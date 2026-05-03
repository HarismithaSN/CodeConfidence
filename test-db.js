#!/usr/bin/env node

// Simple database connection test
require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const DB_HOST = process.env.DB_HOST || 'localhost';
    const DB_USER = process.env.DB_USER || 'root';
    const DB_PASSWORD = process.env.DB_PASSWORD || '';
    const DB_NAME = process.env.DB_NAME || 'codeconfidence';
    const DATABASE_URL = process.env.DATABASE_URL;

    let dbConfig;
    if (DATABASE_URL) {
      const parsed = new URL(DATABASE_URL);
      dbConfig = {
        host: parsed.hostname,
        user: parsed.username,
        password: parsed.password,
        database: parsed.pathname.slice(1),
        port: parsed.port || 3306
      };
    } else {
      dbConfig = {
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME
      };
    }

    console.log('🔌 Testing database connection...');
    console.log(`Host: ${dbConfig.host}:${dbConfig.port || 3306}`);
    console.log(`Database: ${dbConfig.database}`);

    const connection = await mysql.createConnection(dbConfig);
    await connection.execute('SELECT 1 as test');
    await connection.end();

    console.log('✅ Database connection successful!');
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(error.message);
    process.exit(1);
  }
}

testConnection();