// routes/round2.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwt = require('jsonwebtoken'); 
const CodeExecutor = require('../piston-executor');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

const verifyAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (req.user.teamCode !== 'ADMIN001' && !req.user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    req.user.isAdmin = true;
    next();
};

// ============ CREATE TABLES IF NOT EXISTS ============
const createRound2Tables = async () => {
    try {
        // Check if tables exist, create if not
        await pool.query(`
            CREATE TABLE IF NOT EXISTS round2_questions (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                difficulty VARCHAR(50) CHECK (difficulty IN ('Easy', 'Medium', 'Hard', 'easy', 'medium', 'hard', 'EASY', 'MEDIUM', 'HARD')),
                time_limit INT DEFAULT 30,
                memory_limit INT DEFAULT 256,
                points INT DEFAULT 5,
                sample_input TEXT,
                sample_output TEXT,
                problem_statement TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS round2_testcases (
                id SERIAL PRIMARY KEY,
                question_id INT REFERENCES round2_questions(id) ON DELETE CASCADE,
                input TEXT NOT NULL,
                expected_output TEXT NOT NULL,
                is_hidden BOOLEAN DEFAULT TRUE,
                score INT DEFAULT 5,
                order_number INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS round2_submissions (
                id SERIAL PRIMARY KEY,
                team_id INT REFERENCES teams(id),
                question_id INT REFERENCES round2_questions(id),
                language VARCHAR(50) NOT NULL,
                code TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'Pending',
                total_score INT DEFAULT 0,
                passed_testcases INT DEFAULT 0,
                total_testcases INT DEFAULT 0,
                execution_time INT DEFAULT 0,
                memory_used INT DEFAULT 0,
                submitted_at TIMESTAMP DEFAULT NOW()
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS round2_testcase_results (
                id SERIAL PRIMARY KEY,
                submission_id INT REFERENCES round2_submissions(id) ON DELETE CASCADE,
                testcase_id INT REFERENCES round2_testcases(id),
                passed BOOLEAN DEFAULT FALSE,
                actual_output TEXT,
                execution_time INT DEFAULT 0,
                memory_used INT DEFAULT 0,
                error_message TEXT
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS round2_sessions (
                id SERIAL PRIMARY KEY,
                team_id INT REFERENCES teams(id) UNIQUE,
                start_time TIMESTAMP DEFAULT NOW(),
                end_time TIMESTAMP,
                status VARCHAR(50) DEFAULT 'in_progress',
                total_score INT DEFAULT 0,
                questions_attempted INT DEFAULT 0,
                cheat_score INT DEFAULT 0
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS round2_cheat_logs (
                id SERIAL PRIMARY KEY,
                session_id VARCHAR(100),
                team_id INT,
                activity_type VARCHAR(50),
                details TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        console.log('✅ Round 2 tables created successfully');
    } catch (error) {
        console.error('❌ Error creating round2 tables:', error);
    }
};

// Initialize tables
createRound2Tables();

// ============ ADMIN ROUTES ============

// 1. Add Round 2 Question with Test Cases
router.post('/admin/questions', authenticateToken, verifyAdmin, async (req, res) => {
    const { title, description, difficulty, time_limit, memory_limit, testcases, points, sample_input, sample_output, problem_statement } = req.body;
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Validate input
        if (!title || !description || !difficulty) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!testcases || testcases.length === 0) {
            return res.status(400).json({ error: 'At least one test case required' });
        }

        // Format difficulty
        let formattedDifficulty = difficulty;
        if (difficulty === 'easy') formattedDifficulty = 'Easy';
        else if (difficulty === 'medium') formattedDifficulty = 'Medium';
        else if (difficulty === 'hard') formattedDifficulty = 'Hard';

        // Insert question
        const questionResult = await client.query(
            `INSERT INTO round2_questions 
             (title, description, difficulty, time_limit, memory_limit, points, sample_input, sample_output, problem_statement) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
             RETURNING id`,
            [title, description, formattedDifficulty, time_limit || 30, memory_limit || 256, points || 5, sample_input || '', sample_output || '', problem_statement || description]
        );
        
        const questionId = questionResult.rows[0].id;
        
        // Insert test cases
        for (let i = 0; i < testcases.length; i++) {
            const tc = testcases[i];
            if (!tc.input || !tc.expected_output) {
                throw new Error('Test case missing input or expected output');
            }
            
            await client.query(
                `INSERT INTO round2_testcases 
                 (question_id, input, expected_output, is_hidden, score, order_number) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [questionId, tc.input, tc.expected_output, tc.is_hidden || false, tc.score || 5, i]
            );
        }
        
        await client.query('COMMIT');
        
        console.log(`✅ Question added with ID: ${questionId}, ${testcases.length} test cases`);
        
        res.json({
            success: true,
            message: 'Question added successfully',
            questionId: questionId,
            testcasesCount: testcases.length
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error adding question:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// 2. Get All Round 2 Questions (Admin)
router.get('/admin/questions', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const questions = await pool.query(`
            SELECT q.*, 
                   COUNT(t.id) as testcases_count,
                   COALESCE(SUM(t.score), 0) as total_score,
                   SUM(CASE WHEN t.is_hidden = false THEN 1 ELSE 0 END) as sample_count,
                   SUM(CASE WHEN t.is_hidden = true THEN 1 ELSE 0 END) as hidden_count
            FROM round2_questions q
            LEFT JOIN round2_testcases t ON q.id = t.question_id
            GROUP BY q.id
            ORDER BY 
                CASE q.difficulty
                    WHEN 'Easy' THEN 1
                    WHEN 'Medium' THEN 2
                    WHEN 'Hard' THEN 3
                END,
                q.created_at DESC
        `);
        
        res.json(questions.rows);
    } catch (error) {
        console.error('❌ Error fetching questions:', error);
        res.status(500).json({ error: error.message });
    }
});

// 3. Get Question with Test Cases (Admin)
router.get('/admin/questions/:id', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const question = await pool.query(
            'SELECT * FROM round2_questions WHERE id = $1',
            [req.params.id]
        );
        
        if (question.rows.length === 0) {
            return res.status(404).json({ error: 'Question not found' });
        }
        
        const testcases = await pool.query(
            'SELECT * FROM round2_testcases WHERE question_id = $1 ORDER BY order_number',
            [req.params.id]
        );
        
        res.json({
            ...question.rows[0],
            testcases: testcases.rows
        });
    } catch (error) {
        console.error('❌ Error fetching question:', error);
        res.status(500).json({ error: error.message });
    }
});

