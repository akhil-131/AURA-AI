const sql = require('../config/db');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// 1. TEXT GENERATION KEYS (3 Keys for Rotation)
const textKeys = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3
].filter(Boolean);

let textKeyIndex = 0;

const getNextTextKey = () => {
    const key = textKeys[textKeyIndex];
    textKeyIndex = (textKeyIndex + 1) % textKeys.length;
    return key;
};

// --- CHAT SESSION MANAGEMENT ---

exports.createNewChat = async (req, res) => {
    const { userId, title } = req.body;
    try {
        const newChat = await sql`INSERT INTO chats (user_id, title) VALUES (${userId}, ${title}) RETURNING *`;
        res.status(201).json(newChat[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getChatHistory = async (req, res) => {
    const { chatId } = req.params;
    try {
        const history = await sql`SELECT * FROM messages WHERE chat_id = ${chatId} ORDER BY created_at ASC LIMIT 50`;
        res.json(history);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getUserChats = async (req, res) => {
    const { userId } = req.params;
    try {
        const chats = await sql`SELECT * FROM chats WHERE user_id = ${userId} ORDER BY updated_at DESC`;
        res.json(chats);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteChat = async (req, res) => {
    try {
        await sql`DELETE FROM chats WHERE id = ${req.params.chatId}`;
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.renameChat = async (req, res) => {
    try {
        await sql`UPDATE chats SET title = ${req.body.title} WHERE id = ${req.params.chatId}`;
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.pinChat = async (req, res) => {
    try {
        await sql`UPDATE chats SET is_pinned = ${req.body.isPinned} WHERE id = ${req.params.chatId}`;
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- TEXT GENERATION (Gemini 1.5 Flash - Stable Free Tier) ---

exports.streamChat = async (req, res) => {
    const { prompt, chatId, history, attachment } = req.body;

    // Loop through our keys if one hits a rate limit
    for (let attempt = 1; attempt <= textKeys.length; attempt++) {
        try {
            const genAI = new GoogleGenerativeAI(getNextTextKey());
            
            // 🌟 FIXED: Switched to the universally supported 1.5-flash model
            // 🌟 The official free-tier model for 2026
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            if (!res.headersSent) {
                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                res.setHeader('Transfer-Encoding', 'chunked');
            }

            const formattedHistory = (history || [])
                .filter(msg => msg.text && msg.text.length < 5000) 
                .map(msg => ({
                    role: msg.isAi ? "model" : "user",
                    parts: [{ text: msg.text }]
                }));

            const chat = model.startChat({ history: formattedHistory });
            
            let chatParts = [{ text: prompt }];
            if (attachment && attachment.base64) {
                chatParts.push({
                    inlineData: {
                        data: attachment.base64,
                        mimeType: attachment.mimeType || 'application/octet-stream'
                    }
                });
            }

            // Send the prompt AND the file to Gemini
            const result = await chat.sendMessageStream(chatParts);
            let fullAiResponse = "";

            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                fullAiResponse += chunkText;
                res.write(chunkText);
            }

            res.end();

            // Create a clean DB prompt so we don't save massive Base64 strings to Neon DB
            let dbUserMessage = prompt;
            if (attachment) {
                dbUserMessage = `📎 [${attachment.name}]\n\n${prompt}`;
            }

            if (chatId) {
                await sql`INSERT INTO messages (chat_id, role, content) VALUES (${chatId}, 'user', ${dbUserMessage})`;
                await sql`INSERT INTO messages (chat_id, role, content) VALUES (${chatId}, 'assistant', ${fullAiResponse})`;
                await sql`UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ${chatId}`;
            }
            return; 

        } catch (error) {
            console.error(`Text Attempt ${attempt} Failed:`, error.message);
            
            // If it's a rate limit (429) or Service Unavailable (503), the loop continues to the next key
            if (error.status === 503 || error.status === 429) continue;
            
            // For other errors, stop and tell the user
            if (!res.headersSent) res.status(500).json({ error: "AURA text servers are busy." });
            res.end();
            return;
        }
    }
};