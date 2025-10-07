const mysql = require('mysql2/promise');
require('dotenv').config();

async function debugDirectorProblem() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    try {
        console.log('🔍 DIAGNÓSTICO COMPLETO DEL PROBLEMA DE DIRECTORES\n');

        // 1. Verificar el proyecto "proyecto final"
        console.log('📋 1. ESTADO ACTUAL DEL PROYECTO:');
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
            console.log('❌ Proyecto no encontrado');
            return;
        }

        const project = projectRows[0];
        console.log(`   ✅ Proyecto: ${project.titulo} (ID: ${project.id})`);
        console.log(`   👨‍💼 Director ID: ${project.director_id || 'NULL'}`);
        console.log(`   🎓 Estudiante ID: ${project.estudiante_id || 'NULL'}`);
        console.log(`   📝 Evaluador ID: ${project.evaluador_id || 'NULL'}\n`);

        // 2. Verificar TODOS los miembros del proyecto en proyecto_usuarios
        console.log('👥 2. TODOS LOS MIEMBROS EN proyecto_usuarios:');
        const [allMembers] = await connection.execute(`
            SELECT 
                pu.usuario_id,
                pu.rol,
                pu.estado,
                pu.fecha_asignacion,
                u.nombres,
                u.apellidos,
                u.email,
                r.nombre as rol_sistema
            FROM proyecto_usuarios pu
            JOIN usuarios u ON pu.usuario_id = u.id
            JOIN roles r ON u.rol_id = r.id
            WHERE pu.proyecto_id = ?
            ORDER BY pu.fecha_asignacion DESC
        `, [project.id]);

        if (allMembers.length > 0) {
            console.log(`   ✅ Se encontraron ${allMembers.length} miembros:`);
            allMembers.forEach((member, index) => {
                console.log(`   ${index + 1}. ${member.nombres} ${member.apellidos} (${member.email})`);
                console.log(`      Usuario ID: ${member.usuario_id}`);
                console.log(`      Rol en proyecto: ${member.rol}`);
                console.log(`      Rol en sistema: ${member.rol_sistema}`);
                console.log(`      Estado: ${member.estado}`);
                console.log(`      Fecha: ${member.fecha_asignacion}`);
                console.log('');
            });
        } else {
            console.log('   ❌ No se encontraron miembros\n');
        }

        // 3. Verificar qué devuelve findByDirector para cada usuario con rol coordinador
        console.log('🔍 3. PROBANDO findByDirector PARA CADA COORDINADOR:');
        const coordinadores = allMembers.filter(m => m.rol === 'coordinador' && m.estado === 'activo');
        
        for (const coord of coordinadores) {
            console.log(`\n   👤 Probando para: ${coord.nombres} ${coord.apellidos} (ID: ${coord.usuario_id})`);
            
            // Simular la consulta exacta de findByDirector
            const [directorProjects] = await connection.execute(`
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
            `, [coord.usuario_id]);

            if (directorProjects.length > 0) {
                console.log(`      ✅ findByDirector encuentra ${directorProjects.length} proyectos:`);
                directorProjects.forEach((proj, idx) => {
                    console.log(`      ${idx + 1}. ${proj.titulo} (ID: ${proj.id})`);
                });
            } else {
                console.log(`      ❌ findByDirector NO encuentra proyectos`);
                console.log(`      💡 Razón: director_id del proyecto (${project.director_id}) ≠ usuario_id (${coord.usuario_id})`);
            }
        }

        // 4. Verificar el problema específico
        console.log('\n🚨 4. ANÁLISIS DEL PROBLEMA:');
        
        const coordinadoresActivos = coordinadores.length;
        const directorIdAsignado = project.director_id;
        
        console.log(`   📊 Coordinadores activos en proyecto_usuarios: ${coordinadoresActivos}`);
        console.log(`   📊 Director ID en tabla proyectos: ${directorIdAsignado || 'NULL'}`);
        
        if (coordinadoresActivos > 1 && directorIdAsignado) {
            console.log('\n   ⚠️  PROBLEMA IDENTIFICADO: CONFLICTO DE MÚLTIPLES DIRECTORES');
            console.log('   📝 Situación:');
            console.log(`      - Hay ${coordinadoresActivos} coordinadores en proyecto_usuarios`);
            console.log(`      - Pero director_id solo apunta a uno: ${directorIdAsignado}`);
            console.log(`      - Los otros coordinadores NO aparecen en findByDirector`);
            
            const directorAsignado = coordinadores.find(c => c.usuario_id == directorIdAsignado);
            const directoresNoAsignados = coordinadores.filter(c => c.usuario_id != directorIdAsignado);
            
            if (directorAsignado) {
                console.log(`\n   ✅ Director que SÍ aparece: ${directorAsignado.nombres} ${directorAsignado.apellidos}`);
            }
            
            if (directoresNoAsignados.length > 0) {
                console.log(`\n   ❌ Directores que NO aparecen:`);
                directoresNoAsignados.forEach((dir, idx) => {
                    console.log(`      ${idx + 1}. ${dir.nombres} ${dir.apellidos} (ID: ${dir.usuario_id})`);
                });
            }
            
        } else if (coordinadoresActivos > 0 && !directorIdAsignado) {
            console.log('\n   ⚠️  PROBLEMA IDENTIFICADO: DIRECTOR_ID NO ASIGNADO');
            console.log('   📝 Situación:');
            console.log(`      - Hay ${coordinadoresActivos} coordinadores en proyecto_usuarios`);
            console.log('      - Pero director_id es NULL en la tabla proyectos');
            console.log('      - NINGÚN coordinador aparece en findByDirector');
        }

        // 5. Proponer solución
        console.log('\n💡 5. SOLUCIÓN RECOMENDADA:');
        console.log('   🔧 OPCIÓN 1: Modificar findByDirector para consultar AMBAS fuentes');
        console.log('      - Buscar en director_id (actual)');
        console.log('      - TAMBIÉN buscar en proyecto_usuarios con rol coordinador');
        console.log('      - Unir ambos resultados');
        
        console.log('\n   🔧 OPCIÓN 2: Mantener director_id sincronizado');
        console.log('      - Cuando se agrega un coordinador, actualizar director_id');
        console.log('      - Manejar conflictos de múltiples directores');
        
        console.log('\n   ✅ RECOMENDACIÓN: Implementar OPCIÓN 1 (más robusta)');

    } catch (error) {
        console.error('❌ Error en el diagnóstico:', error.message);
    } finally {
        await connection.end();
    }
}

debugDirectorProblem().catch(console.error);