// 4. Delete Question (Admin)
router.delete('/admin/questions/:id', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM round2_questions WHERE id = $1 RETURNING id', [req.params.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Question not found' });
        }
        
        res.json({ success: true, message: 'Question deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting question:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ PARTICIPANT ROUTES ============

// 5. Start Round 2 Session
router.post('/start', authenticateToken, async (req, res) => {
    const teamId = req.user.teamId;
    
    try {
        // Check if team has completed Round 1
        const team = await pool.query(
            'SELECT round1_completed FROM teams WHERE id = $1',
            [teamId]
        );
        
        if (!team.rows[0]?.round1_completed) {
            return res.status(403).json({ error: 'Complete Round 1 first' });
        }
        
        // Create or get session
        const session = await pool.query(
            `INSERT INTO round2_sessions (team_id, start_time, status) 
             VALUES ($1, NOW(), 'in_progress')
             ON CONFLICT (team_id) 
             DO UPDATE SET start_time = NOW(), status = 'in_progress'
             RETURNING id`,
            [teamId]
        );
        
        res.json({
            success: true,
            sessionId: session.rows[0].id,
            message: 'Round 2 started successfully'
        });
        
    } catch (error) {
        console.error('❌ Error starting round 2:', error);
        res.status(500).json({ error: error.message });
    }
});

// 6. Get Round 2 Questions for Participant
router.get('/questions', authenticateToken, async (req, res) => {
    try {
        const questions = await pool.query(`
            SELECT 
                q.id, q.title, q.description, q.difficulty, 
                q.time_limit, q.memory_limit, q.points,
                COUNT(t.id) as testcases_count,
                COALESCE(SUM(t.score), 0) as total_score,
                CASE 
                    WHEN s.id IS NOT NULL AND s.status = 'Accepted' THEN 'Solved'
                    WHEN s.id IS NOT NULL THEN 'Attempted'
                    ELSE 'Not Attempted'
                END as status,
                COALESCE(s.total_score, 0) as earned_score
            FROM round2_questions q
            LEFT JOIN round2_testcases t ON q.id = t.question_id
            LEFT JOIN (
                SELECT DISTINCT ON (question_id) question_id, status, total_score
                FROM round2_submissions 
                WHERE team_id = $1
                ORDER BY question_id, submitted_at DESC
            ) s ON q.id = s.question_id
            GROUP BY q.id, s.status, s.total_score
            ORDER BY 
                CASE q.difficulty
                    WHEN 'Easy' THEN 1
                    WHEN 'Medium' THEN 2
                    WHEN 'Hard' THEN 3
                END,
                q.id
        `, [req.user.teamId]);
        
        res.json(questions.rows);
    } catch (error) {
        console.error('❌ Error fetching questions:', error);
        res.status(500).json({ error: error.message });
    }
});

// 7. Get Single Question with Sample Test Cases
router.get('/questions/:id', authenticateToken, async (req, res) => {
    const questionId = parseInt(req.params.id);
    
    if (isNaN(questionId)) {
        return res.status(400).json({ error: 'Invalid question ID' });
    }

    try {
        const question = await pool.query(
            'SELECT * FROM round2_questions WHERE id = $1',
            [questionId]
        );
        
        if (question.rows.length === 0) {
            return res.status(404).json({ error: 'Question not found' });
        }
        
        // Get sample test cases (non-hidden)
        const testcases = await pool.query(
            `SELECT id, input, expected_output, score 
             FROM round2_testcases 
             WHERE question_id = $1 AND is_hidden = false
             ORDER BY order_number`,
            [questionId]
        );
        
        // Get hidden test cases count
        const hiddenStats = await pool.query(
            `SELECT COUNT(*) as count, COALESCE(SUM(score), 0) as total_score 
             FROM round2_testcases 
             WHERE question_id = $1 AND is_hidden = true`,
            [questionId]
        );
        
        // Get previous submissions
        const submissions = await pool.query(
            `SELECT status, total_score, passed_testcases, total_testcases, 
                    submitted_at, execution_time
             FROM round2_submissions 
             WHERE team_id = $1 AND question_id = $2
             ORDER BY submitted_at DESC
             LIMIT 5`,
            [req.user.teamId, questionId]
        );
        
        res.json({
            ...question.rows[0],
            sample_testcases: testcases.rows,
            hidden_testcases_count: parseInt(hiddenStats.rows[0].count) || 0,
            hidden_testcases_total_score: parseInt(hiddenStats.rows[0].total_score) || 0,
            previous_submissions: submissions.rows
        });
        
    } catch (error) {
        console.error('❌ Error fetching question:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ COMPILER ROUTES (NEW) ============

// 8. Compile Only - Check syntax, no execution
router.post('/compile', authenticateToken, async (req, res) => {
    const { language, code } = req.body;
    
    if (!language || !code) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Use Piston API to compile (run without input)
        const result = await CodeExecutor.executeCode(language, code, '');
        
        // Check for compilation errors
        if (result.stderr || result.error) {
            return res.json({
                success: false,
                compilationError: result.stderr || result.error,
                exitCode: result.code || 1
            });
        }

        // No errors - compilation successful
        res.json({
            success: true,
            message: 'Compilation successful',
            warnings: result.stderr || '',
            exitCode: 0
        });

    } catch (error) {
        console.error('❌ Compilation error:', error);
        res.status(500).json({ 
            error: 'Compilation failed',
            details: error.message 
        });
    }
});

// 9. Execute Code with User Input (Manual Testing)
router.post('/execute', authenticateToken, async (req, res) => {
    const { language, code, input } = req.body;
    
    if (!language || !code) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const startTime = Date.now();
        
        // Execute code with provided input
        const result = await CodeExecutor.executeCode(language, code, input || '');
        
        const executionTime = Date.now() - startTime;

        // Check for runtime errors
        if (result.error || result.stderr) {
            return res.json({
                success: false,
                runtimeError: result.stderr || result.error,
                stdout: result.stdout || '',
                stderr: result.stderr || '',
                exitCode: result.code || 1,
                executionTime
            });
        }

        // Successful execution
        res.json({
            success: true,
            stdout: result.stdout || '',
            stderr: result.stderr || '',
            exitCode: result.code || 0,
            executionTime
        });

    } catch (error) {
        console.error('❌ Execution error:', error);
        res.status(500).json({ 
            error: 'Execution failed',
            details: error.message 
        });
    }
});

// 10. Run Code with Sample Tests (Original Run - Enhanced)
router.post('/run', authenticateToken, async (req, res) => {
    const { questionId, language, code } = req.body;
    
    if (!questionId || !language || !code) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Get sample test cases only
        const testcases = await pool.query(
            `SELECT input, expected_output, score 
             FROM round2_testcases 
             WHERE question_id = $1 AND is_hidden = false
             ORDER BY order_number`,
            [questionId]
        );
        
        if (testcases.rows.length === 0) {
            return res.status(404).json({ error: 'No sample test cases found' });
        }

        // Run code against all sample test cases
        const results = [];
        let passedCount = 0;

        for (const tc of testcases.rows) {
            const result = await CodeExecutor.executeCode(language, code, tc.input);
            
            const passed = !result.error && !result.stderr && 
                          result.stdout?.trim() === tc.expected_output.trim();
            
            if (passed) passedCount++;

            results.push({
                passed,
                input: tc.input,
                expected_output: tc.expected_output,
                actual_output: result.stdout || '',
                error: result.stderr || result.error || null,
                execution_time: result.execution_time || 0,
                score: tc.score
            });
        }

        res.json({
            success: true,
            passedCount,
            totalTestCases: testcases.rows.length,
            results
        });

    } catch (error) {
        console.error('❌ Run error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 11. Submit Code (Full Evaluation - Enhanced)
router.post('/submit', authenticateToken, async (req, res) => {
    const { questionId, language, code, sessionId } = req.body;
    const teamId = req.user.teamId;
    
    if (!questionId || !language || !code) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    try {
        // Get ALL test cases (including hidden)
        const testcases = await pool.query(
            `SELECT id, input, expected_output, score, is_hidden 
             FROM round2_testcases 
             WHERE question_id = $1
             ORDER BY order_number`,
            [questionId]
        );
        
        if (testcases.rows.length === 0) {
            return res.status(404).json({ error: 'No test cases found for this question' });
        }
        
        // Create submission record
        const submissionResult = await pool.query(
            `INSERT INTO round2_submissions 
             (team_id, question_id, language, code, status, total_testcases) 
             VALUES ($1, $2, $3, $4, 'Running', $5) 
             RETURNING id`,
            [teamId, questionId, language, code, testcases.rows.length]
        );
        
        const submissionId = submissionResult.rows[0].id;
        
        // Execute code against all test cases
        const results = [];
        let passedTests = 0;
        let totalScore = 0;

        for (const tc of testcases.rows) {
            const result = await CodeExecutor.executeCode(language, code, tc.input);
            
            const passed = !result.error && !result.stderr && 
                          result.stdout?.trim() === tc.expected_output.trim();
            
            if (passed) {
                passedTests++;
                totalScore += tc.score;
            }

            // Save test case result
            await pool.query(
                `INSERT INTO round2_testcase_results 
                 (submission_id, testcase_id, passed, actual_output, execution_time, error_message) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    submissionId, 
                    tc.id, 
                    passed, 
                    result.stdout || '', 
                    result.execution_time || 0,
                    result.stderr || result.error || null
                ]
            );

            results.push({
                passed,
                score: tc.score,
                is_hidden: tc.is_hidden,
                execution_time: result.execution_time || 0,
                ...(!tc.is_hidden && {
                    expected_output: tc.expected_output,
                    actual_output: result.stdout || ''
                })
            });
        }
        
        const status = passedTests === testcases.rows.length ? 'Accepted' : 'Wrong Answer';
        
        // Update submission
        await pool.query(
            `UPDATE round2_submissions 
             SET status = $1, 
                 total_score = $2, 
                 passed_testcases = $3,
                 execution_time = $4
             WHERE id = $5`,
            [status, totalScore, passedTests, results.reduce((acc, r) => acc + (r.execution_time || 0), 0) / results.length, submissionId]
        );
        
        // Update session
        if (sessionId) {
            await pool.query(
                `UPDATE round2_sessions 
                 SET total_score = total_score + $1,
                     questions_attempted = questions_attempted + 1
                 WHERE id = $2`,
                [totalScore, sessionId]
            );
        }
        
        // Update team score
        await pool.query(
            `UPDATE teams 
             SET round2_score = round2_score + $1 
             WHERE id = $2`,
            [totalScore, teamId]
        );
        
        res.json({
            success: true,
            submissionId,
            status,
            passedCount: passedTests,
            totalTestCases: testcases.rows.length,
            totalScore,
            results
        });
        
    } catch (error) {
        console.error('❌ Submission error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 12. Get Submission History
router.get('/submissions/:questionId', authenticateToken, async (req, res) => {
    const questionId = parseInt(req.params.questionId);
    
    if (isNaN(questionId)) {
        return res.status(400).json({ error: 'Invalid question ID' });
    }

    try {
        const submissions = await pool.query(
            `SELECT id, status, total_score, passed_testcases, total_testcases, 
                    submitted_at, execution_time
             FROM round2_submissions 
             WHERE team_id = $1 AND question_id = $2
             ORDER BY submitted_at DESC
             LIMIT 10`,
            [req.user.teamId, questionId]
        );
        
        res.json(submissions.rows);
    } catch (error) {
        console.error('❌ Error fetching submissions:', error);
        res.status(500).json({ error: error.message });
    }
});

// 13. Log Cheat Activity
router.post('/log-activity', authenticateToken, async (req, res) => {
    const { sessionId, activityType, details } = req.body;
    
    try {
        await pool.query(
            `INSERT INTO round2_cheat_logs (session_id, team_id, activity_type, details) 
             VALUES ($1, $2, $3, $4)`,
            [sessionId, req.user.teamId, activityType, details || '']
        );
        
        if (sessionId) {
            await pool.query(
                `UPDATE round2_sessions 
                 SET cheat_score = COALESCE(cheat_score, 0) + 1 
                 WHERE id = $1`,
                [sessionId]
            );
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error logging activity:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;