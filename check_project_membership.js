const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkProjectMembership() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    try {
        console.log('🔍 Verificando membresía vs asignación específica...\n');

        // Obtener el usuario s@test.com
        const [userResult] = await connection.execute(`
            SELECT id, nombres, apellidos, email 
            FROM usuarios 
            WHERE email = 's@test.com'
        `);
        
        if (userResult.length === 0) {
            console.log('❌ Usuario s@test.com no encontrado');
            return;
        }

        const user = userResult[0];
        console.log(`👤 Usuario: ${user.nombres} ${user.apellidos} (ID: ${user.id})`);

        // Verificar si es miembro del proyecto 35
        console.log('\n🔍 Verificando membresía en proyecto 35...');
        const [membershipResult] = await connection.execute(`
            SELECT pu.*, p.titulo as proyecto_titulo
            FROM proyecto_usuarios pu
            LEFT JOIN proyectos p ON pu.proyecto_id = p.id
            WHERE pu.usuario_id = ? AND pu.proyecto_id = 35
        `, [user.id]);

        if (membershipResult.length > 0) {
            console.log('✅ ES MIEMBRO del proyecto 35:');
            membershipResult.forEach(membership => {
                console.log(`   - Proyecto: ${membership.proyecto_titulo}`);
                console.log(`   - Estado: ${membership.estado}`);
                console.log(`   - Rol: ${membership.rol || 'No especificado'}`);
            });
        } else {
            console.log('❌ NO es miembro del proyecto 35');
        }

        // Usar la query exacta del método findByStudent
        console.log('\n🔍 Usando query exacta de findByStudent...');
        const [studentDeliverables] = await connection.execute(`
            SELECT 
              e.*,
              p.titulo as proyecto_titulo,
              p.estado as proyecto_estado,
              fp.nombre as fase_nombre,
              fp.descripcion as fase_descripcion,
              at.codigo as area_trabajo_codigo
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
            LEFT JOIN areas_trabajo at ON e.area_trabajo_id = at.id
            INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            WHERE pu.usuario_id = ? AND pu.estado = 'activo'
            ORDER BY e.fecha_entrega ASC
        `, [user.id]);

        console.log(`\n📋 Entregables que ve el estudiante: ${studentDeliverables.length}`);
        
        if (studentDeliverables.length > 0) {
            studentDeliverables.forEach(deliverable => {
                console.log(`\n--- Entregable ID: ${deliverable.id} ---`);
                console.log(`Título: ${deliverable.titulo}`);
                console.log(`Proyecto: ${deliverable.proyecto_titulo}`);
                console.log(`asignado_a: ${deliverable.asignado_a}`);
                console.log(`Estado: ${deliverable.estado}`);
                console.log(`Fecha entrega: ${deliverable.fecha_entrega}`);
            });
        }

        // Verificar todos los miembros del proyecto 35
        console.log('\n🔍 Todos los miembros del proyecto 35...');
        const [allMembers] = await connection.execute(`
            SELECT pu.*, u.nombres, u.apellidos, u.email
            FROM proyecto_usuarios pu
            LEFT JOIN usuarios u ON pu.usuario_id = u.id
            WHERE pu.proyecto_id = 35
        `);

        console.log(`\n👥 Miembros del proyecto 35: ${allMembers.length}`);
        allMembers.forEach(member => {
            console.log(`   - ${member.nombres} ${member.apellidos} (${member.email}) - Estado: ${member.estado}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

checkProjectMembership();