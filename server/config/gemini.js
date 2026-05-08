const { GoogleGenAI } = require("@google/genai");
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
// Try this one first (The most universally supported tag)
// 🌟 The official free-tier model for 2026
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });