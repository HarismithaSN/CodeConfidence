const GEMINI_API_KEY = window.__GEMINI_API_KEY__
    || 'PASTE-YOUR-GEMINI-KEY-HERE';
window.__GEMINI_MODEL__ = localStorage.getItem('cc_gemini_model') || 'gemini-2.0-flash';

const geminiCallTracker = {
    calls: [],
    canCall() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        this.calls = this.calls.filter(t => t > oneMinuteAgo);
        return this.calls.length < 14;
    },
    trackCall() { this.calls.push(Date.now()); },
    waitTime() {
        if (this.calls.length === 0) return 0;
        const oldest = this.calls[0];
        const waitMs = (oldest + 60000) - Date.now();
        return Math.max(0, Math.ceil(waitMs / 1000));
    }
};

let state = { ...APP_DATA };
let interviewState = {
    active: false,
    company: '',
    questions: [],
    currentIndex: 0,
    answers: [],
    timer: 0,
    timerInterval: null
};

const SQL_CHALLENGES = [
    {
        id: 'sql1',
        title: 'Basic Retrieval',
        desc: "Find all employees in the 'IT' department with a salary greater than 50,000.",
        expectedRows: 2,
        check: (q) => q.toUpperCase().includes('IT') && q.toUpperCase().includes('50000'),
        hint: "SELECT * FROM Employees WHERE Dept = 'IT' AND Salary > 50000;"
    },
    {
        id: 'sql2',
        title: 'Department Count',
        desc: "Count how many employees are in the 'HR' department.",
        expectedRows: 1,
        check: (q) => q.toUpperCase().includes('COUNT') && q.toUpperCase().includes('HR'),
        hint: "SELECT COUNT(*) FROM Employees WHERE Dept = 'HR';"
    },
    {
        id: 'sql3',
        title: 'Salary Average',
        desc: "Find the average salary of all employees.",
        expectedRows: 1,
        check: (q) => q.toUpperCase().includes('AVG'),
        hint: "SELECT AVG(Salary) FROM Employees;"
    },
    {
        id: 'sql4',
        title: 'Newest Joiners',
        desc: "Find employees who joined after '2022-01-01'.",
        expectedRows: 2,
        check: (q) => q.toUpperCase().includes('2022-01-01') || q.toUpperCase().includes('JOINED') || q.toUpperCase().includes('JOINDATE'),
        hint: "SELECT * FROM Employees WHERE JoinDate > '2022-01-01';"
    }
];

if (!state.sqlChallengeIndex) state.sqlChallengeIndex = 0;

function init() {
    initTheme();
    const email = localStorage.getItem('cc_session');
    if (email) {
        const savedProfile = localStorage.getItem('cc_profile_' + email);
        if (savedProfile) {
            state.user = { ...state.user, ...JSON.parse(savedProfile) };
        }
    }

    renderSidebar();
    showPage('dashboard');
    updateXP(0);
    initPlacementData(); // New initialization
    state.sqlSuccess = false;
    state.sqlChallengeIndex = 0;
    updateCareerThemeVariables(); // Initialize career colors for current theme

    // Restore saved Gemini API key
    const savedKey = localStorage.getItem('cc_gemini_key');
    if (savedKey) {
        window.__GEMINI_API_KEY__ = savedKey;
    }

    // Initialize Real-time Analysis UI sync
    const rtToggle = document.getElementById('realtime-toggle');
    if (rtToggle) rtToggle.checked = state.user.realTimeEnabled;
    initRealTimeAnalysis();
}

function initTheme() {
    const saved = localStorage.getItem('cc_theme') || 'dark'
    applyTheme(saved)
}

function applyTheme(theme) {
    const body = document.body
    const btn = document.getElementById('theme-toggle-btn')

    if (theme === 'light') {
        body.classList.add('light-theme')
        if (btn) btn.innerHTML = getMoonIcon()
        if (btn) btn.title = 'Switch to dark mode'
    } else {
        body.classList.remove('light-theme')
        if (btn) btn.innerHTML = getSunIcon()
        if (btn) btn.title = 'Switch to light mode'
    }

    localStorage.setItem('cc_theme', theme)
    updateCareerThemeVariables()
}

function toggleTheme() {
    const current = localStorage.getItem('cc_theme') || 'dark'
    const next = current === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    showToast(`ðŸŒ“ Switched to ${next === 'light' ? 'Light' : 'Dark'} theme`)
}

function getSunIcon() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
}

function getMoonIcon() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`
}

let analysisTimeout;
function initRealTimeAnalysis() {
    const editor = document.querySelector('#page-submit textarea');
    if (!editor) return;

    editor.addEventListener('input', () => {
        clearTimeout(analysisTimeout);
        analysisTimeout = setTimeout(() => {
            if (state.user.realTimeEnabled) {
                analyzeCode(true); // silent=true
            }
        }, 2000); // 2 second debounce for faster real-time feel
    });
}

function renderSidebar() {
    const navItems = [
        { id: 'dashboard', icon: 'ðŸ ', label: 'Dashboard' },
        { id: 'roadmap', icon: 'ðŸ—ºï¸', label: 'Roadmap' },
        { id: 'challenges', icon: 'ðŸŽ¯', label: 'Challenges' },
        { id: 'submit', icon: 'ðŸš€', label: 'Submit Code' },
        { id: 'community', icon: 'ðŸ‘¥', label: 'Community' },
        { id: 'career', icon: 'ðŸŽ“', label: 'Career Prep' },
        { id: 'profile', icon: 'ðŸ‘¤', label: 'My Profile' }
    ];

    const container = document.getElementById('nav-menu');
    container.innerHTML = navItems.map(item => `
        <button class="nav-link" id="nav-${item.id}" onclick="showPage('${item.id}')">
            <i>${item.icon}</i>
            <span>${item.label}</span>
        </button>
    `).join('');
}

function showPage(pageId) {
    // Clear context only when navigating AWAY from submit (not into it)
    if (pageId !== 'submit') {
        state.activeCompany = null;
        state.activeChallenge = null;
    }

    // Hide all pages
    document.querySelectorAll('.page-content').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

    // Show selected
    const page = document.getElementById(`page-${pageId}`);
    if (page) {
        page.style.display = 'block';
        const navBtn = document.getElementById(`nav-${pageId}`);
        if (navBtn) navBtn.classList.add('active');

        // Handle Submit Page default state
        if (pageId === 'submit') {
            const hasActiveTask = state.activeChallenge || state.activeCompany;
            const defState = document.getElementById('submit-default-state');
            const editorCard = document.querySelector('#page-submit .glass-card:not(#submit-default-state)');

            if (defState) defState.style.display = hasActiveTask ? 'none' : 'block';
            if (editorCard) editorCard.style.display = hasActiveTask ? 'block' : 'none';
        }

        renderPage(pageId);
    }
}

function renderPage(pageId) {
    switch (pageId) {
        case 'dashboard': renderDashboard(); break;
        case 'career': renderCareer(); break;
        case 'profile': renderProfile(); break;
        case 'roadmap': renderRoadmap(); break;
        case 'challenges': renderChallenges(); break;
        case 'community': renderCommunity(); break;
    }
}

function renderDashboard() {
    const user = state.user;
    document.getElementById('dash-xp').innerText = user.xp;
    document.getElementById('dash-streak').innerText = user.streak;
    document.getElementById('dash-level').innerText = `Level ${user.level}`;

    // Render Heatmap
    renderHeatmap();

    // Render Skill Bars
    const skillContainer = document.getElementById('dash-skills');
    skillContainer.innerHTML = Object.entries(user.skills).map(([skill, val]) => `
        <div class="skill-item" style="margin-bottom: 12px;">
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                <span style="text-transform:capitalize;">${skill}</span>
                <span>${val}%</span>
            </div>
            <div style="height:6px; background:rgba(255,255,255,0.05); border-radius:10px; overflow:hidden;">
                <div style="width:${val}%; height:100%; background:var(--primary); transition: width 1s;"></div>
            </div>
        </div>
    `).join('');
}

async function renderCareer() {
    console.log("ðŸš€ Rendering AI-Driven Career Prep...");
    const container = document.getElementById('page-career');
    if (!container) return;

    // Switch to dashboard by default if no tab is active
    if (!state.activeCareerTab) {
        switchCareerTab('dashboard');
    } else {
        renderCareerTab(state.activeCareerTab);
    }
}

function switchCareerTab(tabId) {
    state.activeCareerTab = tabId;

    // Update UI active state
    document.querySelectorAll('.career-tab').forEach(btn => {
        btn.classList.toggle('active', btn.id === `tab-btn-${tabId}`);
    });

    renderCareerTab(tabId);
}

async function renderCareerTab(tabId) {
    const container = document.getElementById('career-tab-content');
    if (!container) return;

    // Show skeleton while loading
    container.innerHTML = `
        <div class="career-skeleton" style="padding:20px;">
            <div class="skeleton" style="height:200px; border-radius:24px; margin-bottom:24px;"></div>
            <div class="grid-cols-2" style="gap:24px;">
                <div class="skeleton" style="height:300px; border-radius:24px;"></div>
                <div class="skeleton" style="height:300px; border-radius:24px;"></div>
            </div>
        </div>
    `;

    switch (tabId) {
        case 'dashboard': await renderPlacementDashboard(); break;
        case 'aptitude': await renderAptitudeHub(); break;
        case 'fundamentals': await renderFundamentalsHub(); break;
        case 'companies': await renderCompanyTracks(); break;
        case 'mock': await renderInterviewHub(); break;
        case 'softskills': await renderSoftSkillsHub(); break;
        case 'documents': await renderDocumentsHub(); break;
        case 'score': await renderPlacementAnalytics(); break;
    }
}

function initPlacementData() {
    if (!localStorage.getItem('cc_aptitude')) {
        localStorage.setItem('cc_aptitude', JSON.stringify({
            quant: { scores: {}, history: [], avgScore: 0 },
            logical: { scores: {}, history: [], avgScore: 0 },
            verbal: { scores: {}, history: [], avgScore: 0 }
        }));
    }
    if (!localStorage.getItem('cc_database')) {
        localStorage.setItem('cc_database', JSON.stringify({
            sql: { topicScores: {}, queries_practiced: 0 },
            nosql: { topicScores: {}, queries_practiced: 0 },
            dbms: { topicScores: {}, flashcards_reviewed: 0 },
            os: { topicScores: {}, mcqs_done: 0 },
            cn: { topicScores: {}, mcqs_done: 0 },
            oop: { topicScores: {}, mcqs_done: 0 }
        }));
    }
    if (!localStorage.getItem('cc_placement')) {
        localStorage.setItem('cc_placement', JSON.stringify({
            interviews_completed: [],
            ot_tests_completed: [],
            gd_sessions: [],
            hr_practice: [],
            overall_score: 0,
            company_readiness: {}
        }));
    }
    if (!localStorage.getItem('cc_documents')) {
        localStorage.setItem('cc_documents', JSON.stringify({
            resume: { score: 0, versions: {} },
            cover_letters: {},
            linkedin_score: 0
        }));
    }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PERSONALIZATION FORMULAS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function calculateCareerMetrics() {
    const user = state.user || {};
    const skills = state.user.skills || {
        loops: 0, functions: 0, arrays: 0, oop: 0, recursion: 0, algorithms: 0
    };

    // DSA Score (30%)
    const dsa = ((skills.arrays || 0) + (skills.recursion || 0) + (skills.algorithms || 0)) / 3;
    // OOP Score (25%)
    const oop = ((skills.oop || 0) + (skills.functions || 0)) / 2;
    // Problem Solving (20%)
    const ps = ((skills.loops || 0) + Math.min(100, (state.history || []).length * 2)) / 2;
    // Consistency (15%)
    const consistency = Math.min((user.streak || 0) / 30, 1) * 100;
    // Volume (10%)
    const volume = Math.min((state.history || []).length / 50, 1) * 100;

    const readiness = (dsa * 0.30) + (oop * 0.25) + (ps * 0.20) + (consistency * 0.15) + (volume * 0.10);

    return {
        readiness: Math.round(readiness),
        dsa: Math.round(dsa),
        oop: Math.round(oop),
        ps: Math.round(ps),
        sectors: {
            'DSA & Algorithms': Math.round(dsa),
            'OOP & Design': Math.round(oop),
            'Problem Solving': Math.round(ps),
            'Consistency': Math.round(consistency),
            'Practice Volume': Math.round(volume)
        }
    };
}

async function getPersonalizedPlacementDashboard(force = false) {
    if (!checkAIConfig()) return null;

    const cacheKey = 'cc_placement_dashboard_' + (state.user.usn || 'default');
    const cached = localStorage.getItem(cacheKey);

    if (!force && cached) {
        const dashboard = JSON.parse(cached);
        if (Date.now() - dashboard.generatedAt < 24 * 60 * 60 * 1000) {
            return dashboard.data;
        }
    }

    const metrics = calculateCareerMetrics();
    try {
        const userProfile = { name: state.user.name, usn: state.user.usn, xp: state.user.xp, skills: state.user.skills, metrics: metrics };

        const systemPrompt = "You are a placement coach for Indian MCA/CS students. Generate a fully personalized placement dashboard JSON based on the user's profile. Analyze their skills, metrics, and college. Mention their name and specific stats in the summary. Respond ONLY with valid JSON.";
        const aiResponse = await callGemini(systemPrompt, `Generate placement dashboard for: ${JSON.stringify(userProfile)}`);
        // callGemini returns parsed JSON already if successful
        const dashboardData = aiResponse;

        if (!dashboardData) throw new Error("AI failed to generate dashboard");

        localStorage.setItem(cacheKey, JSON.stringify({
            data: dashboardData,
            generatedAt: Date.now()
        }));

        return dashboardData;
    } catch (e) {
        console.warn("Placement Dashboard AI fallback active:", e);
        return getPlacementDashboardFallback(metrics);
    }
}

function getPlacementDashboardFallback(m) {
    return {
        overall_readiness: {
            score: m.readiness,
            label: m.readiness > 70 ? 'Almost Ready' : 'Developing',
            color: m.readiness > 70 ? 'teal' : 'amber',
            summary: `${state.user.name}, you are at ${m.readiness}% readiness. Focus on SQL and Aptitude to unlock more companies.`,
            biggest_strength: 'Coding Logic',
            biggest_gap: 'SQL & Database',
            days_to_ready: 45,
            recommended_companies: ['TCS', 'Wipro', 'Capgemini']
        },
        readiness_breakdown: { coding: m.readiness, aptitude: 45, database: 30, core_cs: 40, communication: 65, resume: 70 },
        todays_focus: { topic: 'SQL Joins', reason: 'High frequency in technical rounds', task: 'Solve 5 Join challenges', estimated_minutes: 30, xp_reward: 50 },
        weekly_targets: [{ target: 'Aptitude Practice', deadline: 'Friday', current: 2, goal: 5, metric: 'Sets' }],
        placement_prediction: { likely_companies: ['TCS', 'Wipro'], stretch_companies: ['Capgemini', 'Accenture'], dream_companies: ['Amazon', 'Zoho'], salary_range: 'â‚¹3.5-5 LPA' },
        urgent_alerts: [{ type: 'warning', message: 'Improve your SQL score to unlock Accenture track!' }]
    };
}

async function renderPlacementDashboard() {
    const container = document.getElementById('career-tab-content');
    if (!container) return;

    const data = await getPersonalizedPlacementDashboard();
    const alerts = data.urgent_alerts || [];

    container.innerHTML = `
        <div class="glass-card" style="padding:28px; margin-bottom:24px;">
            <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:24px; align-items:center;">
                <div style="max-width:640px;">
                    <div style="font-size:11px; font-weight:800; color:var(--primary); text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;">Career Command Center</div>
                    <h2 style="font-size:30px; margin-bottom:14px;">Your placement readiness cockpit</h2>
                    <p style="color:var(--text-muted); font-size:14px; line-height:1.7;">${data.overall_readiness.summary}</p>
                </div>
                <button class="btn-gold" style="min-width:180px; justify-content:center;" onclick="getPersonalizedPlacementDashboard(true)">Refresh AI Plan</button>
            </div>
        </div>

        <div class="grid-cols-3" style="gap:24px;">
            <div class="glass-card" style="grid-column: span 2; padding:32px; display:flex; align-items:center; gap:36px;">
                <div style="position:relative; width:160px; height:160px; flex-shrink:0;">
                    <svg viewBox="0 0 36 36" style="width:100%; height:100%; transform: rotate(-90deg);">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="3" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--primary)" stroke-width="3" stroke-dasharray="${data.overall_readiness.score}, 100" class="readiness-ring" />
                    </svg>
                    <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                        <div style="font-size:40px; font-weight:800; color:var(--text);">${data.overall_readiness.score}</div>
                        <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px;">Overall Readiness</div>
                    </div>
                </div>
                <div>
                    <div style="font-size:11px; font-weight:800; color:var(--primary); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Placement Status</div>
                    <h2 style="font-size:28px; margin-bottom:14px;">${data.overall_readiness.label}</h2>
                    <p style="color:var(--text-muted); font-size:14px; line-height:1.7;">${data.overall_readiness.summary}</p>
                    <div style="display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:12px; margin-top:22px;">
                        <div style="background:var(--success);opacity:0.08; border-left:4px solid var(--success); padding:14px; border-radius:14px;">
                            <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; margin-bottom:6px;">Strength</div>
                            <div style="font-size:14px; font-weight:700; color:var(--success);">${data.overall_readiness.biggest_strength}</div>
                        </div>
                        <div style="background:var(--error);opacity:0.08; border-left:4px solid var(--error); padding:14px; border-radius:14px;">
                            <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; margin-bottom:6px;">Gap</div>
                            <div style="font-size:14px; font-weight:700; color:var(--error);">${data.overall_readiness.biggest_gap}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="glass-card" style="padding:28px;">
                <h3 style="font-size:16px; margin-bottom:16px;">Readiness Radar</h3>
                <canvas id="readinessRadar" style="max-height:240px; width:100%;"></canvas>
            </div>
        </div>

        <div class="grid-cols-3" style="gap:24px; margin-top:24px;">
            <div class="glass-card gold-focus-card" style="padding:28px;">
                <div style="font-size:11px; font-weight:800; color:var(--primary); text-transform:uppercase; margin-bottom:8px;">Priority Task</div>
                <h3 style="font-size:20px; margin-bottom:12px;">${data.todays_focus.topic}</h3>
                <p style="font-size:13px; color:var(--text-muted); line-height:1.7; margin-bottom:20px;">${data.todays_focus.reason}</p>
                <div style="background:rgba(255,255,255,0.03); padding:16px; border-radius:16px; margin-bottom:22px; font-size:13px;">
                    ðŸŽ¯ <strong>Action:</strong> ${data.todays_focus.task}
                </div>
                <button class="btn-gold" style="width:100%; justify-content:center;" onclick="navigateFromDashboard('${data.todays_focus.topic}')">Launch Focus Plan</button>
            </div>
            <div class="glass-card" style="padding:28px;">
                <h3 style="font-size:16px; margin-bottom:16px;">Company Pipeline</h3>
                <div style="display:flex; flex-direction:column; gap:14px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:12px; color:var(--text-muted);">Likely</span>
                        <span style="font-size:12px; color:#fff;">${data.placement_prediction.likely_companies.join(', ')}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:12px; color:var(--text-muted);">Stretch</span>
                        <span style="font-size:12px; color:#fff;">${data.placement_prediction.stretch_companies.join(', ')}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:12px; color:var(--text-muted);">Dream</span>
                        <span style="font-size:12px; color:#fff;">${data.placement_prediction.dream_companies.join(', ')}</span>
                    </div>
                </div>
                <div style="margin-top:24px; padding-top:18px; border-top:1px solid rgba(255,255,255,0.08); text-align:center;">
                    <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px;">Potential Offer</div>
                    <div style="font-size:18px; font-weight:800; color:var(--primary);">${data.placement_prediction.salary_range}</div>
                </div>
            </div>
            <div class="glass-card" style="padding:28px;">
                <h3 style="font-size:16px; margin-bottom:20px;">Weekly Progress</h3>
                ${data.weekly_targets.map(t => `
                    <div style="margin-bottom:18px;">
                        <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:10px;"><span>${t.target}</span><span>${t.current}/${t.goal}</span></div>
                        <div style="height:6px; background:rgba(255,255,255,0.05); border-radius:999px; overflow:hidden;">
                            <div style="width:${Math.min(100, (t.current / t.goal) * 100)}%; height:100%; background:var(--primary);"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="glass-card" style="margin-top:24px; padding:24px;">
            <h3 style="font-size:16px; margin-bottom:14px;">Urgent Alerts</h3>
            ${alerts.length ? alerts.map(alert => `
                <div style="padding:16px; margin-bottom:12px; border-radius:16px; background:${alert.type === 'warning' ? 'rgba(239,68,68,0.08)' : 'rgba(14,217,122,0.08)'}; border:1px solid ${alert.type === 'warning' ? 'rgba(239,68,68,0.25)' : 'rgba(14,217,122,0.25)'};">
                    <div style="font-size:12px; color:var(--text-muted); margin-bottom:6px; text-transform:uppercase; letter-spacing:1px;">${alert.type}</div>
                    <div style="font-size:14px; color:#fff;">${alert.message}</div>
                </div>
            `).join('') : '<p style="color:var(--text-muted);">No urgent alerts. You are on a stable growth path.</p>'}
        </div>
    `;

    setTimeout(() => initReadinessRadar(data.readiness_breakdown), 100);
}

function initReadinessRadar(v) {
    const ctx = document.getElementById('readinessRadar');
    if (!ctx) return;
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Coding', 'Aptitude', 'Database', 'Core CS', 'Communication', 'Resume'],
            datasets: [{
                label: 'Harismitha',
                data: [v.coding, v.aptitude, v.database, v.core_cs, v.communication, v.resume],
                backgroundColor: 'rgba(212, 175, 55, 0.2)',
                borderColor: '#d4af37',
                borderWidth: 2,
                pointRadius: 2
            }, {
                label: 'Ideal',
                data: [85, 80, 80, 75, 85, 90],
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                borderDash: [5, 5],
                pointRadius: 0
            }]
        },
        options: {
            scales: { r: { angleLines: { display: false }, grid: { color: 'rgba(255,255,255,0.05)' }, pointLabels: { color: '#888', font: { size: 10 } }, ticks: { display: false }, suggestedMin: 0, suggestedMax: 100 } },
            plugins: { legend: { display: false } }
        }
    });
}

