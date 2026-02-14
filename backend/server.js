const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path'); // Add this
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Import routes - FIX THE PATH
const round2Routes = require(path.join(__dirname, 'routes', 'round2'));

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
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
                round1_completed BOOLEAN DEFAULT FALSE,
                round1_score INT DEFAULT 0,
                round2_completed BOOLEAN DEFAULT FALSE,
                round2_score INT DEFAULT 0,
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

        // Round 1 Questions (MCQ)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS round1_questions (
                id SERIAL PRIMARY KEY,
                question_text TEXT NOT NULL,
                question_type VARCHAR(50) DEFAULT 'mcq',
                options JSONB,
                correct_answer TEXT,
                difficulty VARCHAR(20) DEFAULT 'medium',
                points INT DEFAULT 1,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Round 1 questions table created');

        // Round 2 Questions (Coding)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS round2_questions (
                id SERIAL PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                difficulty VARCHAR(20) NOT NULL,
                problem_statement TEXT NOT NULL,
                sample_input TEXT,
                sample_output TEXT,
                points INT DEFAULT 5,
                time_limit INT DEFAULT 30,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Round 2 questions table created');

        // Test Cases for Round 2
        await pool.query(`
            CREATE TABLE IF NOT EXISTS test_cases (
                id SERIAL PRIMARY KEY,
                question_id INT REFERENCES round2_questions(id) ON DELETE CASCADE,
                input_data TEXT NOT NULL,
                expected_output TEXT NOT NULL,
                is_hidden BOOLEAN DEFAULT FALSE,
                order_number INT DEFAULT 0
            )
        `);
        console.log('✅ Test cases table created');

        // Round 1 Quiz sessions
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

        // Round 1 Answers
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
        console.log('✅ Round 1 answers table created');

        // Round 2 Submissions
        await pool.query(`
            CREATE TABLE IF NOT EXISTS round2_submissions (
                id SERIAL PRIMARY KEY,
                team_id INT REFERENCES teams(id),
                question_id INT REFERENCES round2_questions(id),
                submitted_code TEXT,
                language VARCHAR(20) DEFAULT 'python',
                passed_tests INT DEFAULT 0,
                total_tests INT DEFAULT 0,
                score_earned INT DEFAULT 0,
                execution_time_ms INT,
                submitted_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Round 2 submissions table created');

        // Test Case Results for Round 2
        await pool.query(`
            CREATE TABLE IF NOT EXISTS test_case_results (
                id SERIAL PRIMARY KEY,
                submission_id INT REFERENCES round2_submissions(id) ON DELETE CASCADE,
                test_case_id INT REFERENCES test_cases(id),
                passed BOOLEAN DEFAULT FALSE,
                actual_output TEXT,
                execution_time_ms INT
            )
        `);
        console.log('✅ Test case results table created');

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

        // Settings table for passwords
        await pool.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id SERIAL PRIMARY KEY,
                setting_key VARCHAR(50) UNIQUE NOT NULL,
                setting_value TEXT,
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Settings table created');

        // Insert default settings
        await pool.query(`
            INSERT INTO settings (setting_key, setting_value) 
            VALUES 
                ('round1_password', $1),
                ('round2_password', $2)
            ON CONFLICT (setting_key) DO NOTHING
        `, [process.env.ROUND1_PASSWORD || 'Round1@2024', process.env.ROUND2_PASSWORD || 'Round2@2024']);
        console.log('✅ Default settings inserted');

        // Create default admin team
        const hashedAdminPass = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123', 10);
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

// ==================== ROUND 1 API ROUTES ====================

// GET all Round 1 questions
app.get('/api/admin/round1/questions', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM round1_questions ORDER BY id DESC'
        );

        // Parse options JSON
        const questions = result.rows.map(q => ({
            ...q,
            options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
        }));

        res.json(questions);
    } catch (error) {
        console.error('Error fetching round1 questions:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST new Round 1 question (MCQ)
app.post('/api/admin/round1/questions', authenticateToken, verifyAdmin, async (req, res) => {
    const { question_text, question_type, options, correct_answer, difficulty, points } = req.body;

    try {
        // Validate required fields
        if (!question_text || !correct_answer) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await pool.query(
            `INSERT INTO round1_questions 
             (question_text, question_type, options, correct_answer, difficulty, points) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id`,
            [
                question_text,
                question_type || 'mcq',
                JSON.stringify(options || []),
                correct_answer,
                difficulty || 'medium',
                points || 1
            ]
        );

        res.json({
            success: true,
            questionId: result.rows[0].id,
            message: 'Round 1 question added successfully!'
        });

    } catch (error) {
        console.error('Error adding round1 question:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE Round 1 question
app.delete('/api/admin/round1/questions/:id', authenticateToken, verifyAdmin, async (req, res) => {
    const questionId = parseInt(req.params.id);

    if (isNaN(questionId) || questionId <= 0) {
        return res.status(400).json({ error: 'Invalid question ID' });
    }

    try {
        // Check if question exists
        const questionCheck = await pool.query(
            'SELECT id FROM round1_questions WHERE id = $1',
            [questionId]
        );

        if (questionCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Question not found' });
        }

        // Delete question (answers will be deleted via foreign key cascade)
        await pool.query('DELETE FROM round1_questions WHERE id = $1', [questionId]);

        res.json({
            success: true,
            message: 'Round 1 question deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting round1 question:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== ROUND 2 API ROUTES ====================

// GET all Round 2 questions with their test cases
app.get('/api/admin/round2/questions', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        // Get all round2 questions - FIXED SYNTAX
        const questionsResult = await pool.query(`
            SELECT * FROM round2_questions 
            ORDER BY 
                CASE difficulty 
                    WHEN 'easy' THEN 1 
                    WHEN 'medium' THEN 2 
                    WHEN 'hard' THEN 3 
                END, 
                id DESC
        `);

        const questions = [];

        // For each question, get its test cases
        for (const question of questionsResult.rows) {
            const testCasesResult = await pool.query(
                'SELECT * FROM test_cases WHERE question_id = $1 ORDER BY order_number',
                [question.id]
            );

            questions.push({
                ...question,
                test_cases: testCasesResult.rows
            });
        }

        res.json(questions);

    } catch (error) {
        console.error('Error fetching round2 questions:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST new Round 2 question (Coding)
// POST new Round 2 question (Coding)
app.post('/api/admin/round2/questions', authenticateToken, verifyAdmin, async (req, res) => {
    const {
        title,
        difficulty,
        problem_statement,
        description,  // Add this to accept both
        sample_input,
        sample_output,
        points,
        time_limit,
        test_cases
    } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Use either problem_statement or description
        const problemText = problem_statement || description;

        // Validate required fields
        if (!title || !difficulty || !problemText) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check which columns exist in your table
        const tableInfo = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'round2_questions'
        `);

        const columns = tableInfo.rows.map(row => row.column_name);
        console.log('Available columns:', columns);

        let questionResult;

        // Dynamic insert based on available columns
        if (columns.includes('problem_statement')) {
            questionResult = await client.query(
                `INSERT INTO round2_questions 
                 (title, difficulty, problem_statement, sample_input, sample_output, points, time_limit) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7) 
                 RETURNING id`,
                [title, difficulty, problemText, sample_input, sample_output, points || 5, time_limit || 30]
            );
        } else if (columns.includes('description')) {
            questionResult = await client.query(
                `INSERT INTO round2_questions 
                 (title, difficulty, description, sample_input, sample_output, points, time_limit) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7) 
                 RETURNING id`,
                [title, difficulty, problemText, sample_input, sample_output, points || 5, time_limit || 30]
            );
        } else {
            throw new Error('Neither problem_statement nor description column found in round2_questions table');
        }

        const questionId = questionResult.rows[0].id;

        // Insert test cases
        if (test_cases && test_cases.length > 0) {
            for (let i = 0; i < test_cases.length; i++) {
                const tc = test_cases[i];
                await client.query(
                    `INSERT INTO test_cases 
                     (question_id, input_data, expected_output, is_hidden, order_number) 
                     VALUES ($1, $2, $3, $4, $5)`,
                    [questionId, tc.input, tc.output, tc.isHidden || false, i]
                );
            }
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            questionId: questionId,
            message: 'Round 2 coding question added successfully!'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding round2 question:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// DELETE Round 2 question
app.delete('/api/admin/round2/questions/:id', authenticateToken, verifyAdmin, async (req, res) => {
    const questionId = parseInt(req.params.id);

    if (isNaN(questionId) || questionId <= 0) {
        return res.status(400).json({ error: 'Invalid question ID' });
    }

    try {
        // Check if question exists
        const questionCheck = await pool.query(
            'SELECT id FROM round2_questions WHERE id = $1',
            [questionId]
        );

        if (questionCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Question not found' });
        }

        // Delete question (test cases will be deleted via CASCADE)
        await pool.query('DELETE FROM round2_questions WHERE id = $1', [questionId]);

        res.json({
            success: true,
            message: 'Round 2 question deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting round2 question:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== ROUND 2 CODING RESULTS ====================

// GET coding results with detailed scores
app.get('/api/admin/coding-results', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                t.id as team_id,
                t.team_name,
                t.leader_name,
                t.college_name,
                t.round2_completed,
                t.round2_score as total_score,
                
                -- Easy questions score
                COALESCE((
                    SELECT SUM(score_earned)
                    FROM round2_submissions s
                    JOIN round2_questions q ON s.question_id = q.id
                    WHERE s.team_id = t.id AND q.difficulty = 'easy'
                ), 0) as easy_score,
                
                -- Medium questions score
                COALESCE((
                    SELECT SUM(score_earned)
                    FROM round2_submissions s
                    JOIN round2_questions q ON s.question_id = q.id
                    WHERE s.team_id = t.id AND q.difficulty = 'medium'
                ), 0) as medium_score,
                
                -- Hard questions score
                COALESCE((
                    SELECT SUM(score_earned)
                    FROM round2_submissions s
                    JOIN round2_questions q ON s.question_id = q.id
                    WHERE s.team_id = t.id AND q.difficulty = 'hard'
                ), 0) as hard_score,
                
                -- Submission details
                (
                    SELECT json_agg(
                        json_build_object(
                            'question_title', q.title,
                            'difficulty', q.difficulty,
                            'score', s.score_earned,
                            'passed_tests', s.passed_tests,
                            'total_tests', s.total_tests,
                            'submitted_at', s.submitted_at
                        )
                    )
                    FROM round2_submissions s
                    JOIN round2_questions q ON s.question_id = q.id
                    WHERE s.team_id = t.id
                ) as submissions
                
            FROM teams t
            WHERE t.team_code != 'ADMIN001'
            ORDER BY t.round2_score DESC, t.team_name
        `);

        res.json(result.rows);

    } catch (error) {
        console.error('Error fetching coding results:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== SETTINGS API ROUTES ====================

// GET all settings (passwords, etc.)
app.get('/api/admin/settings', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT setting_key, setting_value FROM settings WHERE setting_key IN ($1, $2)',
            ['round1_password', 'round2_password']
        );

        const settings = {
            round1Password: process.env.ROUND1_PASSWORD || 'Round1@2024',
            round2Password: process.env.ROUND2_PASSWORD || 'Round2@2024'
        };

        // Override from database if available
        result.rows.forEach(row => {
            if (row.setting_key === 'round1_password') {
                settings.round1Password = row.setting_value;
                process.env.ROUND1_PASSWORD = row.setting_value;
            } else if (row.setting_key === 'round2_password') {
                settings.round2Password = row.setting_value;
                process.env.ROUND2_PASSWORD = row.setting_value;
            }
        });

        res.json({
            success: true,
            ...settings
        });

    } catch (error) {
        console.error('Error fetching settings:', error);
        // Return default values on error
        res.json({
            success: true,
            round1Password: process.env.ROUND1_PASSWORD || 'Round1@2024',
            round2Password: process.env.ROUND2_PASSWORD || 'Round2@2024'
        });
    }
});

// POST update Round 1 password
app.post('/api/admin/set-round1-password', authenticateToken, verifyAdmin, async (req, res) => {
    const { newPassword } = req.body;

    if (!newPassword) {
        return res.status(400).json({ error: 'New password is required' });
    }

    try {
        // Update in database
        await pool.query(
            `INSERT INTO settings (setting_key, setting_value) 
             VALUES ($1, $2)
             ON CONFLICT (setting_key) 
             DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
            ['round1_password', newPassword]
        );

        // Update environment variable
        process.env.ROUND1_PASSWORD = newPassword;

        res.json({
            success: true,
            message: 'Round 1 password updated successfully',
            password: newPassword
        });

    } catch (error) {
        console.error('Error updating round1 password:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST update Round 2 password
app.post('/api/admin/set-round2-password', authenticateToken, verifyAdmin, async (req, res) => {
    const { newPassword } = req.body;

    if (!newPassword) {
        return res.status(400).json({ error: 'New password is required' });
    }

    try {
        // Update in database
        await pool.query(
            `INSERT INTO settings (setting_key, setting_value) 
             VALUES ($1, $2)
             ON CONFLICT (setting_key) 
             DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
            ['round2_password', newPassword]
        );

        // Update environment variable
        process.env.ROUND2_PASSWORD = newPassword;

        res.json({
            success: true,
            message: 'Round 2 password updated successfully',
            password: newPassword
        });

    } catch (error) {
        console.error('Error updating round2 password:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== EXISTING ROUTES (Keep all your existing routes) ====================

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
            isAdmin: true,
            message: 'Admin login successful'
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Create Team (Admin only)
app.post('/api/admin/create-team', authenticateToken, verifyAdmin, async (req, res) => {
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
            message: `Team created successfully!`
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

// Get team details including round status (UPDATED)
app.get('/api/team/details', authenticateToken, async (req, res) => {
    const teamId = req.user.teamId;
    
    try {
        console.log('🔍 Fetching team details for team ID:', teamId);
        
        const result = await pool.query(
            `SELECT 
                id, 
                team_code, 
                team_name, 
                leader_name, 
                college_name, 
                COALESCE(round1_completed, false) as round1_completed,
                COALESCE(round1_score, 0) as round1_score,
                COALESCE(round2_completed, false) as round2_completed,
                COALESCE(round2_score, 0) as round2_score,
                created_at
            FROM teams 
            WHERE id = $1`,
            [teamId]
        );
        
        if (result.rows.length === 0) {
            console.log('❌ Team not found for ID:', teamId);
            return res.status(404).json({ error: 'Team not found' });
        }
        
        console.log('✅ Team details found:', result.rows[0]);
        
        res.json({
            success: true,
            team: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Error fetching team details:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get team members status (ADD THIS if missing)
app.get('/api/team/members', authenticateToken, async (req, res) => {
    const teamId = req.user.teamId;

    try {
        const result = await pool.query(
            'SELECT COUNT(*) as count FROM team_members WHERE team_id = $1',
            [teamId]
        );

        const hasMembers = parseInt(result.rows[0].count) > 0;
        console.log(`👥 Team ${teamId} has members: ${hasMembers}`);

        res.json({
            success: true,
            hasMembers: hasMembers,
            count: parseInt(result.rows[0].count)
        });
    } catch (error) {
        console.error('❌ Error checking team members:', error);
        res.status(500).json({ error: error.message });
    }
});

// 6. Team Registration (UPDATED)
app.post('/api/teams/register', authenticateToken, async (req, res) => {
    const { teamName, leaderName, collegeName, members } = req.body;
    const teamId = req.user.teamId;

    console.log('📝 Registration request for team:', teamId);
    console.log('Team name:', teamName);
    console.log('Members:', members);

    try {
        // Start transaction
        await pool.query('BEGIN');

        // Update team info
        await pool.query(
            `UPDATE teams 
             SET team_name = $1, leader_name = $2, college_name = $3 
             WHERE id = $4`,
            [teamName, leaderName, collegeName, teamId]
        );

        // Delete existing members (if any) to avoid duplicates
        await pool.query('DELETE FROM team_members WHERE team_id = $1', [teamId]);

        // Add team members
        for (const member of members) {
            await pool.query(
                `INSERT INTO team_members 
                 (team_id, member_name, email, phone, roll_number, is_leader) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [teamId, member.name, member.email, member.phone, member.rollNumber, member.isLeader || false]
            );
        }

        // Commit transaction
        await pool.query('COMMIT');

        console.log('✅ Team registration completed for team:', teamId);

        res.json({
            success: true,
            message: 'Team registration completed successfully!'
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('❌ Registration error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get team members status
app.get('/api/team/members', authenticateToken, async (req, res) => {
    const teamId = req.user.teamId;

    try {
        const result = await pool.query(
            'SELECT COUNT(*) as count FROM team_members WHERE team_id = $1',
            [teamId]
        );

        res.json({
            success: true,
            hasMembers: parseInt(result.rows[0].count) > 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 7. Start Quiz (Round 1)
app.post('/api/round1/start', authenticateToken, async (req, res) => {
    const { roundPassword } = req.body;
    const teamId = req.user.teamId;

    try {
        // Get current round password from settings
        const settingsResult = await pool.query(
            'SELECT setting_value FROM settings WHERE setting_key = $1',
            ['round1_password']
        );

        const currentPassword = settingsResult.rows[0]?.setting_value || process.env.ROUND1_PASSWORD;

        // Verify round password
        if (roundPassword !== currentPassword) {
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

// 8. Get Round 1 Questions (randomized)
app.get('/api/round1/questions', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, question_text, question_type, options, difficulty, points 
            FROM round1_questions 
            ORDER BY RANDOM() 
            LIMIT 20
        `);

        // Parse options for each question
        const questions = result.rows.map(q => ({
            ...q,
            options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
        }));

        res.json(questions);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 9. Submit Answer (Round 1)
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

// 10. Complete Quiz (Round 1)
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

        // Update team record
        await pool.query(
            `UPDATE teams 
             SET round1_completed = TRUE, round1_score = $1 
             WHERE id = $2`,
            [totalScore, teamId]
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
            message: 'Quiz completed successfully!'
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

// 12. Get Round 1 Results (Admin)
app.get('/api/admin/results', authenticateToken, verifyAdmin, async (req, res) => {
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

// 13. Get all teams (Admin)
app.get('/api/admin/teams', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                t.*,
                COUNT(DISTINCT m.id) as member_count,
                COUNT(DISTINCT qs.id) FILTER (WHERE qs.status = 'completed') as round1_attempts
            FROM teams t
            LEFT JOIN team_members m ON t.id = m.team_id
            LEFT JOIN quiz_sessions qs ON t.id = qs.team_id
            GROUP BY t.id
            ORDER BY t.created_at DESC
        `);

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 14. Get Round 2 questions for participants (with sample tests only)
app.get('/api/round2/questions', authenticateToken, async (req, res) => {
    try {
        const questionsResult = await pool.query(`
            SELECT id, title, difficulty, problem_statement, 
                   sample_input, sample_output, points, time_limit
            FROM round2_questions 
            ORDER BY 
                CASE difficulty 
                    WHEN 'easy' THEN 1 
                    WHEN 'medium' THEN 2 
                    WHEN 'hard' THEN 3 
                END
        `);

        // For each question, get ONLY sample test cases (non-hidden)
        const questions = [];
        for (const q of questionsResult.rows) {
            const testCasesResult = await pool.query(`
                SELECT id, input_data as input, expected_output as output
                FROM test_cases 
                WHERE question_id = $1 AND is_hidden = false
                ORDER BY order_number
            `, [q.id]);

            questions.push({
                ...q,
                sample_tests: testCasesResult.rows
            });
        }

        res.json(questions);

    } catch (error) {
        console.error('Error fetching round2 questions for participants:', error);
        res.status(500).json({ error: error.message });
    }
});

// 15. Submit Round 2 coding solution
app.post('/api/round2/submit', authenticateToken, async (req, res) => {
    const { questionId, code, language } = req.body;
    const teamId = req.user.teamId;

    try {
        // Get all test cases for this question
        const testCases = await pool.query(
            'SELECT * FROM test_cases WHERE question_id = $1',
            [questionId]
        );

        const totalTests = testCases.rows.length;
        const hiddenTests = testCases.rows.filter(tc => tc.is_hidden).length;

        // Here you would integrate with a code executor
        // For now, we'll simulate test case results
        // You can integrate with piston-api or a similar service

        // Simulate test execution (replace with actual code execution)
        const passedTests = Math.floor(Math.random() * totalTests); // Simulated
        const allPassed = passedTests === totalTests;

        // Calculate score based on passed tests
        const questionInfo = await pool.query(
            'SELECT points FROM round2_questions WHERE id = $1',
            [questionId]
        );

        const maxPoints = questionInfo.rows[0].points;
        const scoreEarned = Math.floor((passedTests / totalTests) * maxPoints);

        // Save submission
        const submissionResult = await pool.query(
            `INSERT INTO round2_submissions 
             (team_id, question_id, submitted_code, language, passed_tests, total_tests, score_earned) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [teamId, questionId, code, language || 'python', passedTests, totalTests, scoreEarned]
        );

        // Update team's round2 score
        await pool.query(
            `UPDATE teams 
             SET round2_score = round2_score + $1 
             WHERE id = $2`,
            [scoreEarned, teamId]
        );

        // Check if all questions attempted to mark round2 as completed
        const totalQuestions = await pool.query('SELECT COUNT(*) FROM round2_questions');
        const attemptedQuestions = await pool.query(
            'SELECT COUNT(DISTINCT question_id) FROM round2_submissions WHERE team_id = $1',
            [teamId]
        );

        if (attemptedQuestions.rows[0].count === parseInt(totalQuestions.rows[0].count)) {
            await pool.query(
                'UPDATE teams SET round2_completed = TRUE WHERE id = $1',
                [teamId]
            );
        }

        res.json({
            success: true,
            submissionId: submissionResult.rows[0].id,
            passedTests,
            totalTests,
            hiddenTests,
            scoreEarned,
            allPassed,
            message: allPassed ? 'All tests passed!' : `${passedTests}/${totalTests} tests passed`
        });

    } catch (error) {
        console.error('Error submitting round2 solution:', error);
        res.status(500).json({ error: error.message });
    }
});
app.use('/api/round2', round2Routes);
// ==================== DELETE ALL QUESTIONS ROUTE (Keep your existing) ====================

app.delete('/api/admin/delete-all-questions', authenticateToken, verifyAdmin, async (req, res) => {
    console.log('='.repeat(50));
    console.log('🗑️ DELETE ALL QUESTIONS REQUEST RECEIVED');
    console.log('='.repeat(50));

    try {
        // Begin transaction
        await pool.query('BEGIN');

        const stats = {
            answers: 0,
            cheatLogs: 0,
            sessions: 0,
            round1_questions: 0,
            round2_questions: 0,
            test_cases: 0,
            submissions: 0
        };

        // Delete Round 2 test case results
        const testCaseResultsResult = await pool.query('DELETE FROM test_case_results RETURNING id');
        stats.test_case_results = testCaseResultsResult.rowCount;

        // Delete Round 2 submissions
        const submissionsResult = await pool.query('DELETE FROM round2_submissions RETURNING id');
        stats.submissions = submissionsResult.rowCount;

        // Delete Round 2 test cases
        const testCasesResult = await pool.query('DELETE FROM test_cases RETURNING id');
        stats.test_cases = testCasesResult.rowCount;

        // Delete Round 2 questions
        const round2Result = await pool.query('DELETE FROM round2_questions RETURNING id');
        stats.round2_questions = round2Result.rowCount;

        // Delete Round 1 answers
        const answersResult = await pool.query('DELETE FROM round1_answers RETURNING id');
        stats.answers = answersResult.rowCount;

        // Delete cheat logs
        const cheatLogsResult = await pool.query('DELETE FROM cheat_logs RETURNING id');
        stats.cheatLogs = cheatLogsResult.rowCount;

        // Reset quiz sessions
        const sessionsResult = await pool.query(
            `UPDATE quiz_sessions 
             SET total_score = 0, cheat_score = 0, status = 'not_started', end_time = NULL 
             RETURNING id`
        );
        stats.sessions = sessionsResult.rowCount;

        // Delete Round 1 questions
        const round1Result = await pool.query('DELETE FROM round1_questions RETURNING id');
        stats.round1_questions = round1Result.rowCount;

        // Reset team scores
        await pool.query(
            `UPDATE teams 
             SET round1_completed = FALSE, round1_score = 0, 
                 round2_completed = FALSE, round2_score = 0 
             WHERE team_code != 'ADMIN001'`
        );

        // Commit transaction
        await pool.query('COMMIT');

        console.log('🎉 DELETE ALL QUESTIONS COMPLETED SUCCESSFULLY');
        console.log('📊 STATISTICS:', stats);

        res.status(200).json({
            success: true,
            message: 'All questions and related data deleted successfully',
            stats: stats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('❌ DELETE ALL QUESTIONS ERROR:', error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

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
    console.log(`📡 Server URL: http://0.0.0.0:${PORT}`);
    console.log(`🔗 Database: Render PostgreSQL`);
    console.log(`🔗 Database: Connected`);
    console.log('='.repeat(50));
});