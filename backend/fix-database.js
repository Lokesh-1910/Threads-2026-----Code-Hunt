// backend/fix-database.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function fixDatabase() {
    console.log('='.repeat(60));
    console.log('🔧 FIXING DATABASE - STARTING...');
    console.log('='.repeat(60));
    
    try {
        // ============ FIX ROUND 2 QUESTIONS TABLE ============
        console.log('\n📊 Checking round2_questions table...');
        
        // Check current columns in round2_questions
        const round2Columns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'round2_questions'
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Current columns in round2_questions:');
        if (round2Columns.rows.length === 0) {
            console.log('   ❌ Table does not exist yet');
        } else {
            round2Columns.rows.forEach(col => console.log(`   - ${col.column_name}`));
        }

        // Add missing columns to round2_questions
        console.log('\n📝 Adding missing columns to round2_questions...');
        
        await pool.query(`
            ALTER TABLE round2_questions 
            ADD COLUMN IF NOT EXISTS problem_statement TEXT,
            ADD COLUMN IF NOT EXISTS description TEXT,
            ADD COLUMN IF NOT EXISTS sample_input TEXT,
            ADD COLUMN IF NOT EXISTS sample_output TEXT,
            ADD COLUMN IF NOT EXISTS points INT DEFAULT 5,
            ADD COLUMN IF NOT EXISTS time_limit INT DEFAULT 30,
            ADD COLUMN IF NOT EXISTS memory_limit INT DEFAULT 256
        `);
        
        console.log('✅ Round 2 columns added successfully!');

        // Verify round2_columns after fix
        const updatedRound2Columns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'round2_questions'
            ORDER BY ordinal_position
        `);
        
        console.log('\n📊 Updated columns in round2_questions:');
        updatedRound2Columns.rows.forEach(col => console.log(`   - ${col.column_name}`));

        // ============ FIX ROUND 1 QUESTIONS TABLE ============
        console.log('\n\n📊 Checking round1_questions table...');
        
        // Check current columns in round1_questions
        const round1Columns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'round1_questions'
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Current columns in round1_questions:');
        if (round1Columns.rows.length === 0) {
            console.log('   ❌ Table does not exist yet');
        } else {
            round1Columns.rows.forEach(col => console.log(`   - ${col.column_name}`));
        }

        // Add missing columns to round1_questions
        console.log('\n📝 Adding missing columns to round1_questions...');
        
        await pool.query(`
            ALTER TABLE round1_questions 
            ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'medium',
            ADD COLUMN IF NOT EXISTS points INT DEFAULT 1,
            ADD COLUMN IF NOT EXISTS question_type VARCHAR(50) DEFAULT 'mcq'
        `);
        
        console.log('✅ Round 1 columns added successfully!');

        // Verify round1_columns after fix
        const updatedRound1Columns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'round1_questions'
            ORDER BY ordinal_position
        `);
        
        console.log('\n📊 Updated columns in round1_questions:');
        updatedRound1Columns.rows.forEach(col => console.log(`   - ${col.column_name}`));

        // ============ CHECK TEST CASES TABLE ============
        console.log('\n\n📊 Checking test_cases table...');
        
        const testCasesColumns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'test_cases'
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Columns in test_cases:');
        if (testCasesColumns.rows.length === 0) {
            console.log('   ❌ Table does not exist yet');
            
            // Create test_cases table if it doesn't exist
            await pool.query(`
                CREATE TABLE IF NOT EXISTS test_cases (
                    id SERIAL PRIMARY KEY,
                    question_id INT REFERENCES round2_questions(id) ON DELETE CASCADE,
                    input_data TEXT NOT NULL,
                    expected_output TEXT NOT NULL,
                    is_hidden BOOLEAN DEFAULT FALSE,
                    order_number INT DEFAULT 0,
                    score INT DEFAULT 5
                )
            `);
            console.log('✅ test_cases table created!');
        } else {
            testCasesColumns.rows.forEach(col => console.log(`   - ${col.column_name}`));
            
            // Add any missing columns to test_cases
            await pool.query(`
                ALTER TABLE test_cases 
                ADD COLUMN IF NOT EXISTS score INT DEFAULT 5
            `);
            console.log('✅ test_cases columns updated!');
        }

        // ============ SUMMARY ============
        console.log('\n' + '='.repeat(60));
        console.log('✅✅✅ DATABASE FIX COMPLETED SUCCESSFULLY! ✅✅✅');
        console.log('='.repeat(60));
        console.log('\n📊 Summary of fixes:');
        console.log('   • round2_questions: Added missing columns');
        console.log('   • round1_questions: Added difficulty, points columns');
        console.log('   • test_cases: Verified/created table');
        console.log('\n🚀 You can now restart your backend and try adding questions again!');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌❌❌ ERROR:', error.message);
        console.error('\n🔍 Detailed error:', error);
    } finally {
        await pool.end();
    }
}

// Run the fix
fixDatabase();