const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAdminProject() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    try {
        console.log('🔍 Buscando proyecto "proyecto final" del administrador adminfinal@test.com\n');

        // Primero, obtener información del administrador
        const [adminRows] = await connection.execute(
            'SELECT id, nombres, apellidos, email, rol_id FROM usuarios WHERE email = ?',
            ['adminfinal@test.com']
        );

        if (adminRows.length === 0) {
            console.log('❌ Administrador no encontrado con email: adminfinal@test.com');
            return;
        }

        const admin = adminRows[0];
        console.log('👤 Información del administrador:');
        console.log(`   ID: ${admin.id}`);
        console.log(`   Nombre: ${admin.nombres} ${admin.apellidos}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Rol ID: ${admin.rol_id}\n`);

        // Buscar proyectos del administrador que contengan "proyecto final"
        console.log('📋 Proyectos que contienen "proyecto final":');
        const [projects] = await connection.execute(`
            SELECT 
                id,
                titulo,
                descripcion,
                estado,
                director_id,
                estudiante_id,
                evaluador_id,
                created_at
            FROM proyectos 
            WHERE titulo LIKE '%proyecto final%' OR descripcion LIKE '%proyecto final%'
            ORDER BY created_at DESC
        `);

        if (projects.length > 0) {
            projects.forEach((project, index) => {
                console.log(`   ${index + 1}. ${project.titulo} (ID: ${project.id})`);
                console.log(`      Descripción: ${project.descripcion || 'Sin descripción'}`);
                console.log(`      Estado: ${project.estado}`);
                console.log(`      Director ID: ${project.director_id || 'No asignado'}`);
                console.log(`      Estudiante ID: ${project.estudiante_id || 'No asignado'}`);
                console.log(`      Evaluador ID: ${project.evaluador_id || 'No asignado'}`);
                console.log(`      Fecha creación: ${project.created_at}`);
                console.log('');
            });

            // Para cada proyecto, verificar invitaciones
            for (const project of projects) {
                console.log(`📨 Invitaciones para proyecto "${project.titulo}" (ID: ${project.id}):`);
                const [invitations] = await connection.execute(`
                    SELECT 
                        i.id,
                        i.codigo_invitacion,
                        i.email,
                        i.estado,
                        i.created_at,
                        i.fecha_expiracion,
                        i.fecha_aceptacion,
                        u.nombres,
                        u.apellidos
                    FROM invitaciones i
                    LEFT JOIN usuarios u ON i.usuario_id = u.id
                    WHERE i.proyecto_id = ?
                    ORDER BY i.created_at DESC
                `, [project.id]);

                if (invitations.length > 0) {
                    invitations.forEach((invitation, idx) => {
                        console.log(`   ${idx + 1}. Código: ${invitation.codigo_invitacion}`);
                        console.log(`      Email: ${invitation.email || 'No especificado'}`);
                        console.log(`      Usuario: ${invitation.nombres ? `${invitation.nombres} ${invitation.apellidos}` : 'No asignado'}`);
                        console.log(`      Estado: ${invitation.estado}`);
                        console.log(`      Fecha creación: ${invitation.created_at}`);
                        console.log(`      Fecha aceptación: ${invitation.fecha_aceptacion || 'No aceptada'}`);
                        console.log(`      Fecha expiración: ${invitation.fecha_expiracion}`);
                        console.log('');
                    });
                } else {
                    console.log('   No hay invitaciones para este proyecto.\n');
                }
            }
        } else {
            console.log('   No se encontraron proyectos que contengan "proyecto final".\n');
        }

        // Verificar si dir2@test.com tiene alguna relación con proyectos
        console.log('🔍 Verificando relación de dir2@test.com con proyectos:');
        const [directorRelations] = await connection.execute(`
            SELECT 
                p.id,
                p.titulo,
                'director' as rol
            FROM proyectos p
            WHERE p.director_id = (SELECT id FROM usuarios WHERE email = 'dir2@test.com')
            UNION
            SELECT 
                p.id,
                p.titulo,
                'estudiante' as rol
            FROM proyectos p
            WHERE p.estudiante_id = (SELECT id FROM usuarios WHERE email = 'dir2@test.com')
            UNION
            SELECT 
                p.id,
                p.titulo,
                'evaluador' as rol
            FROM proyectos p
            WHERE p.evaluador_id = (SELECT id FROM usuarios WHERE email = 'dir2@test.com')
        `);

        if (directorRelations.length > 0) {
            directorRelations.forEach((relation, index) => {
                console.log(`   ${index + 1}. Proyecto: ${relation.titulo} (ID: ${relation.id}) - Rol: ${relation.rol}`);
            });
        } else {
            console.log('   dir2@test.com no tiene relación directa con ningún proyecto.');
        }

    } catch (error) {
        console.error('❌ Error al consultar la base de datos:', error.message);
    } finally {
        await connection.end();
    }
}

checkAdminProject().catch(console.error);