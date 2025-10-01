const { pool } = require('./src/config/database');

async function checkCurrentSession() {
    console.log('🔍 VERIFICANDO ESTADO ACTUAL DEL SISTEMA\n');
    console.log('='.repeat(60));
    
    try {
        // 1. Verificar coordinadores con estudiantes
        console.log('\n📋 1. COORDINADORES CON ESTUDIANTES ASIGNADOS:');
        const coordinatorsQuery = `
            SELECT DISTINCT 
                u.id,
                u.nombres,
                u.apellidos,
                u.email,
                COUNT(DISTINCT pu_estudiante.usuario_id) as total_estudiantes,
                COUNT(DISTINCT p.id) as total_proyectos
            FROM usuarios u
            INNER JOIN proyecto_usuarios pu_coord ON u.id = pu_coord.usuario_id 
                AND pu_coord.rol = 'coordinador'
            INNER JOIN proyectos p ON pu_coord.proyecto_id = p.id
            LEFT JOIN proyecto_usuarios pu_estudiante ON p.id = pu_estudiante.proyecto_id 
                AND pu_estudiante.rol = 'estudiante'
            WHERE u.rol_id = 3
            GROUP BY u.id, u.nombres, u.apellidos, u.email
            HAVING total_estudiantes > 0
            ORDER BY total_estudiantes DESC
        `;
        
        const [coordinators] = await pool.execute(coordinatorsQuery);
        
        if (coordinators.length === 0) {
            console.log('❌ No hay coordinadores con estudiantes asignados');
        } else {
            coordinators.forEach((coord, index) => {
                console.log(`\n${index + 1}. ${coord.nombres} ${coord.apellidos}`);
                console.log(`   📧 Email: ${coord.email}`);
                console.log(`   🆔 ID: ${coord.id}`);
                console.log(`   👥 Estudiantes: ${coord.total_estudiantes}`);
                console.log(`   📁 Proyectos: ${coord.total_proyectos}`);
            });
        }
        
        // 2. Verificar el coordinador específico que asignamos
        console.log('\n📋 2. VERIFICANDO COORDINADOR ASIGNADO (ID: 41):');
        const specificCoordQuery = `
            SELECT 
                u.id,
                u.nombres,
                u.apellidos,
                u.email,
                u.rol_id
            FROM usuarios u
            WHERE u.id = 41
        `;
        
        const [specificCoord] = await pool.execute(specificCoordQuery);
        
        if (specificCoord.length > 0) {
            const coord = specificCoord[0];
            console.log(`✅ Coordinador encontrado:`);
            console.log(`   Nombre: ${coord.nombres} ${coord.apellidos}`);
            console.log(`   Email: ${coord.email}`);
            console.log(`   ID: ${coord.id}`);
            console.log(`   Rol ID: ${coord.rol_id}`);
            
            // Verificar sus estudiantes
            const studentsQuery = `
                SELECT DISTINCT 
                    u_estudiante.nombres,
                    u_estudiante.apellidos,
                    u_estudiante.email,
                    p.titulo as proyecto_nombre,
                    p.estado
                FROM usuarios u_coord
                INNER JOIN proyecto_usuarios pu_coord ON u_coord.id = pu_coord.usuario_id 
                    AND pu_coord.rol = 'coordinador'
                INNER JOIN proyectos p ON pu_coord.proyecto_id = p.id
                INNER JOIN proyecto_usuarios pu_estudiante ON p.id = pu_estudiante.proyecto_id 
                    AND pu_estudiante.rol = 'estudiante'
                INNER JOIN usuarios u_estudiante ON pu_estudiante.usuario_id = u_estudiante.id
                WHERE u_coord.id = 41
                ORDER BY u_estudiante.nombres
            `;
            
            const [students] = await pool.execute(studentsQuery);
            
            if (students.length > 0) {
                console.log(`\n   👥 ESTUDIANTES ASIGNADOS (${students.length}):`);
                students.forEach((student, index) => {
                    console.log(`      ${index + 1}. ${student.nombres} ${student.apellidos}`);
                    console.log(`         📧 ${student.email}`);
                    console.log(`         📁 Proyecto: ${student.proyecto_nombre} (${student.estado})`);
                });
            } else {
                console.log(`\n   ❌ No tiene estudiantes asignados`);
            }
        } else {
            console.log('❌ Coordinador con ID 41 no encontrado');
        }
        
        // 3. Mostrar instrucciones claras
        console.log('\n📋 3. INSTRUCCIONES PARA ACCEDER:');
        console.log('='.repeat(60));
        
        if (coordinators.length > 0) {
            const bestCoord = coordinators[0];
            console.log('🎯 CREDENCIALES RECOMENDADAS:');
            console.log(`   📧 Email: ${bestCoord.email}`);
            console.log(`   🔐 Contraseña: 123456 (por defecto)`);
            console.log(`   👥 Estudiantes esperados: ${bestCoord.total_estudiantes}`);
            
            console.log('\n🔄 PASOS PARA PROBAR:');
            console.log('   1. Cierra completamente el navegador');
            console.log('   2. Abre una nueva ventana/pestaña');
            console.log('   3. Ve a: http://localhost:3000/auth/login');
            console.log(`   4. Usa el email: ${bestCoord.email}`);
            console.log('   5. Usa la contraseña: 123456');
            console.log('   6. Ve a "Mis Estudiantes"');
            console.log(`   7. Deberías ver ${bestCoord.total_estudiantes} estudiante(s)`);
        } else {
            console.log('❌ No hay coordinadores con estudiantes. Necesitamos crear una asignación.');
        }
        
        // 4. Verificar todos los coordinadores disponibles
        console.log('\n📋 4. TODOS LOS COORDINADORES DISPONIBLES:');
        const allCoordsQuery = `
            SELECT 
                u.id,
                u.nombres,
                u.apellidos,
                u.email,
                u.rol_id
            FROM usuarios u
            WHERE u.rol_id = 3
            ORDER BY u.id
        `;
        
        const [allCoords] = await pool.execute(allCoordsQuery);
        
        if (allCoords.length > 0) {
            console.log(`\n📊 Total coordinadores en el sistema: ${allCoords.length}`);
            allCoords.forEach((coord, index) => {
                console.log(`   ${index + 1}. ${coord.nombres} ${coord.apellidos} (ID: ${coord.id}) - ${coord.email}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        // No necesitamos cerrar el pool aquí ya que puede ser usado por otros procesos
        process.exit(0);
    }
}

checkCurrentSession();