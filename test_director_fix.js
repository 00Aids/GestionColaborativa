const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDirectorFix() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    try {
        console.log('🧪 PROBANDO LA SOLUCIÓN DEL DIRECTOR\n');

        // 1. Obtener información del director y proyecto
        const [directorRows] = await connection.execute(
            'SELECT id, nombres, apellidos, email FROM usuarios WHERE email = ?',
            ['dir2@test.com']
        );

        const [projectRows] = await connection.execute(
            'SELECT id, titulo FROM proyectos WHERE titulo LIKE "%proyecto final%" ORDER BY created_at DESC LIMIT 1'
        );

        if (directorRows.length === 0 || projectRows.length === 0) {
            console.log('❌ Director o proyecto no encontrado');
            return;
        }

        const director = directorRows[0];
        const project = projectRows[0];

        console.log(`👤 Director: ${director.nombres} ${director.apellidos} (ID: ${director.id})`);
        console.log(`📋 Proyecto: ${project.titulo} (ID: ${project.id})\n`);

        // 2. Limpiar membresía anterior del director en este proyecto
        console.log('🧹 Limpiando membresía anterior...');
        await connection.execute(
            'DELETE FROM proyecto_usuarios WHERE proyecto_id = ? AND usuario_id = ?',
            [project.id, director.id]
        );

        // 3. Limpiar director_id del proyecto
        await connection.execute(
            'UPDATE proyectos SET director_id = NULL WHERE id = ?',
            [project.id]
        );
        console.log('✅ Membresía anterior limpiada\n');

        // 4. Crear una nueva invitación
        console.log('📨 Creando nueva invitación...');
        const invitationCode = Math.random().toString(36).substring(2, 15).toUpperCase();
        
        await connection.execute(`
            INSERT INTO invitaciones 
            (proyecto_id, codigo_invitacion, invitado_por, fecha_expiracion, max_usos, usos_actuales, estado)
            VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), 1, 0, 'pendiente')
        `, [project.id, invitationCode, 29]); // 29 es el ID del admin que creó el proyecto

        console.log(`✅ Nueva invitación creada: ${invitationCode}\n`);

        // 5. Simular el proceso de unión usando el modelo Project
        console.log('🔗 Simulando unión al proyecto...');
        
        // Importar el modelo Project
        const Project = require('./src/models/Project');
        const projectModel = new Project();

        // Intentar unirse al proyecto
        const result = await projectModel.joinProjectWithCode(invitationCode, director.id);
        
        if (result.success) {
            console.log(`✅ ${result.message}`);
            console.log(`📋 Proyecto: ${result.project.titulo} (ID: ${result.project.id})\n`);
        } else {
            console.log(`❌ Error: ${result.message}\n`);
            return;
        }

        // 6. Verificar que el director_id se actualizó correctamente
        console.log('🔍 Verificando actualización del proyecto...');
        const [updatedProjectRows] = await connection.execute(
            'SELECT director_id, estudiante_id, evaluador_id FROM proyectos WHERE id = ?',
            [project.id]
        );

        if (updatedProjectRows.length > 0) {
            const updatedProject = updatedProjectRows[0];
            console.log(`   Director ID: ${updatedProject.director_id}`);
            console.log(`   Estudiante ID: ${updatedProject.estudiante_id}`);
            console.log(`   Evaluador ID: ${updatedProject.evaluador_id}`);
            
            if (updatedProject.director_id == director.id) {
                console.log('✅ ¡El campo director_id se actualizó correctamente!\n');
            } else {
                console.log('❌ El campo director_id NO se actualizó\n');
            }
        }

        // 7. Verificar que findByDirector ahora encuentra el proyecto
        console.log('🔍 Probando consulta findByDirector...');
        const [directorProjectRows] = await connection.execute(`
            SELECT p.id, p.titulo, p.estado
            FROM proyectos p
            WHERE p.director_id = ?
        `, [director.id]);

        if (directorProjectRows.length > 0) {
            console.log('✅ ¡El director ahora puede ver sus proyectos!');
            directorProjectRows.forEach((proj, index) => {
                console.log(`   ${index + 1}. ${proj.titulo} (ID: ${proj.id}) - Estado: ${proj.estado}`);
            });
        } else {
            console.log('❌ El director aún no puede ver sus proyectos');
        }

        console.log('\n🎉 PRUEBA COMPLETADA');

    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
        console.error(error.stack);
    } finally {
        await connection.end();
    }
}

testDirectorFix().catch(console.error);