-- Round 2 Questions Table
CREATE TABLE IF NOT EXISTS round2_questions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(20) DEFAULT 'Medium',
    time_limit INT DEFAULT 5, -- seconds
    memory_limit INT DEFAULT 256, -- MB
    created_at TIMESTAMP DEFAULT NOW()
);

-- Test Cases Table
CREATE TABLE IF NOT EXISTS round2_testcases (
    id SERIAL PRIMARY KEY,
    question_id INT REFERENCES round2_questions(id) ON DELETE CASCADE,
    input TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_hidden BOOLEAN DEFAULT TRUE,
    score INT DEFAULT 5,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Round 2 Submissions Table
CREATE TABLE IF NOT EXISTS round2_submissions (
    id SERIAL PRIMARY KEY,
    team_id INT REFERENCES teams(id),
    question_id INT REFERENCES round2_questions(id),
    language VARCHAR(20) NOT NULL,
    code TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending', -- Pending, Accepted, Wrong Answer, Error
    total_score INT DEFAULT 0,
    passed_testcases INT DEFAULT 0,
    total_testcases INT DEFAULT 0,
    execution_time FLOAT,
    memory_used INT,
    submitted_at TIMESTAMP DEFAULT NOW()
);

-- Round 2 Test Case Results Table
CREATE TABLE IF NOT EXISTS round2_testcase_results (
    id SERIAL PRIMARY KEY,
    submission_id INT REFERENCES round2_submissions(id) ON DELETE CASCADE,
    testcase_id INT REFERENCES round2_testcases(id) ON DELETE CASCADE,
    passed BOOLEAN DEFAULT FALSE,
    actual_output TEXT,
    execution_time FLOAT,
    memory_used INT,
    error_message TEXT
);

-- Round 2 Sessions Table
CREATE TABLE IF NOT EXISTS round2_sessions (
    id SERIAL PRIMARY KEY,
    team_id INT REFERENCES teams(id),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(20) DEFAULT 'not_started',
    total_score INT DEFAULT 0,
    questions_attempted INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);