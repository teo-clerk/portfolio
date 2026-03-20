export default async function handler(req, res) {
    const apiKey = process.env.XAI_API_KEY || process.env.VITE_XAI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'XAI_API_KEY is not configured on the server.' });
    }

    try {
        const response = await fetch('https://api.x.ai/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        console.error('Serverless Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
