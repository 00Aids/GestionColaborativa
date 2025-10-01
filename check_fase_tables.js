const { pool } = require('./src/config/database');

async function checkFaseTables() {
    try {
        const [rows] = await pool.execute("SHOW TABLES LIKE '%fase%'");
        console.log('Tablas con "fase":', rows);
        
        const [allTables] = await pool.execute("SHOW TABLES");
        console.log('\nTodas las tablas:');
        allTables.forEach(table => {
            const tableName = Object.values(table)[0];
            console.log(`  - ${tableName}`);
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkFaseTables();