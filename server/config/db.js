const { neon } = require('@neondatabase/serverless');
const dotenv = require('dotenv');

dotenv.config();

// We use the direct connection string from your .env
const connectionString = process.env.DATABASE_URL;

// This 'sql' object is what we use to talk to the DB
const sql = neon(connectionString);

module.exports = sql;