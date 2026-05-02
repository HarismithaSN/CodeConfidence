async function launchFullMockTest(company) {
    // Launch a comprehensive mock test combining all types
    const container = document.getElementById('career-tab-content');

    container.innerHTML = `
        <div style="max-width: 600px; margin: 0 auto; text-align: center;">
            <div class="glass-card" style="padding: 40px;">
                <h2 style="font-size: 28px; margin-bottom: 16px;">🎯 ${company} Full Mock Test</h2>
                <p style="color: var(--text-muted); margin-bottom: 32px;">
                    Complete placement simulation including aptitude, coding, and interview rounds
                </p>

                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <button class="btn-gold" onclick="launchCompanyAptitude('${company}')">
                        🧮 Start with Aptitude Test
                    </button>
                    <button class="btn-gold" onclick="launchCodingPrep('${company}')">
                        💻 Coding Round
                    </button>
                    <button class="btn-gold" onclick="launchMockInterview('technical')">
                        🔧 Technical Interview
                    </button>
                    <button class="btn-gold" onclick="launchMockInterview('behavioral')">
                        🧠 HR Interview
                    </button>
                </div>

                <button class="btn-gold" style="margin-top: 24px; opacity: 0.7;" onclick="renderCompanyTracks()">
                    Back to Companies
                </button>
            </div>
        </div>
    `;
}
