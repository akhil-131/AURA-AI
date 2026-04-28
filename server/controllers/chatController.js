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

    console.log("\n========================================");
    console.log(`📩 NEW MESSAGE RECEIVED: "${prompt}"`);
    console.log(`🔑 Available API Keys in Memory: ${textKeys.length}`);
    console.log("========================================");

    // 🛑 If .env is broken, it will stop here
    if (textKeys.length === 0) {
        console.log("❌ CRITICAL ERROR: 0 API keys found! Check your .env file.");
        return res.status(500).json({ error: "AURA text servers are busy." });
    }

    for (let attempt = 1; attempt <= textKeys.length; attempt++) {
        try {
            console.log(`🚀 [Attempt ${attempt}/${textKeys.length}] Calling Gemini API...`);
            
            const genAI = new GoogleGenerativeAI(getNextTextKey());
            const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

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

            console.log("⏳ Waiting for Google to respond...");
            const result = await chat.sendMessageStream(chatParts);
            
            let fullAiResponse = "";
            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                fullAiResponse += chunkText;
                res.write(chunkText);
            }

            console.log("✅ Message streamed successfully!");
            res.end();

            let dbUserMessage = prompt;
            if (attachment) dbUserMessage = `📎 [${attachment.name}]\n\n${prompt}`;

            if (chatId) {
                await sql`INSERT INTO messages (chat_id, role, content) VALUES (${chatId}, 'user', ${dbUserMessage})`;
                await sql`INSERT INTO messages (chat_id, role, content) VALUES (${chatId}, 'assistant', ${fullAiResponse})`;
                await sql`UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ${chatId}`;
                console.log("💾 Saved to Neon Database.");
            }
            return; 

        } catch (error) {
            console.log(`\n💥 [CRASH ON ATTEMPT ${attempt}]`);
            console.log(`➡️ Status Code: ${error.status || 'UNKNOWN'}`);
            console.log(`➡️ Error Detail: ${error.message || 'No detail provided'}`);
            
            // 🛑 NEW: Catch both 503/429 AND the weird "Failed to parse stream" SDK bug
            const isBusy = error.status === 503 || error.status === 429;
            const isStreamBug = error.message && error.message.includes("Failed to parse stream");

            if (isBusy || isStreamBug) {
                console.log("⚠️ Google is overloaded. Moving to next API key...");
                continue; 
            }
            
            console.log("🛑 Hard error encountered. Stopping everything.");
            if (!res.headersSent) res.status(500).json({ error: "AURA text servers are busy." });
            res.end();
            return;
        }
    }

    // 🛑 If the loop finishes and all 3 keys hit a rate limit
    console.log("\n❌ ALL 3 API KEYS EXHAUSTED.");
    if (!res.headersSent) res.status(500).json({ error: "AURA text servers are busy." });
    res.end();
};