function navigateFromDashboard(topic) {
    const t = topic.toLowerCase();
    if (t.includes('sql') || t.includes('dbms')) switchCareerTab('fundamentals');
    else if (t.includes('aptitude')) switchCareerTab('aptitude');
    else switchCareerTab('mock');
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// AI INTERVIEW SYSTEM
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

async function showCompanyPrepModal(company) {
    const modal = document.createElement('div');
    modal.id = 'company-prep-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); display: flex; align-items: center;
        justify-content: center; z-index: 1000; backdrop-filter: blur(10px);
    `;

    modal.innerHTML = `
        <div style="background: var(--bg); border-radius: 24px; padding: 32px;
             max-width: 600px; width: 90%; border: 1px solid rgba(255,255,255,0.1);
             box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            <div style="text-align: center; margin-bottom: 32px;">
                <h2 style="font-size: 28px; margin-bottom: 8px;">ðŸŽ¯ ${company} Preparation</h2>
                <p style="color: var(--text-muted); font-size: 14px;">
                    Choose your preparation focus for ${company}
                </p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px;">
                <button class="prep-option" data-type="aptitude" style="
                    background: linear-gradient(135deg, rgba(240,180,41,0.1), rgba(240,180,41,0.05));
                    border: 1px solid rgba(240,180,41,0.3); border-radius: 16px; padding: 20px;
                    cursor: pointer; transition: all 0.3s; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 12px;">ðŸ§®</div>
                    <h3 style="margin-bottom: 8px; color: var(--primary);">Aptitude Test</h3>
                    <p style="font-size: 12px; color: var(--text-muted);">
                        Quant, Logical, Verbal - Company specific patterns
                    </p>
                </button>

                <button class="prep-option" data-type="communication" style="
                    background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(99,102,241,0.05));
                    border: 1px solid rgba(99,102,241,0.3); border-radius: 16px; padding: 20px;
                    cursor: pointer; transition: all 0.3s; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 12px;">ðŸ’¬</div>
                    <h3 style="margin-bottom: 8px; color: var(--secondary);">Communication</h3>
                    <p style="font-size: 12px; color: var(--text-muted);">
                        Verbal ability, GD prep, Presentation skills
                    </p>
                </button>

                <button class="prep-option" data-type="coding" style="
                    background: linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.05));
                    border: 1px solid rgba(34,197,94,0.3); border-radius: 16px; padding: 20px;
                    cursor: pointer; transition: all 0.3s; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 12px;">ðŸ’»</div>
                    <h3 style="margin-bottom: 8px; color: #22c55e;">Coding Round</h3>
                    <p style="font-size: 12px; color: var(--text-muted);">
                        DSA problems, ${company} coding patterns
                    </p>
                </button>

                <button class="prep-option" data-type="behavioral" style="
                    background: linear-gradient(135deg, rgba(168,85,247,0.1), rgba(168,85,247,0.05));
                    border: 1px solid rgba(168,85,247,0.3); border-radius: 16px; padding: 20px;
                    cursor: pointer; transition: all 0.3s; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 12px;">ðŸ§ </div>
                    <h3 style="margin-bottom: 8px; color: #a855f7;">Behavioral</h3>
                    <p style="font-size: 12px; color: var(--text-muted);">
                        HR questions, Situational judgment
                    </p>
                </button>

                <button class="prep-option" data-type="technical" style="
                    background: linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.05));
                    border: 1px solid rgba(239,68,68,0.3); border-radius: 16px; padding: 20px;
                    cursor: pointer; transition: all 0.3s; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 12px;">ðŸ”§</div>
                    <h3 style="margin-bottom: 8px; color: #ef4444;">Technical</h3>
                    <p style="font-size: 12px; color: var(--text-muted);">
                        Domain knowledge, System design
                    </p>
                </button>

                <button class="prep-option" data-type="mock" style="
                    background: linear-gradient(135deg, rgba(236,72,153,0.1), rgba(236,72,153,0.05));
                    border: 1px solid rgba(236,72,153,0.3); border-radius: 16px; padding: 20px;
                    cursor: pointer; transition: all 0.3s; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 12px;">ðŸŽ­</div>
                    <h3 style="margin-bottom: 8px; color: #ec4899;">Full Mock Test</h3>
                    <p style="font-size: 12px; color: var(--text-muted);">
                        Complete ${company} placement simulation
                    </p>
                </button>
            </div>

            <div style="text-align: center;">
                <button onclick="document.getElementById('company-prep-modal').remove()"
                    style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
                    color: var(--text-muted); padding: 12px 24px; border-radius: 12px;
                    cursor: pointer; font-size: 14px;">
                    Cancel
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Add hover effects
    modal.querySelectorAll('.prep-option').forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'translateY(-4px)';
            btn.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translateY(0)';
            btn.style.boxShadow = 'none';
        });
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            modal.remove();
            launchCompanyPrep(company, type);
        });
    });
}

async function launchCompanyPrep(company, type) {
    console.log(`ðŸš€ Launching ${type} prep for ${company}`);

    switch (type) {
        case 'aptitude':
            // Launch company-specific aptitude test
            launchCompanyAptitude(company);
            break;
        case 'communication':
            // Launch communication/GD prep
            launchCommunicationPrep(company);
            break;
        case 'coding':
            // Launch coding round prep
            launchCodingPrep(company);
            break;
        case 'behavioral':
            // Launch behavioral interview
            launchBehavioralPrep(company);
            break;
        case 'technical':
            // Launch technical interview (original functionality)
            launchTechnicalInterview(company);
            break;
        case 'mock':
            // Launch full mock test
            launchFullMockTest(company);
            break;
        default:
            console.error(`Unknown prep type: ${type}`);
    }
}

function launchCommunicationPrep(company) {
    const container = document.getElementById('career-tab-content');
    container.innerHTML = `
        <div style="text-align:center; padding:60px;">
            <div class="spinner"></div>
            <p style="margin-top:24px; color:var(--text-muted); font-size:14px;">Loading ${company} communication prep...</p>
        </div>
    `;

    setTimeout(() => {
        try {
            const vocab = getCompanyCommunication(company, 5);
            const gd = getGDTopic();
            renderCommunicationPrep(vocab, gd, company);
        } catch (e) {
            console.error(e);
            container.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-muted);">Failed to load communication prep.</div>`;
        }
    }, 300);
}

function renderCommunicationPrep(vocab, gd, company) {
    const container = document.getElementById('career-tab-content');
    container.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 32px;">
                <h2 style="font-size: 28px;">ðŸ—£ï¸ ${company} Communication Prep</h2>
                <p style="color: var(--text-muted);">Master Verbal Ability & Group Discussions required by ${company}</p>
            </div>

            <div class="glass-card" style="padding: 32px; margin-bottom: 24px;">
                <h3 style="font-size: 20px; margin-bottom: 16px;">ðŸ“š Essential Vocabulary</h3>
                ${vocab.map(v => `
                    <div style="padding: 16px; background: rgba(255,255,255,0.02); border-radius: 12px; margin-bottom: 12px; display:flex; justify-content:space-between;">
                        <div>
                            <div style="font-weight: 700; color:var(--primary); font-size:16px;">${v.word} <span style="font-size:12px; font-weight:400; color:var(--text-muted); italic; margin-left:8px;">${v.type}</span></div>
                            <div style="font-size:13px; margin-top:8px;">${v.meaning}</div>
                        </div>
                        <div style="text-align:right; font-size:12px; color:var(--text-muted);">
                            <div>Synonym: <span style="color:#0ed97a;">${v.synonym}</span></div>
                            <div>Antonym: <span style="color:#f25c54;">${v.antonym}</span></div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="glass-card" style="padding: 32px;">
                <h3 style="font-size: 20px; margin-bottom: 16px;">ðŸŽ­ Group Discussion Highlight</h3>
                <div style="padding: 16px; background: rgba(74,143,247,0.1); border-left: 3px solid #4a8ff7; border-radius:8px;">
                    <strong style="color:var(--text); font-size:15px;">Topic:</strong> ${gd.topic}
                    <div style="margin-top:12px; font-size:13px;">
                        <strong style="color:#0ed97a;">Point For:</strong> ${gd.key_points_for[0]}
                    </div>
                    <div style="margin-top:8px; font-size:13px;">
                        <strong style="color:#f25c54;">Point Against:</strong> ${gd.key_points_against[0]}
                    </div>
                    <div style="margin-top:16px; font-size:12px; color:var(--gold);">
                        <strong>Conclusion Tip:</strong> ${gd.conclusion}
                    </div>
                </div>
            </div>

            <div style="text-align: center; margin-top: 32px;">
                <button class="btn-gold" onclick="renderCompanyTracks()">Back to Companies</button>
            </div>
        </div>
    `;
}

function launchCompanyAptitude(company) {
    const container = document.getElementById('career-tab-content');
    container.innerHTML = `
        <div style="text-align:center; padding:60px;">
            <div class="spinner"></div>
            <p style="margin-top:24px; color:var(--text-muted); font-size:14px;">Loading ${company} aptitude questions...</p>
        </div>
    `;

    setTimeout(() => {
        try {
            const questions = getCompanyAptitude(company, 10);
            if (!questions || questions.length === 0) {
                container.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-muted);">No questions found for ${company}.</div>`;
                return;
            }
            showToast(`âœ… ${questions.length} ${company} aptitude questions loaded!`);
            renderCompanyAptitudeQuiz(questions, company);
        } catch (e) {
            console.error(e);
            renderFallbackAptitude();
        }
    }, 300);
}

function renderCompanyAptitudeQuiz(questions, company) {
    let currentQuestion = 0;
    let score = 0;
    let answers = [];
    let startTime = Date.now();

    const container = document.getElementById('career-tab-content');

    function renderQuestion() {
        const q = questions[currentQuestion];
        container.innerHTML = `
            <div style="max-width: 800px; margin: 0 auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h2 style="font-size: 24px;">${company} Aptitude Test</h2>
                    <div style="font-size: 14px; color: var(--text-muted);">
                        Question ${currentQuestion + 1} of ${questions.length}
                    </div>
                </div>

                <div class="glass-card" style="padding: 32px; margin-bottom: 24px;">
                    <div style="font-size: 18px; margin-bottom: 24px; font-weight: 500;">
                        ${q.question}
                    </div>

                    <div style="display: grid; gap: 12px;">
                        ${q.options.map((option, index) => `
                            <button class="option-btn" data-index="${index}" style="
                                width: 100%; text-align: left; padding: 16px; border-radius: 12px;
                                border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.02);
                                cursor: pointer; transition: all 0.2s; font-size: 16px;">
                                ${String.fromCharCode(65 + index)}. ${option}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between;">
                    <button id="prev-btn" class="btn-gold" style="opacity: ${currentQuestion > 0 ? 1 : 0.5}; pointer-events: ${currentQuestion > 0 ? 'auto' : 'none'};"
                        onclick="changeQuestion(-1)">Previous</button>
                    <button id="next-btn" class="btn-gold" onclick="changeQuestion(1)">Next</button>
                </div>
            </div>
        `;

        // Add click handlers for options
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const selectedIndex = parseInt(e.target.dataset.index);
                answers[currentQuestion] = selectedIndex;

                // Highlight selected option
                document.querySelectorAll('.option-btn').forEach(b => {
                    b.style.background = 'rgba(255,255,255,0.02)';
                    b.style.borderColor = 'rgba(255,255,255,0.1)';
                });
                e.target.style.background = 'rgba(240,180,41,0.1)';
                e.target.style.borderColor = 'var(--primary)';
            });
        });

        // Restore previous answer if exists
        if (answers[currentQuestion] !== undefined) {
            const selectedBtn = document.querySelector(`.option-btn[data-index="${answers[currentQuestion]}"]`);
            if (selectedBtn) {
                selectedBtn.style.background = 'rgba(240,180,41,0.1)';
                selectedBtn.style.borderColor = 'var(--primary)';
            }
        }
    }

    function changeQuestion(direction) {
        currentQuestion += direction;
        if (currentQuestion >= questions.length) {
            showResults();
        } else {
            renderQuestion();
        }
    }

    window.changeQuestion = changeQuestion;
    renderQuestion();

    function showResults() {
        // Calculate score
        questions.forEach((q, index) => {
            if (answers[index] === q.correctAnswer) score++;
        });

        const timeTaken = Math.round((Date.now() - startTime) / 1000);
        const percentage = Math.round((score / questions.length) * 100);

        container.innerHTML = `
            <div style="max-width: 600px; margin: 0 auto; text-align: center;">
                <div class="glass-card" style="padding: 40px; margin-bottom: 24px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">
                        ${percentage >= 70 ? 'ðŸŽ‰' : percentage >= 50 ? 'ðŸ‘' : 'ðŸ’ª'}
                    </div>
                    <h2 style="font-size: 32px; margin-bottom: 8px;">${company} Aptitude Results</h2>
                    <div style="font-size: 24px; color: var(--primary); margin-bottom: 16px;">
                        ${score}/${questions.length} (${percentage}%)
                    </div>
                    <div style="font-size: 14px; color: var(--text-muted);">
                        Time taken: ${Math.floor(timeTaken / 60)}:${(timeTaken % 60).toString().padStart(2, '0')}
                    </div>
                </div>

                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button class="btn-gold" onclick="renderCompanyTracks()">Back to Companies</button>
                    <button class="btn-gold" onclick="launchCompanyAptitude('${company}')">Retake Test</button>
                </div>
            </div>
        `;
    }
}

        <div style="max-width: 600px; margin: 0 auto; text-align: center;">
            <div class="glass-card" style="padding: 40px;">
                <h2 style="font-size: 28px; margin-bottom: 16px;">ðŸŽ­ ${company} Full Mock Test</h2>
                <p style="color: var(--text-muted); margin-bottom: 32px;">
                    Complete placement simulation including aptitude, coding, and interview rounds
                </p>

                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <button class="btn-gold" onclick="launchCompanyAptitude('${company}')">
                        ðŸ§® Start with Aptitude Test
                    </button>
                    <button class="btn-gold" onclick="launchCodingPrep('${company}')">
                        ðŸ’» Coding Round
                    </button>
                    <button class="btn-gold" onclick="launchMockInterview('technical')">
                        ðŸ”§ Technical Interview
                    </button>
                    <button class="btn-gold" onclick="launchMockInterview('behavioral')">
                        ðŸ§  HR Interview
                    </button>
                </div>

                <button class="btn-gold" style="margin-top: 24px; opacity: 0.7;" onclick="renderCompanyTracks()">
                    Back to Companies
                </button>
            </div>
        </div>
    `;
}

async function startInterview(company) {
    console.log(`ðŸŽ¤ Starting Interview for ${company}`);

    // Show preparation type selection modal first
    showCompanyPrepModal(company);
}

function renderInterviewQuestion() {
    const q = interviewState.questions[interviewState.currentIndex];
    document.getElementById('int-q-num').innerText = `QUESTION ${interviewState.currentIndex + 1} OF ${interviewState.questions.length}`;
    document.getElementById('int-q-text').innerText = q;
    document.getElementById('int-ans-input').value = '';
    document.getElementById('int-waiting-msg').style.display = 'flex';
    document.getElementById('int-result-area').style.display = 'none';
}

async function submitInterviewAnswer() {
    const ans = document.getElementById('int-ans-input').value.trim();
    if (!ans) return showToast("Please type an answer first");

    document.getElementById('int-waiting-msg').innerHTML = `<div class="spinner" style="border: 2px solid rgba(255, 255, 255, 0.1); border-left-color: var(--primary); width: 30px; height: 30px; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px;"></div> Evaluating your response...`;
    document.getElementById('int-waiting-msg').style.display = 'flex';
    document.getElementById('int-result-area').style.display = 'none';

    setTimeout(() => {
        try {
            // Local algorithmic feedback
            const words = ans.split(' ').length;
            let score = 5;
            let feedback = "Good start, but your answer lacks depth.";

            if (words > 50) {
                score = 8;
                feedback = "Great detail! You structured your answer well.";
            } else if (words > 20) {
                score = 7;
                feedback = "Good effort! You covered the basics, but could be more specific.";
            }

            const evalData = {
                score: score,
                feedback: feedback,
                better_version: "To improve, make sure to explicitly outline your actions and focus on quantifiable outcomes instead of generalized descriptions."
            };

            displayInterviewFeedback(evalData);
            interviewState.answers.push({ q: interviewState.questions[interviewState.currentIndex], a: ans, eval: evalData });

        } catch (e) {
            displayInterviewFeedback({ score: 7, feedback: "Good effort!", better_version: "A better answer would include details." });
        }
    }, 800);
}

function displayInterviewFeedback(data) {
    const area = document.getElementById('int-result-area');
    document.getElementById('int-waiting-msg').style.display = 'none';
    area.style.display = 'block';
    area.innerHTML = `
        <div style="text-align:center; margin-bottom:24px;">
            <div style="font-size:48px; font-weight:800; color:${data.score > 7 ? 'var(--success)' : 'var(--primary)'};">${data.score}/10</div>
            <div style="font-size:12px; color:var(--text-muted);">Evaluation Score</div>
        </div>
        <div style="margin-bottom:20px;">
            <div style="font-size:11px; font-weight:800; color:var(--primary); margin-bottom:8px;">FEEDBACK</div>
            <p style="font-size:13px; line-height:1.6; color:#ccc;">${data.feedback}</p>
        </div>
        <div style="margin-bottom:24px; padding:16px; background:rgba(14,217,122,0.05); border-left:3px solid var(--success); border-radius:8px;">
            <div style="font-size:11px; font-weight:800; color:var(--success); margin-bottom:8px;">AI RECOMMENDED ANSWER</div>
            <p style="font-size:12px; font-style:italic; color:#aaa;">${data.better_version}</p>
        </div>
        <button class="btn-gold" style="width:100%; justify-content:center;" onclick="nextInterviewStep()">
            ${interviewState.currentIndex === interviewState.questions.length - 1 ? 'Finish Interview' : 'Next Question â†’'}
        </button>
    `;
}

function nextInterviewStep() {
    if (interviewState.currentIndex < interviewState.questions.length - 1) {
        interviewState.currentIndex++;
        renderInterviewQuestion();
    } else {
        finishInterview();
    }
}

function closeInterview() {
    if (confirm("Are you sure you want to end this session? Progress will not be saved.")) {
        clearInterval(interviewState.timerInterval);
        document.getElementById('interview-modal').style.display = 'none';
        interviewState.active = false;

        // Stop the webcam stream
        if (webcamStream) {
            webcamStream.getTracks().forEach(track => track.stop());
            webcamStream = null;
        }
    }
}

async function finishInterview() {
    clearInterval(interviewState.timerInterval);
    document.getElementById('int-eval-area').innerHTML = `
        <div style="text-align:center; padding:40px;">
            <div style="font-size:60px; margin-bottom:20px;">ðŸ†</div>
            <h2>Interview Complete!</h2>
            <p style="color:var(--text-muted); margin:12px 0 24px;">Generating your final performance report...</p>
            <div class="skeleton" style="height:100px; border-radius:12px;"></div>
        </div>
    `;

    // Final Report AI Call...
    setTimeout(() => {
        showToast("Session complete! XP awarded for practice.");
        updateXP(100);
        document.getElementById('interview-modal').style.display = 'none';
    }, 2000);
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// RESUME ANALYSIS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

async function analyzeResume() {
    const modal = document.getElementById('resume-modal');
    modal.style.display = 'flex';
    const content = document.getElementById('resume-analysis-content');
    content.innerHTML = `
        <div style="padding:40px; text-align:center;">
            <div class="skeleton" style="width:80px; height:80px; margin:0 auto 20px;"></div>
            <h3>Scanning Resume structure...</h3>
        </div>
    `;

    try {
        const payload = {
            student: state.user,
            skills: state.user.skills,
            target: 'Tier 1 Product Companies'
        };

        const systemPrompt = "Analyze the student resume data and platform skills. Provide ATS score, keyword gaps, and formatting tips. Respond with a well-formatted HTML report.";
        const aiResponse = await callGemini(systemPrompt, `Data: ${JSON.stringify(payload)}`, 2000, false);

        if (aiResponse) {
            content.innerHTML = aiResponse;
        } else {
            throw new Error("Empty response from AI");
        }
    } catch (e) {
        content.innerHTML = `
            <div style="padding:40px; text-align:center;">
                <div style="font-size:40px; margin-bottom:20px;">âš ï¸</div>
                <h3 style="color:var(--error);">Analysis Failed</h3>
                <p style="font-size:14px; color:var(--text-muted); margin:12px 0 24px;">${e.message || "Could not connect to Gemini AI. Please check your API key."}</p>
                <button class="btn-gold" onclick="analyzeResume()">Retry</button>
            </div>
        `;
    }
}

function renderProfile() {
    const user = state.user;
    if (document.getElementById('profile-name')) document.getElementById('profile-name').value = user.name || '';
    if (document.getElementById('profile-phone')) document.getElementById('profile-phone').value = user.phone || '';
    if (document.getElementById('profile-college')) document.getElementById('profile-college').value = user.college || 'Dayananda Sagar College';
    if (document.getElementById('profile-branch')) document.getElementById('profile-branch').value = user.branch || 'MCA';
    if (document.getElementById('profile-cgpa')) document.getElementById('profile-cgpa').value = user.cgpa || '';
    if (document.getElementById('profile-year')) document.getElementById('profile-year').value = user.year || '2026';
    if (document.getElementById('profile-skills-input')) document.getElementById('profile-skills-input').value = user.skillsList || 'Python, Java, DSA';
    if (document.getElementById('profile-gemini-key')) document.getElementById('profile-gemini-key').value = localStorage.getItem('cc_gemini_key') || '';
    if (document.getElementById('preview-name')) document.getElementById('preview-name').innerText = user.name || 'Harismitha';
    if (document.getElementById('preview-tagline')) document.getElementById('preview-tagline').innerText = `${user.branch || 'MCA'} â€¢ ${user.college || 'Dayananda Sagar College'}`;

    // Render skill tags
    const tagsEl = document.getElementById('preview-skills-tags');
    if (tagsEl && user.skillsList) {
        tagsEl.innerHTML = user.skillsList.split(',').map(s => `<span style="background:rgba(212,175,55,0.1); color:var(--primary); padding:4px 10px; border-radius:30px; font-size:11px;">${s.trim()}</span>`).join('');
    }

    // Render badges grid (base badges)
    const badgesContainer = document.getElementById('profile-badges');
    if (badgesContainer) {
        const badges = [
            { icon: 'ðŸ”¥', label: '12 Day Streak', color: '#fb923c' },
            { icon: 'âš¡', label: 'First Submit', color: '#f0b429' },
            { icon: 'ðŸŽ¯', label: '5 Challenges', color: '#0ed97a' },
            { icon: 'ðŸ‘¥', label: 'Community', color: '#60a5fa' },
            { icon: 'ðŸ“š', label: 'Roadmap Start', color: '#a78bfa' },
            { icon: 'ðŸ’»', label: 'Code Master', color: '#f472b6' }
        ];
        badgesContainer.innerHTML = badges.map(b => `
            <div style="padding:16px; text-align:center; background:rgba(255,255,255,0.03); border-radius:16px; border:1px solid rgba(255,255,255,0.06);">
                <div style="font-size:28px; margin-bottom:8px;">${b.icon}</div>
                <div style="font-size:10px; color:${b.color}; font-weight:700;">${b.label}</div>
            </div>`).join('');
        // Now inject certificates on top
        renderCertificates();
    }
}

function saveProfile() {
    const user = state.user;
    user.name = document.getElementById('profile-name').value;
    user.phone = document.getElementById('profile-phone').value;
    user.college = document.getElementById('profile-college').value;
    user.branch = document.getElementById('profile-branch').value;
    user.cgpa = document.getElementById('profile-cgpa').value;
    user.year = document.getElementById('profile-year').value;
    user.skillsList = document.getElementById('profile-skills-input').value;

    // Sync back to general skills if needed (for dashboard bars)
    // Optional: parse skillsList to update state.user.skills

    saveToStorage();
    if (document.getElementById('profile-apikey')) {
        const key = document.getElementById('profile-apikey').value;
        localStorage.setItem('cc_gemini_key', key);
        window.__GEMINI_API_KEY__ = key;
    }
    renderProfile();
    updateCommunityBanner();
    showToast("âœ… Profile updated successfully!");
}

function renderHeatmap() {
    const heatmap = document.getElementById('heatmap');
    if (!heatmap) return;

    // Generate 70 days of activity (10 weeks)
    const nodes = [];
    for (let i = 0; i < 70; i++) {
        const level = Math.floor(Math.random() * 4); // 0 to 3
        const opacity = [0.05, 0.2, 0.5, 1][level];
        const color = level === 0 ? 'rgba(212,175,55,0.05)' : `rgba(212,175,55,${opacity})`;
        nodes.push(`<div style="width:100%; aspect-ratio:1; background:${color}; border-radius:2px;" title="Activity level: ${level}"></div>`);
    }
    heatmap.innerHTML = nodes.join('');
}

function handleResumeUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const status = document.getElementById('resume-status');
        status.innerText = `âœ“ ${file.name} uploaded successfully`;
        status.style.display = 'block';
        showToast(`ðŸ“„ Resume "${file.name}" ready!`);

        // In a real app, you'd upload this to a server
        state.user.resumeName = file.name;
        saveToStorage();
    }
}

