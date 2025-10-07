require('dotenv').config();
const mysql = require('mysql2/promise');

// Configuración de base de datos
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'gestion_colaborativa'
};

async function checkUsuariosTable() {
    let connection;
    
    try {
        console.log('🔍 VERIFICANDO ESTRUCTURA DE TABLA USUARIOS');
        console.log('==========================================\n');
        
        // Conectar a la base de datos
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conexión a base de datos establecida\n');
        
        // 1. Describir la estructura de la tabla usuarios
        console.log('1. ESTRUCTURA DE LA TABLA USUARIOS:');
        const [tableStructure] = await connection.execute('DESCRIBE usuarios');
        
        console.log('   Columnas disponibles:');
        tableStructure.forEach(column => {
            console.log(`   - ${column.Field} (${column.Type}) ${column.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${column.Key ? `[${column.Key}]` : ''} ${column.Default !== null ? `Default: ${column.Default}` : ''}`);
        });
        
        // 2. Mostrar algunos registros de ejemplo
        console.log('\n2. REGISTROS DE EJEMPLO:');
        const [sampleUsers] = await connection.execute(`
            SELECT * FROM usuarios 
            WHERE activo = 1 
            LIMIT 5
        `);
        
        console.log(`   Usuarios encontrados: ${sampleUsers.length}`);
        sampleUsers.forEach((user, index) => {
            console.log(`\n   Usuario ${index + 1}:`);
            Object.keys(user).forEach(key => {
                let value = user[key];
                // Ocultar información sensible si existe
                if (key.toLowerCase().includes('password') || key.toLowerCase().includes('contrasena')) {
                    value = value ? '[OCULTO]' : 'null';
                }
                console.log(`     ${key}: ${value}`);
            });
        });
        
        // 3. Buscar directores específicamente
        console.log('\n3. DIRECTORES DISPONIBLES:');
        const [directors] = await connection.execute(`
            SELECT u.*, r.nombre as rol_nombre
            FROM usuarios u
            JOIN roles r ON u.rol_id = r.id
            WHERE r.nombre = 'Director de Proyecto' 
            AND u.activo = 1
        `);
        
        console.log(`   Directores encontrados: ${directors.length}`);
        directors.forEach((director, index) => {
            console.log(`\n   Director ${index + 1}:`);
            console.log(`     ID: ${director.id}`);
            console.log(`     Nombres: ${director.nombres}`);
            console.log(`     Apellidos: ${director.apellidos}`);
            console.log(`     Email: ${director.email}`);
            console.log(`     Rol: ${director.rol_nombre}`);
            console.log(`     Activo: ${director.activo}`);
            console.log(`     Creado: ${director.created_at}`);
        });
        
        console.log('\n==========================================');
        console.log('🏁 VERIFICACIÓN COMPLETADA');
        
    } catch (error) {
        console.error('❌ Error durante la verificación:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexión cerrada');
        }
    }
}

// Ejecutar la verificación
checkUsuariosTable();