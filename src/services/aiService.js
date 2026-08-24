import {
    buildSystemPrompt,
    MAX_QUESTION_LENGTH,
    MODEL,
    TEMPERATURE,
    MAX_TOKENS,
} from './systemPrompt';

const GENERIC_ERROR =
    "AI connection error. Browse the CV manually for now — try <strong>about</strong> or <strong>projects</strong>.";

/**
 * Production path: the serverless proxy holds the API key and builds the
 * system prompt. The client sends nothing but the question.
 */
const askViaProxy = async (question) => {
    let response;
    try {
        response = await fetch('/api/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question }),
        });
    } catch (error) {
        console.error('Network error reaching /api/ask:', error);
        return 'Network error. Unable to reach the AI module.';
    }

    if (response.status === 429) {
        return "Slow down a moment — too many questions in a row. Try again shortly.";
    }

    if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        console.error('AI proxy error:', response.status, detail);
        return detail?.error ? String(detail.error) : GENERIC_ERROR;
    }

    const data = await response.json().catch(() => null);
    return data?.reply || 'Received an empty response.';
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
const askDirectInDev = async (question) => {
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
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: buildSystemPrompt() },
                    { role: 'user', content: question },
                ],
                temperature: TEMPERATURE,
                max_tokens: MAX_TOKENS,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Local xAI API error:', errorData);
            return 'Local AI connection error. Check your API key and connection.';
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || 'Empty response from AI.';
    } catch (error) {
        console.error('Local network error:', error);
        return 'Local network error. AI modules are offline.';
    }
};

export const askGrok = async (userMessage) => {
    const question = String(userMessage ?? '').trim();

    if (!question) {
        return 'Ask me something about Teo — try <strong>ask what are his skills?</strong>';
    }
    if (question.length > MAX_QUESTION_LENGTH) {
        return `That question is a bit long (max ${MAX_QUESTION_LENGTH} characters). Try trimming it down.`;
    }

    return import.meta.env.DEV ? askDirectInDev(question) : askViaProxy(question);
};
