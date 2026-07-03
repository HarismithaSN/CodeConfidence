# CodeConfidence 🎯

An AI-powered coding confidence builder and assessment platform designed for students and institutions. CodeConfidence helps learners practice coding challenges, receive AI-generated feedback, track their progress, and build confidence — all while giving institutions a powerful dashboard to monitor student performance.

---

## ✨ Features

### For Students
- 🧠 **AI Mentor Feedback** — Get instant, detailed feedback on your code from Google Gemini AI
- ⚡ **Real Code Execution** — Run Python, JavaScript, Java, C, and C++ code via the Judge0 API
- 📊 **Skill Tracking** — Visual radar chart tracking progress across Loops, Functions, Arrays, OOP, Recursion, and Algorithms
- 🔥 **Streak & XP System** — Gamified daily streaks and experience points to keep you motivated
- 📝 **Practice Arenas** — Aptitude, Technical MCQs, SQL Lab, NoSQL Shell, Behavioral, and Communication rounds
- 🏆 **Coding Activity Heatmap** — GitHub-style heatmap of your daily practice activity
- 👥 **Community Leaderboard** — See how you rank among peers at your institution

### For Institutions
- 🏫 **Institution Dashboard** — Monitor all student progress in one place
- 📈 **Student Analytics** — Confidence scores, XP, level, streak, and submission history per student
- 📋 **At-Risk Identification** — Identify inactive or struggling students automatically
- 👤 **Student Management** — Add and manage student accounts with automatic credential generation
- 📥 **Registration Requests** — Manage incoming institution onboarding requests

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js, Express.js |
| **Database** | MySQL (production) / SQLite (fallback) |
| **AI** | Google Gemini API (`gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-1.5-pro`) |
| **Code Runner** | Judge0 CE API |
| **Frontend** | Vanilla HTML, CSS, JavaScript |
| **Email** | Nodemailer (Gmail SMTP) |
| **Deployment** | Render (with SQLite fallback) |

---

## 📁 Project Structure

```
Coder/
├── server.js                   # Express backend — API routes, DB logic, AI/email integration
├── app.html                    # Student dashboard (main app UI)
├── login.html                  # Login & institution registration page
├── institution-dashboard.html  # Institution admin dashboard
├── logic.js                    # Client-side logic for student dashboard
├── index.css                   # Global stylesheet
│
├── Data/                       # Question bank JSON files
│   ├── 01_APTITUDE_QUANTITATIVE.json
│   ├── behavioral.json
│   ├── coding_round.json
│   ├── communication.json
│   ├── core_cs.json
│   ├── full_mock_test.json
│   ├── nosql_shell.json
│   ├── sql_lab.json
│   ├── technical.json
│   └── technical (1).json
│
├── aptitude_bank.js            # Aptitude question bank (JS)
├── communication_bank.js       # Communication question bank (JS)
├── data.js                     # Shared data / question loading logic
│
├── users.json                  # Seed file for initial user data (auto-migrated on startup)
├── codeconfidence.db           # SQLite database (auto-created in production fallback)
├── test-db.js                  # DB connection test utility
│
├── package.json
├── .env.example                # Environment variable template
├── .gitignore
├── DEPLOYMENT.md               # Deployment guide for Render
└── README.md
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org/) v16+
- [XAMPP](https://www.apachefriends.org/) or any MySQL server (optional — app falls back to SQLite)
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey) (optional — a default key is bundled for demo)

### 1. Clone & Install

```bash
git clone https://github.com/HarismithaSN/CodeConfidence.git
cd CodeConfidence
npm install
```

### 2. Configure Environment

Copy the example env file and fill in your settings:

```bash
copy .env.example .env
```

Edit `.env`:

```env
# Local MySQL (XAMPP/WAMP) — leave blank to use SQLite automatically
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=codeconfidence

# OR use a connection URL for cloud databases
# DATABASE_URL=mysql://username:password@host:port/database_name

# Gemini API Key (optional — bundled demo key included)
GEMINI_API_KEY=your-gemini-api-key

# Email notifications (optional)
MAIL_USER=your-gmail@gmail.com
MAIL_PASS=your-gmail-app-password
MAIL_TO=admin@yourdomain.com
```

### 3. Test Database Connection (Optional)

```bash
npm run test-db
```

### 4. Run the App

```bash
npm start
```

Open your browser at: **http://localhost:3001**

> If no database is configured, the app automatically uses SQLite (`codeconfidence.db`) — no setup needed.

---

## 🌐 API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/signup` | Student self-registration |
| `POST` | `/api/login` | Login with email or roll number |
| `PUT` | `/api/profile/:email` | Update user profile/progress |

### Code Execution & AI
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/run` | Execute code via Judge0 |
| `POST` | `/api/feedback` | Get AI code feedback from Gemini |
| `POST` | `/api/ai` | General AI proxy endpoint |

### Institutions
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/institution/students` | Sync student list for an institution |
| `POST` | `/api/institution/request` | Submit a new institution registration request |
| `GET` | `/api/institution/requests` | List all institution registration requests |
| `GET` | `/api/community/:college` | Get leaderboard for a college |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/users` | List all users (requires `x-admin-secret` header) |
| `GET` | `/health` | Health check — reports DB mode and environment |

---

## 🗄️ Database

The app supports two database modes, selected automatically:

| Mode | When Used | Notes |
|---|---|---|
| **MySQL** | `DATABASE_URL` or `DB_HOST` is set | Recommended for production |
| **SQLite** | No DB env var found in production | Auto-created, zero-config |

On startup, the app:
1. Creates all required tables (`institutions`, `users`, `institution_requests`)
2. Seeds the demo institution (`DSCE-MCA-2024`)
3. Migrates users from `users.json` (if not already in DB)

---

## 🚢 Deployment (Render)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full guide.

**Quick summary:**
1. Push to GitHub
2. Create a Render **Web Service** pointing to your repo
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add optional env vars: `DATABASE_URL`, `GEMINI_API_KEY`, `NODE_ENV=production`
6. Deploy — SQLite auto-activates if no DB URL is provided

---

## 🔐 Demo Credentials

| Role | Email / Roll No | Password |
|---|---|---|
| Institution Admin | `admin@dsce.edu.in` | `demo123` |
| Student (self-signup) | *(create your own)* | *(set during signup)* |

> ⚠️ Change default credentials before deploying to a production environment.

---

## 📄 License

This project is intended for academic and educational use.

---

*Built with ❤️ by [Harismitha S N](https://github.com/HarismithaSN)*
