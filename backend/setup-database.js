// backend/fix-teams-table.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function fixTeamsTable() {
    console.log('='.repeat(70));
    console.log('🔧 FIXING TEAMS TABLE - ADDING MISSING COLUMNS');
    console.log('='.repeat(70));

    try {
        // Add missing columns to teams table
        console.log('\n📝 Adding columns to teams table...');
        
        await pool.query(`
            ALTER TABLE teams 
            ADD COLUMN IF NOT EXISTS round1_completed BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS round1_score INT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS round2_completed BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS round2_score INT DEFAULT 0
        `);
        
        console.log('✅ Columns added successfully!');

        // Verify columns were added
        const verifyColumns = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'teams' 
            AND column_name IN ('round1_completed', 'round1_score', 'round2_completed', 'round2_score')
        `);
        
        console.log('\n📊 Verified columns:');
        verifyColumns.rows.forEach(col => {
            console.log(`   • ${col.column_name} (${col.data_type})`);
        });

        // Update existing teams with default values
        console.log('\n📝 Updating existing teams...');
        
        await pool.query(`
            UPDATE teams 
            SET 
                round1_completed = FALSE,
                round1_score = 0,
                round2_completed = FALSE,
                round2_score = 0
            WHERE round1_completed IS NULL
        `);
        
        console.log('✅ Existing teams updated!');

        // Show updated teams data
        const teams = await pool.query(`
            SELECT 
                id, 
                team_code, 
                team_name,
                round1_completed,
                round1_score,
                round2_completed,
                round2_score
            FROM teams 
            WHERE team_code != 'ADMIN001'
            ORDER BY id
        `);
        
        console.log('\n📊 Updated teams data:');
        teams.rows.forEach(team => {
            console.log(`   • ${team.team_code}: Round1 ${team.round1_completed ? '✅' : '❌'} (${team.round1_score}/20), Round2 ${team.round2_completed ? '✅' : '❌'} (${team.round2_score}/30)`);
        });

        console.log('\n' + '='.repeat(70));
        console.log('✅✅ TEAMS TABLE FIX COMPLETED! ✅✅');
        console.log('='.repeat(70));
        console.log('\n🚀 Next steps:');
        console.log('   1. Restart your backend server');
        console.log('   2. Login to your team account');
        console.log('   3. Round 1 should now be AVAILABLE!');
        console.log('='.repeat(70));

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

fixTeamsTable();