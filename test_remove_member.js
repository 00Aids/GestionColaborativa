const mysql = require('mysql2/promise');
require('dotenv').config();

async function testRemoveMember() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root', 
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    try {
        console.log('🔍 Probando funcionalidad de eliminación de miembros...\n');

        // Obtener un proyecto con miembros
        const [projects] = await connection.execute(`
            SELECT DISTINCT p.id, p.titulo, COUNT(pu.usuario_id) as total_miembros
            FROM proyectos p
            JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            WHERE pu.estado = 'activo'
            GROUP BY p.id, p.titulo
            HAVING total_miembros > 0
            LIMIT 1
        `);

        if (projects.length === 0) {
            console.log('❌ No hay proyectos con miembros activos');
            return;
        }

        const project = projects[0];
        console.log(`📁 Proyecto seleccionado: ${project.titulo} (ID: ${project.id})`);
        console.log(`   Total miembros activos: ${project.total_miembros}\n`);

        // Obtener miembros activos del proyecto
        const [activeMembers] = await connection.execute(`
            SELECT pu.*, u.nombres, u.apellidos, u.email
            FROM proyecto_usuarios pu
            JOIN usuarios u ON pu.usuario_id = u.id
            WHERE pu.proyecto_id = ? AND pu.estado = 'activo'
            ORDER BY u.nombres
        `, [project.id]);

        console.log('👥 Miembros activos ANTES de la eliminación:');
        activeMembers.forEach((member, index) => {
            console.log(`   ${index + 1}. ${member.nombres} ${member.apellidos} (ID: ${member.usuario_id}) - Estado: ${member.estado}`);
        });

        if (activeMembers.length === 0) {
            console.log('❌ No hay miembros activos para probar');
            return;
        }

        // Seleccionar el primer miembro para "eliminar"
        const memberToRemove = activeMembers[0];
        console.log(`\n🎯 Miembro a eliminar: ${memberToRemove.nombres} ${memberToRemove.apellidos} (ID: ${memberToRemove.usuario_id})`);

        // Simular la eliminación (cambiar estado a inactivo)
        const [updateResult] = await connection.execute(`
            UPDATE proyecto_usuarios 
            SET estado = 'inactivo'
            WHERE proyecto_id = ? AND usuario_id = ?
        `, [project.id, memberToRemove.usuario_id]);

        console.log(`\n✅ Actualización ejecutada. Filas afectadas: ${updateResult.affectedRows}`);

        // Verificar miembros activos DESPUÉS de la eliminación
        const [activeMembersAfter] = await connection.execute(`
            SELECT pu.*, u.nombres, u.apellidos, u.email
            FROM proyecto_usuarios pu
            JOIN usuarios u ON pu.usuario_id = u.id
            WHERE pu.proyecto_id = ? AND pu.estado = 'activo'
            ORDER BY u.nombres
        `, [project.id]);

        console.log('\n👥 Miembros activos DESPUÉS de la eliminación:');
        if (activeMembersAfter.length === 0) {
            console.log('   (No hay miembros activos)');
        } else {
            activeMembersAfter.forEach((member, index) => {
                console.log(`   ${index + 1}. ${member.nombres} ${member.apellidos} (ID: ${member.usuario_id}) - Estado: ${member.estado}`);
            });
        }

        // Verificar el miembro eliminado
        const [removedMember] = await connection.execute(`
            SELECT pu.*, u.nombres, u.apellidos, u.email
            FROM proyecto_usuarios pu
            JOIN usuarios u ON pu.usuario_id = u.id
            WHERE pu.proyecto_id = ? AND pu.usuario_id = ?
        `, [project.id, memberToRemove.usuario_id]);

        console.log(`\n🔍 Estado del miembro eliminado:`);
        if (removedMember.length > 0) {
            console.log(`   ${removedMember[0].nombres} ${removedMember[0].apellidos} - Estado: ${removedMember[0].estado}`);
        }

        // Restaurar el miembro para no afectar los datos
        await connection.execute(`
            UPDATE proyecto_usuarios 
            SET estado = 'activo'
            WHERE proyecto_id = ? AND usuario_id = ?
        `, [project.id, memberToRemove.usuario_id]);

        console.log(`\n🔄 Miembro restaurado para no afectar los datos originales`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

testRemoveMember();