function saveToStorage() {
    const email = localStorage.getItem('cc_session');
    if (email) {
        localStorage.setItem('cc_profile_' + email, JSON.stringify(state.user));
    }
}

function renderRoadmap() {
    const roadmap = state.roadmap;
    const container = document.getElementById('roadmap-container');
    container.innerHTML = roadmap.map(l => `
        <div class="glass-card" style="padding: 24px; margin-bottom:16px; display:flex; gap:20px; align-items:center; position:relative; overflow:hidden;">
            ${l.status === 'locked' ? '<div style="position:absolute; inset:0; background:rgba(0,0,0,0.5); z-index:1;"></div>' : ''}
            <div style="font-size:40px; background:var(--surface-light); width:80px; height:80px; border-radius:20px; display:flex; align-items:center; justify-content:center; position:relative; z-index:2;">
                ${l.icon}
                ${l.status === 'completed' ? '<div style="position:absolute; bottom:-5px; right:-5px; background:var(--success); width:24px; height:24px; border-radius:50%; font-size:12px; display:flex; align-items:center; justify-content:center;">âœ“</div>' : ''}
            </div>
            <div style="flex:1; position:relative; z-index:2;">
                <div style="font-size:11px; color:var(--primary); font-weight:800; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Level 0${l.level}</div>
                <div style="font-size:20px; font-weight:700; margin-bottom:8px;">${l.name}</div>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    ${l.topics.map(t => `<span style="background:rgba(255,255,255,0.05); padding:4px 10px; border-radius:30px; font-size:11px;">${t}</span>`).join('')}
                </div>
            </div>
            <div style="position:relative; z-index:2;">
                ${l.status === 'current' ? '<button class="btn-gold">Resume</button>' : l.status === 'locked' ? 'ðŸ”’' : ''}
            </div>
        </div>
    `).join('');
}

function renderChallenges(filter = 'All') {
    const challenges = state.challenges;
    const container = document.getElementById('challenges-grid');
    const diffColors = { Beginner: '#0ed97a', Intermediate: '#f0b429', Hard: '#ff6b6b' };

    const filtered = filter === 'All' ? challenges : challenges.filter(c => c.diff === filter);

    container.innerHTML = filtered.map(c => `
        <div class="glass-card" style="padding: 24px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:16px;">
                <span style="background:${diffColors[c.diff] || 'rgba(212,175,55,0.1)'}18; color:${diffColors[c.diff] || 'var(--primary)'}; padding:4px 12px; border-radius:30px; font-size:11px; font-weight:700;">${c.diff}</span>
                <span style="color:var(--text-muted); font-size:11px;">${c.lang}</span>
            </div>
            <div style="font-size:18px; font-weight:700; margin-bottom:8px;">${c.title}</div>
            <p style="font-size:13px; color:var(--text-muted); margin-bottom:20px; line-height:1.5;">${c.desc}</p>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:700; color:var(--primary);">âš¡ ${c.xp} XP</span>
                <button class="btn-gold" style="padding:8px 16px; font-size:12px;" onclick="showChallenge(${JSON.stringify(c).replace(/"/g, '&quot;')})">Solve â†’</button>
            </div>
        </div>
    `).join('') || '<div style="grid-column: span 3; color: var(--text-muted); text-align: center; padding: 40px;">No challenges found for this difficulty.</div>';

    // Update active state of buttons (only filter buttons at the top)
    const isLight = document.body.classList.contains('light-theme');
    const filterButtons = document.querySelectorAll('#page-challenges > div:first-child .btn-gold');
    filterButtons.forEach(btn => {
        const btnFilter = btn.textContent === 'Beginner' ? 'Easy' :
            btn.textContent === 'Intermediate' ? 'Medium' :
                btn.textContent;

        if (btnFilter === filter) {
            btn.style.background = 'var(--primary)';
            btn.style.color = '#000';
            btn.style.borderColor = 'var(--primary)';
        } else {
            btn.style.background = isLight ? 'rgba(0,0,0,0.05)' : 'var(--surface-light)';
            btn.style.color = isLight ? '#000' : '#fff';
            btn.style.borderColor = 'var(--border)';
        }
    });
}

function showChallenge(challenge) {
    // Set challenge context, clear company context
    state.activeChallenge = challenge;
    state.activeCompany = null;

    showPage('submit');

    // Show challenge context banner, hide company banner
    const chalBar = document.getElementById('challenge-context-bar');
    const compBar = document.getElementById('company-context-bar');
    if (chalBar) chalBar.style.display = 'block';
    if (compBar) compBar.style.display = 'none';

    // Populate banner fields
    const diffColors = { Beginner: '#0ed97a', Intermediate: '#f0b429', Hard: '#ff6b6b' };
    if (document.getElementById('ctx-title')) document.getElementById('ctx-title').textContent = challenge.title;
    if (document.getElementById('ctx-desc')) document.getElementById('ctx-desc').textContent = challenge.desc;
    if (document.getElementById('ctx-xp')) document.getElementById('ctx-xp').textContent = '+' + challenge.xp + ' XP';
    if (document.getElementById('ctx-diff-badge')) {
        const el = document.getElementById('ctx-diff-badge');
        el.textContent = challenge.diff;
        el.style.color = diffColors[challenge.diff] || 'var(--primary)';
        el.style.background = (diffColors[challenge.diff] || '#f0b429') + '18';
    }
    if (document.getElementById('ctx-lang-badge')) document.getElementById('ctx-lang-badge').textContent = challenge.lang;
    document.getElementById('submit-lab-title').textContent = 'ðŸŽ¯ ' + challenge.title;

    // Set language picker to match challenge
    const langPicker = document.getElementById('lang-picker');
    if (langPicker && challenge.lang) {
        const opts = Array.from(langPicker.options);
        const match = opts.find(o => o.text === challenge.lang);
        if (match) langPicker.value = match.value;
    }

    // Seed starter code if challenge has it
    const ta = document.querySelector('#page-submit textarea');
    if (ta) ta.value = challenge.starterCode || `# ${challenge.title}\n# Language: ${challenge.lang}\n\n# Write your solution below:\n`;

    // Reset feedback and discussion for this challenge
    document.getElementById('feedback-box').style.display = 'none';
    const discSection = document.getElementById('discussion-section');
    if (discSection) discSection.style.display = 'none';

    showToast(`ðŸŽ¯ Loaded: ${challenge.title}`);
}

function updateEditorLanguage() {
    const lang = document.getElementById('lang-picker').value;
    const ta = document.querySelector('#page-submit textarea');
    if (!ta) return;

    const title = state.activeChallenge ? state.activeChallenge.title : 'Quick Lab';

    // Replace existing language comment or add new one
    let val = ta.value;
    if (val.includes('# Language:')) {
        val = val.replace(/# Language: .*/, `# Language: ${lang}`);
        ta.value = val;
    } else {
        ta.value = `# ${title}\n# Language: ${lang}\n\n` + ta.value;
    }

    showToast(`ðŸŒ Switched to ${lang}`);
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// COMMUNITY PAGE â€” DSC College-Based Competition
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const DSC_USER = {
    name: 'Harismitha', usn: '1DS24MC034', college: 'Dayananda Sagar College',
    branch: 'MCA', streak: 12, submissions: 34,
    skills: { Loops: 85, Functions: 72, Arrays: 60, OOP: 48, Recursion: 32, Algorithms: 18 }
};

let currentXP = parseInt(localStorage.getItem('cc_xp_total') || '620');
const TARGET_XP = 680;
const TARGET_NAME = 'Preethi A';
const TARGET_SKILLS = { Loops: 68, Functions: 62, Arrays: 75, OOP: 55, Recursion: 50, Algorithms: 30 };

const DSC_LB = {
    alltime: [
        { rank: 1, name: 'Arjun S', usn: '1DS24MC001', branch: 'MCA', xp: 1840, score: 91, level: 'Journeyman', trend: 'â†‘' },
        { rank: 2, name: 'Priya R', usn: '1DS24MC007', branch: 'MCA', xp: 1620, score: 87, level: 'Journeyman', trend: 'â†‘' },
        { rank: 3, name: 'Rohan M', usn: '1DS24MC012', branch: 'MCA', xp: 1340, score: 83, level: 'Apprentice', trend: 'â†’' },
        { rank: 4, name: 'Sneha K', usn: '1DS24MC018', branch: 'MCA', xp: 1180, score: 80, level: 'Apprentice', trend: 'â†‘' },
        { rank: 5, name: 'Kiran B', usn: '1DS24MC022', branch: 'MCA', xp: 1050, score: 77, level: 'Apprentice', trend: 'â†“' },
        { rank: 6, name: 'Divya N', usn: '1DS24MC028', branch: 'MCA', xp: 980, score: 74, level: 'Apprentice', trend: 'â†’' },
        { rank: 7, name: 'Amit P', usn: '1DS24MC031', branch: 'MCA', xp: 890, score: 71, level: 'Apprentice', trend: 'â†‘' },
        { rank: 8, name: 'Meena J', usn: '1DS24MC035', branch: 'MCA', xp: 820, score: 69, level: 'Apprentice', trend: 'â†‘' },
        { rank: 9, name: 'Arun V', usn: '1DS24MC038', branch: 'MCA', xp: 760, score: 68, level: 'Apprentice', trend: 'â†“' },
        { rank: 10, name: 'Lakshmi C', usn: '1DS24MC041', branch: 'MCA', xp: 710, score: 67, level: 'Apprentice', trend: 'â†‘' },
        { rank: 11, name: 'Preethi A', usn: '1DS24MC042', branch: 'MCA', xp: 680, score: 65, level: 'Apprentice', trend: 'â†’' },
        { rank: 12, name: 'Harismitha', usn: '1DS24MC034', branch: 'MCA', xp: 620, score: 72, level: 'Apprentice', trend: 'â†‘', isYou: true },
        { rank: 13, name: 'Suresh T', usn: '1DS24MC045', branch: 'MCA', xp: 580, score: 63, level: 'Explorer', trend: 'â†“' },
        { rank: 14, name: 'Asha D', usn: '1DS24MC047', branch: 'MCA', xp: 540, score: 60, level: 'Explorer', trend: 'â†’' },
        { rank: 15, name: 'Rahul G', usn: '1DS24MC048', branch: 'MCA', xp: 490, score: 58, level: 'Explorer', trend: 'â†‘' }
    ],
    week: [
        { rank: 1, name: 'Arjun S', usn: '1DS24MC001', branch: 'MCA', xp: 320, score: 91, level: 'Journeyman', trend: 'â†‘', label: '+320 XP' },
        { rank: 2, name: 'Sneha K', usn: '1DS24MC018', branch: 'MCA', xp: 280, score: 80, level: 'Apprentice', trend: 'â†‘', label: '+280 XP' },
        { rank: 3, name: 'Harismitha', usn: '1DS24MC034', branch: 'MCA', xp: 210, score: 72, level: 'Apprentice', trend: 'â†‘', label: '+210 XP', isYou: true },
        { rank: 4, name: 'Kiran B', usn: '1DS24MC022', branch: 'MCA', xp: 190, score: 77, level: 'Apprentice', trend: 'â†‘', label: '+190 XP' },
        { rank: 5, name: 'Divya N', usn: '1DS24MC028', branch: 'MCA', xp: 160, score: 74, level: 'Apprentice', trend: 'â†’', label: '+160 XP' }
    ],
    month: [
        { rank: 1, name: 'Arjun S', usn: '1DS24MC001', branch: 'MCA', xp: 780, score: 91, level: 'Journeyman', trend: 'â†‘', label: '+780 XP' },
        { rank: 2, name: 'Priya R', usn: '1DS24MC007', branch: 'MCA', xp: 640, score: 87, level: 'Journeyman', trend: 'â†‘', label: '+640 XP' },
        { rank: 3, name: 'Harismitha', usn: '1DS24MC034', branch: 'MCA', xp: 410, score: 72, level: 'Apprentice', trend: 'â†‘', label: '+410 XP', isYou: true },
        { rank: 4, name: 'Sneha K', usn: '1DS24MC018', branch: 'MCA', xp: 360, score: 80, level: 'Apprentice', trend: 'â†‘', label: '+360 XP' },
        { rank: 5, name: 'Rohan M', usn: '1DS24MC012', branch: 'MCA', xp: 290, score: 83, level: 'Apprentice', trend: 'â†’', label: '+290 XP' }
    ],
    branch: [] // filled from alltime (MCA)
};
DSC_LB.branch = DSC_LB.alltime.map((s, i) => ({ ...s, rank: i + 1 }));

const DSC_REVIEW_ITEMS = [
    {
        id: 'dr1', title: 'Array Spiral Logic', lang: 'Python', diff: 'Intermediate', lines: 24, xp: 40,
        code: `def spiral_order(matrix):\n    result = []\n    while matrix:\n        result += matrix.pop(0)\n        matrix = list(zip(*matrix))[::-1]\n    return result\n\n# Example usage\nprint(spiral_order([[1,2,3],[4,5,6],[7,8,9]]))`
    },
    {
        id: 'dr2', title: 'Balanced Parenthesis', lang: 'Java', diff: 'Intermediate', lines: 18, xp: 30,
        code: `public boolean isValid(String s) {\n    Stack<Character> stack = new Stack<>();\n    for (char c : s.toCharArray()) {\n        if (c=='(' || c=='{' || c=='[') stack.push(c);\n        else {\n            if (stack.isEmpty()) return false;\n            char top = stack.pop();\n            if (c==')' && top!='(') return false;\n            if (c=='}' && top!='{') return false;\n        }\n    }\n    return stack.isEmpty();\n}`
    },
    {
        id: 'dr3', title: 'FizzBuzz Variation', lang: 'Python', diff: 'Beginner', lines: 12, xp: 20,
        code: `for i in range(1, 101):\n    if i % 15 == 0:\n        print('FizzBuzz')\n    elif i % 3 == 0:\n        print('Fizz')\n    elif i % 5 == 0:\n        print('Buzz')\n    else:\n        print(i)`
    },
    {
        id: 'dr4', title: 'Linked List Reverse', lang: 'C++', diff: 'Intermediate', lines: 20, xp: 40,
        code: `ListNode* reverseList(ListNode* head) {\n    ListNode *prev = nullptr, *curr = head;\n    while (curr) {\n        ListNode* next = curr->next;\n        curr->next = prev;\n        prev = curr;\n        curr = next;\n    }\n    return prev;\n}`
    }
];

const DSC_STUDY_GROUPS = [
    { id: 'dsg1', name: 'Python Beginners', members: 14, status: 'Active', emoji: 'ðŸ', joined: false },
    { id: 'dsg2', name: 'DSA Prep 2026', members: 11, status: 'Active', emoji: 'ðŸ§ ', joined: false },
    { id: 'dsg3', name: 'MCA Placement', members: 18, status: 'Active', emoji: 'ðŸŽ“', joined: false }
];

let activeReviewItem = null;
let currentLbTab = 'alltime';
let reviewItems = [...DSC_REVIEW_ITEMS];

function renderCommunity() {
    syncCommunityProfile();
    updateCommunityBanner();
    updateXPDisplays();
    switchDSCLeaderboard('alltime');
    renderGapBars();
    renderReviewQueue();
    renderStudyGroups();
}

function syncCommunityProfile() {
    DSC_USER.name = state.user.name || DSC_USER.name;
    DSC_USER.college = state.user.college || DSC_USER.college;
    DSC_USER.branch = state.user.branch || DSC_USER.branch;
    DSC_USER.skills = state.user.skills || DSC_USER.skills;
}

function updateCommunityBanner() {
    const collegeName = document.getElementById('community-college-name');
    const collegeSubtitle = document.getElementById('community-college-subtitle');
    if (collegeName) collegeName.textContent = state.user.college || 'Dayananda Sagar College';
    if (collegeSubtitle) collegeSubtitle.textContent = `${state.user.branch || 'MCA'} Department â€¢ Batch ${state.user.year || '2026'}`;
}

// â”€â”€ XP HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function addCommunityXP(amount, reason) {
    const prevXP = currentXP;
    currentXP += amount;
    localStorage.setItem('cc_xp_total', currentXP);
    updateXPDisplays();
    showToast(`âš¡ +${amount} XP earned! ${reason}`);
    // Rank-up check
    if (prevXP < TARGET_XP && currentXP >= TARGET_XP) {
        setTimeout(showRankUpModal, 800);
    }
}

function updateXPDisplays() {
    const riXP = document.getElementById('ri-current-xp');
    const riGap = document.getElementById('ri-xp-gap');
    const riProgress = document.getElementById('ri-progress-fill');
    const bannerRank = document.getElementById('banner-rank');
    if (riXP) riXP.textContent = currentXP;
    if (riGap) {
        const gap = Math.max(0, TARGET_XP - currentXP);
        riGap.textContent = gap === 0 ? '0 XP âœ“' : gap + ' XP';
    }
    if (riProgress) {
        const pct = Math.min(100, Math.round((currentXP / TARGET_XP) * 100));
        riProgress.style.width = pct + '%';
    }
    if (bannerRank) {
        bannerRank.textContent = currentXP >= TARGET_XP ? '#11' : '#12';
    }
    // update global XP bar in header
    if (typeof updateXP === 'function') {
        const header_fill = document.getElementById('xp-progress-fill');
        const header_txt = document.getElementById('xp-text');
        if (header_fill) header_fill.style.width = Math.min(100, Math.round((currentXP / 1000) * 100)) + '%';
        if (header_txt) header_txt.textContent = `${currentXP} / 1000 XP mastered`;
    }
}

// â”€â”€ LEADERBOARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function switchDSCLeaderboard(tab) {
    currentLbTab = tab;
    document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('lb-tab-active'));
    const btn = document.getElementById('lb-tab-' + tab);
    if (btn) btn.classList.add('lb-tab-active');

    const data = DSC_LB[tab] || DSC_LB.alltime;
    const isXPGain = (tab === 'week' || tab === 'month');
    const medalColors = { 1: '#f0b429', 2: '#c0c0c0', 3: '#cd7f32' };
    const container = document.getElementById('leaderboard-table');
    container.innerHTML = `
        <div style="display:grid; grid-template-columns:60px 1fr 140px 100px 80px 110px 60px; padding:10px 16px; font-size:11px; color:var(--text-muted); font-weight:700; text-transform:uppercase; letter-spacing:1px; border-bottom:1px solid var(--border);">
            <span>RANK</span><span>STUDENT</span><span>USN</span>
            <span>${isXPGain ? 'XP GAINED' : 'TOTAL XP'}</span>
            <span>SCORE</span><span>LEVEL</span><span>TREND</span>
        </div>
        ${data.map(row => `
            <div onclick="${row.isYou ? '' : `showDSCProfilePopup(event,${JSON.stringify(row).replace(/"/g, '&quot;')})`}"
                style="display:grid; grid-template-columns:60px 1fr 140px 100px 80px 110px 60px; padding:13px 16px; font-size:13px; align-items:center; border-bottom:1px solid rgba(255,255,255,0.04); transition:background 0.15s; cursor:${row.isYou ? 'default' : 'pointer'}; animation:fadeUp 0.3s ease ${row.rank * 0.04}s both; ${row.isYou ? 'background:rgba(240,180,41,0.07); border-left:3px solid var(--primary);' : ''}"
                onmouseover="${row.isYou ? '' : "this.style.background='rgba(255,255,255,0.03)'"}" onmouseout="${row.isYou ? '' : "this.style.background=''"}"
            >
                <span style="font-weight:800; color:${medalColors[row.rank] || 'inherit'}; font-family:monospace;">#${row.rank}</span>
                <span style="font-weight:${row.isYou ? '700' : '500'};">
                    ${row.name}${row.isYou ? ' <span style="font-size:9px; background:var(--primary); color:#000; padding:2px 6px; border-radius:4px; margin-left:6px; font-weight:800;">YOU</span>' : ''}
                </span>
                <span style="font-family:monospace; font-size:11px; color:var(--text-muted);">${row.usn}</span>
                <span style="font-weight:700; color:${row.isYou ? 'var(--primary)' : 'inherit'}; font-family:monospace;">${isXPGain ? (row.label || '+' + row.xp + ' XP') : row.xp + ' XP'}</span>
                <span style="color:var(--text-muted); font-size:12px;">${row.score}</span>
                <span style="font-size:11px; color:var(--text-muted);">${row.level}</span>
                <span style="font-size:18px; color:${row.trend === 'â†‘' ? '#0ed97a' : row.trend === 'â†“' ? '#ff6b6b' : '#666'};">${row.trend}</span>
            </div>`).join('')}`;
}

function showDSCProfilePopup(event, user) {
    const popup = document.getElementById('profile-popup');
    if (!popup) return;
    const skillColors = { Loops: '#4a8ff7', Functions: '#0ed97a', Arrays: '#f0b429', OOP: '#a855f7', Recursion: '#f97316', Algorithms: '#ff6b6b' };
    const skills = { Loops: Math.round(user.score * 0.9), Functions: Math.round(user.score * 0.8), Arrays: Math.round(user.score * 0.85), OOP: Math.round(user.score * 0.7), Recursion: Math.round(user.score * 0.65), Algorithms: Math.round(user.score * 0.5) };
    popup.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <div style="font-weight:800;font-size:15px;">${user.name}</div>
            <button onclick="document.getElementById('profile-popup').style.display='none'" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px;">âœ•</button>
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px;font-family:monospace;">${user.usn}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;">
            ${[['XP', user.xp, 'var(--primary)'], ['Rank', '#' + user.rank, '#4a8ff7'], ['Streak', '12ðŸ”¥', '#0ed97a']].map(([l, v, c]) =>
        `<div style="background:rgba(255,255,255,0.04);padding:8px;border-radius:8px;text-align:center;"><div style="font-size:14px;font-weight:800;color:${c};">${v}</div><div style="font-size:9px;color:var(--text-muted);margin-top:2px;">${l}</div></div>`
    ).join('')}
        </div>
        <div style="font-size:10px;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Skills</div>
        ${Object.entries(skills).map(([k, v]) => `
            <div style="margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;"><span>${k}</span><span style="color:${skillColors[k]};font-weight:700;">${v}%</span></div>
                <div style="height:4px;background:rgba(255,255,255,0.06);border-radius:4px;"><div style="width:${v}%;height:100%;background:${skillColors[k]};border-radius:4px;"></div></div>
            </div>`).join('')}`;
    popup.style.display = 'block';
    const x = Math.min(event.clientX + 12, window.innerWidth - 320);
    const y = Math.min(event.clientY + 12, window.innerHeight - 400);
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
    setTimeout(() => { document.addEventListener('click', () => { popup.style.display = 'none'; }, { once: true }); }, 60);
}

