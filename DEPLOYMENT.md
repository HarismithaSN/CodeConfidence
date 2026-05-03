# CodeConfidence Deployment Guide

## 🚀 Deploying to Render

### Step 1: Set up MySQL Database

**Option A: Railway MySQL (Recommended - Free tier available)**

1. Go to [Railway.app](https://railway.app) and sign up/login
2. Click "New Project" → "Database" → "MySQL"
3. Wait for database to be created
4. Go to "Variables" tab in your database
5. Copy the `DATABASE_URL` (it looks like: `mysql://user:pass@host:port/dbname`)

**Option B: Render MySQL**
1. In Render dashboard, create a new "Managed Database" → MySQL
2. Copy the connection details

### Step 2: Deploy to Render

1. Connect your GitHub repo to Render
2. Create a new "Web Service"
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables:

```
DATABASE_URL=mysql://your-railway-connection-string-here
GEMINI_API_KEY=your-gemini-api-key-here
NODE_ENV=production
```

### Step 3: Configure Environment

Make sure these environment variables are set in Render:

- `DATABASE_URL` (preferred)
- `GEMINI_API_KEY` (for AI features)
- `NODE_ENV=production`
- `PORT` (automatically set by Render)

> If you are not using `DATABASE_URL`, set all 4 values manually:
> - `DB_HOST`
> - `DB_USER`
> - `DB_PASSWORD`
> - `DB_NAME`

**Important:** Never leave `DB_HOST` as `localhost` on Render. If your app is deployed on Render, `DB_HOST` must be the remote database host from your cloud provider, not `127.0.0.1`.


### Step 4: Deploy

Click "Create Web Service" and wait for deployment.

## 🔧 Local Development

1. Install XAMPP/WAMP for MySQL
2. Copy `.env.example` to `.env`
3. Update `.env` with your local MySQL credentials
4. Test database connection: `npm run test-db`
5. Run the app: `npm start`

## 🐛 Troubleshooting

- **ECONNREFUSED**: Check DATABASE_URL format - it should be `mysql://user:pass@host:port/dbname`
- **Connection timeout**: Verify database is running and accessible from external connections
- **Build fails**: Check Node.js version (16+ recommended)
- **Port issues**: Render automatically sets the PORT environment variable
- **Database creation fails**: Ensure your MySQL user has CREATE DATABASE permissions