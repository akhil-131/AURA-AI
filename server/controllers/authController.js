const sql = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// SIGNUP
exports.signup = async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const existingUser = await sql`SELECT * FROM users WHERE email = ${email}`;
        if (existingUser.length > 0) return res.status(400).json({ message: "User already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await sql`
            INSERT INTO users (username, email, password_hash) 
            VALUES (${username}, ${email}, ${hashedPassword}) 
            RETURNING id, username, email, profile_picture
        `;

        res.status(201).json({ message: "User created successfully", user: newUser[0] });
    } catch (error) {
        console.error("Database Error:", error); 
        res.status(500).json({ error: error.message });
    }
};

// LOGIN
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await sql`SELECT * FROM users WHERE email = ${email}`;
        if (user.length === 0) return res.status(400).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user[0].password_hash);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: user[0].id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: { 
                id: user[0].id, 
                username: user[0].username, 
                email: user[0].email,
                profile_picture: user[0].profile_picture // 🌟 FIXED: It now brings the picture with it!
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// UPDATE USER PROFILE (Name & Picture)
exports.updateProfile = async (req, res) => {
    const { userId, username, profilePicture } = req.body;
    try {
        const result = await sql`
            UPDATE users 
            SET username = ${username}, profile_picture = ${profilePicture}
            WHERE id = ${userId}
            RETURNING id, username, email, profile_picture
        `;
        res.json({ success: true, user: result[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 🌟 NEW: FETCH FRESH USER DATA (Needed for Sidebar to auto-update)
exports.getMe = async (req, res) => {
    try {
        const user = await sql`
            SELECT id, username, email, profile_picture 
            FROM users 
            WHERE id = ${req.params.id}
        `;
        if (user.length === 0) return res.status(404).json({ message: "User not found" });
        
        res.json(user[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        // 1. Check if user exists
        const user = await sql`SELECT * FROM users WHERE email = ${email}`;
        if (user.length === 0) return res.status(404).json({ message: "User not found" });

        // 2. Generate a random 64-character token
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        // 3. Set expiry time to 1 hour from now
        const tokenExpiry = new Date(Date.now() + 3600000); 

        // 4. Save token to Neon DB
        await sql`
            UPDATE users 
            SET reset_token = ${resetToken}, reset_token_expiry = ${tokenExpiry} 
            WHERE email = ${email}
        `;

        // 5. Configure the Email Sender
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // 6. Send the Email
        // Note: For now, this points to your frontend URL. We will build the Reset Screen next!
        const resetLink = `http://akhil-aura-ai.vercel.app/reset-password?token=${resetToken}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'AURA AI - Password Reset Request',
            html: `
                <div style="background-color: #000; color: #fff; padding: 20px; font-family: sans-serif; text-align: center;">
                    <h2 style="color: #9ba8ff;">AURA AI Network</h2>
                    <p>We received a request to reset your password.</p>
                    <p>Click the button below to establish a new secure connection:</p>
                    <a href="${resetLink}" style="background-color: #9ba8ff; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block; margin-top: 20px;">Reset Password</a>
                    <p style="color: #757575; font-size: 12px; margin-top: 30px;">If you didn't request this, safely ignore this email. This link expires in 1 hour.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: "Reset link sent to your email." });

    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({ error: error.message });
    }
};

// 🌟 NEW: ACTUALLY RESET THE PASSWORD
exports.resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        // 1. Find user by token AND make sure it hasn't expired yet
        const user = await sql`
            SELECT * FROM users 
            WHERE reset_token = ${token} 
            AND reset_token_expiry > NOW()
        `;

        if (user.length === 0) {
            return res.status(400).json({ message: "Invalid or expired reset link." });
        }

        // 2. Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // 3. Update the password and DELETE the token so it can't be used twice
        await sql`
            UPDATE users 
            SET password_hash = ${hashedPassword}, reset_token = NULL, reset_token_expiry = NULL 
            WHERE id = ${user[0].id}
        `;

        res.json({ message: "Password updated successfully." });
    } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({ error: error.message });
    }
};