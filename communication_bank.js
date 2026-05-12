// ═══════════════════════════════════════════════════════════════════
// SKILLFORGE — OFFLINE COMMUNICATION & SOFT SKILLS BANK (RAG System)
// Consolidates Verbal Ability, Group Discussions, HR Frameworks,
// Email Writing, and Presentation Skills.
// ═══════════════════════════════════════════════════════════════════

const COMM_BANK = {
    // Vocabulary / Synonyms & Antonyms (for Daily Vocab)
    vocabulary: [
        { word: "EPHEMERAL", type: "adjective", meaning: "Lasting for a very short time", antonym: "Permanent", synonym: "Transient", companies: ["TCS", "Infosys", "Wipro"] },
        { word: "LOQUACIOUS", type: "adjective", meaning: "Tending to talk a great deal", antonym: "Silent", synonym: "Talkative", companies: ["TCS", "Accenture", "Deloitte"] },
        { word: "BENEVOLENT", type: "adjective", meaning: "Well meaning and kindly", antonym: "Malevolent", synonym: "Kind", companies: ["TCS", "Infosys", "HCL"] },
        { word: "VERBOSE", type: "adjective", meaning: "Using more words than are needed", antonym: "Concise", synonym: "Wordy", companies: ["Wipro", "Capgemini", "Deloitte"] },
        { word: "AMELIORATE", type: "verb", meaning: "Make something bad or unsatisfactory better", antonym: "Worsen", synonym: "Improve", companies: ["TCS", "Deloitte", "Accenture"] },
        { word: "OBSTINATE", type: "adjective", meaning: "Stubbornly refusing to change one's opinion or chosen course of action", antonym: "Flexible", synonym: "Stubborn", companies: ["TCS", "Infosys", "Wipro"] },
        { word: "FRUGAL", type: "adjective", meaning: "Sparing or economical with money", antonym: "Extravagant", synonym: "Thrifty", companies: ["Cognizant", "HCL", "Capgemini"] },
        { word: "CANDID", type: "adjective", meaning: "Truthful and straightforward", antonym: "Deceptive", synonym: "Frank", companies: ["TCS", "Wipro", "Accenture"] },
        { word: "PRAGMATIC", type: "adjective", meaning: "Dealing with things sensibly and realistically", antonym: "Theoretical", synonym: "Practical", companies: ["Accenture", "LTIMindtree"] },
        { word: "GREGARIOUS", type: "adjective", meaning: "Fond of company; sociable", antonym: "Introverted", synonym: "Sociable", companies: ["TCS", "Infosys"] },
        { word: "EFFUSIVE", type: "adjective", meaning: "Expressing feelings of gratitude or approval in an unrestrained manner", antonym: "Sparing", synonym: "Lavish", companies: ["Wipro", "Accenture", "Deloitte"] }
    ],

    // Group Discussion Topics
    group_discussions: [
        {
            topic: "Is remote work the future of employment?",
            key_points_for: [
                "Increases productivity by reducing commute stress",
                "Enables global talent hiring regardless of geography",
                "Reduces operational costs for companies",
                "Promotes work-life balance"
            ],
            key_points_against: [
                "Reduces collaboration and team cohesion",
                "Blurs the boundary between personal and professional life",
                "Not feasible for all industries (manufacturing, healthcare)",
                "Can lead to feelings of isolation and mental health issues"
            ],
            conclusion: "A hybrid model balancing remote and in-office work is the most pragmatic approach."
        },
        {
            topic: "Should social media platforms be regulated by the government?",
            key_points_for: [
                "Prevents spread of misinformation and fake news",
                "Protects users from cyberbullying and harassment",
                "Ensures data privacy and security",
                "Holds platforms accountable for harmful content"
            ],
            key_points_against: [
                "May infringe on freedom of speech",
                "Risk of government misuse for political censorship",
                "Self-regulation by platforms may be more effective",
                "Different countries have different standards — regulation is complex"
            ],
            conclusion: "Regulation is necessary but must be transparent, unbiased, and protect free speech."
        },
        {
            topic: "Electric vehicles: Are they a sustainable solution to pollution?",
            key_points_for: [
                "Zero tailpipe emissions reduce air pollution in cities",
                "Lower operational and maintenance costs in the long run",
                "Renewables integration can make EVs truly green",
                "Government incentives are accelerating adoption"
            ],
            key_points_against: [
                "Battery production generates significant carbon emissions",
                "Charging infrastructure is still underdeveloped",
                "High upfront costs remain a barrier for many consumers",
                "Electricity generation itself may rely on fossil fuels"
            ],
            conclusion: "EVs are a crucial part of the solution but must be paired with clean energy generation and responsible battery recycling."
        },
        {
            topic: "Brain drain: Is it a loss or gain for developing countries?",
            key_points_for: [
                "Remittances sent back contribute to the home economy",
                "Professionals gain world-class experience and may return",
                "Builds a global diaspora network benefiting the home country",
                "Encourages better conditions at home to retain talent"
            ],
            key_points_against: [
                "Country loses skilled professionals it invested in educating",
                "Reduces innovation and entrepreneurship at home",
                "Widens the gap between developed and developing nations",
                "Healthcare and education sectors suffer most"
            ],
            conclusion: "Brain drain is a challenge that calls for better opportunities, compensation, and work environments in developing nations."
        },
        {
            topic: "Artificial Intelligence will do more harm than good",
            key_points_for: [
                "Leads to large-scale unemployment due to automation",
                "Raises serious ethical concerns around bias and privacy",
                "AI systems can malfunction with critical consequences",
                "Concentration of AI power in few corporations is dangerous"
            ],
            key_points_against: [
                "AI automates repetitive tasks, freeing humans for creative work",
                "Enables faster medical diagnosis and drug discovery",
                "Improves efficiency in logistics, agriculture, and energy",
                "Creates new job categories and opportunities"
            ],
            conclusion: "AI is a tool — its impact depends on how responsibly it is developed and governed."
        }
    ],

    // HR Question Frameworks (STAR Method)
    hr_frameworks: {
        "Tell me about yourself": {
            idealFramework: "Present, Past, Future formula.",
            tips: [
                "Start with your current role/academics and a major recent achievement.",
                "Mention past experiences and relevant skills leading up to now.",
                "Conclude with your future goals and how this company aligns with them.",
                "Keep it concise (1-2 minutes max). Do not just recite your resume."
            ]
        },
        "What are your strengths?": {
            idealFramework: "Claim + Proof formula.",
            tips: [
                "Pick 2-3 genuine strengths relevant to the job (e.g., Problem-solving, Adaptability).",
                "Back up every strength with a specific, real-world example.",
                "Avoid clichés like 'I am a perfectionist' or 'I work too hard'."
            ]
        },
        "Why should we hire you?": {
            idealFramework: "Alignment formula.",
            tips: [
                "Highlight how your specific skills solve the company's specific problems.",
                "Mention your cultural fit and passion for the industry.",
                "Summarize by asserting that you can deliver value from Day 1."
            ]
        },
        "Describe a difficult situation.": {
            idealFramework: "S.T.A.R. Method (Situation, Task, Action, Result)",
            tips: [
                "Situation: Briefly set the context (e.g., a looming deadline).",
                "Task: Explain what you needed to achieve.",
                "Action: Focus on what YOU did specifically to resolve the issue (use 'I', not 'We').",
                "Result: Share the positive outcome, using metrics if possible, and what you learned."
            ]
        }
    },

    // Cover Letter Templates
    cover_letters: {
        default: `Dear Hiring Manager,

I am writing to express my strong interest in the Software Engineer position at {COMPANY}. With a solid foundation in computer science and practical experience in modern web technologies, I am confident in my ability to contribute effectively to your engineering team.

In my recent academic projects and internships, I have developed a deep understanding of full-stack development, database architecture, and agile methodologies. I am particularly drawn to {COMPANY} because of your commitment to innovation and engineering excellence. 

I am eager to bring my problem-solving skills and technical expertise to your team. Thank you for considering my application. I have attached my resume for your review and look forward to the opportunity to discuss how my background aligns with your needs.

Best regards,
Harismitha`,
        "TCS": `Dear TCS Recruitment Team,

I am writing to apply for the Assistant System Engineer role at Tata Consultancy Services. As an MCA student with a passion for software development and IT infrastructure, I have long admired TCS's global impact and commitment to delivering transformational business solutions.

Throughout my academic journey, I have honed my skills in Java, SQL, and Object-Oriented Programming, engaging in hands-on projects that required robust problem-solving. My dedication to continuous learning aligns perfectly with the TCS core value of learning and sharing.

I am excited about the prospect of starting my career with a prestigious organization like TCS and contributing to impactful large-scale projects. Thank you for your time and consideration.

Best regards,
Harismitha`,
        "Accenture": `Dear Accenture Hiring Manager,

I am excited to submit my application for the Associate Software Engineer position at Accenture. With a strong background in software engineering and cloud technologies, I am eager to contribute to Accenture's mission of delivering technology innovations that drive business value.

My academic projects have equipped me with practical experience in full-stack development, and I am highly adaptable to new technologies. I admire Accenture's focus on cloud-first solutions and continuous innovation.

I am a collaborative team player and am ready to bring my technical skills and enthusiasm to your dynamic team. Thank you for reviewing my application.

Warm regards,
Harismitha`
    }
};

// ═══════════════════════════════════════════════════════════════════
// RAG RETRIEVER API
// ═══════════════════════════════════════════════════════════════════

let __vocabIndex = -1;

function getVocabWord() {
    const list = COMM_BANK.vocabulary;
    if (__vocabIndex === -1) {
        // Random start
        __vocabIndex = Math.floor(Math.random() * list.length);
    } else {
        __vocabIndex = (__vocabIndex + 1) % list.length;
    }
    return list[__vocabIndex];
}

function getGDTopic() {
    const list = COMM_BANK.group_discussions;
    const rand = Math.floor(Math.random() * list.length);
    return list[rand];
}

function getHRFramework(question) {
    if (COMM_BANK.hr_frameworks[question]) {
        return COMM_BANK.hr_frameworks[question];
    }
    // Fallback
    return {
        idealFramework: "S.T.A.R. Method (Situation, Task, Action, Result)",
        tips: [
            "Listen carefully to the question.",
            "Take a moment to structure your thoughts.",
            "Provide a brief, concrete example for your point.",
            "End with a positive outcome or learning."
        ]
    };
}

function getCoverLetterTemplate(company) {
    const temp = COMM_BANK.cover_letters[company] || COMM_BANK.cover_letters.default;
    return temp.replace(/{COMPANY}/g, company || "your esteemed organization");
}