// â”€â”€ RANK INTELLIGENCE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderGapBars() {
    const mySkills = DSC_USER.skills;
    const theirSkills = TARGET_SKILLS;
    const container = document.getElementById('gap-analysis-bars');
    if (!container) return;
    container.innerHTML = Object.entries(mySkills).map(([skill, myVal]) => {
        const theirVal = theirSkills[skill] || 0;
        const gap = myVal - theirVal;
        const ahead = gap >= 0;
        return `
        <div style="display:grid; grid-template-columns:90px 1fr 1fr 70px; gap:10px; align-items:center; font-size:12px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
            <div style="font-weight:600;">${skill}</div>
            <div>
                <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px;"><span style="color:var(--primary);">You</span><span>${myVal}</span></div>
                <div style="height:5px;background:rgba(255,255,255,0.06);border-radius:4px;"><div style="width:${myVal}%;height:100%;background:var(--primary);border-radius:4px;transition:width 0.8s;"></div></div>
            </div>
            <div>
                <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px;"><span style="color:#888;">${TARGET_NAME}</span><span>${theirVal}</span></div>
                <div style="height:5px;background:rgba(255,255,255,0.06);border-radius:4px;"><div style="width:${theirVal}%;height:100%;background:${ahead ? '#888' : '#ff6b6b'};border-radius:4px;transition:width 0.8s;"></div></div>
            </div>
            <span style="text-align:right; font-weight:700; font-size:11px; color:${ahead ? '#0ed97a' : '#ff6b6b'}; background:${ahead ? 'rgba(14,217,122,0.08)' : 'rgba(255,107,107,0.08)'}; padding:3px 8px; border-radius:6px;">${ahead ? '+' : ''}${gap}</span>
        </div>`;
    }).join('');
}

// â”€â”€ AI RANK PLAN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function getAIRankPlan() {
    const btn = document.getElementById('ai-plan-btn');
    if (!btn) return;

    btn.innerHTML = 'â³ Generating your plan...';
    btn.disabled = true;
    const section = document.getElementById('rank-plan-section');
    section.style.display = 'block';
    section.innerHTML = `<div class="glass-card" style="padding:32px;text-align:center;"><div style="font-size:28px;animation:fadeUp 0.5s;">âš¡</div><p style="color:var(--text-muted);margin-top:8px;">AI is crafting your personal rank boost plan...</p></div>`;

    try {
        const payload = {
            user: state.user.name,
            college: state.user.college,
            current_rank: 12, // Default or calculated
            total_students: 48,
            current_xp: state.user.xp,
            streak: state.user.streak,
            skills: state.user.skills,
            task: `Give a personalized 7-day plan to help ${state.user.name} improve her rank from #12 to #11.`
        };
        const systemPrompt = 'You are a coding career coach. Respond only in valid JSON with {days_to_target, daily_plan: [{day, focus, task, xp_goal, why}], quick_wins: [], motivational_message}.';
        const data = await callClaude(systemPrompt, JSON.stringify(payload));

        if (data && data.daily_plan) {
            renderRankPlan(data);
        } else {
            throw new Error("Invalid response from coach");
        }
    } catch (e) {
        console.error(e);
        // Fallback or error
        renderRankPlan({
            days_to_target: '5-7 days if consistent',
            daily_plan: [
                { day: 'Day 1', focus: 'Arrays', task: 'Complete Two Sum + Binary Search challenges', xp_goal: '+80 XP', why: 'Arrays is your biggest gap.' },
                { day: 'Day 2', focus: 'Recursion', task: 'Solve Factorial + Fibonacci with recursion', xp_goal: '+70 XP', why: 'Recursion is far below target â€” high leverage.' },
                { day: 'Day 3', focus: 'OOP', task: 'Submit a Class-based solution in Python', xp_goal: '+60 XP', why: 'OOP gap is closing â€” one good submission helps.' },
                { day: 'Day 4', focus: 'Arrays', task: 'Try 2 Medium Array problems from Challenges', xp_goal: '+80 XP', why: 'Consistency compounds growth.' },
                { day: 'Day 5', focus: 'Algorithms', task: 'Start Binary Search â€” submit 1 problem', xp_goal: '+50 XP', why: 'Algorithms needs most improvement.' },
                { day: 'Day 6', focus: 'Peer Reviews', task: 'Do 3 peer code reviews (+40 XP each)', xp_goal: '+120 XP', why: 'Guaranteed XP gain!' },
                { day: 'Day 7', focus: 'Full Sprint', task: 'Submit 2 problems + 1 peer review', xp_goal: '+100 XP', why: 'Final push to cross the rank gap!' }
            ],
            quick_wins: ['Submit any code solution', 'Review one peer submission', 'Join a Study Group'],
            motivational_message: `You are very close to crossing the next rank! Keep going!`
        });
    } finally {
        btn.innerHTML = 'âš¡ Regenerate Plan';
        btn.disabled = false;
    }
}

function renderRankPlan(plan) {
    const section = document.getElementById('rank-plan-section');
    const colors = ['#f0b429', '#0ed97a', '#60a5fa', '#f472b6', '#a78bfa', '#34d399', '#fb923c'];
    section.innerHTML = `
        <div class="glass-card" style="padding:28px;border-color:rgba(240,180,41,0.3);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <h3 style="color:var(--primary);font-size:18px;">âš¡ Your 7-Day Rank Boost Plan</h3>
                <div style="font-size:12px;color:var(--text-muted);background:rgba(255,255,255,0.04);padding:6px 12px;border-radius:8px;">#12 â†’ #11 in ${plan.days_to_target}</div>
            </div>
            <div style="overflow-x:auto;padding-bottom:12px;">
                <div style="display:flex;gap:12px;min-width:max-content;">
                    ${plan.daily_plan.map((d, i) => `
                        <div style="padding:20px;border-radius:16px;width:200px;flex-shrink:0;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-top:3px solid ${colors[i]};">
                            <div style="font-size:10px;font-weight:700;color:${colors[i]};margin-bottom:8px;text-transform:uppercase;">${d.day}</div>
                            <div style="font-size:11px;background:rgba(255,255,255,0.05);padding:3px 8px;border-radius:4px;margin-bottom:10px;display:inline-block;">${d.focus}</div>
                            <div style="font-size:12px;line-height:1.5;margin-bottom:10px;color:var(--text-muted);">${d.task}</div>
                            <div style="font-size:14px;font-weight:700;color:${colors[i]};">${d.xp_goal}</div>
                        </div>`).join('')}
                </div>
            </div>
            <div style="margin-top:24px;">
                <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:12px;text-transform:uppercase;">âš¡ Quick Wins â€” Do These Right Now</div>
                <div style="display:flex;flex-direction:column;gap:8px;">
                    ${plan.quick_wins.map((w, i) => `
                        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;">
                            <input type="checkbox" id="qw${i}" style="accent-color:var(--primary);width:16px;height:16px;" onchange="handleQuickWin(this,${i})">
                            <span id="qw-text-${i}">${w}</span>
                        </label>`).join('')}
                </div>
            </div>
            <div style="margin-top:24px;padding:16px;background:rgba(240,180,41,0.06);border-radius:12px;border:1px solid rgba(240,180,41,0.15);">
                <div style="font-size:12px;color:var(--primary);font-weight:700;margin-bottom:6px;">ðŸ’¬ Message from your AI Mentor</div>
                <div style="font-size:13px;line-height:1.6;font-style:italic;">${plan.motivational_message}</div>
            </div>
            <button class="btn-gold" style="margin-top:20px;background:#26d9c7;color:#000;" onclick="showPage('challenges')">ðŸš€ Start Day 1 â€” Go to Challenges</button>
        </div>`;
}

function handleQuickWin(cb, i) {
    const span = document.getElementById('qw-text-' + i);
    if (span) {
        span.style.textDecoration = cb.checked ? 'line-through' : 'none';
        span.style.opacity = cb.checked ? '0.4' : '1';
    }
    if (cb.checked) addCommunityXP(10, 'Quick win completed!');
}

// â”€â”€ PEER REVIEW QUEUE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderReviewQueue() {
    const container = document.getElementById('review-queue');
    const badge = document.getElementById('review-count-badge');
    if (!container) return;
    if (badge) badge.textContent = reviewItems.length + ' waiting';
    if (!reviewItems.length) {
        container.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text-muted);">No pending reviews ðŸŽ‰ Check back later!</div>`;
        return;
    }
    const diffColors = { Beginner: '#0ed97a', Intermediate: '#f0b429', Hard: '#ff6b6b' };
    const langColors = { Python: '#3b82f6', Java: '#f97316', 'C++': '#a855f7', JavaScript: '#eab308' };
    container.innerHTML = reviewItems.map(item => `
        <div id="ri-${item.id}" style="display:flex;gap:16px;align-items:center;padding:18px 20px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:14px;transition:all 0.4s;">
            <div style="flex:1;">
                <div style="font-weight:700;font-size:15px;margin-bottom:8px;">${item.title}</div>
                <div style="display:flex;gap:8px;">
                    <span style="font-size:10px;padding:3px 8px;border-radius:4px;background:rgba(255,255,255,0.05);color:${langColors[item.lang] || '#888'};font-weight:700;">${item.lang}</span>
                    <span style="font-size:10px;padding:3px 8px;border-radius:4px;background:rgba(255,255,255,0.05);color:${diffColors[item.diff] || '#888'};font-weight:700;">${item.diff}</span>
                    <span style="font-size:10px;padding:3px 8px;border-radius:4px;background:rgba(255,255,255,0.05);color:#888;">${item.lines} lines</span>
                </div>
            </div>
            <div style="text-align:right;flex-shrink:0;">
                <div style="color:var(--primary);font-weight:700;font-size:14px;margin-bottom:8px;">+${item.xp} XP</div>
                <button class="btn-gold" style="padding:8px 16px;font-size:12px;" onclick="openReviewModal('${item.id}')">Review Now â†’</button>
            </div>
        </div>`).join('');
}

function openReviewModal(itemId) {
    activeReviewItem = reviewItems.find(r => r.id === itemId);
    if (!activeReviewItem) return;
    const item = activeReviewItem;
    const diffColors = { Beginner: '#0ed97a', Intermediate: '#f0b429', Hard: '#ff6b6b' };
    const langColors = { Python: '#3b82f6', Java: '#f97316', 'C++': '#a855f7', JavaScript: '#eab308' };
    document.getElementById('review-modal-content').innerHTML = `
        <div style="padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.07);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <h3 style="font-size:18px;">Review this code anonymously</h3>
                <button onclick="closeReviewModal()" style="background:none;border:none;color:var(--text-muted);font-size:20px;cursor:pointer;">âœ•</button>
            </div>
            <p style="font-size:12px;color:var(--text-muted);">Your identity is hidden. Be kind and constructive.</p>
        </div>
        <div style="padding:24px 32px;">
            <div style="display:flex;gap:8px;margin-bottom:16px;">
                <span style="font-size:10px;padding:4px 10px;border-radius:6px;background:rgba(255,255,255,0.05);color:${diffColors[item.diff]};font-weight:700;">${item.diff}</span>
                <span style="font-size:10px;padding:4px 10px;border-radius:6px;background:rgba(255,255,255,0.05);color:${langColors[item.lang] || '#888'};font-weight:700;">${item.lang}</span>
                <span style="font-size:10px;padding:4px 10px;border-radius:6px;background:rgba(255,255,255,0.05);color:#888;">${item.title} Â· ${item.lines} lines</span>
            </div>
            <div style="background:#020205;border-radius:14px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;margin-bottom:20px;">
                <div style="background:rgba(255,255,255,0.03);padding:10px 16px;display:flex;gap:6px;border-bottom:1px solid rgba(255,255,255,0.06);">
                    <div style="width:10px;height:10px;border-radius:50%;background:#ff5f57;"></div>
                    <div style="width:10px;height:10px;border-radius:50%;background:#febc2e;"></div>
                    <div style="width:10px;height:10px;border-radius:50%;background:#28c840;"></div>
                    <span style="font-size:10px;color:#555;margin-left:8px;">${item.lang} Â· Anonymous Submission</span>
                </div>
                <pre style="padding:18px;font-family:monospace;font-size:13px;color:#86efac;overflow-x:auto;white-space:pre;margin:0;line-height:1.6;">${item.code}</pre>
            </div>
            <div style="margin-bottom:14px;">
                <label style="font-size:12px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:6px;">â­ Overall Rating</label>
                <div style="display:flex;gap:4px;" id="star-row">
                    ${[1, 2, 3, 4, 5].map(n => `<button class="star-btn" id="star-${n}" onclick="setStars(${n})" style="font-size:22px;color:#444;">â˜†</button>`).join('')}
                </div>
            </div>
            <div style="margin-bottom:14px;">
                <label style="font-size:12px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:6px;">âœ… What did they do well?</label>
                <textarea id="rv-good" style="width:100%;min-height:80px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);border-radius:10px;padding:12px;color:#fff;font-size:13px;resize:none;outline:none;font-family:inherit;" placeholder="e.g. Good variable names, clear logic..."></textarea>
            </div>
            <div style="margin-bottom:14px;">
                <label style="font-size:12px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:6px;">âš ï¸ What can be improved?</label>
                <textarea id="rv-improve" style="width:100%;min-height:80px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);border-radius:10px;padding:12px;color:#fff;font-size:13px;resize:none;outline:none;font-family:inherit;" placeholder="e.g. The loop can be simplified..."></textarea>
            </div>
            <div style="margin-bottom:20px;">
                <label style="font-size:12px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:8px;">ðŸŽ¯ How hard was this code?</label>
                <div style="display:flex;gap:8px;">
                    <button class="difficulty-toggle" onclick="setDiff(this,'Easy')">Easy</button>
                    <button class="difficulty-toggle active" onclick="setDiff(this,'Medium')">Medium</button>
                    <button class="difficulty-toggle" onclick="setDiff(this,'Hard')">Hard</button>
                </div>
            </div>
        </div>
        <div style="position:sticky;bottom:0;padding:16px 32px;background:var(--surface);border-top:1px solid rgba(255,255,255,0.07);display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:12px;color:var(--text-muted);">You'll earn <strong style="color:var(--primary);">+${item.xp} XP</strong> for this review</span>
            <div style="display:flex;gap:10px;">
                <button onclick="closeReviewModal()" style="padding:10px 20px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:var(--text-muted);cursor:pointer;font-size:13px;">Cancel</button>
                <button class="btn-gold" id="submit-review-btn" onclick="submitReview()">Submit Review â€” Earn +${item.xp} XP</button>
            </div>
        </div>`;
    document.getElementById('review-modal').classList.add('open');
}

function setStars(n) {
    for (let i = 1; i <= 5; i++) {
        const s = document.getElementById('star-' + i);
        if (s) { s.textContent = i <= n ? 'â˜…' : 'â˜†'; s.style.color = i <= n ? '#f0b429' : '#444'; }
    }
}

function setDiff(btn, val) {
    document.querySelectorAll('.difficulty-toggle').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function closeReviewModal(e) {
    if (e && e.target !== document.getElementById('review-modal')) return;
    document.getElementById('review-modal').classList.remove('open');
    activeReviewItem = null;
}

function submitReview() {
    const good = document.getElementById('rv-good')?.value?.trim();
    const improve = document.getElementById('rv-improve')?.value?.trim();
    if (!good || !improve) { showToast('âš ï¸ Please fill both sections before submitting.'); return; }
    const item = activeReviewItem;
    const btn = document.getElementById('submit-review-btn');
    if (btn) { btn.textContent = 'Submitting...'; btn.disabled = true; }
    setTimeout(() => {
        document.getElementById('review-modal').classList.remove('open');
        // Animate out queue item
        const el = document.getElementById('ri-' + item.id);
        if (el) { el.style.opacity = '0'; el.style.transform = 'translateX(30px)'; setTimeout(() => el.remove(), 400); }
        reviewItems = reviewItems.filter(r => r.id !== item.id);
        setTimeout(renderReviewQueue, 500);
        addCommunityXP(item.xp, `You reviewed "${item.title}"`);
        activeReviewItem = null;
    }, 1500);
}

// â”€â”€ RANK UP MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function showRankUpModal() {
    const modal = document.getElementById('rankup-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    spawnConfetti();
}

function closeRankupModal() {
    const modal = document.getElementById('rankup-modal');
    if (modal) modal.style.display = 'none';
}

function spawnConfetti() {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    container.innerHTML = '';
    const colors = ['#f0b429', '#0ed97a', '#4a8ff7', '#f472b6', '#a78bfa', '#26d9c7', '#fb923c'];
    for (let i = 0; i < 20; i++) {
        const el = document.createElement('div');
        const size = Math.random() * 12 + 8;
        el.style.cssText = `position:absolute;width:${size}px;height:${size}px;background:${colors[i % colors.length]};left:${Math.random() * 100}%;top:-20px;border-radius:${Math.random() > 0.5 ? '50%' : '3px'};animation:confettiFall ${Math.random() * 2 + 2}s ease-in forwards;animation-delay:${Math.random() * 0.5}s;transform:rotate(${Math.random() * 360}deg);opacity:0.9;`;
        container.appendChild(el);
    }
}

// â”€â”€ STUDY GROUPS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderStudyGroups() {
    const container = document.getElementById('study-groups-grid');
    if (!container) return;
    const statusDot = { 'Active': '#0ed97a' };
    const avatarColors = ['#4a8ff7', '#0ed97a', '#f0b429', '#a855f7'];
    container.innerHTML = DSC_STUDY_GROUPS.map(g => `
        <div class="glass-card" style="padding:20px;text-align:center;">
            <div style="font-size:32px;margin-bottom:10px;">${g.emoji}</div>
            <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${g.name}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">${g.members} members</div>
            <div style="display:flex;justify-content:center;gap:4px;margin-bottom:10px;">
                ${avatarColors.map(c => `<div style="width:22px;height:22px;border-radius:50%;background:${c};border:2px solid var(--surface);"></div>`).join('')}
            </div>
            <div style="font-size:10px;color:${statusDot[g.status] || '#888'};margin-bottom:14px;">â— ${g.status}</div>
            <button id="sg-btn-${g.id}" class="btn-gold" style="width:100%;justify-content:center;font-size:12px;" onclick="joinGroup('${g.id}','${g.name}')">${g.joined ? 'Joined âœ“' : 'Join'}</button>
        </div>`).join(`
        <div style="border:2px dashed rgba(255,255,255,0.1);border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:180px;cursor:pointer;transition:border-color 0.2s;" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.1)'" onclick="showToast('â„¹ï¸ Create Group coming soon!')">
            <div style="font-size:28px;margin-bottom:8px;color:var(--text-muted);">+</div>
            <div style="font-size:12px;color:var(--text-muted);">Create Group</div>
        </div>`);
}

