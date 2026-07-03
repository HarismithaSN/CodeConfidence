# CodeConfidence Deployment Guide

## 🚀 Deploying to Render (Zero-Config Database!)

### Step 1: Database Setup (Optional - SQLite Fallback Included)

**Option A: Use External MySQL (Recommended for Production)**
1. Go to [planetscale.com](https://planetscale.com) and sign up (free tier available)
2. Create a new database
3. Get the connection string from "Connect" → "General" → "Connect with"
4. Copy the MySQL URL (looks like: `mysql://user:pass@host:port/dbname`)

**Option B: Use Railway MySQL (Free)**
1. Go to [railway.app](https://railway.app) → New Project → Database → MySQL
2. Wait for creation
3. Copy `DATABASE_URL` from Variables tab

**Option C: Zero-Config Deployment (Easiest)**
- The app automatically uses SQLite when no DATABASE_URL is provided
- No database setup required - just deploy!
- Perfect for demos, testing, or small-scale deployments

### Step 2: Deploy to Render

1. Connect your GitHub repo to Render
2. Create a new "Web Service"
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables:

```
DATABASE_URL=your-custom-db-url-here  # Optional - omit for SQLite fallback
GEMINI_API_KEY=your-gemini-api-key    # For AI features
NODE_ENV=production                   # Required for production mode
```

### Step 3: Deploy

Click "Create Web Service" and wait for deployment. The app will automatically use SQLite if no DATABASE_URL is provided.

## 🔧 Local Development

1. Install XAMPP/WAMP for MySQL (optional)
2. Copy `.env.example` to `.env`
3. Update `.env` with your local MySQL credentials (or leave empty for SQLite)
4. Test database connection: `npm run test-db`
5. Run the app: `npm start`

## 🐛 Troubleshooting

- **ECONNREFUSED**: Check DATABASE_URL format or ensure MySQL is running locally
- **SQLite Permission Errors**: Ensure write permissions in the app directory
- **Database Connection Issues**: The app automatically falls back to SQLite in production when no DATABASE_URL is configured
- **Connection timeout**: Verify database is running and accessible
- **Build fails**: Check Node.js version (16+ recommended)
- **Port issues**: Render automatically sets the PORT environment variable