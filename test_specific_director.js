require('dotenv').config();
const mysql = require('mysql2/promise');

// Configuración de base de datos
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'gestion_colaborativa'
};

async function testSpecificDirector() {
    let connection;
    
    try {
        console.log('🔍 VERIFICANDO DIRECTOR: directofinal1@test.com');
        console.log('===============================================\n');
        
        // Conectar a la base de datos
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conexión a base de datos establecida\n');
        
        // 1. Buscar el director específico
        console.log('1. INFORMACIÓN DEL DIRECTOR:');
        const [director] = await connection.execute(`
            SELECT u.*, r.nombre as rol_nombre
            FROM usuarios u
            JOIN roles r ON u.rol_id = r.id
            WHERE u.email = ? AND u.activo = 1
        `, ['directofinal1@test.com']);
        
        if (director.length === 0) {
            console.log('❌ Director no encontrado o no está activo');
            return;
        }
        
        const directorInfo = director[0];
        console.log(`   Nombre: ${directorInfo.nombres} ${directorInfo.apellidos}`);
        console.log(`   ID: ${directorInfo.id}`);
        console.log(`   Email: ${directorInfo.email}`);
        console.log(`   Rol: ${directorInfo.rol_nombre}`);
        console.log(`   Activo: ${directorInfo.activo}`);
        console.log(`   Código Usuario: ${directorInfo.codigo_usuario}`);
        console.log(`   Password Hash: ${directorInfo.password_hash ? 'Existe' : 'No existe'}`);
        
        // 2. Verificar proyectos asignados
        console.log('\n2. PROYECTOS ASIGNADOS:');
        const [projects] = await connection.execute(`
            SELECT 
                p.id,
                p.titulo,
                p.descripcion,
                p.estado,
                p.activo,
                p.fecha_inicio,
                p.fecha_fin,
                p.created_at,
                CONCAT(e.nombres, ' ', e.apellidos) as estudiante_nombre,
                e.email as estudiante_email
            FROM proyectos p
            LEFT JOIN usuarios e ON p.estudiante_id = e.id
            WHERE p.director_id = ?
            ORDER BY p.created_at DESC
        `, [directorInfo.id]);
        
        console.log(`   Total proyectos: ${projects.length}`);
        
        if (projects.length === 0) {
            console.log('   ❌ Este director NO tiene proyectos asignados');
            console.log('   ℹ️  Por eso no aparecen proyectos en la vista');
        } else {
            projects.forEach((project, index) => {
                console.log(`\n   Proyecto ${index + 1}:`);
                console.log(`     - ID: ${project.id}`);
                console.log(`     - Título: "${project.titulo}"`);
                console.log(`     - Estado: ${project.estado}`);
                console.log(`     - Activo: ${project.activo}`);
                console.log(`     - Estudiante: ${project.estudiante_nombre || 'Sin asignar'}`);
                console.log(`     - Email Estudiante: ${project.estudiante_email || 'N/A'}`);
                console.log(`     - Fecha Inicio: ${project.fecha_inicio}`);
                console.log(`     - Fecha Fin: ${project.fecha_fin}`);
                console.log(`     - Creado: ${project.created_at}`);
            });
        }
        
        // 3. Simular la consulta del DirectorController
        console.log('\n3. SIMULANDO DirectorController.projects():');
        const directorId = directorInfo.id;
        const page = 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        
        // Consulta exacta del controlador
        const [controllerProjects] = await connection.execute(`
            SELECT 
                p.id,
                p.titulo,
                p.descripcion,
                p.estado,
                p.activo,
                p.fecha_inicio,
                p.fecha_fin,
                p.created_at,
                CONCAT(u.nombres, ' ', u.apellidos) as estudiante_nombre,
                u.email as estudiante_email,
                CASE 
                    WHEN COUNT(e.id) = 0 THEN 0
                    ELSE ROUND((COUNT(CASE WHEN e.estado = 'completado' THEN 1 END) * 100.0) / COUNT(e.id), 2)
                END as progreso
            FROM proyectos p
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            LEFT JOIN entregables e ON p.id = e.proyecto_id
            WHERE p.director_id = ?
            GROUP BY p.id, p.titulo, p.descripcion, p.estado, p.activo, p.fecha_inicio, p.fecha_fin, p.created_at, u.nombres, u.apellidos, u.email
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `, [directorId, limit, offset]);
        
        console.log(`   Proyectos encontrados por el controlador: ${controllerProjects.length}`);
        
        // 4. Calcular estadísticas
        const [stats] = await connection.execute(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN estado = 'en_desarrollo' THEN 1 END) as activos,
                COUNT(CASE WHEN estado = 'completado' THEN 1 END) as finalizados,
                COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes
            FROM proyectos 
            WHERE director_id = ?
        `, [directorId]);
        
        const statistics = stats[0];
        console.log('\n4. ESTADÍSTICAS:');
        console.log(`   Total: ${statistics.total}`);
        console.log(`   Activos: ${statistics.activos}`);
        console.log(`   Finalizados: ${statistics.finalizados}`);
        console.log(`   Pendientes: ${statistics.pendientes}`);
        
        // 5. Conclusión
        console.log('\n5. DIAGNÓSTICO:');
        if (projects.length === 0) {
            console.log('   🔍 PROBLEMA IDENTIFICADO:');
            console.log('   ❌ El director "directofinal1@test.com" NO tiene proyectos asignados');
            console.log('   ℹ️  Por eso la vista de proyectos aparece vacía');
            console.log('   💡 SOLUCIÓN: Asignar proyectos a este director en la base de datos');
            
            // Sugerir directores con proyectos
            console.log('\n   📋 DIRECTORES CON PROYECTOS DISPONIBLES:');
            const [directorsWithProjects] = await connection.execute(`
                SELECT DISTINCT
                    u.id,
                    u.nombres,
                    u.apellidos,
                    u.email,
                    COUNT(p.id) as total_proyectos
                FROM usuarios u
                JOIN roles r ON u.rol_id = r.id
                LEFT JOIN proyectos p ON p.director_id = u.id
                WHERE r.nombre = 'Director de Proyecto' 
                AND u.activo = 1
                AND p.id IS NOT NULL
                GROUP BY u.id, u.nombres, u.apellidos, u.email
                ORDER BY total_proyectos DESC
                LIMIT 3
            `);
            
            directorsWithProjects.forEach((dir, index) => {
                console.log(`     ${index + 1}. ${dir.nombres} ${dir.apellidos} (${dir.email}) - ${dir.total_proyectos} proyectos`);
            });
            
        } else {
            console.log('   ✅ El director tiene proyectos asignados');
            console.log('   ℹ️  El problema debe estar en otro lugar (autenticación, rutas, etc.)');
        }
        
        console.log('\n===============================================');
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
testSpecificDirector();