function joinGroup(id, name) {
    const g = DSC_STUDY_GROUPS.find(x => x.id === id);
    const btn = document.getElementById('sg-btn-' + id);
    if (!g || g.joined) return;
    g.joined = true;
    g.members++;
    if (btn) { btn.textContent = 'Joined âœ“'; btn.style.background = '#0ed97a'; btn.style.color = '#000'; }
    addCommunityXP(10, `Joined ${name}!`);
}




// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PEER DISCUSSION SYSTEM
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

let currentDiscTab = 'discussion';
let currentDiscKey = 'general';

// Seed some starter posts for each company/challenge
const SEED_POSTS = {
    'Capgemini': [
        { id: 's1', author: 'Anon Coder', avatar: 'A', tab: 'tips', text: 'Focus on time complexity â€” Capgemeni rounds always have at least one O(N log N) problem. Practice sorting variants!', likes: 14, liked: false, spoiler: false, ts: Date.now() - 3600000 },
        { id: 's2', author: 'DSA Ninja', avatar: 'D', tab: 'discussion', text: 'Anyone else struggling with the string manipulation tasks? The edge case for empty string was tricky.', likes: 7, liked: false, spoiler: false, ts: Date.now() - 7200000 },
        { id: 's3', author: 'Harismitha', avatar: 'H', tab: 'solutions', text: 'Two Sum pattern â†’ use a HashMap. O(N) time, O(N) space. Works for all Capgemini variants. Here\'s the key insight: store complement, not current value.', likes: 22, liked: false, spoiler: true, ts: Date.now() - 1800000 }
    ],
    'LTIMindtree': [
        { id: 's4', author: 'Code Wizard', avatar: 'C', tab: 'tips', text: 'LTIMindtree loves graph problems in rounds 2+. Make sure you\'re comfortable with BFS/DFS.', likes: 9, liked: false, spoiler: false, ts: Date.now() - 5400000 },
        { id: 's5', author: 'Anon', avatar: '?', tab: 'discussion', text: 'The SQL round was unexpected for me. Practice GROUP BY, JOINs and HAVING clauses!', likes: 11, liked: false, spoiler: false, ts: Date.now() - 10800000 }
    ],
    'Deloitte': [
        { id: 's6', author: 'Placement Pro', avatar: 'P', tab: 'tips', text: 'Deloitte focuses heavily on case study + aptitude. Don\'t skip the pseudo-code questions at the start.', likes: 18, liked: false, spoiler: false, ts: Date.now() - 3000000 }
    ],
    'general': [
        { id: 'g1', author: 'Arjun S', avatar: 'A', tab: 'discussion', text: 'Great challenge! The tricky part was handling negative numbers in the array. Make sure to add that edge case.', likes: 8, liked: false, spoiler: false, ts: Date.now() - 1200000 },
        { id: 'g2', author: 'Priya R', avatar: 'P', tab: 'tips', text: 'ðŸ’¡ Tip: Try solving this in O(n) first using a HashMap before going for brute force â€” it\'ll help you understand the optimal approach.', likes: 15, liked: false, spoiler: false, ts: Date.now() - 6000000 },
        { id: 'g3', author: 'Anon Coder', avatar: '?', tab: 'solutions', text: 'Here\'s my approach: iterate through the array once, store seen values in a set, and check if the complement exists.', likes: 5, liked: false, spoiler: true, ts: Date.now() - 9000000 }
    ]
};

function getDiscKey() {
    if (state.activeCompany) return state.activeCompany;
    if (state.activeChallenge) return 'challenge_' + (state.activeChallenge.id || state.activeChallenge.title?.replace(/\s+/g, '_'));
    return 'general';
}

function loadDiscPosts(key) {
    const stored = localStorage.getItem('cc_discussion_' + key);
    if (stored) return JSON.parse(stored);
    // Seed starter posts
    const seeds = SEED_POSTS[key] || SEED_POSTS['general'];
    localStorage.setItem('cc_discussion_' + key, JSON.stringify(seeds));
    return seeds;
}

function saveDiscPosts(key, posts) {
    localStorage.setItem('cc_discussion_' + key, JSON.stringify(posts));
}

function renderDiscussion(key) {
    currentDiscKey = key || getDiscKey();
    const section = document.getElementById('discussion-section');
    if (!section) return;
    section.style.display = 'block';
    refreshDiscFeed();
}

function switchDiscTab(tab) {
    currentDiscTab = tab;
    document.querySelectorAll('.disc-tab').forEach(t => t.classList.remove('disc-tab-active'));
    const btn = document.getElementById('disc-tab-' + tab);
    if (btn) btn.classList.add('disc-tab-active');
    refreshDiscFeed();
}

function refreshDiscFeed() {
    const posts = loadDiscPosts(currentDiscKey);
    const filtered = currentDiscTab === 'discussion' ? posts : posts.filter(p => p.tab === currentDiscTab);
    const container = document.getElementById('disc-feed');
    const countEl = document.getElementById('disc-post-count');
    if (countEl) countEl.textContent = posts.length + (posts.length === 1 ? ' post' : ' posts');
    if (!container) return;

    if (!filtered.length) {
        container.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text-muted);">
            <div style="font-size:32px;margin-bottom:8px;">ðŸ¤«</div>
            <div>No posts in this category yet. Be the first!</div>
        </div>`;
        return;
    }

    container.innerHTML = filtered.map(p => {
        const timeAgo = getTimeAgo(p.ts);
        const tabColors = { tips: '#0ed97a', solutions: '#60a5fa', discussion: '#f0b429' };
        const tabLabels = { tips: 'ðŸ’¡ Tip', solutions: 'âœ… Solution', discussion: 'ðŸ’¬ Discussion' };
        const avatarColors = ['#f0b429', '#0ed97a', '#60a5fa', '#f472b6', '#a78bfa'];
        const avatarBg = avatarColors[p.avatar.charCodeAt(0) % avatarColors.length];
        return `
        <div id="disc-post-${p.id}" style="display:flex;gap:12px;padding:16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:14px;transition:all 0.3s;animation:fadeUp 0.3s ease;">
            <div style="width:36px;height:36px;border-radius:10px;background:${avatarBg};display:flex;align-items:center;justify-content:center;font-weight:800;color:#000;flex-shrink:0;font-size:14px;">${p.avatar}</div>
            <div style="flex:1;min-width:0;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-weight:700;font-size:13px;">${p.author}</span>
                        <span style="font-size:10px;padding:2px 8px;border-radius:4px;background:rgba(255,255,255,0.05);color:${tabColors[p.tab]};font-weight:700;">${tabLabels[p.tab]}</span>
                        ${p.spoiler ? '<span style="font-size:10px;padding:2px 8px;border-radius:4px;background:rgba(255,107,107,0.1);color:#ff6b6b;font-weight:700;">âš ï¸ Spoiler</span>' : ''}
                    </div>
                    <span style="font-size:11px;color:var(--text-muted);">${timeAgo}</span>
                </div>
                ${p.spoiler
                ? `<div id="spoiler-${p.id}" style="cursor:pointer;font-size:13px;color:var(--text-muted);background:rgba(255,255,255,0.04);padding:10px;border-radius:8px;text-align:center;" onclick="revealSpoiler('${p.id}')">
                        ðŸ™ˆ Click to reveal spoiler
                       </div>`
                : `<p style="font-size:13px;line-height:1.6;color:rgba(255,255,255,0.85);margin:0;" id="spoiler-${p.id}">${p.text}</p>`
            }
                <div style="display:flex;gap:16px;margin-top:10px;">
                    <button onclick="likeDiscussionPost('${p.id}')" id="like-btn-${p.id}"
                        style="background:none;border:none;cursor:pointer;font-size:12px;color:${p.liked ? 'var(--primary)' : 'var(--text-muted)'};display:flex;align-items:center;gap:4px;transition:color 0.2s;">
                        ${p.liked ? 'â¤ï¸' : 'ðŸ¤'} <span id="like-count-${p.id}">${p.likes}</span>
                    </button>
                    <button onclick="replyToPost('${p.id}')"
                        style="background:none;border:none;cursor:pointer;font-size:12px;color:var(--text-muted);">
                        ðŸ’¬ Reply
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function revealSpoiler(postId) {
    const posts = loadDiscPosts(currentDiscKey);
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const el = document.getElementById('spoiler-' + postId);
    if (el) { el.innerHTML = post.text; el.style.cssText = 'font-size:13px;line-height:1.6;color:rgba(255,255,255,0.85);margin:0;'; el.onclick = null; }
}

function likeDiscussionPost(postId) {
    const posts = loadDiscPosts(currentDiscKey);
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    post.liked = !post.liked;
    post.likes += post.liked ? 1 : -1;
    saveDiscPosts(currentDiscKey, posts);
    const btn = document.getElementById('like-btn-' + postId);
    const cnt = document.getElementById('like-count-' + postId);
    if (btn) { btn.style.color = post.liked ? 'var(--primary)' : 'var(--text-muted)'; btn.innerHTML = (post.liked ? 'â¤ï¸' : 'ðŸ¤') + ` <span id="like-count-${postId}">${post.likes}</span>`; }
}

function replyToPost(postId) {
    const input = document.getElementById('disc-input');
    if (input) { input.focus(); input.placeholder = `Replying to post... type your response`; }
}

function postDiscussionMessage() {
    const input = document.getElementById('disc-input');
    const text = input?.value?.trim();
    if (!text) { showToast('âš ï¸ Please write something before posting!'); return; }
    const isAnon = document.getElementById('disc-anon')?.checked;
    const isSpoiler = document.getElementById('disc-spoiler')?.checked;
    const tab = currentDiscTab === 'discussion' ? 'discussion' : currentDiscTab;
    const session = localStorage.getItem('cc_session');
    let author = 'Anonymous Coder';
    let avatar = '?';
    if (!isAnon && session) {
        author = (state.user.name || session.split('@')[0] || 'You');
        avatar = author[0].toUpperCase();
    }
    const newPost = { id: 'p' + Date.now(), author, avatar, tab, text, likes: 0, liked: false, spoiler: isSpoiler, ts: Date.now() };
    const posts = loadDiscPosts(currentDiscKey);
    posts.unshift(newPost);
    saveDiscPosts(currentDiscKey, posts);
    input.value = '';
    input.placeholder = 'Share a hint, ask a question, or post your approach...';
    if (document.getElementById('disc-spoiler')) document.getElementById('disc-spoiler').checked = false;
    refreshDiscFeed();
    showToast('âœ… Posted! Your message is live.');
}

function getTimeAgo(ts) {
    const diff = (Date.now() - ts) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// COMPANY COMPLETION CERTIFICATES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

let _certCurrentCompany = null;
let _certCurrentScore = 0;

function checkAndAwardCertificate(companyName, score) {
    if (!companyName || score < 70) return;
    const certs = JSON.parse(localStorage.getItem('cc_certificates') || '[]');
    const already = certs.find(c => c.company === companyName);
    if (already) return; // Already awarded

    const cert = {
        id: 'cert_' + companyName.replace(/\s+/g, '_') + '_' + Date.now(),
        company: companyName,
        score: score,
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
        month: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    };
    certs.push(cert);
    localStorage.setItem('cc_certificates', JSON.stringify(certs));
    _certCurrentCompany = companyName;
    _certCurrentScore = score;
    setTimeout(() => showCertModal(cert), 1200);
}

function showCertModal(cert) {
    const modal = document.getElementById('cert-modal');
    if (!modal) return;
    const companyEmojis = { Capgemini: 'ðŸ”µ', LTIMindtree: 'ðŸŸ¢', Deloitte: 'ðŸ”·' };
    const emoji = companyEmojis[cert.company] || 'ðŸ…';
    document.getElementById('cert-emoji').textContent = emoji;
    document.getElementById('cert-company-title').textContent = cert.company + ' Mock Practice';
    document.getElementById('cert-student-name').textContent = state.user.name || 'Harismitha';
    document.getElementById('cert-track-label').textContent = cert.company + ' Coding Practice Track';
    document.getElementById('cert-date-score').textContent = 'Issued ' + cert.month + ' Â· Score: ' + cert.score + '/100';
    document.getElementById('cert-score-bar').style.width = '0%';
    modal.style.display = 'flex';
    spawnCertConfetti();
    setTimeout(() => { document.getElementById('cert-score-bar').style.width = cert.score + '%'; }, 100);
}

function closeCertModal() {
    const modal = document.getElementById('cert-modal');
    if (modal) modal.style.display = 'none';
}

function spawnCertConfetti() {
    const container = document.getElementById('cert-confetti');
    if (!container) return;
    container.innerHTML = '';
    const colors = ['#f0b429', '#0ed97a', '#60a5fa', '#f472b6', '#a78bfa', '#26d9c7', '#fb923c'];
    for (let i = 0; i < 28; i++) {
        const el = document.createElement('div');
        const size = Math.random() * 14 + 8;
        el.style.cssText = `position:absolute;width:${size}px;height:${size}px;background:${colors[i % colors.length]};left:${Math.random() * 100}%;top:-20px;border-radius:${Math.random() > 0.5 ? '50%' : '3px'};animation:confettiFall ${Math.random() * 2 + 2}s ease-in forwards;animation-delay:${Math.random() * 0.8}s;opacity:0.9;`;
        container.appendChild(el);
    }
}

function downloadCertificate() {
    const certs = JSON.parse(localStorage.getItem('cc_certificates') || '[]');
    const company = _certCurrentCompany || (certs.length ? certs[certs.length - 1].company : 'Company');
    const cert = certs.find(c => c.company === company) || certs[certs.length - 1];
    if (!cert) return;
    const studentName = state.user.name || 'Harismitha';
    const companyColors = { Capgemini: '#0070f3', LTIMindtree: '#00a650', Deloitte: '#86bc25' };
    const color = companyColors[cert.company] || '#d4af37';
    const html = `<!DOCTYPE html><html><head><title>${cert.company} Certificate</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        body{margin:0;padding:0;font-family:'Inter',sans-serif;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
        .page{width:800px;margin:0 auto;padding:0;}
        .header{background:linear-gradient(135deg,${color},${color}cc);padding:48px;text-align:center;color:#fff;}
        .logo{font-size:56px;margin-bottom:12px;}
        .cert-label{font-size:12px;letter-spacing:4px;text-transform:uppercase;opacity:0.8;margin-bottom:8px;}
        .company{font-size:28px;font-weight:800;}
        .body{padding:48px;text-align:center;border:4px solid ${color};border-top:none;}
        .issued-to{font-size:13px;color:#666;margin-bottom:12px;}
        .student-name{font-size:38px;font-weight:800;color:#111;margin-bottom:8px;}
        .body p{color:#555;font-size:15px;margin:8px 0;}
        .track{font-size:18px;font-weight:700;color:#111;margin:16px 0 8px;}
        .score-area{display:inline-block;background:${color}18;border:2px solid ${color};border-radius:12px;padding:16px 40px;margin:20px 0;}
        .score-label{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#666;margin-bottom:4px;}
        .score{font-size:36px;font-weight:800;color:${color};}
        .divider{width:80px;height:3px;background:${color};margin:24px auto;}
        .footer{display:flex;justify-content:space-around;margin-top:40px;padding-top:24px;border-top:1px solid #eee;}
        .footer-item{text-align:center;}
        .footer-item .val{font-size:13px;font-weight:700;color:#111;}
        .footer-item .lbl{font-size:10px;color:#999;text-transform:uppercase;letter-spacing:1px;}
        .watermark{font-size:10px;color:#bbb;margin-top:32px;}
        @media print{.no-print{display:none}body{margin:0}}
    </style></head><body>
    <div class="page">
        <div class="header">
            <div class="logo">ðŸ…</div>
            <div class="cert-label">Certificate of Completion</div>
            <div class="company">${cert.company} Mock Practice Track</div>
        </div>
        <div class="body">
            <div class="issued-to">This is to certify that</div>
            <div class="student-name">${studentName}</div>
            <p>has successfully completed all challenges in the</p>
            <div class="track">${cert.company} Coding Practice Track</div>
            <p>on the <strong>CodeConfidence</strong> Learning Platform</p>
            <div class="divider"></div>
            <div class="score-area">
                <div class="score-label">Final Score</div>
                <div class="score">${cert.score}/100</div>
            </div>
            <div class="footer">
                <div class="footer-item"><div class="val">CodeConfidence</div><div class="lbl">Platform</div></div>
                <div class="footer-item"><div class="val">${cert.date}</div><div class="lbl">Issue Date</div></div>
                <div class="footer-item"><div class="val">${cert.id.slice(-8).toUpperCase()}</div><div class="lbl">Certificate ID</div></div>
            </div>
            <div class="watermark">Verify at: codeconfidence.app/verify Â· This certificate demonstrates proficiency in company-specific coding challenges.</div>
        </div>
    </div>
    <script>window.onload=()=>{window.print();}<\/script>
    </body></html>`;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
}

function renderCertificates() {
    const certs = JSON.parse(localStorage.getItem('cc_certificates') || '[]');
    const container = document.getElementById('profile-badges');
    if (!container) return;

    // Render existing badges first (already rendered by renderProfile)
    const existingBadgesHtml = container.innerHTML;

    const companyColors = { Capgemini: '#0070f3', LTIMindtree: '#00a650', Deloitte: '#86bc25' };
    const companyEmojis = { Capgemini: 'ðŸ”µ', LTIMindtree: 'ðŸŸ¢', Deloitte: 'ðŸ”·' };
    const certHtml = certs.map(cert => {
        const color = companyColors[cert.company] || '#d4af37';
        const emoji = companyEmojis[cert.company] || 'ðŸ…';
        return `
        <div class="cert-card" style="grid-column:span 2; padding:20px; border-radius:20px; border:2px solid ${color}40; background:linear-gradient(135deg,${color}0d,transparent); position:relative; overflow:hidden; cursor:pointer;" onclick="downloadCertificate._company='${cert.company}'; _certCurrentCompany='${cert.company}'; downloadCertificate()">
            <div style="position:absolute;inset:0;background:linear-gradient(135deg,${color}08,transparent);pointer-events:none;"></div>
            <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px;">
                <div style="font-size:28px;">${emoji}</div>
                <div>
                    <div style="font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${color};margin-bottom:2px;">Certificate</div>
                    <div style="font-size:15px;font-weight:700;">${cert.company}</div>
                </div>
                <div style="margin-left:auto;background:${color}18;border:1px solid ${color}40;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:700;color:${color};">${cert.score}/100</div>
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">${cert.company} Coding Practice Track Â· Issued ${cert.date}</div>
            <button style="background:${color};color:#fff;border:none;padding:7px 14px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;" onclick="event.stopPropagation();_certCurrentCompany='${cert.company}';downloadCertificate()">â¬‡ Download</button>
            <div class="cert-shimmer"></div>
        </div>`;
    }).join('');

    if (certHtml) {
        // Prepend certificates at the top of badges
        const header = document.createElement('div');
        header.style.cssText = 'grid-column:span 6;font-size:12px;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;';
        header.textContent = 'ðŸ… Earned Certificates';
        container.prepend(header);
        header.insertAdjacentHTML('afterend', certHtml);
    }
}

function updateXP(add) {
    state.user.xp += add;
    const fill = (state.user.xp / state.user.nextLevelXp) * 100;
    document.getElementById('xp-progress-fill').style.width = fill + '%';
    document.getElementById('xp-text').innerText = `${state.user.xp} / ${state.user.nextLevelXp} XP mastered`;

    if (add > 0) {
        showToast(`âš¡ +${add} XP Earned!`);
    }
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'glass';
    toast.style.cssText = `
        position: fixed; top: 40px; right: 40px; padding: 20px 30px; 
        border: 1px solid var(--primary); border-radius: 16px; z-index: 2000;
        animation: slideIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        background: linear-gradient(135deg, var(--surface), var(--bg));
        box-shadow: 0 10px 30px rgba(0,0,0,0.5); font-weight:700; color:var(--primary);
    `;
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.5s forwards';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

async function analyzeCode(silent = false) {
    const code = document.querySelector('#page-submit textarea').value;
    if (!code.trim()) return;

    const companyContext = state.activeCompany || null;
    const language = document.getElementById('lang-picker').value;

    const btn = document.getElementById('btn-analyze');
    if (!silent) {
        btn.innerText = "Analyzing System...";
        btn.disabled = true;
    }

    try {
        // First try via /api/feedback proxy (server handles key + fallback)
        const email = localStorage.getItem('cc_session') || '';
        const userKey = localStorage.getItem('cc_gemini_key') || '';

        const res = await fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, language, email, apiKey: userKey, companyContext })
        });

        if (!res.ok) throw new Error('Server feedback failed: ' + res.status);
        const data = await res.json();

        if (!data || !data.score) {
            if (!silent) showToast("âŒ AI analysis unavailable.");
            return;
        }

        renderFeedback(data);
        if (!silent) {
            const xp = data.xp_earned || 50;
            updateXP(xp);
        }
    } catch (e) {
        // Fallback: try callGemini direct if proxy fails
        try {
            const systemPrompt = `You are an expert code reviewer. Return JSON: {score, grade, summary, issues:[], improved_code, tutor_question, skill_tags:[], xp_earned, level_up_tip}`;
            const userMessage = `Code:\n${code}\nLanguage: ${language}\nCompany: ${companyContext || 'General'}`;
            const data = await callGemini(systemPrompt, userMessage);
            if (data && data.score) {
                renderFeedback(data);
                if (!silent) updateXP(data.xp_earned || 50);
            } else {
                if (!silent) showAIError('AI analysis unavailable â€” check your API key or server.');
            }
        } catch (e2) {
            if (!silent) showAIError('Analysis failed: ' + e2.message);
        }
    } finally {
        if (!silent) {
            btn.innerText = "Analyze with AI";
            btn.disabled = false;
        }
    }
}

