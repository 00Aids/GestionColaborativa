const mysql = require('mysql2/promise');
require('dotenv').config();

async function debugDirectorIssue() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    try {
        console.log('🔍 DIAGNÓSTICO DEL PROBLEMA DEL DIRECTOR\n');

        // 1. Verificar información del director dir2@test.com
        console.log('👤 1. INFORMACIÓN DEL DIRECTOR:');
        const [directorRows] = await connection.execute(
            'SELECT id, nombres, apellidos, email, rol_id FROM usuarios WHERE email = ?',
            ['dir2@test.com']
        );

        if (directorRows.length === 0) {
            console.log('❌ Director no encontrado');
            return;
        }

        const director = directorRows[0];
        console.log(`   ✅ Director encontrado: ${director.nombres} ${director.apellidos} (ID: ${director.id})`);
        console.log(`   📧 Email: ${director.email}`);
        console.log(`   🎭 Rol ID: ${director.rol_id}\n`);

        // 2. Verificar el proyecto "proyecto final"
        console.log('📋 2. INFORMACIÓN DEL PROYECTO "proyecto final":');
        const [projectRows] = await connection.execute(`
            SELECT 
                id,
                titulo,
                descripcion,
                estado,
                director_id,
                estudiante_id,
                evaluador_id,
                area_trabajo_id,
                created_at
            FROM proyectos 
            WHERE titulo LIKE '%proyecto final%'
            ORDER BY created_at DESC
            LIMIT 1
        `);

        if (projectRows.length === 0) {
            console.log('❌ Proyecto "proyecto final" no encontrado');
            return;
        }

        const project = projectRows[0];
        console.log(`   ✅ Proyecto encontrado: ${project.titulo} (ID: ${project.id})`);
        console.log(`   📝 Descripción: ${project.descripcion}`);
        console.log(`   📊 Estado: ${project.estado}`);
        console.log(`   👨‍💼 Director ID: ${project.director_id || 'No asignado'}`);
        console.log(`   🎓 Estudiante ID: ${project.estudiante_id || 'No asignado'}`);
        console.log(`   📝 Evaluador ID: ${project.evaluador_id || 'No asignado'}`);
        console.log(`   🏢 Área trabajo ID: ${project.area_trabajo_id || 'No asignada'}`);
        console.log(`   📅 Creado: ${project.created_at}\n`);

        // 3. Verificar si el director está en la tabla proyecto_usuarios
        console.log('👥 3. VERIFICAR TABLA proyecto_usuarios:');
        const [memberRows] = await connection.execute(`
            SELECT 
                pu.*,
                p.titulo as proyecto_titulo
            FROM proyecto_usuarios pu
            LEFT JOIN proyectos p ON pu.proyecto_id = p.id
            WHERE pu.usuario_id = ? AND pu.proyecto_id = ?
        `, [director.id, project.id]);

        if (memberRows.length > 0) {
            console.log(`   ✅ Director encontrado en proyecto_usuarios:`);
            memberRows.forEach((member, index) => {
                console.log(`   ${index + 1}. Proyecto: ${member.proyecto_titulo}`);
                console.log(`      Rol: ${member.rol}`);
                console.log(`      Estado: ${member.estado}`);
                console.log(`      Fecha asignación: ${member.fecha_asignacion}`);
                console.log('');
            });
        } else {
            console.log('   ❌ Director NO encontrado en proyecto_usuarios\n');
        }

        // 4. Verificar todas las invitaciones aceptadas para este proyecto
        console.log('📨 4. INVITACIONES ACEPTADAS PARA EL PROYECTO:');
        const [invitationRows] = await connection.execute(`
            SELECT 
                i.*,
                u.nombres,
                u.apellidos,
                u.email as usuario_email
            FROM invitaciones i
            LEFT JOIN usuarios u ON i.usuario_id = u.id
            WHERE i.proyecto_id = ? AND i.estado = 'aceptada'
            ORDER BY i.fecha_aceptacion DESC
        `, [project.id]);

        if (invitationRows.length > 0) {
            console.log(`   ✅ Se encontraron ${invitationRows.length} invitaciones aceptadas:`);
            invitationRows.forEach((invitation, index) => {
                console.log(`   ${index + 1}. Código: ${invitation.codigo_invitacion}`);
                console.log(`      Usuario: ${invitation.nombres ? `${invitation.nombres} ${invitation.apellidos}` : 'No asignado'}`);
                console.log(`      Email: ${invitation.usuario_email || invitation.email || 'No especificado'}`);
                console.log(`      Fecha aceptación: ${invitation.fecha_aceptacion}`);
                console.log(`      Usos: ${invitation.usos_actuales}/${invitation.max_usos}`);
                console.log('');
            });
        } else {
            console.log('   ❌ No se encontraron invitaciones aceptadas\n');
        }

        // 5. Verificar qué consulta usa findByDirector
        console.log('🔍 5. SIMULANDO CONSULTA findByDirector:');
        const [directorProjectRows] = await connection.execute(`
            SELECT 
                p.*,
                u_estudiante.nombres as estudiante_nombres,
                u_estudiante.apellidos as estudiante_apellidos,
                u_director.nombres as director_nombres,
                u_director.apellidos as director_apellidos,
                u_evaluador.nombres as evaluador_nombres,
                u_evaluador.apellidos as evaluador_apellidos
            FROM proyectos p
            LEFT JOIN usuarios u_estudiante ON p.estudiante_id = u_estudiante.id
            LEFT JOIN usuarios u_director ON p.director_id = u_director.id
            LEFT JOIN usuarios u_evaluador ON p.evaluador_id = u_evaluador.id
            WHERE p.director_id = ?
            ORDER BY p.created_at DESC
        `, [director.id]);

        if (directorProjectRows.length > 0) {
            console.log(`   ✅ Proyectos encontrados con director_id = ${director.id}:`);
            directorProjectRows.forEach((proj, index) => {
                console.log(`   ${index + 1}. ${proj.titulo} (ID: ${proj.id})`);
                console.log(`      Director: ${proj.director_nombres} ${proj.director_apellidos}`);
                console.log(`      Estado: ${proj.estado}`);
                console.log('');
            });
        } else {
            console.log(`   ❌ NO se encontraron proyectos con director_id = ${director.id}\n`);
        }

        // 6. Verificar si el problema es que no se actualizó el campo director_id
        console.log('🔧 6. DIAGNÓSTICO DEL PROBLEMA:');
        
        if (project.director_id !== director.id) {
            console.log('   ❌ PROBLEMA IDENTIFICADO: El campo director_id del proyecto NO está actualizado');
            console.log(`      - Proyecto director_id actual: ${project.director_id}`);
            console.log(`      - Director ID esperado: ${director.id}`);
            console.log('   💡 SOLUCIÓN: El proceso de unión con invitación solo agrega a proyecto_usuarios');
            console.log('      pero NO actualiza los campos director_id/estudiante_id/evaluador_id del proyecto');
            
            // Verificar si hay miembros con rol director en proyecto_usuarios
            const [directorMembers] = await connection.execute(`
                SELECT * FROM proyecto_usuarios 
                WHERE proyecto_id = ? AND rol IN ('director', 'coordinador') AND estado = 'activo'
            `, [project.id]);
            
            if (directorMembers.length > 0) {
                console.log('\n   📋 Miembros con rol director/coordinador en proyecto_usuarios:');
                directorMembers.forEach((member, index) => {
                    console.log(`   ${index + 1}. Usuario ID: ${member.usuario_id}, Rol: ${member.rol}`);
                });
                
                console.log('\n   🔧 RECOMENDACIÓN: Actualizar el campo director_id del proyecto');
                console.log(`      UPDATE proyectos SET director_id = ${director.id} WHERE id = ${project.id};`);
            }
        } else {
            console.log('   ✅ El campo director_id está correctamente asignado');
        }

    } catch (error) {
        console.error('❌ Error en el diagnóstico:', error.message);
    } finally {
        await connection.end();
    }
}

debugDirectorIssue().catch(console.error);