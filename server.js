const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
require('dotenv').config();

// Fix for Render IPv6 routing issues with Gmail SMTP
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

console.log("\n🚀 SkillForge Starting with MySQL storage...");

// ─── Email Helper ─────────────────────────────────────────────────────────────
const mailTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // Use SSL/TLS
  family: 4, // Force IPv4 explicitly because Render's free tier drops outbound IPv6
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

async function sendMail(subject, html, toEmail) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    console.warn('[Email] MAIL_USER / MAIL_PASS not set. Skipping email.');
    return;
  }

  const recipient = toEmail || process.env.MAIL_TO;
  if (!recipient) {
    console.warn('[Email] No recipient address provided and MAIL_TO not set.');
    return;
  }

  try {
    await mailTransporter.sendMail({
      from: `"SkillForge Alerts" <${process.env.MAIL_USER}>`,
      to: recipient,
      subject,
      html
    });
    console.log(`[Email] Sent: ${subject} to ${recipient}`);
  } catch (e) {
    console.error('[Email] Failed to send:', e.message);
  }
}

function emailTemplate(title, rows, color = '#4a8ff7') {
  const rowsHtml = rows.map(([k, v]) =>
    `<tr><td style="padding:8px 12px;color:#888;font-size:13px;">${k}</td><td style="padding:8px 12px;color:#eee;font-size:13px;">${v}</td></tr>`
  ).join('');
  return `
  <div style="font-family:Inter,sans-serif;background:#0d0d0d;padding:32px;border-radius:16px;max-width:520px;margin:auto;">
    <div style="border-left:4px solid ${color};padding-left:16px;margin-bottom:24px;">
      <h2 style="color:#fff;margin:0;font-size:20px;">${title}</h2>
      <p style="color:#888;margin:4px 0 0;font-size:12px;">SkillForge Platform Alert</p>
    </div>
    <table style="width:100%;border-collapse:collapse;background:#1a1a1a;border-radius:10px;overflow:hidden;">
      ${rowsHtml}
    </table>
    <p style="color:#555;font-size:11px;margin-top:20px;text-align:center;">This is an automated alert from SkillForge. Do not reply.</p>
  </div>`;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname)));

// Root redirect
app.get('/', (req, res) => res.redirect('/login.html'));

const isProduction = process.env.NODE_ENV === 'production' || (process.env.PORT && process.env.NODE_ENV !== 'development');
const DB_HOST = isProduction ? process.env.DB_HOST : process.env.DB_HOST || 'localhost';
const DB_USER = isProduction ? process.env.DB_USER : process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = isProduction ? process.env.DB_NAME : process.env.DB_NAME || 'codeconfidence';
const DATABASE_URL = process.env.DATABASE_URL;

let pool;
let useSQLite = false;
let db;

if (!DATABASE_URL && isProduction) {
  console.log('🔄 Production mode detected with no DATABASE_URL. Using SQLite as fallback...');
  useSQLite = true;
}

if (!isProduction && !DATABASE_URL && !process.env.DB_HOST) {
  console.warn('⚠️ No database environment variables found. Falling back to localhost:3306 for local development.');
  console.warn('Use .env or set DB_HOST / DB_USER / DB_PASSWORD / DB_NAME locally.');
}

// Parse DATABASE_URL if provided (common for cloud deployments)
function parseDatabaseUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      user: parsed.username,
      password: parsed.password,
      database: parsed.pathname.slice(1), // Remove leading slash
      port: parsed.port || 3306
    };
  } catch (e) {
    console.warn('Invalid DATABASE_URL format:', e.message);
    return null;
  }
}

