// backend/verify-fix.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verifyFix() {
    try {
        const result = await pool.query(`
            SELECT 
                column_name, 
                data_type 
            FROM information_schema.columns 
            WHERE table_name = 'teams' 
            ORDER BY ordinal_position
        `);
        
        console.log('📊 Teams Table Columns:');
        console.log('='.repeat(50));
        result.rows.forEach(col => {
            console.log(`   • ${col.column_name} (${col.data_type})`);
        });
        console.log('='.repeat(50));
        
        // Check if our new columns are there
        const newColumns = ['round1_completed', 'round1_score', 'round2_completed', 'round2_score'];
        const existingColumns = result.rows.map(r => r.column_name);
        
        console.log('\n🔍 Checking for new columns:');
        newColumns.forEach(col => {
            if (existingColumns.includes(col)) {
                console.log(`   ✅ ${col} - FOUND`);
            } else {
                console.log(`   ❌ ${col} - MISSING`);
            }
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

verifyFix();