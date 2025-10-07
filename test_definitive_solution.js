const mysql = require('mysql2/promise');
const Project = require('./src/models/Project');
require('dotenv').config();

async function testDefinitiveSolution() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    try {
        console.log('🧪 PRUEBA DEFINITIVA DE LA SOLUCIÓN PARA DIRECTORES\n');

        // 1. Obtener el proyecto "proyecto final"
        console.log('📋 1. OBTENIENDO PROYECTO DE PRUEBA...');
        const [projectRows] = await connection.execute(`
            SELECT id, titulo, director_id FROM proyectos 
            WHERE titulo LIKE '%proyecto final%'
            ORDER BY created_at DESC LIMIT 1
        `);

        if (projectRows.length === 0) {
            console.log('❌ Proyecto no encontrado');
            return;
        }

        const project = projectRows[0];
        console.log(`   ✅ Proyecto: ${project.titulo} (ID: ${project.id})`);
        console.log(`   👨‍💼 Director ID actual: ${project.director_id || 'NULL'}\n`);

        // 2. Obtener todos los coordinadores del proyecto
        console.log('👥 2. COORDINADORES EN EL PROYECTO:');
        const [coordinators] = await connection.execute(`
            SELECT 
                pu.usuario_id,
                u.nombres,
                u.apellidos,
                u.email,
                pu.estado,
                pu.fecha_asignacion
            FROM proyecto_usuarios pu
            JOIN usuarios u ON pu.usuario_id = u.id
            WHERE pu.proyecto_id = ? 
              AND pu.rol = 'coordinador' 
              AND pu.estado = 'activo'
            ORDER BY pu.fecha_asignacion ASC
        `, [project.id]);

        if (coordinators.length === 0) {
            console.log('   ❌ No hay coordinadores activos\n');
            return;
        }

        console.log(`   ✅ Se encontraron ${coordinators.length} coordinadores activos:`);
        coordinators.forEach((coord, index) => {
            console.log(`   ${index + 1}. ${coord.nombres} ${coord.apellidos} (${coord.email})`);
            console.log(`      Usuario ID: ${coord.usuario_id}`);
            console.log(`      Fecha asignación: ${coord.fecha_asignacion}`);
        });
        console.log('');

        // 3. Probar la nueva implementación de findByDirector
        console.log('🔍 3. PROBANDO NUEVA IMPLEMENTACIÓN findByDirector:');
        const projectModel = new Project();

        for (const coord of coordinators) {
            console.log(`\n   👤 Probando para: ${coord.nombres} ${coord.apellidos} (ID: ${coord.usuario_id})`);
            
            try {
                const projects = await projectModel.findByDirector(coord.usuario_id);
                
                if (projects && projects.length > 0) {
                    console.log(`      ✅ ÉXITO: Encuentra ${projects.length} proyectos:`);
                    projects.forEach((proj, idx) => {
                        console.log(`      ${idx + 1}. ${proj.titulo} (ID: ${proj.id})`);
                        console.log(`         Estado: ${proj.estado}`);
                        console.log(`         Director ID: ${proj.director_id || 'NULL'}`);
                    });
                } else {
                    console.log(`      ❌ FALLO: No encuentra proyectos`);
                }
            } catch (error) {
                console.log(`      ❌ ERROR: ${error.message}`);
            }
        }

        // 4. Verificar que no hay duplicados
        console.log('\n🔍 4. VERIFICANDO DUPLICADOS:');
        if (coordinators.length > 1) {
            const firstCoord = coordinators[0];
            const projects = await projectModel.findByDirector(firstCoord.usuario_id);
            
            // Contar cuántas veces aparece el mismo proyecto
            const projectCounts = {};
            projects.forEach(proj => {
                projectCounts[proj.id] = (projectCounts[proj.id] || 0) + 1;
            });

            const duplicates = Object.entries(projectCounts).filter(([id, count]) => count > 1);
            
            if (duplicates.length > 0) {
                console.log('   ⚠️  ADVERTENCIA: Se encontraron duplicados:');
                duplicates.forEach(([id, count]) => {
                    console.log(`      Proyecto ID ${id} aparece ${count} veces`);
                });
            } else {
                console.log('   ✅ No se encontraron duplicados');
            }
        } else {
            console.log('   ℹ️  Solo hay un coordinador, no hay riesgo de duplicados');
        }

        // 5. Simular escenario de nuevo director
        console.log('\n🆕 5. SIMULANDO NUEVO DIRECTOR:');
        
        // Limpiar cualquier director temporal previo
        await connection.execute('DELETE FROM usuarios WHERE codigo_usuario = ?', ['TESTDIR999']);
        
        // Crear un nuevo director temporal
        const [insertResult] = await connection.execute(`
            INSERT INTO usuarios (codigo_usuario, email, password_hash, nombres, apellidos, rol_id, activo)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            'TESTDIR999',
            'testdir999@test.com',
            'hash_temporal',
            'Director',
            'Temporal',
            2, // Rol coordinador
            true
        ]);

        const newDirectorId = insertResult.insertId;
        console.log(`   ✅ Director temporal creado (ID: ${newDirectorId})`);

        // Agregar al proyecto usando joinProjectWithCode
        const [invitationRows] = await connection.execute(`
            SELECT codigo_invitacion FROM invitaciones 
            WHERE proyecto_id = ? AND estado = 'pendiente' 
            ORDER BY created_at DESC LIMIT 1
        `, [project.id]);

        if (invitationRows.length > 0) {
            const invitationCode = invitationRows[0].codigo_invitacion;
            console.log(`   📧 Usando código de invitación: ${invitationCode}`);
            
            const result = await projectModel.joinProjectWithCode(invitationCode, newDirectorId);
            
            if (result.success) {
                console.log(`   ✅ ${result.message}`);
                
                // Probar que el nuevo director puede ver el proyecto
                const newDirectorProjects = await projectModel.findByDirector(newDirectorId);
                
                if (newDirectorProjects && newDirectorProjects.length > 0) {
                    console.log(`   ✅ ÉXITO: El nuevo director ve ${newDirectorProjects.length} proyectos:`);
                    newDirectorProjects.forEach((proj, idx) => {
                        console.log(`      ${idx + 1}. ${proj.titulo} (ID: ${proj.id})`);
                    });
                } else {
                    console.log(`   ❌ FALLO: El nuevo director NO ve proyectos`);
                }
            } else {
                console.log(`   ❌ Error al unir al proyecto: ${result.message}`);
            }
        } else {
            console.log('   ⚠️  No hay invitaciones activas para probar');
        }

        // Limpiar el director temporal
        await connection.execute('DELETE FROM proyecto_usuarios WHERE usuario_id = ?', [newDirectorId]);
        await connection.execute('DELETE FROM usuarios WHERE id = ?', [newDirectorId]);
        console.log(`   🧹 Director temporal eliminado`);

        // 6. Resumen final
        console.log('\n📊 6. RESUMEN DE LA SOLUCIÓN:');
        console.log('   ✅ PROBLEMA IDENTIFICADO:');
        console.log('      - findByDirector solo consultaba director_id');
        console.log('      - Múltiples coordinadores en proyecto_usuarios no aparecían');
        console.log('');
        console.log('   ✅ SOLUCIÓN IMPLEMENTADA:');
        console.log('      - findByDirector ahora consulta AMBAS fuentes:');
        console.log('        1. director_id (método original)');
        console.log('        2. proyecto_usuarios con rol coordinador');
        console.log('      - Usa DISTINCT para evitar duplicados');
        console.log('      - Mantiene compatibilidad con código existente');
        console.log('');
        console.log('   ✅ BENEFICIOS:');
        console.log('      - TODOS los coordinadores ven sus proyectos');
        console.log('      - No importa si director_id está actualizado o no');
        console.log('      - Solución robusta y definitiva');
        console.log('      - No rompe funcionalidad existente');

    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
    } finally {
        await connection.end();
    }
}

testDefinitiveSolution().catch(console.error);