async function runCode() {
    const code = document.querySelector('#page-submit textarea').value;
    if (!code.trim()) return showToast("âš ï¸ No code to run!");

    const btn = document.getElementById('btn-run-local');
    const originalText = btn.innerText;
    btn.innerText = "Compiling...";
    btn.disabled = true;

    try {
        const r = await fetch('/api/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code,
                language: document.getElementById('lang-picker').value
            })
        });
        const data = await r.json();

        if (data.error && !data.output) {
            showTerminal("Execution Error:\n" + data.error, true);
        } else {
            const outputMsg = data.output ? data.output : (data.error || "No output");
            showTerminal(outputMsg, !!data.error);
            if (!data.error) updateXP(10);
        }
    } catch (e) {
        showToast("âŒ Connection error to compiler.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

function showTerminal(msg, isError) {
    const term = document.getElementById('compiler-terminal');
    const out = document.getElementById('compiler-output');
    term.style.display = 'block';
    out.innerText = msg;
    out.style.color = isError ? '#fca5a5' : '#86efac';
    out.scrollTop = out.scrollHeight;
}

function renderFeedback(data) {
    const feedbackBox = document.getElementById('feedback-box');
    feedbackBox.style.display = 'block';

    // Score & Grade
    document.getElementById('fb-score').innerText = data.score || 0;
    const gradeBadge = document.querySelector('#feedback-box [style*="background:var(--success)"]');
    if (gradeBadge) {
        gradeBadge.innerText = (data.grade || 'EXCELLENT').toUpperCase();
        gradeBadge.style.background = data.score > 88 ? 'var(--success)' : data.score > 60 ? 'var(--warning)' : 'var(--error)';
    }

    // AI Mentor Content
    const container = document.getElementById('ai-content');
    if (container) {
        let issuesHtml = '';
        if (data.issues && data.issues.length > 0) {
            issuesHtml = `
                <div style="margin-top:24px;">
                    <div style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:12px; text-transform:uppercase; letter-spacing:1px;">Key Improvement Areas</div>
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        ${data.issues.map(issue => `
                            <div class="glass" style="padding:16px; border-radius:12px; border-left:4px solid ${issue.type === 'bug' ? 'var(--error)' : 'var(--warning)'}">
                                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                                    <span style="font-size:12px; font-weight:700; color:${issue.type === 'bug' ? 'var(--error)' : 'var(--warning)'}">${issue.type.toUpperCase()} ${issue.line ? `â€¢ Line ${issue.line}` : ''}</span>
                                </div>
                                <div style="font-size:13px; line-height:1.4; margin-bottom:8px;">${issue.message}</div>
                                <div style="font-size:12px; padding:8px 12px; background:rgba(255,255,255,0.03); border-radius:6px; color:var(--primary);">
                                    <strong style="font-size:10px;">PRO TIP:</strong> ${issue.fix}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        container.innerHTML = `
            <h3 style="margin-bottom:12px;">AI Mentor Analysis</h3>
            <p style="font-size:14px; line-height:1.6; color:var(--text-muted);">${data.summary || ''}</p>
            
            ${issuesHtml}

            ${data.improved_code ? `
                <div style="margin-top:24px;">
                    <div style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:8px; text-transform:uppercase;">Optimized Implementation</div>
                    <pre style="background:#050510; padding:16px; border-radius:12px; border:1px solid var(--border); font-size:12px; font-family:monospace; overflow-x:auto;">${data.improved_code}</pre>
                </div>
            ` : ''}

            <div style="margin-top:24px; padding:16px; background:rgba(212,175,55,0.05); border-radius:12px; border:1px solid rgba(212,175,55,0.1);">
                <div style="font-size:11px; font-weight:700; color:var(--primary); margin-bottom:8px; text-transform:uppercase;">Socratic Challenge</div>
                <div style="font-size:13px; font-style:italic;">"${data.tutor_question || ''}"</div>
            </div>

            <div style="margin-top:24px; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; gap:8px;">
                    ${(data.skill_tags || []).map(tag => `
                        <span style="font-size:10px; background:var(--surface-light); padding:4px 10px; border-radius:30px; color:var(--text-muted);">${tag}</span>
                    `).join('')}
                </div>
                <div style="font-size:11px; color:var(--primary); font-weight:700;">
                    Next Step: ${data.level_up_tip || 'Keep practicing!'}
                </div>
            </div>
        `;
    }

    // â”€â”€ Show discussion section â”€â”€
    renderDiscussion(getDiscKey());

    // â”€â”€ Certificate check for company practice â”€â”€
    if (state.activeCompany && data.score >= 70) {
        checkAndAwardCertificate(state.activeCompany, data.score);
    }

    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function showCompanyPractice(companyName) {
    const track = state.career.tracks.find(t => t.name === companyName);
    if (!track || !track.practice) {
        return showToast('No specialized practice for ' + companyName + ' yet!');
    }

    // Set context: company mode, clear challenge mode
    state.activeCompany = companyName;
    state.activeChallenge = null;

    showPage('submit');

    // Show company context banner, hide challenge banner
    const compBar = document.getElementById('company-context-bar');
    const chalBar = document.getElementById('challenge-context-bar');
    if (compBar) compBar.style.display = 'block';
    if (chalBar) chalBar.style.display = 'none';

    // Populate company banner
    const companyEmojis = { Capgemini: 'ðŸ”µ', LTIMindtree: 'ðŸŸ¢', Deloitte: 'ðŸ”·' };
    if (document.getElementById('ctx-company-name')) document.getElementById('ctx-company-name').textContent = companyName;
    if (document.getElementById('ctx-company-emoji')) document.getElementById('ctx-company-emoji').textContent = companyEmojis[companyName] || 'ðŸ¢';
    document.getElementById('submit-lab-title').textContent = companyEmojis[companyName] + ' ' + companyName + ' Practice';

    // Populate Task Picker in the company banner
    const picker = document.getElementById('company-task-picker');
    if (picker) {
        picker.innerHTML = track.practice.map(t => `<option value="${t.id}">${t.title} (${t.diff})</option>`).join('');
    }

    // Load first task
    loadCompanyTask(track.practice[0].id);
    showToast(`ðŸŽ¯ Loaded ${companyName} Training Module`);

    // Load company-specific discussion thread
    renderDiscussion(companyName);
}

function loadCompanyTask(taskId) {
    const track = state.career.tracks.find(t => t.name === state.activeCompany);
    if (!track) return;
    const task = track.practice.find(p => p.id === taskId);
    if (!task) return;

    const textarea = document.querySelector('#page-submit textarea');
    textarea.value = task.code;
    showToast(`ðŸ“ Task Switched: ${task.title}`);
}

// Init call happens at bottom of app.html

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// AI CONFIGURATION & HELPERS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function getAIKey() {
    const key = localStorage.getItem('cc_gemini_key');
    if (!key || key === "null" || key === "undefined" || !key.startsWith("AIza")) return '';
    return key.trim();
}

function checkAIConfig() {
    const geminiKey = getAIKey();
    if (!geminiKey || geminiKey === "null" || geminiKey === "undefined") {
        showAIConfigModal();
        return false;
    }
    return true;
}

function showAIConfigModal() {
    const existing = document.getElementById('ai-config-modal');
    if (existing) existing.remove();

    const currentModel = window.__GEMINI_MODEL__ || 'gemini-2.0-flash';

    const modal = document.createElement('div');
    modal.id = 'ai-config-modal';
    modal.style = "position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:10000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(8px); padding:20px;";

    modal.innerHTML = `
        <div class="glass-card" style="width:100%; max-width:480px; padding:32px; border:1px solid var(--primary); box-shadow:0 0 40px rgba(240,180,41,0.15); animation: fadeUp 0.3s ease-out;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                <h3 style="display:flex; align-items:center; gap:10px;">âš™ï¸ Configure Gemini AI</h3>
                <button onclick="document.getElementById('ai-config-modal').remove()" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:20px;">âœ•</button>
            </div>

            <div style="display:flex; flex-direction:column; gap:24px;">
                <!-- Step 1 -->
                <div>
                    <div style="font-size:11px; font-weight:800; color:var(--primary); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Step 1: Get your free Gemini API key</div>
                    <p style="font-size:13px; color:var(--text-muted); margin-bottom:12px;">Visit Google AI Studio to get your free API key.</p>
                    <button class="glass" style="width:100%; padding:10px; border-radius:10px; font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;" onclick="window.open('https://aistudio.google.com/apikey', '_blank')">
                        Open aistudio.google.com <span style="font-size:14px;">â†—</span>
                    </button>
                </div>

                <!-- Step 2 -->
                <div>
                    <div style="font-size:11px; font-weight:800; color:var(--primary); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Step 2: Paste your key below</div>
                    <input id="modal-gemini-key" type="password" class="glass" style="width:100%; border-radius:12px; padding:12px; color:#fff; outline:none; border: 1px solid var(--border);" placeholder="AIzaSy..." value="${window.__GEMINI_API_KEY__ || ''}">
                </div>

                <!-- Step 3 -->
                <div>
                    <div style="font-size:11px; font-weight:800; color:var(--primary); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Step 3: Select Model</div>
                    <select id="modal-gemini-model" class="glass" style="width:100%; border-radius:12px; padding:12px; color:#fff; outline:none; border: 1px solid var(--border); background: #1a1a1a;">
                        <option value="gemini-2.0-flash" ${currentModel === 'gemini-2.0-flash' ? 'selected' : ''}>gemini-2.0-flash (Recommended)</option>
                        <option value="gemini-1.5-flash" ${currentModel === 'gemini-1.5-flash' ? 'selected' : ''}>gemini-1.5-flash</option>
                        <option value="gemini-1.5-pro" ${currentModel === 'gemini-1.5-pro' ? 'selected' : ''}>gemini-1.5-pro</option>
                    </select>
                </div>

                <!-- Step 4 -->
                <div>
                    <div style="font-size:11px; font-weight:800; color:var(--primary); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Step 4: Test connection</div>
                    <div style="display:flex; gap:12px; align-items:center;">
                        <button id="btn-test-key" class="glass" style="padding:10px 20px; border-radius:10px; font-size:12px; cursor:pointer;" onclick="testGeminiConnection()">Test connection</button>
                        <div id="test-result" style="font-size:12px; font-weight:600;"></div>
                    </div>
                </div>
            </div>
            
            <div style="margin-top:32px; padding-top:24px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:16px;">
                <button class="btn-gold" style="width:100%; justify-content:center; padding:14px;" onclick="saveGeminiConfig()">Save & Enable AI</button>
                <p style="font-size:10px; color:var(--text-muted); text-align:center; line-height:1.4;">
                    Your key is stored locally on your device only. It is never sent to any server except Google.
                </p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function testGeminiConnection() {
    const key = document.getElementById('modal-gemini-key').value.trim();
    const model = document.getElementById('modal-gemini-model').value;
    const resultEl = document.getElementById('test-result');
    const btn = document.getElementById('btn-test-key');

    if (!key) {
        resultEl.style.color = '#ff6b6b';
        resultEl.innerText = "âŒ Please enter a key";
        return;
    }

    btn.disabled = true;
    btn.innerText = "Testing...";
    resultEl.style.color = 'var(--text-muted)';
    resultEl.innerText = "Connecting...";

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    role: 'user',
                    parts: [{ text: 'Say only the word: connected' }]
                }],
                generationConfig: { maxOutputTokens: 10 }
            })
        });

        if (res.ok) {
            resultEl.style.color = '#0ed97a';
            resultEl.innerText = "âœ… Connected! Gemini ready.";
        } else {
            const err = await res.json();
            resultEl.style.color = '#ff6b6b';
            resultEl.innerText = `âŒ Error: ${err.error?.message || 'Invalid key'}`;
        }
    } catch (err) {
        resultEl.style.color = '#ff6b6b';
        resultEl.innerText = "âŒ Connection failed";
    } finally {
        btn.disabled = false;
        btn.innerText = "Test connection";
    }
}

function saveGeminiConfig() {
    const key = document.getElementById('modal-gemini-key').value.trim();
    const model = document.getElementById('modal-gemini-model').value;

    if (key) {
        localStorage.setItem('cc_gemini_key', key);
        localStorage.setItem('cc_gemini_model', model);
        window.__GEMINI_API_KEY__ = key;
        window.__GEMINI_MODEL__ = model;
        showToast('âœ… Gemini AI activated!');
        document.getElementById('ai-config-modal').remove();

        const activeTab = document.querySelector('.career-tab.active');
        if (activeTab) activeTab.click();
    } else {
        showToast("âš ï¸ Please enter an API key");
    }
}

function showAIError(message, fallbackFn) {
    // Find or create error banner
    let banner = document.getElementById('ai-error-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'ai-error-banner';
        banner.style.cssText = `
            background:rgba(255,107,107,0.1);
            border:1px solid rgba(255,107,107,0.3);
            border-radius:8px;
            padding:12px 16px;
            color:#ff6b6b;
            font-size:13px;
            margin-bottom:16px;
            display:flex;
            align-items:center;
            gap:8px;
            animation: fadeUp 0.3s ease-out;
        `;
        // Insert at top of current active page
        const activePage = document.querySelector('.page-content[style*="display: block"]')
            || document.querySelector('.page-content:not([style*="display:none"])')
            || document.body;
        activePage.insertBefore(banner, activePage.firstChild);
    }

    banner.innerHTML = `
        âš ï¸ ${message}
        <button onclick="this.parentElement.style.display='none'" 
        style="margin-left:auto;background:none;border:none;
        color:#ff6b6b;cursor:pointer;font-size:16px;">âœ•</button>
    `;
    banner.style.display = 'flex';

    // Auto hide after 6 seconds
    setTimeout(() => {
        if (banner) banner.style.display = 'none';
    }, 6000);

    // Run fallback function if provided
    if (fallbackFn && typeof fallbackFn === 'function') {
        fallbackFn();
    }
}

async function callGemini(systemPrompt, userMessage, maxTokens, wantJson) {
    const key = window.__GEMINI_API_KEY__;

    const geminiSystemPrompt = `${systemPrompt} 
    CRITICAL: Your entire response must be valid JSON only. 
    No markdown. No explanation. No code blocks. 
    Start immediately with { or [ and end with } or ]`;

    // â”€â”€ PROXY MODE â”€â”€
    // If no key is set, call our local proxy endpoint
    if (!key || key === '' || key.includes('PASTE')) {
        try {
            const proxyRes = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ systemPrompt: geminiSystemPrompt, userPrompt: userMessage })
            });

            if (proxyRes.ok) {
                const proxyData = await proxyRes.json();
                const text = proxyData.text;
                if (wantJson !== false) {
                    try {
                        return JSON.parse(text);
                    } catch {
                        const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
                        try {
                            return JSON.parse(clean);
                        } catch {
                            console.error('JSON parse failed:', text);
                            return null;
                        }
                    }
                }
                return text;
            } else {
                showAIError('Backend AI Proxy failed. Please configure your own API key.');
                return null;
            }
        } catch (e) {
            console.error("Proxy failure:", e);
            showAIError('Network error calling AI Proxy.');
            return null;
        }
    }

    try {
        const body = {
            system_instruction: {
                parts: [{ text: geminiSystemPrompt }]
            },
            contents: [
                {
                    role: 'user',
                    parts: [{ text: userMessage }]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: maxTokens || 1000
            }
        };

        if (wantJson !== false) {
            body.generationConfig.responseMimeType = 'application/json';
        }

        const model = window.__GEMINI_MODEL__ || 'gemini-2.0-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const status = response.status;

            if (status === 400) {
                showAIError('Bad request â€” check your prompt format', loadFallbackContent);
            } else if (status === 401 || status === 403) {
                showAIError('Invalid Gemini API key â€” get a new key from aistudio.google.com', loadFallbackContent);
            } else if (status === 429) {
                showAIError('Rate limit reached â€” Gemini free tier allows 15 requests/min.', loadFallbackContent);
            } else if (status === 500) {
                showAIError('Google server error â€” try again in a moment', loadFallbackContent);
            } else {
                showAIError(`Gemini API error ${status}: ${errData.error?.message || 'Unknown'}`, loadFallbackContent);
            }
            return null;
        }

        const data = await response.json();

        if (data.candidates?.[0]?.finishReason === 'SAFETY') {
            showAIError('Response blocked by safety filters â€” rephrase your prompt', loadFallbackContent);
            return null;
        }

        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
            showAIError('Empty response from Gemini â€” try again', loadFallbackContent);
            return null;
        }

        const text = data.candidates[0].content.parts[0].text;

        if (wantJson !== false) {
            try {
                return JSON.parse(text);
            } catch {
                const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
                try {
                    return JSON.parse(clean);
                } catch {
                    console.error('JSON parse failed:', text);
                    showAIError('AI response format error â€” using fallback content', loadFallbackContent);
                    return null;
                }
            }
        }

        return text;

    } catch (err) {
        console.error('Gemini API error:', err);
        if (err.name === 'TypeError' || err.message.includes('fetch')) {
            showAIError('Network error â€” check your internet connection', loadFallbackContent);
        } else {
            showAIError('AI temporarily unavailable â€” showing sample content', loadFallbackContent);
        }
        return null;
    }
}

async function callAI(systemPrompt, userPrompt) {
    return await callGemini(systemPrompt, userPrompt);
}

function loadFallbackContent() {
    const activePage = document.querySelector('.page-content[style*="display: block"]')
        || document.querySelector('.page-content:not([style*="display:none"])');
    if (!activePage) return;

    // Check which page is active and load relevant fallback
    const pageId = activePage.id;

    if (pageId === 'page-career') {
        const activeTab = document.querySelector('.career-tab.active');
        if (activeTab && activeTab.id === 'tab-btn-aptitude') {
            renderFallbackAptitude();
        }
        // Add more tab-specific fallbacks as needed
    }
}

function renderFallbackAptitude() {
    const container = document.getElementById('career-tab-content');
    if (!container) return;

    const fallbackQuestions = [
        {
            question: "If a train travels 60 km in 1 hour, how far will it travel in 2.5 hours?",
            options: ["A) 120 km", "B) 150 km", "C) 140 km", "D) 160 km"],
            answerIndex: 1, // B
            solution_explanation: "Distance = Speed Ã— Time = 60 Ã— 2.5 = 150 km",
            topic: "Time Speed Distance"
        },
        {
            question: "What is 15% of 240?",
            options: ["A) 36", "B) 32", "C) 38", "D) 34"],
            answerIndex: 0, // A
            solution_explanation: "15% of 240 = (15/100) Ã— 240 = 36",
            topic: "Percentages"
        },
        {
            question: "If 6 workers complete a job in 8 days, how many days will 4 workers take?",
            options: ["A) 10 days", "B) 12 days", "C) 14 days", "D) 16 days"],
            answerIndex: 1, // B
            solution_explanation: "Workers Ã— Days = constant. 6Ã—8 = 4Ã—D. D = 12 days",
            topic: "Time and Work"
        }
    ];

    renderAptitudeQuiz(fallbackQuestions, 'mixed');
}

function getTheme() {
    return document.body.classList.contains('light-theme') ? 'light' : 'dark';
}

function getCareerColors() {
    const isDark = getTheme() === 'dark';
    return {
        gold: isDark ? '#f0b429' : '#b8860b',
        blue: isDark ? '#4a8ff7' : '#2563eb',
        purple: isDark ? '#9b7cf8' : '#7c3aed',
        red: isDark ? '#ff6b6b' : '#dc2626',
        green: isDark ? '#0ed97a' : '#059669',
        teal: isDark ? '#26d9c7' : '#0d9488',
        cardBg: isDark ? '#16161c' : '#f8fafc',
        accentBar: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
    };
}

function updateCareerThemeVariables() {
    const root = document.documentElement;
    const colors = getCareerColors();
    root.style.setProperty('--career-blue', colors.blue);
    root.style.setProperty('--career-teal', colors.teal);
    root.style.setProperty('--career-purple', colors.purple);
}

async function renderAptitudeHub() {
    const container = document.getElementById('career-tab-content');
    const aptData = JSON.parse(localStorage.getItem('cc_aptitude') || '{}');
    const colors = getCareerColors();

    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:20px; margin-bottom:24px;">
            <div>
                <h2 style="font-size:26px; margin-bottom:6px;">Aptitude Mastery Hub</h2>
                <p style="color:var(--text-muted); font-size:14px; max-width:700px;">Improve your quantitative, reasoning and verbal performance with AI-guided practice sets tailored for top hiring companies.</p>
            </div>
            <button class="btn-gold" style="min-width:200px; justify-content:center;" onclick="launchAptitudeSet('mixed')">Launch AI Aptitude Mock</button>
        </div>

        <div class="grid-cols-3" style="gap:24px;">
            <div class="topic-card">
                <div style="font-size:32px; margin-bottom:18px;">ðŸ”¢</div>
                <h3 style="margin-bottom:8px;">Quantitative</h3>
                <p style="font-size:12px; color:var(--text-muted); margin-bottom:20px;">Numbers, algebra, geometry, DI and quick calculation drills.</p>
                <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
                    <span style="font-size:11px; color:var(--primary);">Avg Score: ${aptData.quant?.avgScore || 0}%</span>
                    <button class="btn-gold" style="padding:8px 14px; font-size:12px;" onclick="launchAptitudeSet('quant')">Start Practice</button>
                </div>
            </div>
            <div class="topic-card">
                <div style="font-size:32px; margin-bottom:18px;">ðŸ§©</div>
                <h3 style="margin-bottom:8px;">Logical Reasoning</h3>
                <p style="font-size:12px; color:var(--text-muted); margin-bottom:20px;">Puzzles, patterns, syllogisms and critical thinking drills.</p>
                <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
                    <span style="font-size:11px; color:var(--primary);">Avg Score: ${aptData.logical?.avgScore || 0}%</span>
                    <button class="btn-gold" style="padding:8px 14px; font-size:12px;" onclick="launchAptitudeSet('logical')">Start Practice</button>
                </div>
            </div>
            <div class="topic-card">
                <div style="font-size:32px; margin-bottom:18px;">ðŸ’¬</div>
                <h3 style="margin-bottom:8px;">Verbal Ability</h3>
                <p style="font-size:12px; color:var(--text-muted); margin-bottom:20px;">Grammar, comprehension, vocabulary and interview-ready expression.</p>
                <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
                    <span style="font-size:11px; color:var(--primary);">Avg Score: ${aptData.verbal?.avgScore || 0}%</span>
                    <button class="btn-gold" style="padding:8px 14px; font-size:12px;" onclick="launchAptitudeSet('verbal')">Start Practice</button>
                </div>
            </div>
        </div>

        <div class="glass-card" style="margin-top:24px; padding:28px; background:linear-gradient(135deg, rgba(99,102,241,0.08), ${colors.accentBar}); border-color:var(--secondary);">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:18px;">
                <div>
                    <div style="font-size:13px; font-weight:800; color:var(--secondary); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">AI Mixed Mock</div>
                    <h3 style="font-size:20px; margin-bottom:10px;">Simulated placement test</h3>
                    <p style="font-size:13px; color:var(--text-muted); line-height:1.7;">A balanced 5-question set for on-the-spot assessment and targeted review.</p>
                </div>
                <button class="btn-gold" style="background:var(--secondary); color:#fff; box-shadow:0 4px 15px rgba(99,102,241,0.3);" onclick="launchAptitudeSet('mixed')">Generate Mock</button>
            </div>
        </div>
    `;
}

function launchAptitudeSet(type) {
    const container = document.getElementById('career-tab-content');
    container.innerHTML = `
        <div style="text-align:center; padding:60px;">
            <div class="spinner"></div>
            <p style="margin-top:24px; color:var(--text-muted); font-size:14px;">Loading ${type} questions from question bank...</p>
        </div>
    `;

    // Small timeout so spinner renders, then load instantly from local bank
    setTimeout(() => {
        try {
            const questions = getAptitudeQuestions(type, null, 10);
            if (!questions || questions.length === 0) {
                container.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-muted);">No questions found for "${type}". Try another topic.</div>`;
                return;
            }
            showToast(`âœ… ${questions.length} ${type} questions loaded!`);
            renderAptitudeQuiz(questions, type);
        } catch (e) {
            console.error(e);
            container.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-muted);">Failed to load questions. Please refresh.</div>`;
        }
    }, 300);
}

function renderAptitudeQuiz(questions, type) {
    const container = document.getElementById('career-tab-content');
    let currentIdx = 0;
    let score = 0;
    const answers = [];

    const showQ = () => {
        const q = questions[currentIdx];
        container.innerHTML = `
            <div style="max-width:800px; margin:0 auto;">
                <div style="display:flex; justify-content:space-between; margin-bottom:32px;">
                    <span style="font-size:12px; color:var(--text-muted);">Question ${currentIdx + 1}/${questions.length}</span>
                </div>
                <h2 style="font-size:20px; margin-bottom:32px;">${q.question}</h2>
                <div style="display:flex; flex-direction:column; gap:12px;">
                    ${q.options.map((opt, i) => `<button class="glass-card" style="padding:16px; text-align:left; cursor:pointer; color:var(--primary); width:100%; border:1px solid var(--border);" onclick="selectAptOpt(${i})">${opt}</button>`).join('')}
                </div>
            </div>
        `;
    };

    window.selectAptOpt = (idx) => {
        const correct = idx === questions[currentIdx].answerIndex;
        if (correct) score++;
        answers.push({ q: questions[currentIdx], selected: idx, correct });
        currentIdx++;
        if (currentIdx < questions.length) showQ();
        else renderAptResults(score, questions.length, answers, type);
    };
    showQ();
}

function renderAptResults(score, total, results, type) {
    const container = document.getElementById('career-tab-content');
    const pct = Math.round((score / total) * 100);
    updateXP(score * 20);

    container.innerHTML = `
        <div style="max-width:600px; margin:0 auto; text-align:center;">
            <h2 style="font-size:32px; margin-top:40px;">Test Complete!</h2>
            <div style="font-size:48px; font-weight:800; color:var(--primary); margin:24px 0;">${pct}%</div>
            <div style="text-align:left; margin-top:40px;">
                ${results.map((res, i) => `
                    <div class="glass-card" style="padding:16px; margin-bottom:12px; border-left:4px solid ${res.correct ? '#0ed97a' : '#ff6b6b'};">
                        <div style="font-size:14px; font-weight:700;">${res.q.question}</div>
                        <div style="font-size:12px; color:var(--text-muted); margin-top:8px;">ðŸ’¡ ${res.q.solution_explanation}</div>
                    </div>
                `).join('')}
            </div>
            <button class="btn-gold" style="margin:40px auto;" onclick="renderAptitudeHub()">Continue</button>
        </div>
    `;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PLACEHOLDERS FOR REMAINING TABS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

async function renderFundamentalsHub() {
    const container = document.getElementById('career-tab-content');
    const challenge = SQL_CHALLENGES[state.sqlChallengeIndex || 0];

    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:20px; margin-bottom:24px;">
            <div>
                <h2 style="font-size:26px; margin-bottom:6px;">CS Fundamentals & Data Lab</h2>
                <p style="color:var(--text-muted); font-size:14px; max-width:700px;">Practice SQL, NoSQL, and core computer science concepts with guided challenges and AI review.</p>
            </div>
            <div style="display:flex; gap:12px; flex-wrap:wrap;">
                <button class="career-tab active" onclick="switchFundSubTab('sql')">SQL Lab</button>
                <button class="career-tab" onclick="switchFundSubTab('nosql')">NoSQL Shell</button>
                <button class="career-tab" onclick="switchFundSubTab('theory')">Core CS</button>
            </div>
        </div>

        <div id="fund-content">
            <div class="grid-cols-3" style="grid-template-columns: 1fr 1.5fr; gap:24px;">
                <div style="display:flex; flex-direction:column; gap:20px;">
                    <div class="glass-card" style="padding:28px;">
                        <div style="font-size:12px; font-weight:800; color:var(--primary); text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;">SQL Practice Schema</div>
                        <p style="font-size:12px; color:var(--text-muted); margin-bottom:16px;">Target Table: <code>Employees</code></p>
                        <div style="font-size:11px; background:rgba(255,255,255,0.03); padding:14px; border-radius:12px; overflow-x:auto;">
                            <code>ID (Int), Name (Text), Dept (Text), Salary (Int), JoinDate (Text)</code>
                        </div>
                    </div>
                    <div class="topic-card" style="padding:24px; border-color:var(--primary);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                            <div>
                                <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px;">Current Challenge</div>
                                <div style="font-size:18px; font-weight:700; margin-top:6px;">${challenge.title}</div>
                            </div>
                            <span style="font-size:12px; color:var(--primary);">${state.sqlChallengeIndex + 1}/${SQL_CHALLENGES.length}</span>
                        </div>
                        <p style="font-size:13px; color:var(--text-muted); line-height:1.7;">${challenge.desc}</p>
                    </div>
                    <button class="btn-gold" style="width:100%; justify-content:center;" onclick="executeSQL()">Run Query</button>
                    ${state.sqlSuccess ? `<button class="btn-gold" style="width:100%; justify-content:center; background:#0ed97a; border-color:#0ed97a; color:#000; margin-top:12px;" onclick="nextSQLChallenge()">Next Challenge â†’</button>` : ''}
                </div>
                <div style="display:flex; flex-direction:column; gap:18px;">
                    <div class="glass-card" style="padding:24px; min-height:320px; display:flex; flex-direction:column;">
                        <div style="font-size:12px; font-weight:800; color:var(--primary); text-transform:uppercase; letter-spacing:1px; margin-bottom:14px;">SQL Editor</div>
                        <div class="terminal-simulate" style="flex:1; min-height:220px; padding:0; border-radius:20px; overflow:hidden;">
                            <textarea id="sql-editor" style="width:100%; height:100%; background:transparent; border:none; color:#0ed97a; padding:24px; font-family:monospace; resize:none; outline:none;" spellcheck="false">${challenge.hint}</textarea>
                        </div>
                    </div>
                    <div id="sql-result" class="glass-card" style="min-height:150px; padding:24px; font-size:12px; overflow-x:auto;">
                        <span style="color:var(--text-muted);">Execute query to see results...</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    initSQLEditor();
}

let db_sql = null;
async function initSQLEditor() {
    if (typeof initSqlJs === 'undefined') {
        // Fallback if script didn't load
        console.error("SQL.js not loaded");
        return;
    }

    const SQL = await initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/${file}` });
    db_sql = new SQL.Database();

    // Create Dummy Data
    db_sql.run("CREATE TABLE Employees (ID int, Name text, Dept text, Salary int, JoinDate text);");
    db_sql.run("INSERT INTO Employees VALUES (1, 'Alice', 'HR', 45000, '2022-01-10');");
    db_sql.run("INSERT INTO Employees VALUES (2, 'Bob', 'IT', 65000, '2021-03-15');");
    db_sql.run("INSERT INTO Employees VALUES (3, 'Charlie', 'IT', 75000, '2020-11-20');");
    db_sql.run("INSERT INTO Employees VALUES (4, 'David', 'Sales', 55000, '2023-05-01');");
    db_sql.run("INSERT INTO Employees VALUES (5, 'Eve', 'IT', 48000, '2022-08-12');");
}

function executeSQL() {
    const query = document.getElementById('sql-editor').value;
    const resultDiv = document.getElementById('sql-result');

    try {
        const res = db_sql.exec(query);
        if (res.length === 0) {
            resultDiv.innerHTML = "Query executed successfully. No rows returned.";
            return;
        }

        const columns = res[0].columns;
        const values = res[0].values;

        let html = `<table style="width:100%; border-collapse:collapse; font-size:11px;"><thead><tr>`;
        columns.forEach(col => html += `<th style="text-align:left; border-bottom:1px solid var(--border); padding:8px; color:var(--primary);">${col}</th>`);
        html += `</tr></thead><tbody>`;
        values.forEach(row => {
            html += `<tr>`;
            row.forEach(val => html += `<td style="padding:8px; border-bottom:1px solid rgba(255,255,255,0.03);">${val}</td>`);
            html += `</tr>`;
        });
        html += `</tbody></table>`;

        resultDiv.innerHTML = html;
        updateXP(10);

        // Check for success (Progression Logic)
        const challenge = SQL_CHALLENGES[state.sqlChallengeIndex || 0];
        const isCorrect = challenge.check(query) && values.length === challenge.expectedRows;

        if (isCorrect) {
            state.sqlSuccess = true;
            showToast("ðŸŽ¯ Challenge Mastered! Click 'Next' to proceed.");
            renderFundamentalsHub(); // Refresh UI to show Next button
        }
    } catch (e) {
        resultDiv.innerHTML = `<span style="color:#ff6b6b;">SQL Error: ${e.message}</span>`;
    }
}

function nextSQLChallenge() {
    state.sqlSuccess = false;
    state.sqlChallengeIndex++;

    if (state.sqlChallengeIndex < SQL_CHALLENGES.length) {
        renderFundamentalsHub();
        showToast(`ðŸ“ Next Challenge: ${SQL_CHALLENGES[state.sqlChallengeIndex].title}`);
    } else {
        showToast("ðŸ† All SQL Challenges Completed!");
        switchFundSubTab('nosql');
    }
}

function switchFundSubTab(tab) {
    const container = document.getElementById('fund-content');
    document.querySelectorAll('.career-tab').forEach(b => {
        if (b.innerText.toLowerCase().includes(tab)) b.classList.add('active');
        else if (b.innerText.toLowerCase().includes('sql') || b.innerText.toLowerCase().includes('nosql') || b.innerText.toLowerCase().includes('core')) b.classList.remove('active');
    });

    if (tab === 'sql') renderFundamentalsHub();
    else if (tab === 'nosql') {
        container.innerHTML = `
            <div style="background:#050510; border-radius:16px; padding:32px; border:1px solid var(--border);">
                <div style="font-family:monospace; color:#0ed97a; margin-bottom:24px;">
                    <div>> MongoDB Simulation Shell v5.0</div>
                    <div>> Use <code>db.employees.find({dept: "IT"})</code></div>
                </div>
                <div style="display:flex; gap:12px;">
                    <input id="mongo-input" style="flex:1; background:transparent; border:none; border-bottom:1px solid var(--border); color:#fff; font-family:monospace; padding:8px; outline:none;" placeholder="Enter command..." onkeydown="if(event.key==='Enter') runMongoCmd()">
                </div>
                <div id="mongo-output" style="margin-top:24px; font-family:monospace; font-size:12px; max-height:300px; overflow-y:auto; color:var(--text-muted);"></div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="grid-cols-3" style="gap:24px;">
                ${['DBMS', 'OS', 'Networking', 'System Design'].map(topic => `
                    <div class="topic-card">
                        <div style="font-size:24px; margin-bottom:12px;">ðŸ“š</div>
                        <h3 style="margin-bottom:8px;">${topic}</h3>
                        <p style="font-size:12px; color:var(--text-muted); margin-bottom:20px;">AI-generated interview questions and flashcards for ${topic}.</p>
                        <button class="btn-gold" style="width:100%; justify-content:center; font-size:12px;" onclick="startCSReview('${topic}')">Start Review</button>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

function runMongoCmd() {
    const cmd = document.getElementById('mongo-input').value;
    const out = document.getElementById('mongo-output');

    let result = "Command not recognized in this simulation.";
    if (cmd.includes('find')) {
        result = `[
  { "_id": 1, "name": "Bob", "dept": "IT", "salary": 65000 },
  { "_id": 2, "name": "Charlie", "dept": "IT", "salary": 75000 }
]`;
    } else if (cmd.includes('insertOne')) {
        result = `{ "acknowledged": true, "insertedId": 6 }`;
        updateXP(10);
    }

    out.innerHTML = `<div style="color:var(--primary); margin-bottom:8px;">> ${cmd}</div><pre style="margin-bottom:20px;">${result}</pre>` + out.innerHTML;
    document.getElementById('mongo-input').value = '';
}

async function startCSReview(topic) {
    if (!checkAIConfig()) return;
    const container = document.getElementById('fund-content');
    container.innerHTML = `<div class="spinner" style="margin:40px auto;"></div><p style="text-align:center; color:var(--text-muted);">AI is generating an interactive ${topic} challenge...</p>`;

    try {
        const systemPrompt = `Generate 3 high-frequency MCQs for the CS topic: ${topic}. Format: Respond ONLY as JSON array of objects: [{question, options:[], answerIndex, solution_explanation}].`;
        const aiResponse = await callGemini(systemPrompt, `Generate quiz for ${topic}`);

        if (!aiResponse) {
            // Error already handled in callGemini
            container.innerHTML = `
                <div style="padding:40px; text-align:center;">
                    <p style="color:var(--text-muted); margin-bottom:20px;">AI Service temporarily unavailable or rate limited.</p>
                    <div style="display:flex; gap:12px; justify-content:center;">
                        <button class="btn-gold" onclick="startCSReview('${topic}')">ðŸ”„ Retry</button>
                        <button class="glass" style="padding:10px 24px; border-radius:12px; cursor:pointer;" onclick="switchFundSubTab('review')">Back</button>
                    </div>
                </div>
            `;
            return;
        }

        const questions = Array.isArray(aiResponse) ? aiResponse : JSON.parse(aiResponse.replace(/```json|```/g, '').trim());
        renderCSQuiz(questions, topic);
    } catch (e) {
        console.error(e);
        showAIError("AI failed to generate quiz. Please try again.", () => {
            container.innerHTML = `<button class="btn-gold" style="margin-top:12px;" onclick="startCSReview('${topic}')">Retry</button>`;
        });
    }
}

function renderCSQuiz(questions, topic) {
    const container = document.getElementById('fund-content');
    let currentIdx = 0;
    let score = 0;

    const showQ = () => {
        const q = questions[currentIdx];
        container.innerHTML = `
            <div style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
                <h3 style="font-size:16px;">${topic} Quiz (${currentIdx + 1}/${questions.length})</h3>
                <span style="font-size:12px; color:var(--primary);">Score: ${score}</span>
            </div>
            <div class="glass-card" style="padding:24px; animation: slideIn 0.3s ease-out;">
                <p style="font-size:16px; font-weight:700; margin-bottom:24px;">${q.question}</p>
                <div style="display:flex; flex-direction:column; gap:12px;">
                    ${q.options.map((opt, i) => `
                        <button class="glass" style="padding:16px; text-align:left; border-radius:12px; cursor:pointer; transition:all 0.2s;" onclick="checkCSAns(${i}, ${q.answerIndex}, '${q.solution_explanation.replace(/'/g, "\\'")}')">
                            ${opt}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    };

    window.checkCSAns = (idx, correct, explanation) => {
        const buttons = container.querySelectorAll('button.glass');
        buttons.forEach((btn, i) => {
            btn.disabled = true;
            if (i === correct) btn.style.borderColor = "#0ed97a";
            else if (i === idx) btn.style.borderColor = "#ff6b6b";
        });

        if (idx === correct) {
            score++;
            showToast("Correct! +10 XP");
            updateXP(10);
        }

        const foot = document.createElement('div');
        foot.style = "margin-top:24px; animation: fadeUp 0.3s ease-out;";
        foot.innerHTML = `
            <div style="font-size:12px; color:var(--text-muted); margin-bottom:20px; padding:16px; background:rgba(255,255,255,0.02); border-radius:12px;">
                <b style="color:var(--primary);">Explanation:</b> ${explanation}
            </div>
            <button class="btn-gold" style="width:100%; justify-content:center;" onclick="nextCSQ()">
                ${currentIdx < questions.length - 1 ? 'Next Question' : 'View Results'}
            </button>
        `;
        container.appendChild(foot);
    };

    window.nextCSQ = () => {
        currentIdx++;
        if (currentIdx < questions.length) showQ();
        else {
            container.innerHTML = `
                <div style="text-align:center; padding:40px;">
                    <div style="font-size:48px; margin-bottom:24px;">ðŸ†</div>
                    <h2 style="margin-bottom:8px;">Quiz Completed!</h2>
                    <p style="color:var(--text-muted); margin-bottom:32px;">You scored ${score} out of ${questions.length}</p>
                    <div style="display:flex; gap:12px; justify-content:center;">
                        <button class="btn-gold" onclick="startCSReview('${topic}')">Try Again</button>
                        <button class="glass" style="padding:10px 24px; border-radius:12px; cursor:pointer;" onclick="switchFundSubTab('review')">Finish</button>
                    </div>
                </div>
            `;
        }
    };

    showQ();
}

async function renderCompanyTracks() {
    const container = document.getElementById('career-tab-content');
    const companies = [
        { name: 'TCS', sector: 'Service', level: 'Entry', tech: ['Java', 'C', 'Aptitude'], minXp: 500 },
        { name: 'Capgemini', sector: 'Service', level: 'Mid', tech: ['Pseudo-code', 'SQL', 'C++'], minXp: 1200 },
        { name: 'Accenture', sector: 'Consulting', level: 'Mid', tech: ['Logic', 'Coding'], minXp: 1500 },
        { name: 'Deloitte', sector: 'Consulting', level: 'High', tech: ['Verbal', 'Logic'], minXp: 2000 },
        { name: 'Amazon', sector: 'Product', level: 'Dream', tech: ['DSA', 'System Design'], minXp: 5000 },
        { name: 'Zoho', sector: 'Product', level: 'Dream', tech: ['C', 'Logical'], minXp: 3000 },
        { name: 'Cognizant', sector: 'Service', level: 'Entry', tech: ['Python', 'SQL'], minXp: 800 },
        { name: 'Wipro', sector: 'Service', level: 'Entry', tech: ['Verbal', 'Coding'], minXp: 600 }
    ];

    const metrics = calculateCareerMetrics();

    container.innerHTML = `
        <div style="margin-bottom:24px;">
            <h2 style="font-size:24px; margin-bottom:4px;">Targeted Company Tracks</h2>
            <p style="color:var(--text-muted); font-size:14px;">Compatibility based on your current readiness (${metrics.readiness}%).</p>
        </div>

        <div class="grid-cols-3" style="gap:20px;">
            ${companies.map(c => {
        const comp = Math.min(100, Math.round((metrics.readiness * 0.7) + (state.user.xp / c.minXp * 30)));
        const isLocked = state.user.xp < c.minXp * 0.5;

        return `
                    <div class="glass-card topic-card" style="opacity: ${isLocked ? 0.6 : 1};">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                            <div style="font-weight:800; font-size:16px;">${c.name}</div>
                            <div style="font-size:10px; background:rgba(212,175,55,0.1); color:var(--primary); padding:2px 8px; border-radius:4px;">${comp}% Match</div>
                        </div>
                        <div style="font-size:11px; color:var(--text-muted); margin-bottom:16px;">${c.sector} â€¢ ${c.level}</div>
                        <div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:20px;">
                            ${c.tech.map(t => `<span style="font-size:9px; background:rgba(255,255,255,0.03); padding:2px 6px; border-radius:4px;">${t}</span>`).join('')}
                        </div>
                        ${isLocked ? `<div style="font-size:10px; color:#ff6b6b;">ðŸ”’ Requires ${c.minXp} XP</div>` : `<button class="btn-gold" style="width:100%; justify-content:center; font-size:12px;" onclick="startInterview('${c.name}')">Crack the Code</button>`}
                    </div>
                `;
    }).join('')}
        </div>
    `;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// REMAINING TABS (PLACEHOLDERS)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

async function renderInterviewHub() {
    const container = document.getElementById('career-tab-content');

    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:20px; margin-bottom:24px;">
            <div>
                <h2 style="font-size:26px; margin-bottom:6px;">Interview Simulation Lab</h2>
                <p style="color:var(--text-muted); font-size:14px; max-width:700px;">Practice technical, HR, and behavioral rounds with Gemini-powered feedback and real interview scenarios.</p>
            </div>
            <button class="btn-gold" style="min-width:200px; justify-content:center;" onclick="launchMockInterview('technical')">Quick Start AI Mock</button>
        </div>

        <div class="grid-cols-3" style="gap:24px;">
            <div class="topic-card" style="border-color:var(--primary);">
                <div style="font-size:32px; margin-bottom:16px;">ðŸ”§</div>
                <h3 style="margin-bottom:8px;">Technical Interview</h3>
                <p style="font-size:12px; color:var(--text-muted); margin-bottom:20px;">Get a technical question set with instant Gemini evaluation.</p>
                <button class="btn-gold" style="width:100%; justify-content:center;" onclick="launchMockInterview('technical')">Start Technical</button>
            </div>
            <div class="topic-card" style="border-color:var(--secondary);">
                <div style="font-size:32px; margin-bottom:16px;">ðŸ’¼</div>
                <h3 style="margin-bottom:8px;">Behavioral & HR</h3>
                <p style="font-size:12px; color:var(--text-muted); margin-bottom:20px;">Practice STAR responses and receive polished answers from AI.</p>
                <button class="btn-gold" style="width:100%; justify-content:center;" onclick="launchMockInterview('behavioral')">Start Behavioral</button>
            </div>
            <div class="topic-card" style="border-color:rgba(99,102,241,0.3);">
                <div style="font-size:32px; margin-bottom:16px;">ðŸ“</div>
                <h3 style="margin-bottom:8px;">Online Test Simulator</h3>
                <p style="font-size:12px; color:var(--text-muted); margin-bottom:20px;">AI-curated aptitude + reasoning problems in timed format.</p>
                <button class="btn-gold" style="width:100%; justify-content:center;" onclick="launchOTSim()">Launch OT Sim</button>
            </div>
        </div>

        <div class="glass-card" style="margin-top:24px; padding:24px; display:grid; grid-template-columns:1fr 1fr; gap:24px;">
            <div>
                <h3 style="font-size:16px; margin-bottom:12px;">Your interview readiness</h3>
                <p style="font-size:13px; color:var(--text-muted); line-height:1.7;">Use this lab to refine answers, practice live delivery, and strengthen your situational judgment before the next recruiter call.</p>
            </div>
            <div style="display:flex; flex-direction:column; gap:12px;">
                <button class="btn-gold" style="justify-content:center;" onclick="launchMockInterview('hr')">Mock HR Round</button>
                <button class="btn-gold" style="justify-content:center;" onclick="showInterviewPrepModal()">Company-Specific Prep</button>
            </div>
        </div>

        <div class="glass-card" style="margin-top:24px; padding:24px;">
            <h3 style="font-size:16px; margin-bottom:16px;">Recent Practice</h3>
            <div id="interview-history-list" style="color:var(--text-muted); font-size:13px; text-align:center; padding:20px;">No recent interview sessions found.</div>
        </div>
    `;
}

function showInterviewPrepModal() {
    launchMockInterview('company');
}

function launchMockInterview(type) {
    const container = document.getElementById('career-tab-content');
    const labelMap = {
        technical: 'Technical Interview',
        behavioral: 'Behavioral Interview',
        hr: 'HR Interview',
        company: 'Company-Specific Interview'
    };

    container.innerHTML = `
        <div style="text-align:center; padding:100px;">
            <div class="spinner"></div>
            <p style="margin-top:24px; color:var(--text-muted); font-size:14px;">Preparing your ${labelMap[type] || 'mock'} session...</p>
        </div>
    `;

    setTimeout(() => {
        try {
            let questions = [];
            if (type === 'hr' || type === 'behavioral' || type === 'company') {
                questions = getBehavioralQuestions("your dream company", 5);
            } else {
                questions = [
                    "Explain the concept of Object-Oriented Programming (OOP).",
                    "What is the difference between an Array and a Linked List?",
                    "How does garbage collection work in modern languages?",
                    "Explain a project where you solved a complex technical problem.",
                    "What are the ACID properties in database management?"
                ];
            }
            openInterviewSession(labelMap[type] || 'Mock Interview', questions, type);
        } catch (e) {
            console.error('Mock interview generation failed:', e);
            alert('Could not start the simulated interview. Please try again.');
            renderInterviewHub();
        }
    }, 400);
}

let webcamStream = null;

function openInterviewSession(title, questions, type = "technical") {
    interviewState.active = true;
    interviewState.company = title;
    interviewState.questions = questions;
    interviewState.currentIndex = 0;
    interviewState.answers = [];
    interviewState.timer = 0;

    const modal = document.getElementById('interview-modal');
    modal.style.display = 'flex';
    document.getElementById('int-company-title').innerText = `${title}`;
    document.getElementById('int-topic').innerText = title;
    renderInterviewQuestion();

    if (interviewState.timerInterval) {
        clearInterval(interviewState.timerInterval);
    }

    interviewState.timerInterval = setInterval(() => {
        interviewState.timer += 1;
        const minutes = String(Math.floor(interviewState.timer / 60)).padStart(2, '0');
        const seconds = String(interviewState.timer % 60).padStart(2, '0');
        const timerText = `ðŸ•’ ${minutes}:${seconds}`;
        const timerElement = document.getElementById('int-timer');
        if (timerElement) timerElement.innerText = timerText;
    }, 1000);

    // Setup Webcam for HR / Behavioral Simulation
    const videoElem = document.getElementById('interview-webcam');
    if (videoElem) {
        if (type === 'hr' || type === 'behavioral' || type === 'company') {
            videoElem.style.display = 'block';
            navigator.mediaDevices.getUserMedia({ video: true, audio: false })
                .then(stream => {
                    webcamStream = stream;
                    videoElem.srcObject = stream;
                })
                .catch(err => {
                    console.error("Camera access denied or unavilable: ", err);
                    showToast("No camera detected for HR simulation.");
                    videoElem.style.display = 'none';
                });
        } else {
            videoElem.style.display = 'none';
        }
    }
}

async function launchOTSim() {
    if (!checkAIConfig()) return;
    launchAptitudeSet('mixed');
}

async function launchGDPrep() {
    const container = document.getElementById('career-tab-content');
    container.innerHTML = `
        <div class="glass-card" style="padding:32px; max-width:800px; margin:0 auto;">
            <h2 style="font-size:20px; margin-bottom:16px;">AI-Guided Group Discussion Prep</h2>
            <div style="background:rgba(212,175,55,0.05); border:1px solid var(--primary); padding:16px; border-radius:12px; margin-bottom:24px;">
                <div style="font-size:11px; font-weight:800; color:var(--primary); margin-bottom:8px;">CURRENT GD TOPIC</div>
                <p style="font-size:14px; font-weight:700;">"Is work-life balance a myth in the modern corporate world?"</p>
            </div>
            <textarea id="gd-input" style="width:100%; height:120px; background:rgba(0,0,0,0.2); border:1px solid var(--border); border-radius:12px; color:#fff; padding:16px; margin-bottom:20px; outline:none;" placeholder="Type your opening statement or a specific point here..."></textarea>
            <button class="btn-gold" style="width:100%; justify-content:center;" onclick="evaluateGDPoint()">Analyze Statement</button>
            <div id="gd-feedback" style="margin-top:24px;"></div>
        </div>
    `;
}

async function evaluateGDPoint() {
    if (!window.__GEMINI_API_KEY__) return showAIError("Gemini API Key not set.");
    const input = document.getElementById('gd-input').value;
    const feedbackDiv = document.getElementById('gd-feedback');
    if (!input) return;

    feedbackDiv.innerHTML = `<div class="spinner" style="margin:20px auto;"></div>`;

    try {
        const systemPrompt = `You are a GD moderator. Evaluate the user's statement for clarity, logic, and professional phrasing. Provide 3 specific ways to improve the statement to make it more impactful. Respond in JSON with {evaluation, refined_version, tips: []}.`;
        const data = await callGemini(systemPrompt, `Analyze this GD point: ${input}`);

        if (!data) return; // Error handled in callGemini

        feedbackDiv.innerHTML = `
            <div class="glass-card" style="padding:20px; border-left:4px solid var(--primary);">
                <div style="font-size:13px; font-weight:800; margin-bottom:12px; color:var(--primary);">AI Analysis</div>
                <p style="font-size:12px; margin-bottom:16px;">${data.evaluation || 'Your point is clear but could be more punchy.'}</p>
                <div style="font-size:11px; font-weight:700; color:var(--text); margin-bottom:8px;">REFINED VERSION</div>
                <div style="font-size:13px; font-style:italic; color:#0ed97a; margin-bottom:16px;">"${data.refined_version || '...'}"</div>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    ${(data.tips || []).map(tip => `<div style="font-size:11px; color:var(--text-muted);">ðŸŽ¯ ${tip}</div>`).join('')}
                </div>
            </div>
        `;
        updateXP(25);
    } catch (e) {
        showAIError("Failed to analyze GD point.");
        feedbackDiv.innerHTML = `<p style="color:#ff6b6b;">Failed to analyze. Check connection.</p>`;
    }
}
async function renderSoftSkillsHub() {
    const container = document.getElementById('career-tab-content');

    container.innerHTML = `
        <div style="margin-bottom:24px;">
            <h2 style="font-size:24px; margin-bottom:4px;">Soft Skills & Communication</h2>
            <p style="color:var(--text-muted); font-size:14px;">Master the art of professional communication and HR rounds.</p>
        </div>

        <div class="grid-cols-2" style="gap:24px;">
            <!-- HR Question Bank -->
            <div class="glass-card" style="padding:28px;">
                <h3 style="margin-bottom:16px;">ðŸ’¡ HR Answer Evaluator</h3>
                <p style="font-size:12px; color:var(--text-muted); margin-bottom:20px;">Submit your answers to common HR questions for AI scoring and refinement.</p>
                <div style="margin-bottom:16px;">
                    <select id="hr-q-select" style="width:100%; border-radius:8px; padding:8px; font-size:12px; background:var(--surface-light); color:var(--text); border:1px solid var(--border); outline:none;">
                        <option value="Tell me about yourself">"Tell me about yourself"</option>
                        <option value="What are your strengths?">"What are your strengths?"</option>
                        <option value="Why should we hire you?">"Why should we hire you?"</option>
                        <option value="Describe a difficult situation.">"Describe a difficult situation (STAR method)"</option>
                    </select>
                </div>
                <textarea id="hr-answer-input" style="width:100%; height:100px; background:var(--surface-light); border:1px solid var(--border); border-radius:12px; color:var(--text); padding:12px; font-size:13px; margin-bottom:16px; outline:none; font-family:inherit;" placeholder="Type your answer..."></textarea>
                <button class="btn-gold" style="width:100%; justify-content:center;" onclick="evaluateHRAnswer()">Get AI Feedback</button>
            </div>

            <!-- Email Practice -->
            <div class="glass-card" style="padding:28px;">
                <h3 style="margin-bottom:16px;">ðŸ“§ Professional Email Grader</h3>
                <p style="font-size:12px; color:var(--text-muted); margin-bottom:20px;">Write a follow-up or cold email. AI will score it on tone and clarity.</p>
                <div style="font-size:11px; color:var(--primary); margin-bottom:12px;">Scenario: Follow-up after interview</div>
                <textarea id="email-input" style="width:100%; height:150px; background:var(--surface-light); border:1px solid var(--border); border-radius:12px; color:var(--text); padding:12px; font-size:13px; margin-bottom:16px; outline:none; font-family:inherit;" placeholder="Subject: ...\n\nDear Hiring Manager..."></textarea>
                <button class="btn-gold" style="width:100%; justify-content:center;" onclick="gradeEmail()">Grade Email</button>
            </div>
        </div>

        <div id="softskills-feedback-area" style="margin-top:24px;"></div>
    `;
}

async function evaluateHRAnswer() {
    if (!window.__GEMINI_API_KEY__) return showAIError("Gemini API Key not set.");
    const q = document.getElementById('hr-q-select').value;
    const ans = document.getElementById('hr-answer-input').value;
    const area = document.getElementById('softskills-feedback-area');
    if (!ans) return;

    area.innerHTML = `<div class="spinner" style="margin:20px auto;"></div>`;

    try {
        const systemPrompt = `You are an HR expert. Evaluate the user's answer to the HR question "${q}". Provide a score out of 10, positive points, and a refined version. Respond only in JSON with {score, feedback, refined_version}.`;
        const data = await callGemini(systemPrompt, `Answer: ${ans}`);

        if (!data) return; // Error handled in callGemini

        area.innerHTML = `
            <div class="glass-card" style="padding:24px; border-left:4px solid var(--primary);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                    <div style="font-weight:800;">Question: ${q}</div>
                    <div style="font-size:18px; font-weight:800; color:var(--primary);">${data.score}/10</div>
                </div>
                <div style="font-size:13px; color:var(--text-muted); line-height:1.6; margin-bottom:20px;">${data.feedback || 'Good attempt.'}</div>
                <div style="font-size:11px; font-weight:700; text-transform:uppercase; margin-bottom:8px;">Refined Version (High Impact)</div>
                <div style="background:rgba(212,175,55,0.05); padding:16px; border-radius:12px; font-size:14px; font-style:italic; line-height:1.6;">${data.refined_version}</div>
            </div>
        `;
        updateXP(20);
    } catch (e) {
        showAIError("Failed to evaluate HR answer.");
        area.innerHTML = `<p style="color:#ff6b6b;">Failed. Check connection.</p>`;
    }
}

async function gradeEmail() {
    if (!window.__GEMINI_API_KEY__) return showAIError("Gemini API Key not set.");
    const email = document.getElementById('email-input').value;
    const area = document.getElementById('softskills-feedback-area');
    if (!email) return;

    area.innerHTML = `<div class="spinner" style="margin:20px auto;"></div>`;

    try {
        const systemPrompt = `Evaluate this professional email for tone, clarity, and grammatical correctness. Give 3 improvement tips and a professional score. Respond in JSON with {score, tips: []}.`;
        const data = await callGemini(systemPrompt, `Email: ${email}`);

        if (!data) return; // Error handled in callGemini

        area.innerHTML = `
            <div class="glass-card" style="padding:24px; border-left:4px solid var(--secondary);">
                <h3 style="margin-bottom:16px;">Email Score: ${data.score || '8'}/10</h3>
                <div style="display:flex; flex-direction:column; gap:12px;">
                    ${(data.tips || []).map(tip => `<div style="font-size:13px;">âœ… ${tip}</div>`).join('')}
                </div>
            </div>
        `;
        updateXP(20);
    } catch (e) {
        showAIError("Failed to grade email.");
        area.innerHTML = `<p style="color:#ff6b6b;">Failed. Check connection.</p>`;
    }
}

async function renderDocumentsHub() {
    const container = document.getElementById('career-tab-content');
    container.innerHTML = `
        <div style="margin-bottom:24px;">
            <h2 style="font-size:24px; margin-bottom:4px;">Professional Documents Hub</h2>
            <p style="color:var(--text-muted); font-size:14px;">Build ATS-friendly resumes and tailored cover letters.</p>
        </div>
        <div class="grid-cols-2" style="gap:24px;">
            <div class="glass-card" style="padding:28px;">
                <h3 style="margin-bottom:16px;">ðŸ“„ AI Resume Builder</h3>
                <p style="font-size:12px; color:var(--text-muted); margin-bottom:20px;">Generates a high-impact resume using your CodeConfidence profile.</p>
                <button class="btn-gold" style="width:100%; justify-content:center;" onclick="generateAIResume()">Generate Resume</button>
            </div>
            <div class="glass-card" style="padding:28px;">
                <h3 style="margin-bottom:16px;">âœï¸ Cover Letter Generator</h3>
                <p style="font-size:12px; color:var(--text-muted); margin-bottom:20px;">Tailor your cover letter for specific roles.</p>
                <input id="cl-company" style="width:100%; background:var(--surface-light); border:1px solid var(--border); border-radius:8px; color:var(--text); padding:10px; font-size:12px; margin-bottom:12px; outline:none; font-family:inherit;" placeholder="Company Name">
                <input id="cl-role" style="width:100%; background:var(--surface-light); border:1px solid var(--border); border-radius:8px; color:var(--text); padding:10px; font-size:12px; margin-bottom:20px; outline:none; font-family:inherit;" placeholder="Role">
                <button class="btn-gold" style="width:100%; justify-content:center;" onclick="generateCoverLetter()">Generate Letter</button>
            </div>
        </div>
        <div id="docs-output-area" style="margin-top:24px;"></div>
    `;
}

async function generateAIResume() {
    const area = document.getElementById('docs-output-area');
    area.innerHTML = `
        <div style="text-align:center; padding:40px;">
            <div class="spinner" style="margin:0 auto 20px;"></div>
            <h3>Gemini AI is crafting your professional resume...</h3>
            <p style="font-size:12px; color:var(--text-muted); margin-top:8px;">Analyzing your placement readiness and skills.</p>
        </div>
    `;

    try {
        const user = state.user;
        const metrics = calculateCareerMetrics();
        const profileContext = {
            name: user.name,
            education: `${user.college} - ${user.branch} (${user.year})`,
            cgpa: user.cgpa,
            skills: user.skillsList || Object.keys(user.skills).join(', '),
            readiness: metrics.readiness,
            codingXP: user.xp,
            badges: (user.badges || []).filter(b => b.earned).map(b => b.name)
        };

        const systemPrompt = "You are a professional resume architect. Generate a complete, high-impact, ATS-friendly resume in HTML format. Use premium typography (serif for headings) and a clean layout. Include sections: Professional Summary, Education, Technical Skills (categorized), Projects, and Achievements. Do NOT include <html> or <body> tags, just a <div> wrapper. Respond ONLY with the HTML.";
        const userPrompt = `Generate a resume for: ${JSON.stringify(profileContext)}. Make it look like a high-tier product company application.`;

        const html = await callGemini(systemPrompt, userPrompt, 4000, false);

        if (!html) throw new Error("AI failed to generate resume");

        area.innerHTML = `
            <div class="glass-card" style="padding:40px; background:#fff; color:#000; font-family:serif; box-shadow:0 20px 50px rgba(0,0,0,0.3); animation: fadeUp 0.5s ease-out; max-width:800px; margin:0 auto; overflow:hidden;">
                <div style="text-align:right; margin-bottom:20px; font-family:sans-serif;">
                    <button class="btn-gold" style="padding:4px 12px; font-size:10px; border-radius:6px;" onclick="window.print()">Print PDF</button>
                    <button class="btn-gold" style="padding:4px 12px; font-size:10px; border-radius:6px; background:transparent; border:1px solid #000; color:#000; margin-left:8px;" onclick="generateAIResume()">Regenerate</button>
                </div>
                <div id="resume-printable-content">
                    ${html}
                </div>
            </div>
        `;
        updateXP(50);
        showToast("ðŸŽ“ AI Resume Generated!");
    } catch (e) {
        console.error(e);
        showAIError("AI Resume generation failed due to rate limits or connection issue.", () => {
            area.innerHTML = `
                <div style="padding:40px; text-align:center;">
                    <button class="btn-gold" style="margin:0 auto;" onclick="generateAIResume()">ðŸ”„ Retry Resume Build</button>
                </div>
            `;
        });
    }
}

async function generateCoverLetter() {
    const company = document.getElementById('cl-company').value.trim();
    const role = document.getElementById('cl-role').value.trim();

    if (!company || !role) return showToast("Please enter company and role");

    const area = document.getElementById('docs-output-area');
    area.innerHTML = `
        <div style="text-align:center; padding:40px;">
            <div class="spinner" style="margin:0 auto 20px;"></div>
            <h3>AI is drafting your tailored cover letter...</h3>
        </div>
    `;

    try {
        const user = state.user;
        const systemPrompt = "You are a recruitment expert. Generate a high-impact, professional cover letter tailored for the specified company and role. Use a standard business letter format. Focus on the user's skills and potential. Do NOT include <html> or <body> tags, just a <div> wrapper. Respond ONLY with the HTML.";
        const userPrompt = `Generate a cover letter for ${user.name} applying to ${company} as a ${role}. User context: ${user.college}, ${user.branch}, Skills: ${user.skillsList || Object.keys(user.skills).join(', ')}.`;

        const html = await callGemini(systemPrompt, userPrompt, 2500, false);

        if (!html) throw new Error("AI failed to generate cover letter");

        area.innerHTML = `
            <div class="glass-card" style="padding:40px; background:#fff; color:#000; font-family:serif; box-shadow:0 20px 50px rgba(0,0,0,0.3); animation: fadeUp 0.5s ease-out; max-width:800px; margin:0 auto;">
                <div style="text-align:right; margin-bottom:20px; font-family:sans-serif;">
                    <button class="btn-gold" style="padding:4px 12px; font-size:10px; border-radius:6px;" onclick="window.print()">Print PDF</button>
                    <button class="btn-gold" style="padding:4px 12px; font-size:10px; border-radius:6px; background:transparent; border:1px solid #000; color:#000; margin-left:8px;" onclick="generateCoverLetter()">Regenerate</button>
                </div>
                ${html}
            </div>
        `;
        updateXP(30);
        showToast("ðŸ“§ AI Cover Letter Created!");
    } catch (e) {
        console.error(e);
        showAIError("Failed to generate cover letter.", renderDocumentsHub);
    }
}

