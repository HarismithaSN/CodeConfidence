import re

with open('logic.js', 'r', encoding='utf-8') as f:
    code = f.read()

new_startCSReview = """async function startCSReview(topic) {
    const container = document.getElementById('fund-content');
    container.innerHTML = `<div class="spinner" style="margin:40px auto;"></div><p style="text-align:center; color:var(--text-muted);">Loading offline ${topic} questions...</p>`;

    try {
        const resp = await fetch('/Data/technical.json');
        if (!resp.ok) throw new Error("Failed to load local DB");
        const data = await resp.json();
        
        const categoryMap = {
            'DBMS': 'Database Management Systems (DBMS)',
            'OS': 'Operating Systems (OS)',
            'Networking': 'Computer Networks (CN)',
            'System Design': 'System Design (Basics)'
        };
        const targetCat = categoryMap[topic] || topic;
        const catData = data.categories?.find(c => c.category === targetCat);
        
        if (!catData || !catData.questions || catData.questions.length === 0) {
            throw new Error("No questions found for " + topic);
        }

        const sample = catData.questions.sort(() => 0.5 - Math.random()).slice(0, 5);
        
        const questions = sample.map(q => {
            const answerText = typeof q.answer === 'string' ? q.answer : JSON.stringify(q.answer, null, 2);
            return {
                question: q.question,
                options: ["Reveal Answer"],
                answerIndex: 0,
                solution_explanation: answerText
            };
        });

        renderCSQuiz(questions, topic);
    } catch (e) {
        console.error("Offline UI failed", e);
        container.innerHTML = `
            <div style="padding:40px; text-align:center;">
                <p style="color:var(--text-muted); margin-bottom:20px;">Could not load offline questions. Ensure Data/technical.json exists.</p>
                <div style="display:flex; gap:12px; justify-content:center;">
                    <button class="glass" style="padding:10px 24px; border-radius:12px; cursor:pointer;" onclick="switchFundSubTab('review')">Back</button>
                </div>
            </div>
        `;
    }
}"""
code = re.sub(r"async function startCSReview\(topic\).*?function renderCSQuiz", new_startCSReview + "\n\nfunction renderCSQuiz", code, flags=re.DOTALL)

new_renderCSQuiz = """function renderCSQuiz(questions, topic) {
    const container = document.getElementById('fund-content');
    let currentIdx = 0;
    let score = 0;
    window.currentOfflineQuestions = questions;

    const showQ = () => {
        const q = questions[currentIdx];
        container.innerHTML = `
            <div style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
                <h3 style="font-size:16px;">${topic} Flashcards (${currentIdx + 1}/${questions.length})</h3>
                <span style="font-size:12px; color:var(--primary);">Session XP: ${score * 10}</span>
            </div>
            <div class="glass-card" style="padding:24px; animation: slideIn 0.3s ease-out;">
                <p style="font-size:16px; font-weight:700; margin-bottom:24px;">${q.question}</p>
                <div style="display:flex; flex-direction:column; gap:12px;">
                    ${q.options.map((opt, i) => `
                        <button class="glass" style="padding:16px; text-align:center; border-radius:12px; cursor:pointer; transition:all 0.2s;" onclick="checkCSAns(${i})">
                            ${opt}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    };

    window.checkCSAns = (idx) => {
        const q = window.currentOfflineQuestions[currentIdx];
        const buttons = container.querySelectorAll('button.glass');
        buttons.forEach((btn, i) => {
            btn.disabled = true;
            if (i === q.answerIndex) btn.style.borderColor = "#0ed97a";
            else if (i === idx) btn.style.borderColor = "#ff6b6b";
        });

        if (idx === q.answerIndex) {
            score++;
            updateXP(10);
        }

        const foot = document.createElement('div');
        foot.style = "margin-top:24px; animation: fadeUp 0.3s ease-out;";
        foot.innerHTML = `
            <div style="font-size:12px; color:var(--text-muted); margin-bottom:20px; padding:16px; background:rgba(255,255,255,0.02); border-radius:12px; white-space:pre-wrap; font-family:monospace;">
                <b style="color:var(--primary);">Explanation:</b>\n${q.solution_explanation}
            </div>
            <button class="btn-gold" style="width:100%; justify-content:center;" onclick="nextCSQ()">
                ${currentIdx < questions.length - 1 ? 'Next Question' : 'Finish'}
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
                    <div style="font-size:48px; margin-bottom:24px;">🏆</div>
                    <h2 style="margin-bottom:8px;">Session Completed!</h2>
                    <p style="color:var(--text-muted); margin-bottom:32px;">You completed ${score} concepts.</p>
                    <div style="display:flex; gap:12px; justify-content:center;">
                        <button class="btn-gold" onclick="startCSReview('${topic}')">Practice Again</button>
                        <button class="glass" style="padding:10px 24px; border-radius:12px; cursor:pointer;" onclick="switchFundSubTab('review')">Back</button>
                    </div>
                </div>
            `;
        }
    };
    showQ();
}"""
code = re.sub(r"function renderCSQuiz\(questions, topic\) \{.*?showQ\(\);\n\}", new_renderCSQuiz, code, flags=re.DOTALL)

old_cam = """    if (videoElem) {
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
}"""
new_cam = """    if (videoElem) {
        videoElem.style.display = 'block';
        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            .then(stream => {
                webcamStream = stream;
                videoElem.srcObject = stream;
            })
            .catch(err => {
                console.error("Camera access denied or unavilable: ", err);
                showToast("No camera detected, proceeding without video.");
                videoElem.style.display = 'none';
            });
    }
}"""
if old_cam in code:
    code = code.replace(old_cam, new_cam)
else:
    print("WARNING: Could not find exact old_cam block!")

with open('logic.js', 'w', encoding='utf-8') as f:
    f.write(code)
