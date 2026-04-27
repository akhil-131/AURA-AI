const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');

const app = express();

// Middleware
app.use(cors());
// Tell Express to accept JSON payloads up to 50 Megabytes!
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', require('./routes/chatRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`AURA AI Server running on port ${PORT}`));
const sql = require('./config/db');

// This is a "heartbeat" check
async function checkConnection() {
    try {
        const result = await sql`SELECT NOW()`;
        console.log("✅ Database Connected at:", result[0].now);
    } catch (err) {
        console.error("❌ Database Connection Failed:", err.message);
    }
}

checkConnection();