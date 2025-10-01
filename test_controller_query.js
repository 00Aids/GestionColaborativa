const { pool } = require('./src/config/database');

async function testControllerQuery() {
    console.log('🧪 Probando la consulta EXACTA del controlador coordinatorStudents...\n');

    try {
        // 1. Obtener información del coordinador ananim
        console.log('📋 1. INFORMACIÓN DEL COORDINADOR ANANIM:');
        const [anamimInfo] = await pool.execute(`
            SELECT id, nombres, apellidos, email 
            FROM usuarios 
            WHERE email = 'ananim@gmail.com'
        `);

        if (anamimInfo.length === 0) {
            console.log('❌ No se encontró el coordinador ananim@gmail.com');
            return;
        }

        const ananim = anamimInfo[0];
        console.log(`✅ Coordinador: ${ananim.nombres} ${ananim.apellidos} (ID: ${ananim.id})`);
        console.log(`   Email: ${ananim.email}\n`);

        // 2. Probar la consulta EXACTA del método coordinatorStudents
        console.log('📋 2. EJECUTANDO CONSULTA DEL CONTROLADOR:');
        console.log('   Query utilizada en DashboardController.coordinatorStudents():');
        
        const query = `
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
            WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
            ORDER BY u.apellidos, u.nombres
        `;

        console.log(query);
        console.log(`   Parámetro: usuario_id = ${ananim.id}\n`);

        const [students] = await pool.execute(query, [ananim.id]);

        console.log(`📊 RESULTADO: ${students.length} estudiantes encontrados`);
        
        if (students.length > 0) {
            console.log('\n✅ ESTUDIANTES ENCONTRADOS:');
            students.forEach((student, index) => {
                console.log(`   ${index + 1}. ${student.nombres} ${student.apellidos}`);
                console.log(`      Email: ${student.email}`);
                console.log(`      Proyecto: ${student.proyecto_titulo} (ID: ${student.proyecto_id})`);
                console.log(`      Estado: ${student.proyecto_estado}`);
                console.log(`      Fecha registro: ${student.fecha_registro}`);
                console.log('');
            });

            // 3. Calcular estadísticas como en la vista
            console.log('📈 ESTADÍSTICAS PARA LA VISTA:');
            const totalEstudiantes = students.length;
            const proyectosActivos = students.filter(s => 
                s.proyecto_estado === 'activo' || 
                s.proyecto_estado === 'en_desarrollo' || 
                s.proyecto_estado === 'aprobado'
            ).length;
            const proyectosCompletados = students.filter(s => 
                s.proyecto_estado === 'completado'
            ).length;

            console.log(`   - Total Estudiantes: ${totalEstudiantes}`);
            console.log(`   - Proyectos Activos: ${proyectosActivos}`);
            console.log(`   - Proyectos Completados: ${proyectosCompletados}`);

        } else {
            console.log('\n❌ NO SE ENCONTRARON ESTUDIANTES');
            
            // 4. Diagnóstico paso a paso
            console.log('\n🔍 DIAGNÓSTICO PASO A PASO:');
            
            // Verificar si hay proyectos asignados al coordinador
            const [coordProjects] = await pool.execute(`
                SELECT p.id, p.titulo, p.estado, p.estudiante_id
                FROM proyecto_usuarios pu
                INNER JOIN proyectos p ON pu.proyecto_id = p.id
                WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
            `, [ananim.id]);

            console.log(`   Proyectos asignados al coordinador: ${coordProjects.length}`);
            
            if (coordProjects.length > 0) {
                coordProjects.forEach(project => {
                    console.log(`     - ${project.titulo} (ID: ${project.id}, Estudiante ID: ${project.estudiante_id})`);
                });

                // Verificar si los estudiantes existen
                for (const project of coordProjects) {
                    if (project.estudiante_id) {
                        const [studentInfo] = await pool.execute(`
                            SELECT id, nombres, apellidos, email
                            FROM usuarios
                            WHERE id = ?
                        `, [project.estudiante_id]);

                        if (studentInfo.length > 0) {
                            console.log(`     ✅ Estudiante existe: ${studentInfo[0].nombres} ${studentInfo[0].apellidos}`);
                        } else {
                            console.log(`     ❌ Estudiante con ID ${project.estudiante_id} NO existe`);
                        }
                    } else {
                        console.log(`     ⚠️  Proyecto ${project.titulo} no tiene estudiante asignado`);
                    }
                }
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

testControllerQuery();