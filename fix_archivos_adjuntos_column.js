const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixArchivosAdjuntosColumn() {
    let connection;
    
    try {
        // Crear conexión a la base de datos
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'gestion_colaborativa'
        });

        console.log('✅ Conectado a la base de datos');

        // Verificar la estructura actual de la tabla entregables
        console.log('\n📋 Verificando estructura actual de la tabla entregables...');
        const [columns] = await connection.execute(`
            SHOW COLUMNS FROM entregables
        `);
        
        console.log('\n📊 Columnas actuales:');
        columns.forEach(col => {
            console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `[${col.Key}]` : ''}`);
        });

        // Verificar si la columna archivos_adjuntos existe
        const archivosAdjuntosExists = columns.some(col => col.Field === 'archivos_adjuntos');
        
        if (archivosAdjuntosExists) {
            console.log('\n✅ La columna archivos_adjuntos ya existe');
        } else {
            console.log('\n❌ La columna archivos_adjuntos NO existe');
            console.log('🔧 Agregando la columna archivos_adjuntos...');
            
            // Agregar la columna archivos_adjuntos
            await connection.execute(`
                ALTER TABLE entregables 
                ADD COLUMN archivos_adjuntos JSON NULL
            `);
            
            console.log('✅ Columna archivos_adjuntos agregada exitosamente');
        }

        // Verificar la estructura después del cambio
        console.log('\n📋 Verificando estructura después del cambio...');
        const [newColumns] = await connection.execute(`
            SHOW COLUMNS FROM entregables
        `);
        
        console.log('\n📊 Columnas actualizadas:');
        newColumns.forEach(col => {
            console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `[${col.Key}]` : ''}`);
        });

        console.log('\n🎉 Proceso completado exitosamente');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexión cerrada');
        }
    }
}

// Ejecutar el script
fixArchivosAdjuntosColumn();