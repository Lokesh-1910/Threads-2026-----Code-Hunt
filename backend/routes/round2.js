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
        // Round 2 Questions table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS round2_questions (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                difficulty VARCHAR(50) CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
                time_limit INT DEFAULT 30,
                memory_limit INT DEFAULT 256,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Round 2 Test Cases table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS round2_testcases (
                id SERIAL PRIMARY KEY,
                question_id INT REFERENCES round2_questions(id) ON DELETE CASCADE,
                input TEXT NOT NULL,
                expected_output TEXT NOT NULL,
                is_hidden BOOLEAN DEFAULT TRUE,
                score INT DEFAULT 5,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Round 2 Submissions table
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

        // Round 2 Test Case Results table
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

        // Round 2 Sessions table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS round2_sessions (
                id SERIAL PRIMARY KEY,
                team_id INT REFERENCES teams(id) UNIQUE,
                start_time TIMESTAMP DEFAULT NOW(),
                end_time TIMESTAMP,
                status VARCHAR(50) DEFAULT 'in_progress',
                total_score INT DEFAULT 0,
                questions_attempted INT DEFAULT 0
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
    const { title, description, difficulty, time_limit, memory_limit, testcases } = req.body;
    
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

        // Insert question
        const questionResult = await client.query(
            `INSERT INTO round2_questions 
             (title, description, difficulty, time_limit, memory_limit) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id`,
            [title, description, difficulty, time_limit || 30, memory_limit || 256]
        );
        
        const questionId = questionResult.rows[0].id;
        
        // Insert test cases
        for (const tc of testcases) {
            if (!tc.input || !tc.expected_output) {
                throw new Error('Test case missing input or expected output');
            }
            
            await client.query(
                `INSERT INTO round2_testcases 
                 (question_id, input, expected_output, is_hidden, score) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [questionId, tc.input, tc.expected_output, tc.is_hidden || true, tc.score || 5]
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
                   SUM(t.score) as total_score,
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
            'SELECT * FROM round2_testcases WHERE question_id = $1 ORDER BY id',
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
        
        // Check round 2 password from settings
        const settings = await pool.query(
            'SELECT setting_value FROM settings WHERE setting_key = $1',
            ['round2_password']
        );
        
        const round2Password = settings.rows[0]?.setting_value || process.env.ROUND2_PASSWORD;
        
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
                q.time_limit, q.memory_limit,
                COUNT(t.id) as testcases_count,
                SUM(t.score) as total_score,
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

// 7. Get Single Question with Sample Test Cases (Hidden cases hidden)
router.get('/questions/:id', authenticateToken, async (req, res) => {
    try {
        const question = await pool.query(
            'SELECT * FROM round2_questions WHERE id = $1',
            [req.params.id]
        );
        
        if (question.rows.length === 0) {
            return res.status(404).json({ error: 'Question not found' });
        }
        
        // Get ONLY sample test cases (non-hidden) for participants
        const testcases = await pool.query(
            `SELECT id, input, expected_output, score 
             FROM round2_testcases 
             WHERE question_id = $1 AND is_hidden = false
             ORDER BY id`,
            [req.params.id]
        );
        
        // Get total hidden test cases count and max score
        const hiddenStats = await pool.query(
            `SELECT COUNT(*) as count, SUM(score) as total_score 
             FROM round2_testcases 
             WHERE question_id = $1 AND is_hidden = true`,
            [req.params.id]
        );
        
        // Get previous submissions for this question
        const submissions = await pool.query(
            `SELECT status, total_score, passed_testcases, total_testcases, submitted_at
             FROM round2_submissions 
             WHERE team_id = $1 AND question_id = $2
             ORDER BY submitted_at DESC
             LIMIT 5`,
            [req.user.teamId, req.params.id]
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

// 8. Submit Code
router.post('/submit', authenticateToken, async (req, res) => {
    const { questionId, language, code } = req.body;
    const teamId = req.user.teamId;
    
    if (!questionId || !language || !code) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    try {
        // Validate language
        const isValidLanguage = await CodeExecutor.validateLanguage(language);
        if (!isValidLanguage) {
            return res.status(400).json({ 
                error: 'Unsupported language', 
                supported: CodeExecutor.getSupportedLanguages() 
            });
        }

        // Get all test cases for this question
        const testcases = await pool.query(
            `SELECT id, input, expected_output, score, is_hidden 
             FROM round2_testcases 
             WHERE question_id = $1
             ORDER BY id`,
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
        const executionResult = await CodeExecutor.runTestCases(
            code, 
            language, 
            testcases.rows
        );
        
        // Save test case results
        for (let i = 0; i < executionResult.results.length; i++) {
            const result = executionResult.results[i];
            const testcase = testcases.rows[i];
            
            await pool.query(
                `INSERT INTO round2_testcase_results 
                 (submission_id, testcase_id, passed, actual_output, execution_time, memory_used, error_message) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    submissionId, 
                    testcase.id, 
                    result.passed, 
                    result.actual_output || '', 
                    result.execution_time || 0,
                    result.memory || 0,
                    result.error || null
                ]
            );
        }
        
        // Update submission status
        const allPassed = executionResult.passedCount === testcases.rows.length;
        const status = allPassed ? 'Accepted' : 'Wrong Answer';
        
        await pool.query(
            `UPDATE round2_submissions 
             SET status = $1, 
                 total_score = $2, 
                 passed_testcases = $3,
                 execution_time = $4,
                 memory_used = $5
             WHERE id = $6`,
            [
                status,
                executionResult.totalScore,
                executionResult.passedCount,
                executionResult.averageExecutionTime,
                Math.max(...executionResult.results.map(r => r.memory || 0)),
                submissionId
            ]
        );
        
        // Update round2 session
        await pool.query(
            `INSERT INTO round2_sessions (team_id, start_time, status, total_score, questions_attempted)
             VALUES ($1, NOW(), $2, $3, 1)
             ON CONFLICT (team_id) DO UPDATE 
             SET total_score = round2_sessions.total_score + $3,
                 questions_attempted = round2_sessions.questions_attempted + 1,
                 status = CASE 
                    WHEN round2_sessions.questions_attempted + 1 >= (
                        SELECT COUNT(*) FROM round2_questions
                    ) THEN 'completed'
                    ELSE 'in_progress'
                 END
             WHERE round2_sessions.team_id = $1`,
            [teamId, status, executionResult.totalScore]
        );
        
        // Update team's overall round2 score
        const totalScore = await pool.query(
            'SELECT SUM(total_score) as total FROM round2_submissions WHERE team_id = $1 AND status = $2',
            [teamId, 'Accepted']
        );
        
        await pool.query(
            'UPDATE teams SET round2_score = $1 WHERE id = $2',
            [totalScore.rows[0].total || 0, teamId]
        );
        
        // Prepare response (hide actual outputs for hidden test cases)
        const visibleResults = executionResult.results.map((result, index) => ({
            passed: result.passed,
            score: result.score,
            is_hidden: testcases.rows[index].is_hidden,
            execution_time: result.execution_time,
            memory: result.memory,
            ...(!testcases.rows[index].is_hidden && {
                expected_output: result.expected_output,
                actual_output: result.actual_output
            })
        }));
        
        console.log(`✅ Submission ${submissionId}: ${executionResult.passedCount}/${testcases.rows.length} passed, Score: ${executionResult.totalScore}`);
        
        res.json({
            success: true,
            submissionId,
            status,
            passedCount: executionResult.passedCount,
            totalTestCases: testcases.rows.length,
            totalScore: executionResult.totalScore,
            averageExecutionTime: executionResult.averageExecutionTime,
            results: visibleResults
        });
        
    } catch (error) {
        console.error('❌ Submission error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 9. Run Code (Sample tests only)
router.post('/run', authenticateToken, async (req, res) => {
    const { questionId, language, code } = req.body;
    
    try {
        // Get ONLY sample test cases
        const testcases = await pool.query(
            `SELECT id, input, expected_output, score 
             FROM round2_testcases 
             WHERE question_id = $1 AND is_hidden = false
             ORDER BY id`,
            [questionId]
        );
        
        if (testcases.rows.length === 0) {
            return res.status(404).json({ error: 'No sample test cases found' });
        }
        
        // Execute code against sample test cases
        const executionResult = await CodeExecutor.runTestCases(
            code, 
            language, 
            testcases.rows
        );
        
        // Prepare response
        const results = executionResult.results.map((result, index) => ({
            passed: result.passed,
            expected_output: result.expected_output,
            actual_output: result.actual_output,
            execution_time: result.execution_time,
            memory: result.memory
        }));
        
        res.json({
            success: true,
            passedCount: executionResult.passedCount,
            totalTestCases: testcases.rows.length,
            results
        });
        
    } catch (error) {
        console.error('❌ Run error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 10. Get Submission History
router.get('/submissions/:questionId', authenticateToken, async (req, res) => {
    try {
        const submissions = await pool.query(
            `SELECT s.*, 
                    COUNT(tr.id) as results_count,
                    SUM(CASE WHEN tr.passed THEN 1 ELSE 0 END) as passed_count
             FROM round2_submissions s
             LEFT JOIN round2_testcase_results tr ON s.id = tr.submission_id
             WHERE s.team_id = $1 AND s.question_id = $2
             GROUP BY s.id
             ORDER BY s.submitted_at DESC
             LIMIT 10`,
            [req.user.teamId, req.params.questionId]
        );
        
        res.json(submissions.rows);
    } catch (error) {
        console.error('❌ Error fetching submissions:', error);
        res.status(500).json({ error: error.message });
    }
});

// 11. Get Combined Leaderboard (Round 1 + Round 2)
router.get('/leaderboard', async (req, res) => {
    try {
        const leaderboard = await pool.query(`
            SELECT 
                t.team_name,
                t.leader_name,
                t.college_name,
                COALESCE(t.round1_score, 0) as round1_score,
                COALESCE(t.round2_score, 0) as round2_score,
                (COALESCE(t.round1_score, 0) + COALESCE(t.round2_score, 0)) as total_score,
                CASE 
                    WHEN t.round2_completed THEN 'Completed'
                    WHEN t.round1_completed THEN 'Round 2 In Progress'
                    WHEN t.round1_score > 0 THEN 'Round 1 Completed'
                    ELSE 'Not Started'
                END as status,
                RANK() OVER (ORDER BY (COALESCE(t.round1_score, 0) + COALESCE(t.round2_score, 0)) DESC) as rank
            FROM teams t
            WHERE t.team_code != 'ADMIN001'
            ORDER BY total_score DESC, t.team_name
            LIMIT 50
        `);
        
        res.json(leaderboard.rows);
    } catch (error) {
        console.error('❌ Error fetching leaderboard:', error);
        res.status(500).json({ error: error.message });
    }
});

// 12. Get Round 2 Leaderboard (Coding only)
router.get('/leaderboard/round2', async (req, res) => {
    try {
        const leaderboard = await pool.query(`
            SELECT 
                t.team_name,
                t.leader_name,
                t.college_name,
                t.round2_score,
                rs.questions_attempted,
                rs.start_time,
                rs.end_time,
                RANK() OVER (ORDER BY t.round2_score DESC, rs.start_time ASC) as rank
            FROM teams t
            JOIN round2_sessions rs ON t.id = rs.team_id
            WHERE t.team_code != 'ADMIN001' AND t.round2_score > 0
            ORDER BY t.round2_score DESC, rs.start_time ASC
            LIMIT 50
        `);
        
        res.json(leaderboard.rows);
    } catch (error) {
        console.error('❌ Error fetching round2 leaderboard:', error);
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
            [sessionId, req.user.teamId, activityType, details]
        );
        
        // Update cheat score in session
        await pool.query(
            `UPDATE round2_sessions 
             SET cheat_score = COALESCE(cheat_score, 0) + 1 
             WHERE id = $1`,
            [sessionId]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error logging activity:', error);
        res.status(500).json({ error: error.message });
    }
});

// 14. Get Team Progress
router.get('/progress', authenticateToken, async (req, res) => {
    try {
        const progress = await pool.query(`
            SELECT 
                COUNT(DISTINCT s.question_id) as attempted,
                COUNT(DISTINCT q.id) as total,
                SUM(CASE WHEN s.status = 'Accepted' THEN 1 ELSE 0 END) as solved,
                COALESCE(SUM(s.total_score), 0) as earned_score,
                COALESCE((
                    SELECT SUM(score) 
                    FROM round2_testcases 
                    WHERE question_id IN (SELECT id FROM round2_questions)
                ), 0) as total_score
            FROM round2_questions q
            LEFT JOIN round2_submissions s ON q.id = s.question_id 
                AND s.team_id = $1 
                AND s.status = 'Accepted'
            GROUP BY s.team_id
        `, [req.user.teamId]);
        
        res.json(progress.rows[0] || {
            attempted: 0,
            total: 0,
            solved: 0,
            earned_score: 0,
            total_score: 0
        });
    } catch (error) {
        console.error('❌ Error fetching progress:', error);
        res.status(500).json({ error: error.message });
    }
});

// 15. Complete Round 2
router.post('/complete', authenticateToken, async (req, res) => {
    try {
        await pool.query(
            `UPDATE round2_sessions 
             SET end_time = NOW(), status = 'completed' 
             WHERE team_id = $1`,
            [req.user.teamId]
        );
        
        await pool.query(
            `UPDATE teams 
             SET round2_completed = TRUE 
             WHERE id = $1`,
            [req.user.teamId]
        );
        
        res.json({ success: true, message: 'Round 2 completed!' });
    } catch (error) {
        console.error('❌ Error completing round 2:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;