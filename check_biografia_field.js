const { executeQuery } = require('./src/config/database');

async function checkTables() {
    try {
        // Verificar qué tablas existen
        const tables = await executeQuery('SHOW TABLES');
        console.log('Tablas existentes en la base de datos:');
        console.table(tables);
        
        // Buscar tabla de usuarios (puede tener otro nombre)
        const userTable = tables.find(table => 
            Object.values(table)[0].toLowerCase().includes('user') ||
            Object.values(table)[0].toLowerCase().includes('usuario')
        );
        
        if (userTable) {
            const tableName = Object.values(userTable)[0];
            console.log(`\n📋 Estructura de la tabla ${tableName}:`);
            const tableStructure = await executeQuery(`DESCRIBE ${tableName}`);
            console.table(tableStructure);
            
            // Verificar si existe el campo biografia
            const biografiaField = tableStructure.find(field => field.Field === 'biografia');
            
            if (biografiaField) {
                console.log('✅ El campo "biografia" existe en la tabla');
            } else {
                console.log('❌ El campo "biografia" NO existe en la tabla');
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
    process.exit(0);
}

checkTables();