function getCompanyCommunication(company, count = 5) {
    // RAG mapping for company-specific communication questions
    const allQs = [...COMM_BANK.vocabulary];
    let matched = allQs.filter(q => q.companies.includes(company));
    if (matched.length < count) {
        // Fallback to random if not enough
        matched = matched.concat(allQs).filter((v, i, a) => a.indexOf(v) === i);
    }
    return matched.sort(() => 0.5 - Math.random()).slice(0, count);
}

function getBehavioralQuestions(company, count = 5) {
    // Generate questions matching HR frameworks and GD topics offline
    const qs = [
        "Tell me about yourself and your background.",
        "What are your key strengths and weaknesses?",
        "Describe a difficult situation you faced and how you handled it.",
        `Why do you want to join ${company}?`,
        "Where do you see yourself in 5 years?",
        "Describe a time you showed leadership.",
        "How do you handle tight deadlines?",
        "Tell me about a time you worked in a team and had a conflict."
    ];
    return qs.sort(() => 0.5 - Math.random()).slice(0, count);
}

function getResumeAnalysisOffline() {
    // Generates a realistic offline resume score based on typical MCA student 
    // Random score between 65 and 85
    const score = Math.floor(Math.random() * 21) + 65;

    return {
        score: score,
        issues: [
            "Missing quantifiable metrics (e.g., 'improved performance by X%').",
            "Action verbs are repetitive in the experience section.",
            "Some technical skills mentioned in projects are missing from the Skills section."
        ],
        improvements: [
            "Start bullet points with strong action verbs (Developed, Architected, Spearheaded).",
            "Include links to live project deployments or GitHub repositories.",
            "Tailor the objective statement to be more specific to the target role."
        ]
    };
}

console.log(`✅ Communication Bank loaded: ${COMM_BANK.vocabulary.length} vocab words, ${COMM_BANK.group_discussions.length} GD topics.`);
