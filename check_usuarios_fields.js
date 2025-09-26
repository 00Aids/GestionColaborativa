const { pool } = require('./src/config/database');

async function checkUsuariosFields() {
    try {
        console.log('🔍 Verificando estructura de la tabla usuarios...');
        
        // Obtener la estructura de la tabla usuarios
        const [columns] = await pool.execute(`
            DESCRIBE usuarios
        `);
        
        console.log('\n📋 Campos actuales en la tabla usuarios:');
        console.log('================================================');
        
        columns.forEach(column => {
            console.log(`${column.Field.padEnd(20)} | ${column.Type.padEnd(20)} | ${column.Null.padEnd(5)} | ${column.Key.padEnd(5)} | ${column.Default || 'NULL'}`);
        });
        
        console.log('================================================');
        
        // Verificar específicamente los campos que necesitamos
        const requiredFields = ['telefono', 'fecha_nacimiento'];
        const existingFields = columns.map(col => col.Field);
        
        console.log('\n🔍 Verificando campos requeridos:');
        requiredFields.forEach(field => {
            const exists = existingFields.includes(field);
            console.log(`${field.padEnd(20)} | ${exists ? '✅ Existe' : '❌ No existe'}`);
        });
        
    } catch (error) {
        console.error('❌ Error verificando campos:', error.message);
    } finally {
        await pool.end();
    }
}

checkUsuariosFields();