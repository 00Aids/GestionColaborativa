const { pool } = require('./src/config/database');
const fs = require('fs');
const path = require('path');

async function runFechaNacimientoMigration() {
    try {
        console.log('🚀 Ejecutando migración para agregar fecha_nacimiento...');
        
        // Leer el archivo de migración
        const migrationPath = path.join(__dirname, 'src', 'migrations', '008_add_fecha_nacimiento_to_usuarios.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Dividir las consultas por punto y coma
        const queries = migrationSQL
            .split(';')
            .map(query => query.trim())
            .filter(query => query.length > 0 && !query.startsWith('--'));
        
        console.log(`📝 Ejecutando ${queries.length} consultas...`);
        
        for (const query of queries) {
            if (query.trim()) {
                console.log(`⚡ Ejecutando: ${query.substring(0, 50)}...`);
                await pool.execute(query);
            }
        }
        
        console.log('✅ Migración completada exitosamente');
        
        // Verificar que el campo se agregó correctamente
        const [columns] = await pool.execute('DESCRIBE usuarios');
        const fechaNacimientoField = columns.find(col => col.Field === 'fecha_nacimiento');
        
        if (fechaNacimientoField) {
            console.log('✅ Campo fecha_nacimiento agregado correctamente:');
            console.log(`   Tipo: ${fechaNacimientoField.Type}`);
            console.log(`   Null: ${fechaNacimientoField.Null}`);
            console.log(`   Default: ${fechaNacimientoField.Default || 'NULL'}`);
        } else {
            console.log('❌ Error: Campo fecha_nacimiento no encontrado después de la migración');
        }
        
    } catch (error) {
        console.error('❌ Error ejecutando migración:', error.message);
        
        // Si el error es que la columna ya existe, no es un problema
        if (error.message.includes('Duplicate column name')) {
            console.log('ℹ️  El campo fecha_nacimiento ya existe en la tabla');
        }
    } finally {
        await pool.end();
    }
}

runFechaNacimientoMigration();