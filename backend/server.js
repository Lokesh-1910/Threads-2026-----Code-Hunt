const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Database connection with YOUR Render URL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false  // Required for Render
    }
});

console.log('🔗 Database URL:', process.env.DATABASE_URL);

// Test database connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Database connection error:', err.message);
    } else {
        console.log('✅ Database connected successfully!');
        release();
    }
});

// Create tables
const createTables = async () => {
    try {
        console.log('📝 Creating database tables...');

        // Teams table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS teams (
                id SERIAL PRIMARY KEY,
                team_code VARCHAR(20) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                team_name VARCHAR(100),
                leader_name VARCHAR(100),
                college_name VARCHAR(200),
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Teams table created');

        // Team members
        await pool.query(`
            CREATE TABLE IF NOT EXISTS team_members (
                id SERIAL PRIMARY KEY,
                team_id INT REFERENCES teams(id),
                member_name VARCHAR(100) NOT NULL,
                email VARCHAR(100),
                phone VARCHAR(15),
                roll_number VARCHAR(50),
                is_leader BOOLEAN DEFAULT FALSE
            )
        `);
        console.log('✅ Team members table created');

        // Questions
        await pool.query(`
            CREATE TABLE IF NOT EXISTS round1_questions (
                id SERIAL PRIMARY KEY,
                question_text TEXT NOT NULL,
                question_type VARCHAR(50),
                options JSONB,
                correct_answer TEXT,
                points INT DEFAULT 1,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Questions table created');

        // Quiz sessions
        await pool.query(`
            CREATE TABLE IF NOT EXISTS quiz_sessions (
                id SERIAL PRIMARY KEY,
                team_id INT REFERENCES teams(id),
                start_time TIMESTAMP,
                end_time TIMESTAMP,
                status VARCHAR(20) DEFAULT 'not_started',
                total_score INT DEFAULT 0,
                cheat_score INT DEFAULT 0,
                round_password VARCHAR(100),
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Quiz sessions table created');

        // Answers
        await pool.query(`
            CREATE TABLE IF NOT EXISTS round1_answers (
                id SERIAL PRIMARY KEY,
                session_id INT REFERENCES quiz_sessions(id),
                question_id INT REFERENCES round1_questions(id),
                selected_answer TEXT,
                is_correct BOOLEAN,
                answered_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Answers table created');

        // Cheat logs
        await pool.query(`
            CREATE TABLE IF NOT EXISTS cheat_logs (
                id SERIAL PRIMARY KEY,
                session_id INT REFERENCES quiz_sessions(id),
                activity_type VARCHAR(50),
                timestamp TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Cheat logs table created');

        // Create default admin team
        const hashedAdminPass = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
        await pool.query(
            `INSERT INTO teams (team_code, password, team_name, leader_name) 
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (team_code) DO NOTHING`,
            ['ADMIN001', hashedAdminPass, 'Administrator', 'Admin']
        );
        console.log('✅ Default admin created (ADMIN001)');

        console.log('🎉 All tables created successfully!');

    } catch (error) {
        console.error('❌ Error creating tables:', error.message);
    }
};

// Initialize tables
createTables();

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
    
    // Check if user is admin (based on teamCode or isAdmin flag)
    if (req.user.teamCode !== 'ADMIN001' && !req.user.isAdmin) {
        console.log('❌ Admin access denied for user:', req.user.teamCode);
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Set admin flag for other middleware
    req.user.isAdmin = true;
    console.log('✅ Admin verified:', req.user.teamCode);
    next();
};

// ==================== ROUTES ====================

// 1. Health Check
app.get('/', (req, res) => {
    res.json({
        message: 'Code Hunt Backend is running!',
        database: 'Connected to Render PostgreSQL',
        time: new Date().toISOString()
    });
});

// 2. Database test
app.get('/api/db-test', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW() as time, version() as version');
        res.json({
            success: true,
            time: result.rows[0].time,
            version: result.rows[0].version
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Admin Login
app.post('/api/admin/login', async (req, res) => {
    const { teamCode, password } = req.body;

    try {
        const result = await pool.query(
            'SELECT * FROM teams WHERE team_code = $1',
            [teamCode]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const team = result.rows[0];
        const validPassword = await bcrypt.compare(password, team.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            {
                teamId: team.id,
                teamCode: team.team_code,
                teamName: team.team_name,
                isAdmin: true
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token, 
            teamId: team.id,
            teamCode: team.team_code,
            teamName: team.team_name,
            isAdmin: true,  // ← ALSO RETURN THIS
            message: 'Admin login successful'
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Create Team (Admin only)
app.post('/api/admin/create-team', async (req, res) => {
    const { teamCode, password, teamName } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO teams (team_code, password, team_name) 
             VALUES ($1, $2, $3) 
             RETURNING id, team_code, team_name`,
            [teamCode, hashedPassword, teamName]
        );

        res.json({
            success: true,
            team: result.rows[0],
            credentials: {
                teamCode: teamCode,
                password: password
            },
            message: `Team created successfully! Share these credentials with team.`
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. Team Login
app.post('/api/auth/login', async (req, res) => {
    const { teamCode, password } = req.body;

    try {
        const result = await pool.query(
            'SELECT * FROM teams WHERE team_code = $1',
            [teamCode]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid team code' });
        }

        const team = result.rows[0];
        const validPassword = await bcrypt.compare(password, team.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Check if team has members registered
        const membersResult = await pool.query(
            'SELECT COUNT(*) FROM team_members WHERE team_id = $1',
            [team.id]
        );

        const needsRegistration = membersResult.rows[0].count === '0';

        const token = jwt.sign(
            {
                teamId: team.id,
                teamCode: team.team_code,
                teamName: team.team_name
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            success: true,
            token,
            teamId: team.id,
            teamCode: team.team_code,
            teamName: team.team_name,
            needsRegistration,
            message: needsRegistration ? 'Complete team registration' : 'Login successful'
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 6. Team Registration
app.post('/api/teams/register', authenticateToken, async (req, res) => {
    const { teamName, leaderName, collegeName, members } = req.body;
    const teamId = req.user.teamId;

    try {
        // Update team info
        await pool.query(
            `UPDATE teams 
             SET team_name = $1, leader_name = $2, college_name = $3 
             WHERE id = $4`,
            [teamName, leaderName, collegeName, teamId]
        );

        // Add team members
        for (const member of members) {
            await pool.query(
                `INSERT INTO team_members 
                 (team_id, member_name, email, phone, roll_number, is_leader) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [teamId, member.name, member.email, member.phone, member.rollNumber, member.isLeader || false]
            );
        }

        res.json({
            success: true,
            message: 'Team registration completed successfully!'
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 7. Start Quiz
app.post('/api/round1/start', authenticateToken, async (req, res) => {
    const { roundPassword } = req.body;
    const teamId = req.user.teamId;

    try {
        // Verify round password
        if (roundPassword !== process.env.ROUND1_PASSWORD) {
            return res.status(401).json({ error: 'Invalid round password' });
        }

        // Check if already completed
        const existing = await pool.query(
            'SELECT * FROM quiz_sessions WHERE team_id = $1 AND status = $2',
            [teamId, 'completed']
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Your team has already completed this round' });
        }

        // Check if already in progress
        const inProgress = await pool.query(
            'SELECT * FROM quiz_sessions WHERE team_id = $1 AND status = $2',
            [teamId, 'in_progress']
        );

        let sessionId;

        if (inProgress.rows.length > 0) {
            // Resume existing session
            sessionId = inProgress.rows[0].id;
        } else {
            // Create new session
            const result = await pool.query(
                `INSERT INTO quiz_sessions 
                 (team_id, start_time, status, round_password) 
                 VALUES ($1, NOW(), 'in_progress', $2) 
                 RETURNING id`,
                [teamId, roundPassword]
            );
            sessionId = result.rows[0].id;
        }

        res.json({
            success: true,
            sessionId,
            message: 'Quiz started successfully! You have 30 minutes.'
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 8. Get Questions (randomized)
app.get('/api/round1/questions', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, question_text, question_type, options, points 
            FROM round1_questions 
            ORDER BY RANDOM() 
            LIMIT 20
        `);

        res.json(result.rows);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== QUESTION MANAGEMENT ROUTES ====================

// 1. Add Question (Admin)
app.post('/api/admin/questions', async (req, res) => {
    const { question_text, question_type, options, correct_answer, points } = req.body;
    
    try {
        // Validate required fields
        if (!question_text || !question_type || !correct_answer) {
            return res.status(400).json({ 
                error: 'Missing required fields' 
            });
        }

        const result = await pool.query(
            `INSERT INTO round1_questions 
             (question_text, question_type, options, correct_answer, points) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id`,
            [
                question_text, 
                question_type, 
                JSON.stringify(options || []), 
                correct_answer,
                points || 1
            ]
        );
        
        res.json({ 
            success: true, 
            questionId: result.rows[0].id,
            message: 'Question added successfully!' 
        });
        
    } catch (error) {
        console.error('Error adding question:', error);
        res.status(500).json({ error: error.message });
    }
});


// 2. Get All Questions (Admin)
app.get('/api/admin/questions', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM round1_questions ORDER BY id DESC'
        );

        // Parse options JSON for each question
        const questions = result.rows.map(q => ({
            ...q,
            options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
        }));

        res.json(questions);

    } catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).json({ error: error.message });
    }
});


// ============ COMPLETE FIXED DELETE ROUTE ============
app.delete('/api/admin/questions/:id', authenticateToken, verifyAdmin, async (req, res) => {
    const questionId = parseInt(req.params.id);
    
    // Validate ID
    if (isNaN(questionId) || questionId <= 0) {
        return res.status(400).json({ error: 'Invalid question ID' });
    }

    console.log(`🗑️ Delete request for question ID: ${questionId}`);
    console.log(`👤 User: ${req.user.teamCode}, isAdmin: ${req.user.isAdmin}`);

    try {
        // Check if question exists
        const questionCheck = await pool.query(
            'SELECT id, question_text FROM round1_questions WHERE id = $1',
            [questionId]
        );

        if (questionCheck.rows.length === 0) {
            console.log(`❌ Question ${questionId} not found`);
            return res.status(404).json({ error: 'Question not found' });
        }

        console.log(`📝 Deleting question: ${questionCheck.rows[0].question_text.substring(0, 50)}...`);

        // Begin transaction
        await pool.query('BEGIN');

        // 1. Delete all answers for this question
        const answersResult = await pool.query(
            'DELETE FROM round1_answers WHERE question_id = $1 RETURNING id',
            [questionId]
        );
        
        console.log(`✅ Deleted ${answersResult.rowCount} answers`);

        // 2. Delete the question
        const questionResult = await pool.query(
            'DELETE FROM round1_questions WHERE id = $1 RETURNING id',
            [questionId]
        );

        // Commit transaction
        await pool.query('COMMIT');

        console.log(`✅ Question ${questionId} deleted successfully`);
        
        res.json({ 
            success: true, 
            message: 'Question deleted successfully',
            deletedAnswers: answersResult.rowCount,
            deletedQuestion: questionResult.rows[0]?.id
        });

    } catch (error) {
        // Rollback transaction on error
        await pool.query('ROLLBACK');
        
        console.error('❌ Delete error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============ COMPLETE FIXED DELETE ALL QUESTIONS ROUTE ============
app.delete('/api/admin/delete-all-questions', authenticateToken, verifyAdmin, async (req, res) => {
    console.log('='.repeat(50));
    console.log('🗑️ DELETE ALL QUESTIONS REQUEST RECEIVED');
    console.log('='.repeat(50));
    console.log(`👤 User: ${req.user?.teamCode}, isAdmin: ${req.user?.isAdmin}`);
    console.log(`📅 Time: ${new Date().toISOString()}`);
    
    try {
        // Begin transaction
        await pool.query('BEGIN');
        
        const stats = {
            answers: 0,
            cheatLogs: 0,
            sessions: 0,
            questions: 0
        };

        // 1. FIRST: Delete all answers (this is the main foreign key constraint)
        const answersResult = await pool.query(
            'DELETE FROM round1_answers RETURNING id'
        );
        stats.answers = answersResult.rowCount;
        console.log(`✅ Deleted ${stats.answers} answers`);

        // 2. SECOND: Delete cheat logs
        const cheatLogsResult = await pool.query(
            'DELETE FROM cheat_logs RETURNING id'
        );
        stats.cheatLogs = cheatLogsResult.rowCount;
        console.log(`✅ Deleted ${stats.cheatLogs} cheat logs`);

        // 3. THIRD: Reset quiz sessions (set scores to 0)
        const sessionsResult = await pool.query(
            `UPDATE quiz_sessions 
             SET total_score = 0, 
                 cheat_score = 0, 
                 status = 'not_started', 
                 end_time = NULL 
             WHERE status = 'completed' OR status = 'in_progress'
             RETURNING id`
        );
        stats.sessions = sessionsResult.rowCount;
        console.log(`✅ Reset ${stats.sessions} quiz sessions`);

        // 4. FOURTH: Delete all questions
        const questionsResult = await pool.query(
            'DELETE FROM round1_questions RETURNING id'
        );
        stats.questions = questionsResult.rowCount;
        console.log(`✅ Deleted ${stats.questions} questions`);

        // Commit transaction
        await pool.query('COMMIT');
        
        console.log('='.repeat(50));
        console.log('🎉 DELETE ALL QUESTIONS COMPLETED SUCCESSFULLY');
        console.log('='.repeat(50));
        console.log(`📊 STATISTICS:`);
        console.log(`   • Questions deleted: ${stats.questions}`);
        console.log(`   • Answers deleted: ${stats.answers}`);
        console.log(`   • Cheat logs deleted: ${stats.cheatLogs}`);
        console.log(`   • Sessions reset: ${stats.sessions}`);
        console.log('='.repeat(50));

        res.status(200).json({
            success: true,
            message: 'All questions and related data deleted successfully',
            stats: stats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        // Rollback transaction on error
        await pool.query('ROLLBACK');
        
        console.error('❌ DELETE ALL QUESTIONS ERROR:');
        console.error(`   • Error message: ${error.message}`);
        console.error(`   • Error code: ${error.code}`);
        console.error(`   • Error detail: ${error.detail || 'No details'}`);
        console.error(`   • Stack trace: ${error.stack}`);
        
        // Send appropriate error response
        res.status(500).json({
            success: false,
            error: error.message,
            code: error.code,
            detail: error.detail || null,
            hint: 'Check server logs for more details'
        });
    }
});


// 4. Update Question (Admin)
app.put('/api/admin/questions/:id', async (req, res) => {
    const { id } = req.params;
    const { question_text, question_type, options, correct_answer, points } = req.body;

    try {
        await pool.query(
            `UPDATE round1_questions 
             SET question_text = $1, question_type = $2, options = $3, 
                 correct_answer = $4, points = $5 
             WHERE id = $6`,
            [question_text, question_type, JSON.stringify(options), correct_answer, points, id]
        );

        res.json({ success: true, message: 'Question updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== PASSWORD MANAGEMENT ROUTES ====================

// 5. Update Round Password (Admin)
app.post('/api/admin/update-password', async (req, res) => {
    const { newPassword } = req.body;
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Update environment variable (for current session)
        process.env.ROUND1_PASSWORD = newPassword;

        // You can also store in database if you want persistent storage
        // For now, we'll just update the env variable

        res.json({
            success: true,
            message: 'Round password updated successfully!'
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 6. Get Current Round Password (Admin)
app.get('/api/admin/current-password', async (req, res) => {
    try {
        res.json({
            success: true,
            password: process.env.ROUND1_PASSWORD || 'CodeHunt2024'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 9. Submit Answer
app.post('/api/round1/submit-answer', authenticateToken, async (req, res) => {
    const { sessionId, questionId, selectedAnswer } = req.body;

    try {
        // Get correct answer
        const question = await pool.query(
            'SELECT correct_answer, points FROM round1_questions WHERE id = $1',
            [questionId]
        );

        if (question.rows.length === 0) {
            return res.status(404).json({ error: 'Question not found' });
        }

        const correctAnswer = question.rows[0].correct_answer;
        const isCorrect = correctAnswer === selectedAnswer;
        const points = isCorrect ? question.rows[0].points : 0;

        // Save answer
        await pool.query(
            `INSERT INTO round1_answers 
             (session_id, question_id, selected_answer, is_correct) 
             VALUES ($1, $2, $3, $4)`,
            [sessionId, questionId, selectedAnswer, isCorrect]
        );

        res.json({
            success: true,
            isCorrect,
            points,
            correctAnswer: isCorrect ? null : correctAnswer
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 10. Complete Quiz
app.post('/api/round1/complete', authenticateToken, async (req, res) => {
    const { sessionId, feedback } = req.body;
    const teamId = req.user.teamId;

    try {
        // Calculate total score
        const scoreResult = await pool.query(`
            SELECT COUNT(*) as correct_answers 
            FROM round1_answers 
            WHERE session_id = $1 AND is_correct = true
        `, [sessionId]);

        const totalScore = parseInt(scoreResult.rows[0].correct_answers);

        // Update session
        await pool.query(
            `UPDATE quiz_sessions 
             SET end_time = NOW(), status = 'completed', total_score = $1 
             WHERE id = $2 AND team_id = $3`,
            [totalScore, sessionId, teamId]
        );

        // Save feedback
        if (feedback) {
            await pool.query(
                'INSERT INTO feedback (session_id, comments) VALUES ($1, $2)',
                [sessionId, feedback]
            );
        }

        res.json({
            success: true,
            score: totalScore,
            message: 'Quiz completed successfully! Thank you for participating.'
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 11. Log Cheat Activity
app.post('/api/round1/log-activity', authenticateToken, async (req, res) => {
    const { sessionId, activityType } = req.body;

    try {
        await pool.query(
            `INSERT INTO cheat_logs (session_id, activity_type) 
             VALUES ($1, $2)`,
            [sessionId, activityType]
        );

        // Update cheat score
        await pool.query(
            `UPDATE quiz_sessions 
             SET cheat_score = cheat_score + 1 
             WHERE id = $1`,
            [sessionId]
        );

        res.json({ success: true });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== ADMIN ROUTES ====================

// 12. Add Question
app.post('/api/admin/questions', async (req, res) => {
    const { question_text, question_type, options, correct_answer } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO round1_questions 
             (question_text, question_type, options, correct_answer) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id`,
            [question_text, question_type, JSON.stringify(options), correct_answer]
        );

        res.json({
            success: true,
            questionId: result.rows[0].id,
            message: 'Question added successfully!'
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 13. Get All Questions
app.get('/api/admin/questions', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM round1_questions ORDER BY created_at DESC'
        );

        res.json(result.rows);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 14. Get Results
app.get('/api/admin/results', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                t.team_name,
                t.leader_name,
                t.college_name,
                qs.total_score,
                qs.cheat_score,
                TO_CHAR(qs.start_time, 'DD-MM-YYYY HH24:MI') as start_time,
                TO_CHAR(qs.end_time, 'DD-MM-YYYY HH24:MI') as end_time
            FROM quiz_sessions qs
            JOIN teams t ON qs.team_id = t.id
            WHERE qs.status = 'completed'
            ORDER BY qs.total_score DESC, qs.cheat_score ASC
        `);

        res.json(result.rows);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== ADDITIONAL ADMIN ROUTES ====================

// 1. Get current round password
app.get('/api/admin/current-password', async (req, res) => {
    res.json({ 
        success: true, 
        password: process.env.ROUND1_PASSWORD || 'CodeHunt2024' 
    });
});

// 2. Update round password
app.post('/api/admin/update-password', async (req, res) => {
    const { newPassword } = req.body;
    
    if (!newPassword) {
        return res.status(400).json({ error: 'Password is required' });
    }

    try {
        // Update in memory/process.env
        process.env.ROUND1_PASSWORD = newPassword;
        
        res.json({ 
            success: true, 
            message: 'Password updated successfully',
            password: newPassword 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



// 4. Get all teams
app.get('/api/admin/teams', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                t.*,
                COUNT(m.id) as member_count
            FROM teams t
            LEFT JOIN team_members m ON t.id = m.team_id
            GROUP BY t.id
            ORDER BY t.created_at DESC
        `);
        
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
const round2Routes = require('./routes/round2');
app.use('/api/round2', round2Routes);
// ==================== SOCKET.IO ====================

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join-quiz', (sessionId) => {
        socket.join(`quiz-${sessionId}`);
        console.log(`Client joined quiz session: ${sessionId}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('🚀 CODE HUNT BACKEND SERVER STARTED');
    console.log('='.repeat(50));
    console.log(`📡 Server URL: http://localhost:${PORT}`);
    console.log(`🔗 Database: Render PostgreSQL`);
    console.log(`🔐 Admin Login: ADMIN001 / ${process.env.ADMIN_PASSWORD}`);
    console.log(`🎯 Round 1 Password: ${process.env.ROUND1_PASSWORD}`);
    console.log('='.repeat(50));
});