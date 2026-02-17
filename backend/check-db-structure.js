const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkDatabase() {
    try {
        console.log('🔍 Checking round2_questions table structure...\n');
        
        // Check columns
        const columns = await pool.query(`
            SELECT 
                column_name, 
                data_type, 
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name = 'round2_questions'
            ORDER BY ordinal_position
        `);
        
        console.log('📊 COLUMNS:');
        console.log('='.repeat(60));
        columns.rows.forEach(col => {
            console.log(`   • ${col.column_name}:`);
            console.log(`        Type: ${col.data_type}`);
            console.log(`        Nullable: ${col.is_nullable}`);
            console.log(`        Default: ${col.column_default || 'None'}`);
            console.log('');
        });

        // Check constraints
        const constraints = await pool.query(`
            SELECT 
                conname as constraint_name,
                consrc as constraint_definition
            FROM pg_constraint 
            WHERE conrelid = 'round2_questions'::regclass
        `);
        
        console.log('\n🔒 CONSTRAINTS:');
        console.log('='.repeat(60));
        if (constraints.rows.length === 0) {
            console.log('   No constraints found');
        } else {
            constraints.rows.forEach(con => {
                console.log(`   • ${con.constraint_name}: ${con.constraint_definition}`);
            });
        }

        // Check sample data
        const data = await pool.query(`
            SELECT id, title, difficulty, description 
            FROM round2_questions 
            LIMIT 5
        `);
        
        console.log('\n📝 SAMPLE DATA:');
        console.log('='.repeat(60));
        if (data.rows.length === 0) {
            console.log('   No data in table');
        } else {
            data.rows.forEach(row => {
                console.log(`   • ID: ${row.id}`);
                console.log(`     Title: ${row.title}`);
                console.log(`     Difficulty: ${row.difficulty}`);
                console.log(`     Description: ${row.description?.substring(0, 50)}...`);
                console.log('');
            });
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

checkDatabase();