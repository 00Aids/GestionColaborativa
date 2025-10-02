const { pool } = require('./src/config/database');

async function checkProyectosStructure() {
    try {
        console.log('Verificando estructura de la tabla proyectos...');
        const [rows] = await pool.execute('DESCRIBE proyectos');
        console.log('Estructura de la tabla proyectos:');
        rows.forEach(row => {
            console.log(`- ${row.Field}: ${row.Type}`);
        });
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkProyectosStructure();