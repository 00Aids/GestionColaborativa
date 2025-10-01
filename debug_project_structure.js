const { pool } = require('./src/config/database');

async function debugProjectStructure() {
    console.log('🔍 Analizando estructura del proyecto "Gestion colaborativa"...\n');

    try {
        // 1. Información completa del proyecto
        console.log('📋 1. INFORMACIÓN DEL PROYECTO:');
        const [projectInfo] = await pool.execute(`
            SELECT * FROM proyectos WHERE id = 38
        `);

        if (projectInfo.length > 0) {
            const project = projectInfo[0];
            console.log(`✅ Proyecto encontrado:`);
            console.log(`   ID: ${project.id}`);
            console.log(`   Título: ${project.titulo}`);
            console.log(`   Estado: ${project.estado}`);
            console.log(`   Estudiante ID: ${project.estudiante_id || 'NULL'}`);
            console.log(`   Director ID: ${project.director_id || 'NULL'}`);
            console.log(`   Evaluador ID: ${project.evaluador_id || 'NULL'}`);
            console.log(`   Área trabajo ID: ${project.area_trabajo_id || 'NULL'}`);
        }

        // 2. Verificar relaciones en proyecto_usuarios
        console.log('\n📋 2. RELACIONES EN PROYECTO_USUARIOS:');
        const [projectUsers] = await pool.execute(`
            SELECT 
                pu.usuario_id,
                pu.rol,
                u.nombres,
                u.apellidos,
                u.email
            FROM proyecto_usuarios pu
            INNER JOIN usuarios u ON pu.usuario_id = u.id
            WHERE pu.proyecto_id = 38
            ORDER BY pu.rol
        `);

        console.log(`✅ Usuarios asignados al proyecto: ${projectUsers.length}`);
        projectUsers.forEach(user => {
            console.log(`   - ${user.rol}: ${user.nombres} ${user.apellidos} (${user.email})`);
        });

        // 3. Buscar si jostin correa está en el sistema
        console.log('\n📋 3. BUSCANDO JOSTIN CORREA:');
        const [jostinInfo] = await pool.execute(`
            SELECT id, nombres, apellidos, email, rol_id
            FROM usuarios 
            WHERE nombres LIKE '%jostin%' OR apellidos LIKE '%correa%'
        `);

        if (jostinInfo.length > 0) {
            console.log(`✅ Jostin encontrado:`);
            jostinInfo.forEach(user => {
                console.log(`   - ID: ${user.id}, Nombre: ${user.nombres} ${user.apellidos}`);
                console.log(`     Email: ${user.email}, Rol ID: ${user.rol_id}`);
            });

            // 4. Verificar si jostin está asignado a algún proyecto
            const jostinId = jostinInfo[0].id;
            console.log('\n📋 4. PROYECTOS DE JOSTIN:');
            
            // Como estudiante en proyecto_usuarios
            const [jostinProjects] = await pool.execute(`
                SELECT 
                    p.id,
                    p.titulo,
                    p.estado,
                    pu.rol
                FROM proyecto_usuarios pu
                INNER JOIN proyectos p ON pu.proyecto_id = p.id
                WHERE pu.usuario_id = ?
            `, [jostinId]);

            console.log(`   Proyectos en proyecto_usuarios: ${jostinProjects.length}`);
            jostinProjects.forEach(project => {
                console.log(`     - ${project.titulo} (${project.rol})`);
            });

            // Como estudiante_id en proyectos
            const [jostinDirectProjects] = await pool.execute(`
                SELECT id, titulo, estado
                FROM proyectos
                WHERE estudiante_id = ?
            `, [jostinId]);

            console.log(`   Proyectos como estudiante_id: ${jostinDirectProjects.length}`);
            jostinDirectProjects.forEach(project => {
                console.log(`     - ${project.titulo} (${project.estado})`);
            });

        } else {
            console.log('❌ No se encontró a Jostin Correa en el sistema');
        }

        // 5. Proponer solución
        console.log('\n💡 ANÁLISIS Y SOLUCIÓN:');
        
        if (projectUsers.some(u => u.rol === 'estudiante')) {
            const estudiante = projectUsers.find(u => u.rol === 'estudiante');
            console.log(`✅ El proyecto tiene un estudiante asignado en proyecto_usuarios:`);
            console.log(`   ${estudiante.nombres} ${estudiante.apellidos} (ID: ${estudiante.usuario_id})`);
            
            console.log('\n🔧 SOLUCIÓN RECOMENDADA:');
            console.log(`   Actualizar el campo estudiante_id del proyecto con el ID ${estudiante.usuario_id}`);
            console.log(`   
   UPDATE proyectos 
   SET estudiante_id = ${estudiante.usuario_id} 
   WHERE id = 38;
            `);
        } else {
            console.log('❌ El proyecto no tiene estudiante asignado en proyecto_usuarios');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

debugProjectStructure();