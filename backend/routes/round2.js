// routes/round2.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const CodeExecutor = require('../piston-executor');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ============ ADMIN ROUTES ============

// 1. Add Round 2 Question with Test Cases
router.post('/admin/questions', authenticateToken, verifyAdmin, async (req, res) => {
    const { title, description, difficulty, time_limit, memory_limit, testcases } = req.body;
    
    try {
        await pool.query('BEGIN');
        
        // Insert question
        const questionResult = await pool.query(
            `INSERT INTO round2_questions 
             (title, description, difficulty, time_limit, memory_limit) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id`,
            [title, description, difficulty, time_limit, memory_limit]
        );
        
        const questionId = questionResult.rows[0].id;
        
        // Insert test cases
        for (const tc of testcases) {
            await pool.query(
                `INSERT INTO round2_testcases 
                 (question_id, input, expected_output, is_hidden, score) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [questionId, tc.input, tc.expected_output, tc.is_hidden || true, tc.score || 5]
            );
        }
        
        await pool.query('COMMIT');
        
        res.json({
            success: true,
            message: 'Question added successfully',
            questionId: questionId,
            testcasesCount: testcases.length
        });
        
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error adding question:', error);
        res.status(500).json({ error: error.message });
    }
});

// 2. Get All Round 2 Questions (Admin)
router.get('/admin/questions', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const questions = await pool.query(`
            SELECT q.*, 
                   COUNT(t.id) as testcases_count,
                   SUM(t.score) as total_score
            FROM round2_questions q
            LEFT JOIN round2_testcases t ON q.id = t.question_id
            GROUP BY q.id
            ORDER BY q.created_at DESC
        `);
        
        res.json(questions.rows);
    } catch (error) {
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
        
        const testcases = await pool.query(
            'SELECT * FROM round2_testcases WHERE question_id = $1 ORDER BY id',
            [req.params.id]
        );
        
        res.json({
            ...question.rows[0],
            testcases: testcases.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Delete Question (Admin)
router.delete('/admin/questions/:id', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM round2_questions WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: 'Question deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ PARTICIPANT ROUTES ============

// 5. Get Round 2 Questions for Participant
router.get('/questions', authenticateToken, async (req, res) => {
    try {
        const questions = await pool.query(`
            SELECT 
                q.id, q.title, q.description, q.difficulty, 
                q.time_limit, q.memory_limit,
                COUNT(t.id) as testcases_count,
                SUM(t.score) as total_score,
                CASE 
                    WHEN s.id IS NOT NULL THEN s.status 
                    ELSE 'Not Attempted'
                END as status,
                s.total_score as earned_score
            FROM round2_questions q
            LEFT JOIN round2_testcases t ON q.id = t.question_id
            LEFT JOIN round2_submissions s ON q.id = s.question_id 
                AND s.team_id = $1 
                AND s.status = 'Accepted'
            GROUP BY q.id, s.id, s.status, s.total_score
            ORDER BY q.difficulty, q.id
        `, [req.user.teamId]);
        
        res.json(questions.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 6. Get Single Question with Sample Test Cases (Hidden cases hidden)
router.get('/questions/:id', authenticateToken, async (req, res) => {
    try {
        const question = await pool.query(
            'SELECT * FROM round2_questions WHERE id = $1',
            [req.params.id]
        );
        
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
        
        res.json({
            ...question.rows[0],
            sample_testcases: testcases.rows,
            hidden_testcases_count: parseInt(hiddenStats.rows[0].count),
            hidden_testcases_total_score: parseInt(hiddenStats.rows[0].total_score) || 0
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 7. Submit Code
router.post('/submit', authenticateToken, async (req, res) => {
    const { questionId, language, code } = req.body;
    const teamId = req.user.teamId;
    
    try {
        // Get all test cases for this question (including hidden)
        const testcases = await pool.query(
            `SELECT id, input, expected_output, score, is_hidden 
             FROM round2_testcases 
             WHERE question_id = $1
             ORDER BY id`,
            [questionId]
        );
        
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
        const status = executionResult.passedCount === testcases.rows.length ? 'Accepted' : 'Wrong Answer';
        
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
                executionResult.results.reduce((acc, r) => acc + (r.execution_time || 0), 0) / executionResult.results.length,
                Math.max(...executionResult.results.map(r => r.memory || 0)),
                submissionId
            ]
        );
        
        // Update or create round2 session
        await pool.query(
            `INSERT INTO round2_sessions (team_id, start_time, status, total_score, questions_attempted)
             VALUES ($1, NOW(), 'in_progress', $2, 1)
             ON CONFLICT (team_id) DO UPDATE 
             SET total_score = round2_sessions.total_score + $2,
                 questions_attempted = round2_sessions.questions_attempted + 1,
                 status = 'in_progress'
             WHERE round2_sessions.team_id = $1`,
            [teamId, executionResult.totalScore]
        );
        
        // Prepare response (hide actual outputs for hidden test cases)
        const visibleResults = executionResult.results.map((result, index) => ({
            passed: result.passed,
            score: result.score,
            is_hidden: testcases.rows[index].is_hidden,
            execution_time: result.execution_time,
            memory: result.memory,
            // Only show expected/actual for sample test cases
            ...(!testcases.rows[index].is_hidden && {
                expected_output: result.expected_output,
                actual_output: result.actual_output
            })
        }));
        
        res.json({
            success: true,
            submissionId,
            status,
            passedCount: executionResult.passedCount,
            totalTestCases: testcases.rows.length,
            totalScore: executionResult.totalScore,
            results: visibleResults
        });
        
    } catch (error) {
        console.error('Submission error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 8. Get Submission History
router.get('/submissions/:questionId', authenticateToken, async (req, res) => {
    try {
        const submissions = await pool.query(
            `SELECT s.*, 
                    COUNT(CASE WHEN tr.passed THEN 1 END) as passed_count
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
        res.status(500).json({ error: error.message });
    }
});

// 9. Get Leaderboard
router.get('/leaderboard', async (req, res) => {
    try {
        const leaderboard = await pool.query(`
            SELECT 
                t.team_name,
                t.leader_name,
                t.college_name,
                rs.total_score,
                rs.questions_attempted,
                rs.start_time,
                RANK() OVER (ORDER BY rs.total_score DESC, rs.start_time ASC) as rank
            FROM round2_sessions rs
            JOIN teams t ON rs.team_id = t.id
            WHERE rs.status = 'completed' OR rs.status = 'in_progress'
            ORDER BY rs.total_score DESC, rs.start_time ASC
            LIMIT 50
        `);
        
        res.json(leaderboard.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;