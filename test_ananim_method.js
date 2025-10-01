const { pool } = require('./src/config/database');

async function testAnanim() {
    console.log('🔍 PROBANDO MÉTODO coordinatorStudents CON ANANIM (ID: 88)\n');
    console.log('='.repeat(60));
    
    try {
        // Esta es la consulta exacta del método coordinatorStudents
        const coordinatorStudentsQuery = `
            SELECT DISTINCT 
                u.id,
                u.nombres,
                u.apellidos,
                u.email,
                u.codigo_usuario,
                p.id as proyecto_id,
                p.titulo as proyecto_nombre,
                p.estado as proyecto_estado,
                p.fecha_inicio,
                p.fecha_fin
            FROM usuarios u
            INNER JOIN proyecto_usuarios pu ON u.id = pu.usuario_id 
                AND pu.rol = 'estudiante'
            INNER JOIN proyectos p ON pu.proyecto_id = p.id
            INNER JOIN proyecto_usuarios pu_coord ON p.id = pu_coord.proyecto_id 
                AND pu_coord.rol = 'coordinador'
            WHERE pu_coord.usuario_id = ?
            ORDER BY u.apellidos, u.nombres
        `;
        
        console.log('📋 1. EJECUTANDO CONSULTA DEL MÉTODO coordinatorStudents:');
        console.log('   Usuario ID: 88 (ananim@gmail.com)');
        
        const [students] = await pool.execute(coordinatorStudentsQuery, [88]);
        
        console.log(`\n📊 RESULTADO: ${students.length} estudiante(s) encontrado(s)`);
        
        if (students.length > 0) {
            console.log('\n✅ ESTUDIANTES ENCONTRADOS:');
            students.forEach((student, index) => {
                console.log(`\n${index + 1}. ${student.nombres} ${student.apellidos}`);
                console.log(`   📧 Email: ${student.email}`);
                console.log(`   🆔 ID: ${student.id}`);
                console.log(`   📝 Código: ${student.codigo_usuario || 'No asignado'}`);
                console.log(`   📁 Proyecto: ${student.proyecto_nombre} (ID: ${student.proyecto_id})`);
                console.log(`   📊 Estado: ${student.proyecto_estado}`);
                console.log(`   📅 Inicio: ${student.fecha_inicio}`);
                console.log(`   📅 Fin: ${student.fecha_fin}`);
            });
        } else {
            console.log('\n❌ NO SE ENCONTRARON ESTUDIANTES');
            
            // Vamos a debuggear paso a paso
            console.log('\n🔍 DEBUGGING PASO A PASO:');
            
            // Paso 1: Verificar proyecto_usuarios para ananim como coordinador
            console.log('\n📋 Paso 1: Proyectos donde ananim es coordinador');
            const [coordProjects] = await pool.execute(`
                SELECT 
                    pu.proyecto_id,
                    pu.rol,
                    p.titulo
                FROM proyecto_usuarios pu
                INNER JOIN proyectos p ON pu.proyecto_id = p.id
                WHERE pu.usuario_id = 88 AND pu.rol = 'coordinador'
            `);
            
            console.log(`   Encontrados: ${coordProjects.length}`);
            coordProjects.forEach(proj => {
                console.log(`   - Proyecto ID: ${proj.proyecto_id}, Título: ${proj.titulo}`);
            });
            
            // Paso 2: Verificar estudiantes en esos proyectos
            if (coordProjects.length > 0) {
                console.log('\n📋 Paso 2: Estudiantes en esos proyectos');
                for (const proj of coordProjects) {
                    const [projStudents] = await pool.execute(`
                        SELECT 
                            u.nombres,
                            u.apellidos,
                            u.email,
                            pu.rol
                        FROM proyecto_usuarios pu
                        INNER JOIN usuarios u ON pu.usuario_id = u.id
                        WHERE pu.proyecto_id = ? AND pu.rol = 'estudiante'
                    `, [proj.proyecto_id]);
                    
                    console.log(`   Proyecto "${proj.titulo}" (ID: ${proj.proyecto_id}):`);
                    if (projStudents.length > 0) {
                        projStudents.forEach(student => {
                            console.log(`     - ${student.nombres} ${student.apellidos} (${student.email})`);
                        });
                    } else {
                        console.log(`     - No hay estudiantes`);
                    }
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        process.exit(0);
    }
}

testAnanim();