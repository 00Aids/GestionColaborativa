const { executeQuery } = require('./src/config/database');
const fs = require('fs');
const path = require('path');

async function runBiografiaMigration() {
    try {
        console.log('🚀 Ejecutando migración para agregar campo biografia...');
        
        // Leer el archivo de migración
        const migrationPath = path.join(__dirname, 'src', 'migrations', '007_add_biografia_to_usuarios.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Ejecutar la migración
        await executeQuery(migrationSQL);
        
        console.log('✅ Migración ejecutada exitosamente');
        
        // Verificar que el campo se agregó correctamente
        console.log('\n📋 Verificando estructura actualizada de la tabla usuarios:');
        const tableStructure = await executeQuery('DESCRIBE usuarios');
        console.table(tableStructure);
        
        // Verificar específicamente el campo biografia
        const biografiaField = tableStructure.find(field => field.Field === 'biografia');
        
        if (biografiaField) {
            console.log('✅ El campo "biografia" se agregó correctamente a la tabla usuarios');
        } else {
            console.log('❌ Error: El campo "biografia" no se encontró en la tabla');
        }
        
    } catch (error) {
        console.error('❌ Error ejecutando migración:', error);
    }
    process.exit(0);
}

runBiografiaMigration();