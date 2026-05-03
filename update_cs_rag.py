import re

with open("logic.js", "r", encoding="utf-8") as f:
    code = f.read()

new_startCSReview = """async function startCSReview(topic) {
    const container = document.getElementById('fund-content');
    container.innerHTML = `<div class="spinner" style="margin:40px auto;"></div><p style="text-align:center; color:var(--text-muted);">AI is generating an interactive ${topic} challenge using RAG...</p>`;

    try {
        let ragContext = "";
        let localQuestions = [];
        try {
            const files = ['/Data/core_cs.json', '/Data/technical.json', '/Data/technical (1).json', '/Data/nosql_shell.json', '/Data/sql_lab.json'];
            for (let file of files) {
                try {
                    const resp = await fetch(file);
                    if (resp.ok) {
                        const data = await resp.json();
                        // Search deep for questions related to topic
                        if (data.categories) {
                            for (let cat of data.categories) {
                                if (cat.category.toLowerCase().includes(topic.toLowerCase()) || cat.category.includes('DBMS') && topic === 'DBMS' || cat.category.includes('OS') && topic === 'OS') {
                                    if (cat.questions) {
                                        localQuestions = localQuestions.concat(cat.questions);
                                    }
                                }
                            }
                        }
                    }
                } catch(e) {}
            }
            
            if (localQuestions.length > 0) {
                const sample = localQuestions.sort(() => 0.5 - Math.random()).slice(0, 5);
                ragContext = "Context from Data files:\\n" + sample.map(q => {
                    const text = q.question || q.front || "";
                    const ans = typeof q.answer === 'string' ? q.answer : (q.back || q.model_answer || JSON.stringify(q.answer));
                    return `Concept: ${text}\\nDetails: ${ans}`;
                }).join('\\n\\n');
            }
        } catch(e) {
             console.warn("RAG fetch failed", e);
        }

        let questions = null;
        if (checkAIConfig(true)) {
            const systemPrompt = `Generate 3 high-frequency MCQs for the CS topic: ${topic}. Format: Respond ONLY as JSON array of objects: [{question, options:[], answerIndex, solution_explanation}].\\n\\n${ragContext}`;
            const aiResponse = await callGemini(systemPrompt, `Generate quiz for ${topic}`);
            if (aiResponse) {
                questions = Array.isArray(aiResponse) ? aiResponse : JSON.parse(aiResponse.replace(/```json|```/g, '').trim());
            }
        }

        // Offline RAG Fallback - Use the JSON directly to build options!
        if (!questions && localQuestions.length > 0) {
            console.log("Using Offline RAG Fallback Generator");
            const sample = localQuestions.sort(() => 0.5 - Math.random()).slice(0, 3);
            questions = sample.map(q => {
                const qText = q.question || q.front || `What is a key concept of ${topic}?`;
                const ansText = typeof q.answer === 'string' ? q.answer : (q.back || q.model_answer || "Refer to core CS principles.");
                
                // Get some dummy options from other questions
                let dummies = localQuestions.filter(dq => dq !== q).slice(0, 3).map(dq => (dq.question || dq.front || "").substring(0, 40) + "...");
                if (dummies.length < 3) dummies = ["True", "False", "Both", "None of the above"].slice(0, 3);
                
                const options = [ansText.substring(0, 100) + (ansText.length > 100 ? "..." : ""), ...dummies].sort(() => 0.5 - Math.random());
                const answerIndex = options.findIndex(o => o.startsWith(ansText.substring(0, 40)));
                
                return {
                    question: qText,
                    options: options,
                    answerIndex: answerIndex !== -1 ? answerIndex : 0,
                    solution_explanation: ansText
                };
            });
        }

        if (questions && questions.length > 0) {
            renderCSQuiz(questions, topic);
            return;
        }

        // Fallback Error
        container.innerHTML = `
            <div style="padding:40px; text-align:center;">
                <p style="color:var(--text-muted); margin-bottom:20px;">AI Service temporarily unavailable. Please configure Gemini AI.</p>
                <div style="display:flex; gap:12px; justify-content:center;">
                    <button class="btn-gold" onclick="startCSReview('${topic}')">🔄 Retry</button>
                    <button class="glass" style="padding:10px 24px; border-radius:12px; cursor:pointer;" onclick="switchFundSubTab('review')">Back</button>
                </div>
            </div>
        `;
    } catch (e) {
        console.error(e);
        showAIError("AI failed to generate quiz. Please try again.", () => {
            container.innerHTML = `<button class="btn-gold" style="margin-top:12px;" onclick="startCSReview('${topic}')">Retry</button>`;
        });
    }
}"""
code = re.sub(r"async function startCSReview\(topic\) \{.*?\}\n\}", new_startCSReview + "\n", code, flags=re.DOTALL)

with open("logic.js", "w", encoding="utf-8") as f:
    f.write(code)

"""
