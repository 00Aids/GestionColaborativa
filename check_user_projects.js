const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUserProjects() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    try {
        console.log('🔍 Buscando información del usuario: dir2@test.com\n');

        // Primero, obtener información básica del usuario
        const [userRows] = await connection.execute(
            'SELECT id, nombres, apellidos, email, rol_id FROM usuarios WHERE email = ?',
            ['dir2@test.com']
        );

        if (userRows.length === 0) {
            console.log('❌ Usuario no encontrado con email: dir2@test.com');
            return;
        }

        const user = userRows[0];
        console.log('👤 Información del usuario:');
        console.log(`   ID: ${user.id}`);
        console.log(`   Nombre: ${user.nombres} ${user.apellidos}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Rol ID: ${user.rol_id}\n`);

        // Buscar proyectos donde el usuario es director
        console.log('🎯 Proyectos donde es director:');
        const [directorProjects] = await connection.execute(`
            SELECT 
                id,
                titulo,
                descripcion,
                estado,
                fecha_inicio,
                fecha_fin,
                director_id
            FROM proyectos 
            WHERE director_id = ?
            ORDER BY created_at DESC
        `, [user.id]);

        if (directorProjects.length > 0) {
            directorProjects.forEach((project, index) => {
                console.log(`   ${index + 1}. ${project.titulo} (ID: ${project.id})`);
                console.log(`      Descripción: ${project.descripcion || 'Sin descripción'}`);
                console.log(`      Estado: ${project.estado}`);
                console.log(`      Fecha inicio: ${project.fecha_inicio || 'No definida'}`);
                console.log(`      Fecha fin: ${project.fecha_fin || 'No definida'}`);
                console.log('');
            });
        } else {
            console.log('   No es director de ningún proyecto.\n');
        }

        // Buscar proyectos donde el usuario es estudiante
        console.log('🎓 Proyectos donde es estudiante:');
        const [studentProjects] = await connection.execute(`
            SELECT 
                id,
                titulo,
                descripcion,
                estado,
                fecha_inicio,
                fecha_fin,
                estudiante_id
            FROM proyectos 
            WHERE estudiante_id = ?
            ORDER BY created_at DESC
        `, [user.id]);

        if (studentProjects.length > 0) {
            studentProjects.forEach((project, index) => {
                console.log(`   ${index + 1}. ${project.titulo} (ID: ${project.id})`);
                console.log(`      Descripción: ${project.descripcion || 'Sin descripción'}`);
                console.log(`      Estado: ${project.estado}`);
                console.log(`      Fecha inicio: ${project.fecha_inicio || 'No definida'}`);
                console.log(`      Fecha fin: ${project.fecha_fin || 'No definida'}`);
                console.log('');
            });
        } else {
            console.log('   No es estudiante de ningún proyecto.\n');
        }

        // Buscar proyectos donde el usuario es evaluador
        console.log('📝 Proyectos donde es evaluador:');
        const [evaluatorProjects] = await connection.execute(`
            SELECT 
                id,
                titulo,
                descripcion,
                estado,
                fecha_inicio,
                fecha_fin,
                evaluador_id
            FROM proyectos 
            WHERE evaluador_id = ?
            ORDER BY created_at DESC
        `, [user.id]);

        if (evaluatorProjects.length > 0) {
            evaluatorProjects.forEach((project, index) => {
                console.log(`   ${index + 1}. ${project.titulo} (ID: ${project.id})`);
                console.log(`      Descripción: ${project.descripcion || 'Sin descripción'}`);
                console.log(`      Estado: ${project.estado}`);
                console.log(`      Fecha inicio: ${project.fecha_inicio || 'No definida'}`);
                console.log(`      Fecha fin: ${project.fecha_fin || 'No definida'}`);
                console.log('');
            });
        } else {
            console.log('   No es evaluador de ningún proyecto.\n');
        }

        // Buscar invitaciones pendientes
        console.log('📨 Invitaciones pendientes:');
        const [invitations] = await connection.execute(`
            SELECT 
                i.id,
                i.codigo_invitacion,
                i.estado,
                i.created_at,
                i.fecha_expiracion,
                p.titulo as proyecto_titulo
            FROM invitaciones i
            INNER JOIN proyectos p ON i.proyecto_id = p.id
            WHERE i.email = ? AND i.estado = 'pendiente'
            ORDER BY i.created_at DESC
        `, [user.email]);

        if (invitations.length > 0) {
            invitations.forEach((invitation, index) => {
                console.log(`   ${index + 1}. Proyecto: ${invitation.proyecto_titulo}`);
                console.log(`      Código: ${invitation.codigo_invitacion}`);
                console.log(`      Estado: ${invitation.estado}`);
                console.log(`      Fecha creación: ${invitation.created_at}`);
                console.log(`      Fecha expiración: ${invitation.fecha_expiracion}`);
                console.log('');
            });
        } else {
            console.log('   No tiene invitaciones pendientes.\n');
        }

        // Resumen
        console.log('📊 RESUMEN:');
        console.log(`   - Director de ${directorProjects.length} proyecto(s)`);
        console.log(`   - Estudiante de ${studentProjects.length} proyecto(s)`);
        console.log(`   - Evaluador de ${evaluatorProjects.length} proyecto(s)`);
        console.log(`   - ${invitations.length} invitación(es) pendiente(s)`);

    } catch (error) {
        console.error('❌ Error al consultar la base de datos:', error.message);
    } finally {
        await connection.end();
    }
}

checkUserProjects().catch(console.error);