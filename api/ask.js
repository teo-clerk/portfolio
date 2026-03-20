export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { messages, model, temperature, max_tokens } = req.body;
    const apiKey = process.env.XAI_API_KEY || process.env.VITE_XAI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'XAI_API_KEY is not configured on the server.' });
    }

    try {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: process.env.XAI_MODEL || model || 'grok-2-1212',
                messages,
                temperature: temperature || 0.7,
                max_tokens: max_tokens || 300
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        return res.status(200).json(data);
    } catch (error) {
        console.error('Serverless Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
