const { pool } = require('./src/config/database');

async function addFechaNacimientoField() {
    try {
        console.log('🚀 Agregando campo fecha_nacimiento a la tabla usuarios...');
        
        // Agregar el campo fecha_nacimiento
        await pool.execute(`
            ALTER TABLE usuarios 
            ADD COLUMN fecha_nacimiento DATE NULL 
            COMMENT 'Fecha de nacimiento del usuario'
        `);
        
        console.log('✅ Campo fecha_nacimiento agregado exitosamente');
        
        // Crear índice para optimizar consultas
        try {
            await pool.execute(`
                CREATE INDEX idx_usuarios_fecha_nacimiento ON usuarios(fecha_nacimiento)
            `);
            console.log('✅ Índice para fecha_nacimiento creado exitosamente');
        } catch (indexError) {
            if (indexError.message.includes('Duplicate key name')) {
                console.log('ℹ️  El índice para fecha_nacimiento ya existe');
            } else {
                console.log('⚠️  Error creando índice (no crítico):', indexError.message);
            }
        }
        
        // Verificar que el campo se agregó correctamente
        const [columns] = await pool.execute('DESCRIBE usuarios');
        const fechaNacimientoField = columns.find(col => col.Field === 'fecha_nacimiento');
        
        if (fechaNacimientoField) {
            console.log('✅ Verificación exitosa - Campo fecha_nacimiento:');
            console.log(`   Tipo: ${fechaNacimientoField.Type}`);
            console.log(`   Null: ${fechaNacimientoField.Null}`);
            console.log(`   Default: ${fechaNacimientoField.Default || 'NULL'}`);
        } else {
            console.log('❌ Error: Campo fecha_nacimiento no encontrado');
        }
        
    } catch (error) {
        if (error.message.includes('Duplicate column name')) {
            console.log('ℹ️  El campo fecha_nacimiento ya existe en la tabla');
            
            // Verificar el campo existente
            const [columns] = await pool.execute('DESCRIBE usuarios');
            const fechaNacimientoField = columns.find(col => col.Field === 'fecha_nacimiento');
            
            if (fechaNacimientoField) {
                console.log('✅ Campo fecha_nacimiento existente:');
                console.log(`   Tipo: ${fechaNacimientoField.Type}`);
                console.log(`   Null: ${fechaNacimientoField.Null}`);
                console.log(`   Default: ${fechaNacimientoField.Default || 'NULL'}`);
            }
        } else {
            console.error('❌ Error agregando campo:', error.message);
        }
    } finally {
        await pool.end();
    }
}

addFechaNacimientoField();