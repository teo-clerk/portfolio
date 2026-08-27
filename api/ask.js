import {
    buildSystemPrompt,
    MAX_QUESTION_LENGTH,
    MODEL,
    TEMPERATURE,
    MAX_TOKENS,
} from '../src/services/systemPrompt.js';

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 8;
const MAX_TRACKED_CLIENTS = 5_000;

/** Ceiling on the whole upstream exchange, streaming included. */
const UPSTREAM_TIMEOUT_MS = 30_000;

/**
 * Best-effort in-memory rate limiter.
 *
 * Serverless instances are ephemeral and there may be several of them, so this
 * is a speed bump rather than a guarantee — it stops a single bored visitor
 * from draining the API budget in a loop. For a hard limit, move this to a
 * shared store (Vercel KV / Upstash) keyed the same way.
 */
const hits = new Map();

const getClientKey = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0].trim();
    }
    return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
};

const isRateLimited = (key) => {
    const now = Date.now();

    // Opportunistic sweep so the map cannot grow without bound.
    if (hits.size > MAX_TRACKED_CLIENTS) {
        for (const [k, timestamps] of hits) {
            const fresh = timestamps.filter((t) => now - t < WINDOW_MS);
            if (fresh.length === 0) hits.delete(k);
            else hits.set(k, fresh);
        }
    }

    const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
        hits.set(key, recent);
        return true;
    }

    recent.push(now);
    hits.set(key, recent);
    return false;
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const clientKey = getClientKey(req);
    if (isRateLimited(clientKey)) {
        res.setHeader('Retry-After', String(Math.ceil(WINDOW_MS / 1000)));
        return res.status(429).json({
            error: 'Too many requests. Give it a minute and try again.',
        });
    }

    // Validate at the boundary. The endpoint accepts ONLY a question string —
    // it deliberately does not accept messages, a system prompt, a model, or
    // token limits from the client, all of which the previous version passed
    // straight through to the upstream API.
    const question = req.body?.question;
    if (typeof question !== 'string') {
        return res.status(400).json({ error: 'Expected a "question" string.' });
    }

    const trimmed = question.trim();
    if (trimmed.length === 0) {
        return res.status(400).json({ error: 'Question cannot be empty.' });
    }
    if (trimmed.length > MAX_QUESTION_LENGTH) {
        return res.status(400).json({
            error: `Question is too long (max ${MAX_QUESTION_LENGTH} characters).`,
        });
    }

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
        console.error('XAI_API_KEY is not configured on the server.');
        return res.status(503).json({ error: 'AI module is not configured.' });
    }

    // Everything above can still fail with a real status code. Once the first
    // byte of the stream is written the status is committed, so any later
    // failure has to be reported as an in-band `error` event instead.
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), UPSTREAM_TIMEOUT_MS);

    // The client hanging up mid-answer should stop us billing for the rest.
    req.on('close', () => abort.abort());

    try {
        const upstream = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            signal: abort.signal,
            body: JSON.stringify({
                model: process.env.XAI_MODEL || MODEL,
                messages: [
                    { role: 'system', content: buildSystemPrompt() },
                    { role: 'user', content: trimmed },
                ],
                temperature: TEMPERATURE,
                max_tokens: MAX_TOKENS,
                stream: true,
            }),
        });

        if (!upstream.ok || !upstream.body) {
            // Read the body for the server log only — never forward provider text.
            const detail = await upstream.text().catch(() => '');
            console.error('xAI upstream error', upstream.status, detail.slice(0, 500));
            clearTimeout(timeout);
            return res.status(502).json({ error: 'AI provider request failed.' });
        }

        res.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            // Vercel/nginx will otherwise buffer the whole body and defeat the
            // point of streaming.
            'X-Accel-Buffering': 'no',
        });

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let produced = 0;

        // Upstream speaks SSE too, but its framing is an implementation detail:
        // we parse its deltas out and re-emit our own minimal protocol so the
        // client never has to know which provider is behind this.
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            // Last element is a partial line; keep it for the next chunk.
            buffer = lines.pop() ?? '';

            for (const line of lines) {
                const text = line.trim();
                if (!text.startsWith('data:')) continue;

                const payload = text.slice(5).trim();
                if (payload === '[DONE]') continue;

                try {
                    const parsed = JSON.parse(payload);
                    const delta = parsed?.choices?.[0]?.delta?.content;
                    if (typeof delta === 'string' && delta.length > 0) {
                        produced += delta.length;
                        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
                    }
                } catch {
                    /* a frame split across chunks — the buffer will retry it */
                }
            }
        }

        if (produced === 0) {
            res.write(`data: ${JSON.stringify({ error: 'AI returned an empty response.' })}\n\n`);
        }
        res.write('data: [DONE]\n\n');
        res.end();
    } catch (error) {
        const aborted = error?.name === 'AbortError';
        console.error('Serverless error:', aborted ? 'aborted/timed out' : error);

        if (res.headersSent) {
            // Mid-stream: the status line is long gone, so report in band.
            try {
                res.write(`data: ${JSON.stringify({ error: 'The AI response was cut short.' })}\n\n`);
                res.write('data: [DONE]\n\n');
                res.end();
            } catch {
                /* socket already gone */
            }
            return;
        }
        return res.status(aborted ? 504 : 500).json({
            error: aborted ? 'AI request timed out.' : 'Internal Server Error',
        });
    } finally {
        clearTimeout(timeout);
    }
}