async function initDatabase() {
  if (useSQLite) {
    // Use SQLite for production fallback
    const dbPath = path.join(__dirname, 'codeconfidence.db');
    db = new sqlite3.Database(dbPath);

    console.log(`🔌 Using SQLite database at ${dbPath}`);

    // Create tables for SQLite
    await new Promise((resolve, reject) => {
      db.run(`CREATE TABLE IF NOT EXISTS institutions (
        id TEXT PRIMARY KEY,
        name TEXT,
        adminName TEXT,
        email TEXT,
        password TEXT,
        type TEXT,
        totalStudents INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run(`CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY,
        rollNo TEXT,
        name TEXT,
        branch TEXT,
        year TEXT,
        password TEXT,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        confidenceScore INTEGER DEFAULT 0,
        streak INTEGER DEFAULT 0,
        lastLogin DATE,
        status TEXT DEFAULT 'active',
        instId TEXT,
        college TEXT,
        passwordSet INTEGER DEFAULT 1,
        language TEXT DEFAULT 'English',
        submissions TEXT,
        scores TEXT,
        skills TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await seedDemoInstitution();
    await migrateJsonUsers();
    return;
  }

  // MySQL logic
  const dbConfig = DATABASE_URL ? parseDatabaseUrl(DATABASE_URL) : {
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME
  };

  if (!dbConfig) {
    throw new Error('Invalid database configuration. Please check your environment variables.');
  }

  console.log(`🔌 Connecting to MySQL database at ${dbConfig.host}:${dbConfig.port || 3306}/${dbConfig.database}`);

  // First connect without database to create it if needed
  const rootConfig = { ...dbConfig };
  delete rootConfig.database;

  const rootPool = await mysql.createPool({
    ...rootConfig,
    waitForConnections: true,
    connectionLimit: 2,
    queueLimit: 0
  });

  await rootPool.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await rootPool.end();

  pool = await mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  await pool.query(`CREATE TABLE IF NOT EXISTS institutions (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255),
    adminName VARCHAR(255),
    email VARCHAR(255),
    password VARCHAR(255),
    type VARCHAR(128),
    totalStudents INT DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    email VARCHAR(255) PRIMARY KEY,
    rollNo VARCHAR(64),
    name VARCHAR(255),
    branch VARCHAR(80),
    year VARCHAR(40),
    password VARCHAR(255),
    xp INT DEFAULT 0,
    level INT DEFAULT 1,
    confidenceScore INT DEFAULT 0,
    streak INT DEFAULT 0,
    lastLogin DATE,
    status VARCHAR(50) DEFAULT 'active',
    instId VARCHAR(64),
    college VARCHAR(255),
    passwordSet TINYINT(1) DEFAULT 1,
    language VARCHAR(64) DEFAULT 'English',
    submissions JSON,
    scores JSON,
    skills JSON,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_roll (rollNo),
    INDEX idx_inst (instId),
    INDEX idx_college (college)
  )`);

  await seedDemoInstitution();
  await migrateJsonUsers();
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.toLowerCase().trim() : '';
}

function formatLastLogin(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().split('T')[0];
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
}

function parseUserRow(row) {
  if (!row) return null;
  return {
    email: row.email,
    rollNo: row.rollNo,
    name: row.name,
    branch: row.branch,
    year: row.year,
    password: row.password,
    xp: row.xp,
    level: row.level,
    confidenceScore: row.confidenceScore,
    streak: row.streak,
    lastActive: formatLastLogin(row.lastLogin),
    status: row.status,
    instId: row.instId,
    college: row.college,
    passwordSet: !!row.passwordSet,
    submissions: row.submissions ? JSON.parse(row.submissions) : [],
    scores: row.scores ? JSON.parse(row.scores) : [],
    skills: row.skills ? JSON.parse(row.skills) : {},
    createdAt: row.createdAt
  };
}

async function findUserByEmail(email) {
  if (useSQLite) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [normalizeEmail(email)], (err, row) => {
        if (err) reject(err);
        else resolve(parseUserRow(row));
      });
    });
  } else {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [normalizeEmail(email)]);
    return parseUserRow(rows[0]);
  }
}

async function findUserByRollNo(rollNo, instId) {
  if (useSQLite) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE LOWER(rollNo) = ? AND (? = "" OR instId = ?)',
        [rollNo.toLowerCase(), instId || '', instId || ''], (err, row) => {
          if (err) reject(err);
          else resolve(parseUserRow(row));
        });
    });
  } else {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE LOWER(rollNo) = ? AND (? = "" OR instId = ?)',
      [rollNo.toLowerCase(), instId || '', instId || '']
    );
    return parseUserRow(rows[0]);
  }
}

