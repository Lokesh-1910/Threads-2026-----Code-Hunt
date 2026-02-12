const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Sample questions for Round 1
const sampleQuestions = [
    {
        question_text: "Arrange the code in correct order to print numbers 1 to 5:",
        question_type: "jumbled_code",
        options: {
            lines: [
                "for i in range(1, 6):",
                "print(i)",
                "i = 1",
                "while i <= 5:",
                "print(i)",
                "i += 1"
            ]
        },
        correct_answer: "for i in range(1, 6):,print(i)"
    },
    {
        question_text: "Find the bug in this Python code: print('Hello World')",
        question_type: "debugging",
        options: {
            code: "print('Hello World')",
            bug_options: ["Missing semicolon", "Extra parenthesis", "No bug", "Wrong quotes"]
        },
        correct_answer: "No bug"
    },
    {
        question_text: "Match pseudocode with description:",
        question_type: "pseudocode_match",
        options: {
            pseudocodes: [
                "IF score >= 60 THEN grade = 'Pass'",
                "FOR i = 1 TO 10",
                "WHILE x > 0"
            ],
            descriptions: [
                "Loop 10 times",
                "Check passing condition",
                "Repeat until condition false"
            ]
        },
        correct_answer: "IF score >= 60 THEN grade = 'Pass':Check passing condition;FOR i = 1 TO 10:Loop 10 times;WHILE x > 0:Repeat until condition false"
    },
    {
        question_text: "What does HTML stand for?",
        question_type: "mcq",
        options: [
            "Hyper Text Markup Language",
            "High Tech Modern Language",
            "Hyper Transfer Markup Language",
            "Home Tool Markup Language"
        ],
        correct_answer: "Hyper Text Markup Language"
    },
    {
        question_text: "Which tag is used for the largest heading in HTML?",
        question_type: "mcq",
        options: ["<h6>", "<heading>", "<h1>", "<head>"],
        correct_answer: "<h1>"
    }
];

async function setupDatabase() {
    try {
        console.log('📝 Adding sample questions to database...');
        
        // Clear existing questions
        await pool.query('DELETE FROM round1_questions');
        console.log('✅ Cleared existing questions');
        
        // Insert sample questions
        for (const question of sampleQuestions) {
            await pool.query(
                `INSERT INTO round1_questions 
                 (question_text, question_type, options, correct_answer) 
                 VALUES ($1, $2, $3, $4)`,
                [
                    question.question_text,
                    question.question_type,
                    JSON.stringify(question.options),
                    question.correct_answer
                ]
            );
        }
        
        console.log('✅ Added 5 sample questions');
        console.log('🎉 Database setup complete!');
        console.log('\n📋 Sample Questions Added:');
        console.log('1. Jumbled Code (Python loop)');
        console.log('2. Debugging (Python print)');
        console.log('3. Pseudocode Match');
        console.log('4. HTML MCQ');
        console.log('5. HTML Tags MCQ');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

setupDatabase();