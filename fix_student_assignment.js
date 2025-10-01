const { pool } = require('./src/config/database');

async function fixStudentAssignment() {
    console.log('🔧 Corrigiendo asignación de estudiante en proyecto "Gestion colaborativa"...\n');

    try {
        // 1. Verificar estado actual
        console.log('📋 1. ESTADO ACTUAL:');
        const [currentState] = await pool.execute(`
            SELECT 
                p.id,
                p.titulo,
                p.estudiante_id,
                pu.usuario_id as estudiante_en_proyecto_usuarios,
                u.nombres,
                u.apellidos,
                u.email
            FROM proyectos p
            LEFT JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id AND pu.rol = 'estudiante'
            LEFT JOIN usuarios u ON pu.usuario_id = u.id
            WHERE p.id = 38
        `);

        if (currentState.length > 0) {
            const project = currentState[0];
            console.log(`   Proyecto: ${project.titulo}`);
            console.log(`   estudiante_id actual: ${project.estudiante_id || 'NULL'}`);
            console.log(`   Estudiante en proyecto_usuarios: ${project.estudiante_en_proyecto_usuarios || 'NULL'}`);
            if (project.nombres) {
                console.log(`   Nombre del estudiante: ${project.nombres} ${project.apellidos}`);
                console.log(`   Email: ${project.email}`);
            }
        }

        // 2. Realizar la corrección
        console.log('\n📋 2. APLICANDO CORRECCIÓN:');
        const [updateResult] = await pool.execute(`
            UPDATE proyectos 
            SET estudiante_id = 87 
            WHERE id = 38
        `);

        console.log(`✅ Proyecto actualizado. Filas afectadas: ${updateResult.affectedRows}`);

        // 3. Verificar el resultado
        console.log('\n📋 3. VERIFICANDO RESULTADO:');
        const [newState] = await pool.execute(`
            SELECT 
                p.id,
                p.titulo,
                p.estudiante_id,
                u.nombres,
                u.apellidos,
                u.email
            FROM proyectos p
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            WHERE p.id = 38
        `);

        if (newState.length > 0) {
            const project = newState[0];
            console.log(`   Proyecto: ${project.titulo}`);
            console.log(`   estudiante_id actualizado: ${project.estudiante_id}`);
            console.log(`   Estudiante: ${project.nombres} ${project.apellidos}`);
            console.log(`   Email: ${project.email}`);
        }

        // 4. Probar la consulta del controlador
        console.log('\n📋 4. PROBANDO CONSULTA DEL CONTROLADOR:');
        const [testQuery] = await pool.execute(`
            SELECT DISTINCT 
              u.id,
              u.nombres,
              u.apellidos,
              u.email,
              u.telefono,
              u.created_at as fecha_registro,
              p.titulo as proyecto_titulo,
              p.id as proyecto_id,
              p.estado as proyecto_estado
            FROM usuarios u
            INNER JOIN proyectos p ON u.id = p.estudiante_id
            INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            WHERE pu.usuario_id = 88 AND pu.rol = 'coordinador'
            ORDER BY u.apellidos, u.nombres
        `);

        console.log(`✅ Estudiantes encontrados por el coordinador ananim: ${testQuery.length}`);
        
        if (testQuery.length > 0) {
            testQuery.forEach(student => {
                console.log(`   - ${student.nombres} ${student.apellidos}`);
                console.log(`     Proyecto: ${student.proyecto_titulo}`);
                console.log(`     Estado: ${student.proyecto_estado}`);
            });

            console.log('\n🎉 ¡PROBLEMA SOLUCIONADO!');
            console.log('   El coordinador ananim@gmail.com ahora debería ver a su estudiante.');
            console.log('   Puedes refrescar la página en el navegador para ver los cambios.');
        } else {
            console.log('❌ Aún no se encuentran estudiantes. Revisar configuración.');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

fixStudentAssignment();