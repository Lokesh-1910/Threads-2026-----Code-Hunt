// test-delete-all.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function testDatabaseConnection() {
    try {
        // Test connection
        const connTest = await pool.query('SELECT NOW()');
        console.log('✅ Database connected:', connTest.rows[0].now);
        
        // Check current stats
        const questions = await pool.query('SELECT COUNT(*) FROM round1_questions');
        const answers = await pool.query('SELECT COUNT(*) FROM round1_answers');
        const sessions = await pool.query('SELECT COUNT(*) FROM quiz_sessions');
        
        console.log('\n📊 CURRENT DATABASE STATS:');
        console.log(`   Questions: ${questions.rows[0].count}`);
        console.log(`   Answers: ${answers.rows[0].count}`);
        console.log(`   Quiz Sessions: ${sessions.rows[0].count}`);
        
        // Test delete all (in transaction)
        console.log('\n🧪 Testing delete all operation...');
        await pool.query('BEGIN');
        
        const delAnswers = await pool.query('DELETE FROM round1_answers');
        console.log(`   ✅ Deleted ${delAnswers.rowCount} answers`);
        
        const delQuestions = await pool.query('DELETE FROM round1_questions');
        console.log(`   ✅ Deleted ${delQuestions.rowCount} questions`);
        
        await pool.query('ROLLBACK'); // Rollback to keep data
        console.log('   ↩️ Rolled back - no data was actually deleted');
        console.log('\n✅ Test passed! Delete all operation would work.');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await pool.end();
        process.exit();
    }
}

testDatabaseConnection();