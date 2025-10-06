const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function runMigration() {
    let connection;
    
    try {
        // Crear conexión a la base de datos
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'root', // Usar contraseña del .env
            database: 'gestion_academica', // Usar nombre correcto de BD
            multipleStatements: true
        });

        console.log('✅ Conectado a la base de datos');

        // Leer el archivo de migración
        const migrationPath = path.join(__dirname, 'src', 'database', 'migrations', '010_improve_project_assignments_simple.sql');
        const migrationSQL = await fs.readFile(migrationPath, 'utf8');

        console.log('📄 Archivo de migración leído');

        // Ejecutar la migración
        console.log('🔄 Ejecutando migración...');
        const [results] = await connection.execute(migrationSQL);
        
        console.log('✅ Migración ejecutada exitosamente');

        // Verificar los resultados
        console.log('\n📊 Verificando resultados...');
        
        // Contar registros en proyecto_usuarios
        const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM proyecto_usuarios');
        console.log(`📈 Total de asignaciones en proyecto_usuarios: ${countResult[0].total}`);

        // Mostrar distribución por roles
        const [roleDistribution] = await connection.execute(`
            SELECT rol_en_proyecto, COUNT(*) as cantidad 
            FROM proyecto_usuarios 
            GROUP BY rol_en_proyecto
        `);
        console.log('\n📊 Distribución por roles:');
        roleDistribution.forEach(row => {
            console.log(`   ${row.rol_en_proyecto}: ${row.cantidad}`);
        });

        // Verificar proyectos con múltiples asignaciones
        const [multipleAssignments] = await connection.execute(`
            SELECT p.nombre, p.id, COUNT(pu.id) as total_asignaciones
            FROM proyectos p
            LEFT JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            WHERE pu.activo = TRUE
            GROUP BY p.id, p.nombre
            HAVING total_asignaciones > 0
            ORDER BY total_asignaciones DESC
        `);
        
        console.log('\n📋 Proyectos con asignaciones:');
        multipleAssignments.forEach(row => {
            console.log(`   ${row.nombre} (ID: ${row.id}): ${row.total_asignaciones} asignaciones`);
        });

        // Verificar el coordinador específico
        const [coordinatorCheck] = await connection.execute(`
            SELECT 
                u.email,
                u.tipo_usuario,
                p.nombre as proyecto_nombre,
                pu.rol_en_proyecto,
                pu.fecha_asignacion
            FROM usuarios u
            JOIN proyecto_usuarios pu ON u.id = pu.usuario_id
            JOIN proyectos p ON pu.proyecto_id = p.id
            WHERE u.email = 'nuevocoordinador3@test.com'
            AND pu.activo = TRUE
        `);

        console.log('\n🎯 Verificación del coordinador nuevocoordinador3@test.com:');
        if (coordinatorCheck.length > 0) {
            coordinatorCheck.forEach(row => {
                console.log(`   ✅ Asignado a "${row.proyecto_nombre}" como ${row.rol_en_proyecto} (${row.fecha_asignacion})`);
            });
        } else {
            console.log('   ❌ No se encontraron asignaciones para este coordinador');
        }

    } catch (error) {
        console.error('❌ Error ejecutando migración:', error.message);
        
        // Si es error de conexión, intentar sin contraseña
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('\n🔄 Intentando conexión sin contraseña...');
            try {
                connection = await mysql.createConnection({
                    host: 'localhost',
                    user: 'root',
                    password: 'root', // Usar contraseña del .env
                    database: 'gestion_academica', // Usar nombre correcto de BD
                    multipleStatements: true
                });
                
                console.log('✅ Conectado sin contraseña');
                // Repetir la migración...
                const migrationPath = path.join(__dirname, 'src', 'database', 'migrations', '010_improve_project_assignments_simple.sql');
                const migrationSQL = await fs.readFile(migrationPath, 'utf8');
                
                console.log('🔄 Ejecutando migración...');
                await connection.execute(migrationSQL);
                console.log('✅ Migración ejecutada exitosamente');
                
            } catch (retryError) {
                console.error('❌ Error en segundo intento:', retryError.message);
            }
        }
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexión cerrada');
        }
    }
}

// Ejecutar la migración
runMigration().catch(console.error);