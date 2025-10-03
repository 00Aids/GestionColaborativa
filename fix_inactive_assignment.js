const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestion_proyectos'
};

async function fixInactiveAssignment() {
    let connection;
    
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('🔗 Conectado a la base de datos');
        
        // 1. Verificar asignaciones inactivas del coordinador
        console.log('\n🔍 1. VERIFICANDO ASIGNACIONES INACTIVAS:');
        const [inactiveAssignments] = await connection.execute(`
            SELECT pu.*, p.titulo as proyecto_titulo, u.nombres, u.apellidos, u.email
            FROM proyecto_usuarios pu
            JOIN proyectos p ON pu.proyecto_id = p.id
            JOIN usuarios u ON pu.usuario_id = u.id
            WHERE (LOWER(CONCAT(u.nombres, ' ', u.apellidos)) LIKE '%juan florez valderrama%'
                   OR u.email LIKE '%pruebagestion3@gmail.com%')
              AND pu.estado = 'inactivo'
        `);
        
        console.log(`📊 Asignaciones encontradas: ${inactiveAssignments.length}`);
        
        if (inactiveAssignments.length === 0) {
            console.log('❌ No se encontraron asignaciones para el coordinador');
            return;
        }
        
        inactiveAssignments.forEach((assignment, index) => {
            console.log(`\n   📋 Asignación ${index + 1}:`);
            console.log(`   🎯 Proyecto: ${assignment.proyecto_nombre} (ID: ${assignment.proyecto_id})`);
            console.log(`   👤 Usuario: ${assignment.usuario_nombre}`);
            console.log(`   🎭 Rol: ${assignment.rol}`);
            console.log(`   📅 Fecha asignación: ${assignment.fecha_asignacion}`);
            console.log(`   ✅ Estado actual: ${assignment.estado === 'activo' ? 'ACTIVO' : 'INACTIVO'}`);
        });
        
        // 2. Activar todas las asignaciones inactivas (cambiar estado a 'activo')
        console.log('\n📋 2. ACTIVANDO ASIGNACIONES INACTIVAS');
        console.log('=' .repeat(50));
        
        const inactiveCount = inactiveAssignments.filter(a => a.estado === 'inactivo').length;
        
        if (inactiveCount === 0) {
            console.log('✅ Todas las asignaciones ya están activas');
        } else {
            console.log(`🔄 Activando ${inactiveCount} asignaciones inactivas...`);
            
            const [updateResult] = await connection.execute(`
                UPDATE proyecto_usuarios pu
                JOIN usuarios u ON pu.usuario_id = u.id
                SET pu.estado = 'activo', pu.fecha_asignacion = NOW()
                WHERE (LOWER(CONCAT(u.nombres, ' ', u.apellidos)) LIKE '%juan florez valderrama%'
                       OR u.email LIKE '%pruebagestion3@gmail.com%')
                  AND pu.estado = 'inactivo'
            `);
            
            console.log(`✅ ${updateResult.affectedRows} asignaciones activadas`);
        }
        
        // 3. Verificar resultado
        console.log('\n📋 3. VERIFICANDO RESULTADO FINAL');
        console.log('=' .repeat(50));
        
        const [finalAssignments] = await connection.execute(`
            SELECT pu.*, p.titulo as proyecto_nombre, 
                   CONCAT(u.nombres, ' ', u.apellidos) as usuario_nombre
            FROM proyecto_usuarios pu
            JOIN proyectos p ON pu.proyecto_id = p.id
            JOIN usuarios u ON pu.usuario_id = u.id
            WHERE (LOWER(CONCAT(u.nombres, ' ', u.apellidos)) LIKE '%juan florez valderrama%'
                   OR u.email LIKE '%pruebagestion3@gmail.com%')
              AND pu.estado = 'activo'
        `);
        
        console.log(`📊 Asignaciones activas finales: ${finalAssignments.length}`);
        
        finalAssignments.forEach((assignment, index) => {
            console.log(`\n   📋 Asignación activa ${index + 1}:`);
            console.log(`   🎯 Proyecto: ${assignment.proyecto_nombre} (ID: ${assignment.proyecto_id})`);
            console.log(`   👤 Usuario: ${assignment.usuario_nombre}`);
            console.log(`   🎭 Rol: ${assignment.rol}`);
            console.log(`   📅 Fecha asignación: ${assignment.fecha_asignacion}`);
            console.log(`   ✅ Estado: ${assignment.activo ? 'ACTIVO' : 'INACTIVO'}`);
        });
        
        // 4. Probar consulta del dashboard
        console.log('\n📋 4. PROBANDO CONSULTA DEL DASHBOARD');
        console.log('=' .repeat(50));
        
        if (finalAssignments.length > 0) {
            const coordinatorId = finalAssignments[0].usuario_id;
            
            const [dashboardProjects] = await connection.execute(`
                SELECT 
                    p.id,
                    p.titulo as nombre,
                    p.descripcion,
                    p.fecha_propuesta as fecha_inicio,
                    p.fecha_finalizacion as fecha_fin,
                    p.estado,
                    CONCAT(estudiante.nombres, ' ', estudiante.apellidos) as estudiante_nombre,
                    CONCAT(director.nombres, ' ', director.apellidos) as director_nombre,
                    COUNT(DISTINCT e.id) as total_entregables
                FROM proyectos p
                INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
                LEFT JOIN proyecto_usuarios pu_estudiante ON p.id = pu_estudiante.proyecto_id AND pu_estudiante.rol = 'estudiante'
                LEFT JOIN usuarios estudiante ON pu_estudiante.usuario_id = estudiante.id
                LEFT JOIN proyecto_usuarios pu_director ON p.id = pu_director.proyecto_id AND pu_director.rol = 'director'
                LEFT JOIN usuarios director ON pu_director.usuario_id = director.id
                LEFT JOIN entregables e ON p.id = e.proyecto_id
                WHERE pu.usuario_id = ? AND pu.rol = 'coordinador' AND pu.activo = 1
                GROUP BY p.id, p.titulo, p.descripcion, p.fecha_propuesta, p.fecha_finalizacion, p.estado, estudiante_nombre, director_nombre
                ORDER BY p.fecha_propuesta DESC
            `, [coordinatorId]);
            
            console.log(`🎯 Proyectos encontrados en dashboard: ${dashboardProjects.length}`);
            
            if (dashboardProjects.length > 0) {
                dashboardProjects.forEach(project => {
                    console.log(`\n   📁 ${project.nombre} (ID: ${project.id})`);
                    console.log(`   📊 Estado: ${project.estado}`);
                    console.log(`   👨‍🎓 Estudiante: ${project.estudiante_nombre || 'No asignado'}`);
                    console.log(`   👨‍🏫 Director: ${project.director_nombre || 'No asignado'}`);
                    console.log(`   📋 Entregables: ${project.total_entregables}`);
                });
                
                console.log('\n🎉 ¡ÉXITO! El dashboard ahora debería mostrar los proyectos');
            } else {
                console.log('\n❌ Aún no se encuentran proyectos en el dashboard');
            }
        }
        
        // 5. Diagnóstico final
        console.log('\n📋 5. DIAGNÓSTICO FINAL');
        console.log('=' .repeat(50));
        
        if (finalAssignments.length > 0) {
            console.log('✅ PROBLEMA SOLUCIONADO:');
            console.log('   - El coordinador tenía asignaciones INACTIVAS');
            console.log('   - Se activaron todas las asignaciones');
            console.log('   - El dashboard ahora debería funcionar correctamente');
            console.log('\n💡 RECOMENDACIÓN:');
            console.log('   - Cierra sesión y vuelve a iniciar sesión');
            console.log('   - Refresca la página del dashboard');
            console.log('   - Los proyectos deberían aparecer ahora');
        } else {
            console.log('❌ No se pudieron activar las asignaciones');
        }
        
    } catch (error) {
        console.error('❌ Error durante la corrección:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Conexión cerrada');
        }
    }
}

// Ejecutar la corrección
fixInactiveAssignment();