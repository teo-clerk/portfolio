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

    try {
        const upstream = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: process.env.XAI_MODEL || MODEL,
                messages: [
                    { role: 'system', content: buildSystemPrompt() },
                    { role: 'user', content: trimmed },
                ],
                temperature: TEMPERATURE,
                max_tokens: MAX_TOKENS,
            }),
        });

        const data = await upstream.json().catch(() => null);

        if (!upstream.ok) {
            // Log the upstream detail server-side; do not forward it. The old
            // version returned the provider's raw error body to the browser.
            console.error('xAI upstream error', upstream.status, data);
            return res.status(502).json({ error: 'AI provider request failed.' });
        }

        const reply = data?.choices?.[0]?.message?.content;
        if (typeof reply !== 'string' || reply.length === 0) {
            return res.status(502).json({ error: 'AI returned an empty response.' });
        }

        return res.status(200).json({ reply });
    } catch (error) {
        console.error('Serverless error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