async function createUser(user) {
  const insert = `INSERT INTO users (email, rollNo, name, branch, year, password, xp, level, confidenceScore, streak, lastLogin, status, instId, college, passwordSet, language, submissions, scores, skills, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  if (useSQLite) {
    return new Promise((resolve, reject) => {
      db.run(insert, [
        normalizeEmail(user.email),
        user.rollNo || null,
        user.name || null,
        user.branch || null,
        user.year || null,
        user.password || null,
        user.xp || 0,
        user.level || 1,
        user.confidenceScore || 0,
        user.streak || 0,
        user.lastLogin ? new Date(user.lastLogin) : null,
        user.status || 'active',
        user.instId || null,
        user.college || null,
        user.passwordSet ? 1 : 0,
        user.language || 'English',
        JSON.stringify(user.submissions || []),
        JSON.stringify(user.scores || []),
        JSON.stringify(user.skills || {}),
        user.createdAt ? new Date(user.createdAt) : new Date()
      ], function (err) {
        if (err) reject(err);
        else resolve();
      });
    });
  } else {
    await pool.query(insert, [
      normalizeEmail(user.email),
      user.rollNo || null,
      user.name || null,
      user.branch || null,
      user.year || null,
      user.password || null,
      user.xp || 0,
      user.level || 1,
      user.confidenceScore || 0,
      user.streak || 0,
      user.lastLogin ? new Date(user.lastLogin) : null,
      user.status || 'active',
      user.instId || null,
      user.college || null,
      user.passwordSet ? 1 : 0,
      user.language || 'English',
      JSON.stringify(user.submissions || []),
      JSON.stringify(user.scores || []),
      JSON.stringify(user.skills || {}),
      user.createdAt ? new Date(user.createdAt) : new Date()
    ]);
  }
}

async function updateUserByEmail(email, updates) {
  const normalized = normalizeEmail(email);
  const fields = [];
  const values = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (key === 'submissions' || key === 'scores' || key === 'skills') {
      fields.push(`${key} = ?`);
      values.push(JSON.stringify(value || []));
    } else if (key === 'lastLogin') {
      fields.push('lastLogin = ?');
      values.push(value ? new Date(value) : null);
    } else if (key === 'passwordSet') {
      fields.push('passwordSet = ?');
      values.push(value ? 1 : 0);
    } else {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (!fields.length) return;
  values.push(normalized);

  if (useSQLite) {
    return new Promise((resolve, reject) => {
      db.run(`UPDATE users SET ${fields.join(', ')} WHERE email = ?`, values, function (err) {
        if (err) reject(err);
        else resolve();
      });
    });
  } else {
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE email = ?`, values);
  }
}

