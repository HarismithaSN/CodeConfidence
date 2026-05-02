async function launchCodingPrep(company) {
    // Redirect to challenges page with company filter
    showPage('challenges');
    // Could add company-specific filtering here
}

function launchBehavioralPrep(company) {
    const container = document.getElementById('career-tab-content');
    container.innerHTML = `
        <div style="text-align:center; padding:60px;">
            <div class="spinner"></div>
            <p style="margin-top:24px; color:var(--text-muted); font-size:14px;">Loading ${company} behavioral questions...</p>
        </div>
    `;

    setTimeout(() => {
        try {
            const data = {
                questions: getBehavioralQuestions(company, 5),
                tips: [
                    "Use the S.T.A.R. Method (Situation, Task, Action, Result).",
                    "Keep your examples relevant and concise.",
                    "Highlight team collaboration and leadership."
                ]
            };
            renderBehavioralPrep(data, company);
        } catch (e) {
            console.error('Behavioral prep failed:', e);
            renderBehavioralPrep({
                questions: [
                    'Tell me about a time you faced a challenge and how you overcame it.',
                    'Describe a situation where you worked in a team.',
                    'How do you handle pressure and deadlines?'
                ],
                tips: ['Use STAR method', 'Be specific', 'Show self-awareness']
            }, company);
        }
    }, 300);
}

function practiceAnswer(question) {
    openInterviewSession("Behavioral Practice", [question], "behavioral");
}

function renderBehavioralPrep(data, company) {
    const container = document.getElementById('career-tab-content');

    container.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 32px;">
                <h2 style="font-size: 28px;">🧠 ${company} Behavioral Interview</h2>
                <p style="color: var(--text-muted);">Practice HR round questions</p>
            </div>

            <div class="glass-card" style="padding: 32px; margin-bottom: 24px;">
                <h3 style="font-size: 20px; margin-bottom: 16px;">Common Questions</h3>
                ${data.questions.map((q, index) => `
                    <div style="padding: 16px; background: rgba(255,255,255,0.02); border-radius: 12px; margin-bottom: 12px;">
                        <div style="font-weight: 500; margin-bottom: 8px;">${index + 1}. ${q}</div>
                        <button class="btn-gold" style="font-size: 12px; padding: 6px 12px;" onclick="practiceAnswer('${q.replace(/'/g, "\\'")}')">
                            Practice Answer
                        </button>
                    </div>
                `).join('')}
            </div>

            <div class="glass-card" style="padding: 24px;">
                <h3 style="font-size: 20px; margin-bottom: 16px;">💡 Interview Tips</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                    ${data.tips.map(tip => `
                        <div style="padding: 12px 16px; background: rgba(168,85,247,0.1); border-radius: 8px; border: 1px solid rgba(168,85,247,0.3);">
                            ${tip}
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 32px;">
                <button class="btn-gold" onclick="renderCompanyTracks()">Back to Companies</button>
            </div>
        </div>
    `;
}
