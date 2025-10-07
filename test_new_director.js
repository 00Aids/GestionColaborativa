const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function testNewDirector() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    try {
        console.log('🧪 PROBANDO INVITACIÓN DE NUEVO DIRECTOR\n');

        // 1. Crear un nuevo usuario director
        console.log('👤 1. CREANDO NUEVO DIRECTOR...');
        
        const newDirectorEmail = `director_test_${Date.now()}@test.com`;
        const hashedPassword = await bcrypt.hash('123456', 10);
        
        // Obtener el rol_id de "Director de Proyecto"
        const [roleRows] = await connection.execute(
            'SELECT id FROM roles WHERE nombre = ?',
            ['Director de Proyecto']
        );
        
        if (roleRows.length === 0) {
            console.log('❌ Rol "Director de Proyecto" no encontrado');
            return;
        }
        
        const directorRoleId = roleRows[0].id;
        
        // Crear el nuevo director
        const [insertResult] = await connection.execute(`
            INSERT INTO usuarios 
            (nombres, apellidos, email, password, rol_id, estado, fecha_registro)
            VALUES (?, ?, ?, ?, ?, 'activo', NOW())
        `, ['Director', 'Nuevo', newDirectorEmail, hashedPassword, directorRoleId]);
        
        const newDirectorId = insertResult.insertId;
        console.log(`   ✅ Nuevo director creado: ${newDirectorEmail} (ID: ${newDirectorId})\n`);

        // 2. Obtener el proyecto "proyecto final"
        console.log('📋 2. OBTENIENDO PROYECTO...');
        const [projectRows] = await connection.execute(
            'SELECT id, titulo, director_id FROM proyectos WHERE titulo LIKE "%proyecto final%" ORDER BY created_at DESC LIMIT 1'
        );

        if (projectRows.length === 0) {
            console.log('❌ Proyecto "proyecto final" no encontrado');
            return;
        }

        const project = projectRows[0];
        console.log(`   ✅ Proyecto: ${project.titulo} (ID: ${project.id})`);
        console.log(`   👨‍💼 Director actual: ${project.director_id || 'Ninguno'}\n`);

        // 3. Crear una nueva invitación
        console.log('📨 3. CREANDO INVITACIÓN...');
        const invitationCode = Math.random().toString(36).substring(2, 15).toUpperCase();
        
        await connection.execute(`
            INSERT INTO invitaciones 
            (proyecto_id, codigo_invitacion, invitado_por, fecha_expiracion, max_usos, usos_actuales, estado)
            VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), 1, 0, 'pendiente')
        `, [project.id, invitationCode, 29]); // 29 es el admin
        
        console.log(`   ✅ Invitación creada: ${invitationCode}\n`);

        // 4. Simular que el nuevo director acepta la invitación
        console.log('🔗 4. SIMULANDO ACEPTACIÓN DE INVITACIÓN...');
        
        const Project = require('./src/models/Project');
        const projectModel = new Project();
        
        const result = await projectModel.joinProjectWithCode(invitationCode, newDirectorId);
        
        if (result.success) {
            console.log(`   ✅ ${result.message}`);
            console.log(`   📋 Proyecto: ${result.project.titulo} (ID: ${result.project.id})\n`);
        } else {
            console.log(`   ❌ Error: ${result.message}\n`);
            return;
        }

        // 5. Verificar el estado del proyecto después de la invitación
        console.log('🔍 5. VERIFICANDO ESTADO DEL PROYECTO...');
        const [updatedProjectRows] = await connection.execute(
            'SELECT director_id, estudiante_id, evaluador_id FROM proyectos WHERE id = ?',
            [project.id]
        );

        if (updatedProjectRows.length > 0) {
            const updatedProject = updatedProjectRows[0];
            console.log(`   👨‍💼 Director ID: ${updatedProject.director_id}`);
            console.log(`   🎓 Estudiante ID: ${updatedProject.estudiante_id}`);
            console.log(`   📝 Evaluador ID: ${updatedProject.evaluador_id}`);
            
            // ⚠️ PROBLEMA POTENCIAL: ¿Qué pasa si ya había un director?
            if (project.director_id && project.director_id !== newDirectorId && updatedProject.director_id === newDirectorId) {
                console.log(`   ⚠️  ADVERTENCIA: El director anterior (ID: ${project.director_id}) fue reemplazado por el nuevo (ID: ${newDirectorId})`);
                console.log(`   💡 Esto podría ser un problema si queremos múltiples directores\n`);
            } else if (updatedProject.director_id == newDirectorId) {
                console.log(`   ✅ El nuevo director se asignó correctamente\n`);
            }
        }

        // 6. Verificar que el nuevo director puede ver el proyecto
        console.log('👀 6. VERIFICANDO VISTA DEL DIRECTOR...');
        const [directorProjectRows] = await connection.execute(`
            SELECT p.id, p.titulo, p.estado
            FROM proyectos p
            WHERE p.director_id = ?
        `, [newDirectorId]);

        if (directorProjectRows.length > 0) {
            console.log('   ✅ El nuevo director puede ver sus proyectos:');
            directorProjectRows.forEach((proj, index) => {
                console.log(`   ${index + 1}. ${proj.titulo} (ID: ${proj.id}) - Estado: ${proj.estado}`);
            });
        } else {
            console.log('   ❌ El nuevo director NO puede ver proyectos');
        }

        // 7. Verificar membresía en proyecto_usuarios
        console.log('\n👥 7. VERIFICANDO MEMBRESÍA EN proyecto_usuarios...');
        const [memberRows] = await connection.execute(`
            SELECT pu.rol, pu.estado, pu.fecha_asignacion
            FROM proyecto_usuarios pu
            WHERE pu.proyecto_id = ? AND pu.usuario_id = ?
        `, [project.id, newDirectorId]);

        if (memberRows.length > 0) {
            const member = memberRows[0];
            console.log(`   ✅ Membresía encontrada:`);
            console.log(`   Rol: ${member.rol}`);
            console.log(`   Estado: ${member.estado}`);
            console.log(`   Fecha: ${member.fecha_asignacion}`);
        } else {
            console.log('   ❌ No se encontró membresía en proyecto_usuarios');
        }

        // 8. Verificar si hay conflictos con múltiples directores
        console.log('\n🔍 8. VERIFICANDO MÚLTIPLES DIRECTORES...');
        const [allDirectorMembers] = await connection.execute(`
            SELECT pu.usuario_id, u.nombres, u.apellidos, u.email
            FROM proyecto_usuarios pu
            JOIN usuarios u ON pu.usuario_id = u.id
            WHERE pu.proyecto_id = ? AND pu.rol IN ('coordinador', 'director') AND pu.estado = 'activo'
        `, [project.id]);

        if (allDirectorMembers.length > 1) {
            console.log(`   ⚠️  Se encontraron ${allDirectorMembers.length} directores/coordinadores en proyecto_usuarios:`);
            allDirectorMembers.forEach((dir, index) => {
                console.log(`   ${index + 1}. ${dir.nombres} ${dir.apellidos} (${dir.email}) - ID: ${dir.usuario_id}`);
            });
            console.log(`   💡 Pero el campo director_id del proyecto solo apunta a: ${updatedProjectRows[0].director_id}`);
        } else {
            console.log('   ✅ Solo hay un director/coordinador');
        }

        console.log('\n🎉 PRUEBA COMPLETADA');
        console.log(`📧 Email del nuevo director: ${newDirectorEmail}`);
        console.log(`🔑 Contraseña: 123456`);

    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
        console.error(error.stack);
    } finally {
        await connection.end();
    }
}

testNewDirector().catch(console.error);