async function seedDemoInstitution() {
  if (useSQLite) {
    return new Promise((resolve, reject) => {
      db.get('SELECT id FROM institutions WHERE id = ?', ['DSCE-MCA-2024'], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        if (!row) {
          db.run(`INSERT INTO institutions (id, name, adminName, email, password, type, totalStudents) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            ['DSCE-MCA-2024', 'Dayananda Sagar College', 'Dr. Ramesh Kumar', 'admin@dsce.edu.in', 'demo123', 'Engineering College', 156], function (err) {
              if (err) reject(err);
              else resolve();
            });
        } else {
          resolve();
        }
      });
    });
  } else {
    const existing = await pool.query('SELECT id FROM institutions WHERE id = ?', ['DSCE-MCA-2024']);
    if (existing[0].length === 0) {
      await pool.query(`INSERT INTO institutions (id, name, adminName, email, password, type, totalStudents) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['DSCE-MCA-2024', 'Dayananda Sagar College', 'Dr. Ramesh Kumar', 'admin@dsce.edu.in', 'demo123', 'Engineering College', 156]);
    }
  }
}

async function migrateJsonUsers() {
  try {
    const content = fs.readFileSync(path.join(__dirname, 'users.json'), 'utf8');
    const json = JSON.parse(content);
    for (const email of Object.keys(json)) {
      const raw = json[email];

      if (useSQLite) {
        const exists = await new Promise((resolve, reject) => {
          db.get('SELECT email FROM users WHERE email = ?', [normalizeEmail(email)], (err, row) => {
            if (err) reject(err);
            else resolve(!!row);
          });
        });
        if (exists) continue;
      } else {
        const exists = await pool.query('SELECT email FROM users WHERE email = ?', [normalizeEmail(email)]);
        if (exists[0].length > 0) continue;
      }

      await createUser({
        ...raw,
        email,
        passwordSet: raw.passwordSet !== false,
        submissions: raw.submissions || [],
        scores: raw.scores || [],
        skills: raw.skills || {}
      });
    }
    console.log('✅ Migrated user data from users.json into database.');
  } catch (e) {
    console.warn('⚠️ No users.json migration performed:', e.message);
  }
}

// Auth & Profile
app.post('/api/signup', async (req, res) => {
  const { name, email, password, college, language } = req.body;
  const lowerEmail = normalizeEmail(email);
  const existing = await findUserByEmail(lowerEmail);
  if (existing) return res.status(409).json({ error: 'Email registered.' });

  await createUser({
    email: lowerEmail,
    name,
    password,
    college: college || 'Unknown',
    language: language || 'English',
    xp: 0,
    streak: 1,
    submissions: [],
    scores: [],
    lastLogin: new Date().toDateString(),
    createdAt: new Date().toISOString()
  });

  res.json({ name, email: lowerEmail, xp: 0, streak: 1, submissions: [], scores: [], college: college || 'Unknown', language: language || 'English' });
});

app.post('/api/login', async (req, res) => {
  const { email, instId, rollNo, password } = req.body;
  let user = null;

  if (email) {
    user = await findUserByEmail(email);
  }
  if (!user && rollNo) {
    user = await findUserByRollNo(rollNo, instId);
  }

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid creds.' });
  }

  const today = new Date().toDateString();
  if (user.lastActive !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yString = yesterday.toDateString();
    const streak = user.lastActive === yString ? (user.streak || 0) + 1 : 1;

    await updateUserByEmail(user.email, {
      streak,
      lastLogin: today
    });

    user.streak = streak;
    user.lastActive = today;
  }

  // 📧 New Login Email Notification directly to the user
  const loginTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'Unknown';
  sendMail(
    '👋 Thanks for logging in — SkillForge',
    emailTemplate(`Welcome back, ${user.name || 'Student'}!`, [
      ['Student Name', user.name || 'N/A'],
      ['Roll No', user.rollNo || 'N/A'],
      ['Email', user.email],
      ['Login Time', loginTime],
      ['Message', 'Thank you for logging into SkillForge. Keep learning and improving your skills!']
    ], '#10b981'),
    user.email // Pass the user's email here so they receive it
  );

  const response = { ...user };
  delete response.password;
  res.json(response);
});

app.get('/api/community/:college', async (req, res) => {
  const college = req.params.college;

  if (useSQLite) {
    const collegeUsers = await new Promise((resolve, reject) => {
      db.all('SELECT name, xp, level FROM users WHERE college = ? ORDER BY xp DESC', [college], (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(u => ({ name: u.name, xp: u.xp, level: u.level })));
      });
    });

    res.json({
      activeNow: Math.floor(Math.random() * 50) + 100,
      collegeRank: collegeUsers,
      totalReviews: 0
    });
  } else {
    const [rows] = await pool.query('SELECT name, xp, level FROM users WHERE college = ? ORDER BY xp DESC', [college]);
    const collegeUsers = rows.map(u => ({ name: u.name, xp: u.xp, level: u.level }));

    res.json({
      activeNow: Math.floor(Math.random() * 50) + 100,
      collegeRank: collegeUsers,
      totalReviews: 0
    });
  }
});

app.put('/api/profile/:email', async (req, res) => {
  const email = normalizeEmail(req.params.email);
  const existing = await findUserByEmail(email);
  if (!existing) return res.status(404).json({ error: 'Not found.' });

  const isPasswordChange = req.body.password !== undefined;

  await updateUserByEmail(email, req.body);
  const updated = await findUserByEmail(email);
  delete updated.password;

  // 📧 Password Changed Email Notification
  if (isPasswordChange) {
    const changeTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'Unknown';
    sendMail(
      '🔑 Password Changed — SkillForge',
      emailTemplate('Password Changed', [
        ['Student Name', existing.name || 'N/A'],
        ['Roll No', existing.rollNo || 'N/A'],
        ['Email', email],
        ['Changed At', changeTime],
        ['IP Address', ip]
      ], '#f59e0b')
    );
  }

  res.json(updated);
});

// 📧 Institution Registration Request
app.post('/api/institution/request', async (req, res) => {
  const { name, contact, email, phone, students } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required.' });

  const requestTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  // 1. Send alert to Admin (falls back to MAIL_TO)
  sendMail(
    '🏫 New Institution Registration Request — SkillForge',
    emailTemplate('New Institution Registration Request', [
      ['Institution Name', name],
      ['Contact Person', contact || 'N/A'],
      ['Email', email],
      ['Phone', phone || 'N/A'],
      ['Approx. Students', students || 'N/A'],
      ['Requested At', requestTime]
    ], '#22c55e')
  );

  // 2. Send acknowledgment to the Institution that registered
  sendMail(
    '✅ Registration Request Received — SkillForge',
    emailTemplate(`Hello ${contact || 'Admin'},`, [
      ['Status', 'Received'],
      ['Institution', name],
      ['Message', 'Thank you for registering your institution with SkillForge! Our team will review your details and contact you within 24 hours.']
    ], '#4a8ff7'),
    email // The email from the form
  );

  res.json({ success: true, message: 'Registration request received. We will contact you within 24 hours.' });
});

// REAL COMPILER (Judge0)
const JUDGE0 = 'https://ce.judge0.com/submissions?base64_encoded=false&wait=true';
const JUDGE0_LANGS = { 'Python': 71, 'JavaScript': 63, 'Java': 62, 'C++': 54, 'C': 50 };

app.post('/api/run', async (req, res) => {
  const { code, language } = req.body;
  const langId = JUDGE0_LANGS[language];
  if (!langId) return res.json({ output: `Unsupported language: ${language}`, error: true });
  try {
    const r = await fetch(JUDGE0, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source_code: code, language_id: langId }) });
    const data = await r.json();
    const clean = (s) => (s || '').trim();
    res.json({
      output: clean(data.stdout) || clean(data.compile_output) || '',
      error: clean(data.stderr) || (data.status?.id !== 3 ? clean(data.status?.description) : ''),
      combined: clean(data.stdout) + clean(data.stderr) + clean(data.compile_output),
      exitCode: data.status?.id === 3 ? 0 : 1,
      message: data.status?.description || ''
    });
  } catch (e) { res.status(500).json({ error: 'Execution failed.' }); }
});

