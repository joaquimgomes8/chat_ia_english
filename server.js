// ChatBuddy - Backend server for Render
// Serves static files and proxies Gemini API calls (keeps API key secure in .env)
require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Proxy endpoint for Gemini API
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;

    if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Message is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' });
    }

    const systemPrompt =
        "You are ChatBuddy, a friendly English conversation practice partner. " +
        "Keep responses short (1-3 sentences), encouraging, and appropriate for an English learner. " +
        "If the user makes a grammar mistake, gently correct it. " +
        "Always respond in English.";

    const fullPrompt = `${systemPrompt}\n\nUser: ${message}`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: fullPrompt }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 200
                    }
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            console.error('Gemini API error:', response.status, errorData);
            return res.status(response.status).json({ error: 'Gemini API request failed' });
        }

        const data = await response.json();
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!reply) {
            return res.status(500).json({ error: 'Empty response from Gemini' });
        }

        res.json({ reply: reply.trim() });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`ChatBuddy server running on http://localhost:${PORT}`);
});