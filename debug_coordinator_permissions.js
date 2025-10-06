const mysql = require('mysql2/promise');
require('dotenv').config();

async function debugCoordinatorPermissions() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    try {
        console.log('🔍 DEBUGGING COORDINATOR PERMISSIONS FOR DELIVERABLE STATUS UPDATE');
        console.log('='.repeat(70));

        // 1. Verificar el coordinador
        const [coordinator] = await connection.execute(`
            SELECT id, nombres, apellidos, email, rol_id, area_trabajo_id 
            FROM usuarios 
            WHERE email = 'nuevocoordinador1@test.com'
        `);

        if (coordinator.length === 0) {
            console.log('❌ Coordinador no encontrado');
            return;
        }

        console.log('👤 COORDINADOR:');
        console.log(`   ID: ${coordinator[0].id}`);
        console.log(`   Nombre: ${coordinator[0].nombres} ${coordinator[0].apellidos}`);
        console.log(`   Email: ${coordinator[0].email}`);
        console.log(`   Rol ID: ${coordinator[0].rol_id}`);
        console.log(`   Área de trabajo ID: ${coordinator[0].area_trabajo_id}`);

        // 2. Verificar el entregable ID 1
        const [deliverable] = await connection.execute(`
            SELECT id, titulo, estado, proyecto_id, asignado_a, created_at
            FROM entregables 
            WHERE id = 1
        `);

        if (deliverable.length === 0) {
            console.log('❌ Entregable ID 1 no encontrado');
            return;
        }

        console.log('\n📦 ENTREGABLE ID 1:');
        console.log(`   Título: ${deliverable[0].titulo}`);
        console.log(`   Estado: ${deliverable[0].estado}`);
        console.log(`   Proyecto ID: ${deliverable[0].proyecto_id}`);
        console.log(`   Asignado a: ${deliverable[0].asignado_a}`);

        // 3. Verificar el proyecto del entregable
        const [project] = await connection.execute(`
            SELECT id, titulo, area_trabajo_id, estudiante_id, director_id
            FROM proyectos 
            WHERE id = ?
        `, [deliverable[0].proyecto_id]);

        if (project.length === 0) {
            console.log('❌ Proyecto no encontrado');
            return;
        }

        console.log('\n🏗️ PROYECTO:');
        console.log(`   ID: ${project[0].id}`);
        console.log(`   Título: ${project[0].titulo}`);
        console.log(`   Área de trabajo ID: ${project[0].area_trabajo_id}`);
        console.log(`   Estudiante ID: ${project[0].estudiante_id}`);
        console.log(`   Director ID: ${project[0].director_id}`);

        // 4. Verificar las áreas del coordinador usando getUserAreas logic
        console.log('\n🏢 VERIFICANDO ÁREAS DEL COORDINADOR:');
        
        // Simular el método getUserAreas del User model
        const [userAreas] = await connection.execute(`
            SELECT DISTINCT at.id as area_trabajo_id, at.nombre as area_nombre
            FROM usuarios u
            LEFT JOIN areas_trabajo at ON u.area_trabajo_id = at.id
            WHERE u.id = ? AND at.id IS NOT NULL
        `, [coordinator[0].id]);

        console.log(`   Áreas encontradas: ${userAreas.length}`);
        userAreas.forEach(area => {
            console.log(`   - Área ID: ${area.area_trabajo_id}, Nombre: ${area.area_nombre}`);
        });

        // 5. Verificar si hay coincidencia de áreas
        const hasAccess = userAreas.some(area => area.area_trabajo_id === project[0].area_trabajo_id);
        console.log(`\n🔐 VERIFICACIÓN DE ACCESO:`);
        console.log(`   Área del proyecto: ${project[0].area_trabajo_id}`);
        console.log(`   Áreas del coordinador: [${userAreas.map(a => a.area_trabajo_id).join(', ')}]`);
        console.log(`   ¿Tiene acceso?: ${hasAccess ? '✅ SÍ' : '❌ NO'}`);

        // 6. Verificar asignación en proyecto_usuarios
        const [projectAssignment] = await connection.execute(`
            SELECT usuario_id, proyecto_id, rol
            FROM proyecto_usuarios 
            WHERE usuario_id = ? AND proyecto_id = ?
        `, [coordinator[0].id, project[0].id]);

        console.log('\n👥 ASIGNACIÓN EN PROYECTO_USUARIOS:');
        if (projectAssignment.length > 0) {
            console.log(`   ✅ Coordinador asignado al proyecto como: ${projectAssignment[0].rol}`);
        } else {
            console.log(`   ❌ Coordinador NO está asignado al proyecto`);
        }

        // 7. Diagnóstico final
        console.log('\n🎯 DIAGNÓSTICO:');
        console.log('='.repeat(50));
        
        if (!hasAccess) {
            console.log('❌ PROBLEMA ENCONTRADO: El coordinador no tiene acceso al área del proyecto');
            console.log('💡 SOLUCIÓN: Verificar que el coordinador tenga el área_trabajo_id correcto');
            
            if (coordinator[0].area_trabajo_id !== project[0].area_trabajo_id) {
                console.log(`   - Área del coordinador: ${coordinator[0].area_trabajo_id}`);
                console.log(`   - Área del proyecto: ${project[0].area_trabajo_id}`);
                console.log('   - Estas áreas no coinciden, por eso se deniega el acceso');
            }
        } else {
            console.log('✅ El coordinador tiene acceso al área del proyecto');
            console.log('🔍 El problema podría estar en otra validación del código');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

debugCoordinatorPermissions();