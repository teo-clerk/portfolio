import {
    buildSystemPrompt,
    MAX_QUESTION_LENGTH,
    MODEL,
    TEMPERATURE,
    MAX_TOKENS,
} from './systemPrompt';

const GENERIC_ERROR =
    "AI connection error. Browse the CV manually for now — try <strong>about</strong> or <strong>projects</strong>.";

/** Client-side ceiling. The server has its own; this covers a dead socket. */
const STREAM_TIMEOUT_MS = 45_000;

/**
 * The in-flight request, so a new `ask` (or `clear`) can cancel the previous
 * one instead of leaving it writing into a history entry that is gone.
 */
let activeController = null;

export const abortActiveAsk = () => {
    // The reason is how the catch below tells "a newer question replaced this"
    // apart from "this timed out" — the first should stay silent.
    activeController?.abort('superseded');
    activeController = null;
};

/**
 * Read an SSE body, calling `onDelta` for each text fragment.
 *
 * Both transports below speak the same wire format — our proxy re-emits
 * `{delta}` / `{error}` frames, and xAI's own stream carries OpenAI-shaped
 * `choices[0].delta.content`. `extract` is what differs, so it is passed in.
 *
 * Returns the accumulated text; throws with a user-safe message on an in-band
 * error frame.
 */
const consumeSse = async (body, extract, onDelta) => {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';

    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Trailing partial line stays buffered until its remainder arrives.
        buffer = lines.pop() ?? '';

        for (const line of lines) {
            const text = line.trim();
            if (!text.startsWith('data:')) continue;

            const payload = text.slice(5).trim();
            if (payload === '[DONE]') return full;

            let parsed;
            try {
                parsed = JSON.parse(payload);
            } catch {
                continue; // frame split across chunks; the buffer will retry it
            }

            if (parsed?.error) throw new Error(String(parsed.error));

            const delta = extract(parsed);
            if (typeof delta === 'string' && delta.length > 0) {
                full += delta;
                onDelta(full);
            }
        }
    }

    return full;
};

/** Our proxy's own framing. */
const extractProxyDelta = (frame) => frame?.delta;
/** xAI / OpenAI chat-completion streaming framing. */
const extractUpstreamDelta = (frame) => frame?.choices?.[0]?.delta?.content;

/**
 * Production path: the serverless proxy holds the API key and builds the
 * system prompt. The client sends nothing but the question.
 */
const streamViaProxy = async (question, onDelta, signal) => {
    let response;
    try {
        response = await fetch('/api/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question }),
            signal,
        });
    } catch (error) {
        if (error?.name === 'AbortError') throw error;
        console.error('Network error reaching /api/ask:', error);
        return 'Network error. Unable to reach the AI module.';
    }

    if (response.status === 429) {
        return 'Slow down a moment — too many questions in a row. Try again shortly.';
    }

    if (!response.ok || !response.body) {
        const detail = await response.json().catch(() => ({}));
        console.error('AI proxy error:', response.status, detail);
        return detail?.error ? String(detail.error) : GENERIC_ERROR;
    }

    return consumeSse(response.body, extractProxyDelta, onDelta);
};

/**
 * Local development path.
 *
 * `vite dev` does not run the serverless function, so this calls xAI directly
 * using VITE_XAI_API_KEY from .env.local. The whole branch is behind
 * `import.meta.env.DEV`, which Vite replaces with `false` in a production
 * build, so neither this code nor the key reaches the shipped bundle.
 * Run `vercel dev` to exercise the real proxy path locally.
 */
const streamDirectInDev = async (question, onDelta, signal) => {
    const apiKey = import.meta.env.VITE_XAI_API_KEY;
    if (!apiKey) {
        return 'Grok AI is offline (API key missing). Set VITE_XAI_API_KEY in .env.local, or run `vercel dev` to use the serverless proxy.';
    }

    try {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            signal,
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: buildSystemPrompt() },
                    { role: 'user', content: question },
                ],
                temperature: TEMPERATURE,
                max_tokens: MAX_TOKENS,
                stream: true,
            }),
        });

        if (!response.ok || !response.body) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Local xAI API error:', errorData);
            return 'Local AI connection error. Check your API key and connection.';
        }

        return consumeSse(response.body, extractUpstreamDelta, onDelta);
    } catch (error) {
        if (error?.name === 'AbortError') throw error;
        console.error('Local network error:', error);
        return 'Local network error. AI modules are offline.';
    }
};

/**
 * Ask Grok, streaming the answer.
 *
 * `onDelta` receives the accumulated text so far (not just the new fragment),
 * so the caller can render it straight into the terminal without tracking
 * state of its own. Resolves with the final text.
 */
export const askGrokStream = async (userMessage, onDelta = () => {}) => {
    const question = String(userMessage ?? '').trim();

    if (!question) {
        return 'Ask me something about Teo — try <strong>ask what are his skills?</strong>';
    }
    if (question.length > MAX_QUESTION_LENGTH) {
        return `That question is a bit long (max ${MAX_QUESTION_LENGTH} characters). Try trimming it down.`;
    }

    abortActiveAsk();
    const controller = new AbortController();
    activeController = controller;
    const timeout = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

    try {
        const stream = import.meta.env.DEV ? streamDirectInDev : streamViaProxy;
        const reply = await stream(question, onDelta, controller.signal);
        return reply || 'Received an empty response.';
    } catch (error) {
        if (error?.name === 'AbortError') {
            // Either a newer question superseded this one or it ran out of time.
            // The caller distinguishes them; an empty string means "say nothing".
            return controller.signal.reason === 'superseded' ? '' : 'The AI response timed out.';
        }
        console.error('AI stream error:', error);
        return error?.message ? String(error.message) : GENERIC_ERROR;
    } finally {
        clearTimeout(timeout);
        if (activeController === controller) activeController = null;
    }
};