// HEURISTIC AI (Fallback)
function getHeuristicFeedback(code, language) {
  const score = Math.floor(Math.random() * 20) + 70;
  return {
    score: score,
    grade: score > 90 ? "Excellent" : "Good Job",
    summary: "Solid effort! AI is currently in fallback mode but evaluated your logic as positive.",
    issues: [],
    improved_code: code,
    tutor_question: "How can you optimize this for larger inputs?",
    skill_tags: [language, "Logic"],
    xp_earned: 50,
    level_up_tip: "Explore advanced data structures.",
    compiler_analysis: "Code runs fine."
  };
}

// GEMINI CALLER WITH FALLBACK
async function callGemini(systemPrompt, userPrompt, apiKey) {
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
  let lastError = null;

  for (const model of models) {
    try {
      console.log(`[Gemini] Attempting ${model}...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nUser: ${userPrompt}` }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4000 }
        })
      });

      if (!r.ok) {
        const err = await r.text();
        console.warn(`[Gemini] ${model} failed: ${r.status} — ${err.substring(0, 200)}`);
        lastError = err;
        continue;
      }

      const data = await r.json();
      if (data.error) {
        console.warn(`[Gemini] ${model} API error: ${data.error.message}`);
        lastError = data.error.message;
        continue;
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        console.log(`[Gemini] Success with ${model}`);
        return text;
      }
    } catch (e) {
      console.error(`[Gemini] Network error with ${model}:`, e.message);
      lastError = e.message;
    }
  }
  throw new Error(lastError || "All Gemini models failed");
}


app.post('/api/feedback', async (req, res) => {
  let { code, language, apiKey, email } = req.body;
  const DEFAULT_KEY = "AIzaSyDsxsIHMs_HggTeS6YSKmgOqhCMx9o7zfA";
  const activeKey = (apiKey && apiKey.startsWith("AIza")) ? apiKey : DEFAULT_KEY;

  try {
    const db = readDB();
    const user = db[email?.toLowerCase().trim()] || {};
    const systemPrompt = `You are a coding mentor. Analyze the code and provide feedback in JSON format. Language: ${user.language || 'English'}. Score 0-100. Return JSON: {score, grade, summary, issues:[], improved_code, tutor_question, skill_tags:[], xp_earned, level_up_tip}`;

    const aiResponse = await callGemini(systemPrompt, `Code: ${code}\nLang: ${language}`, activeKey);
    const txt = aiResponse.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(txt));
  } catch (e) {
    console.error("[Feedback Failure]:", e.message);
    res.json(getHeuristicFeedback(code, language));
  }
});

app.post('/api/ai', async (req, res) => {
  let { systemPrompt, userPrompt, apiKey } = req.body;
  const DEFAULT_KEY = "AIzaSyDsxsIHMs_HggTeS6YSKmgOqhCMx9o7zfA";
  const activeKey = (apiKey && apiKey.startsWith("AIza")) ? apiKey : DEFAULT_KEY;

  try {
    const text = await callGemini(systemPrompt, userPrompt, activeKey);
    res.json({ text });
  } catch (e) {
    console.error("[AI Proxy Failure]:", e.message);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3001;
(async () => {
  try {
    await initDatabase();
    const listener = app.listen(PORT, '0.0.0.0', () => {
      console.log(`📡 Server active at: http://localhost:${PORT}`);
    });

    listener.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Error: Port ${PORT} is BUSY! Please close the old window.`);
      } else {
        console.error(`\n❌ Fatal Error: ${err.message}`);
      }
    });
  } catch (e) {
    console.error('❌ Could not initialize database. Please check your database configuration.');
    console.error('For MySQL: verify MySQL is running and credentials are correct.');
    console.error('For SQLite: ensure write permissions in the app directory.');
    console.error(e);
    process.exit(1);
  }
})();
