const { pool } = require('./src/config/database');

async function checkAnanim() {
    console.log('🔍 VERIFICANDO COORDINADOR ANANIM\n');
    console.log('='.repeat(60));
    
    try {
        // 1. Verificar información de ananim
        console.log('\n📋 1. INFORMACIÓN DEL COORDINADOR ANANIM:');
        const [ananim] = await pool.execute(`
            SELECT 
                u.id,
                u.nombres,
                u.apellidos,
                u.email,
                u.rol_id,
                r.nombre as rol_nombre
            FROM usuarios u
            LEFT JOIN roles r ON u.rol_id = r.id
            WHERE u.email = 'ananim@gmail.com'
        `);
        
        if (ananim.length > 0) {
            const user = ananim[0];
            console.log(`✅ Usuario encontrado:`);
            console.log(`   Nombre: ${user.nombres} ${user.apellidos}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   ID: ${user.id}`);
            console.log(`   Rol ID: ${user.rol_id}`);
            console.log(`   Rol: ${user.rol_nombre || 'No definido'}`);
            
            // 2. Verificar si tiene proyectos asignados como coordinador
            console.log('\n📋 2. PROYECTOS ASIGNADOS COMO COORDINADOR:');
            const [projects] = await pool.execute(`
                SELECT 
                    p.id,
                    p.titulo,
                    p.estado,
                    pu.rol
                FROM proyecto_usuarios pu
                INNER JOIN proyectos p ON pu.proyecto_id = p.id
                WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
            `, [user.id]);
            
            if (projects.length > 0) {
                console.log(`✅ Proyectos como coordinador: ${projects.length}`);
                projects.forEach((project, index) => {
                    console.log(`   ${index + 1}. ${project.titulo} (${project.estado})`);
                });
                
                // 3. Verificar estudiantes en esos proyectos
                console.log('\n📋 3. ESTUDIANTES EN SUS PROYECTOS:');
                const [students] = await pool.execute(`
                    SELECT DISTINCT 
                        u_estudiante.nombres,
                        u_estudiante.apellidos,
                        u_estudiante.email,
                        p.titulo as proyecto_titulo
                    FROM proyecto_usuarios pu_coord
                    INNER JOIN proyectos p ON pu_coord.proyecto_id = p.id
                    INNER JOIN proyecto_usuarios pu_estudiante ON p.id = pu_estudiante.proyecto_id 
                        AND pu_estudiante.rol = 'estudiante'
                    INNER JOIN usuarios u_estudiante ON pu_estudiante.usuario_id = u_estudiante.id
                    WHERE pu_coord.usuario_id = ? AND pu_coord.rol = 'coordinador'
                `, [user.id]);
                
                if (students.length > 0) {
                    console.log(`✅ Estudiantes encontrados: ${students.length}`);
                    students.forEach((student, index) => {
                        console.log(`   ${index + 1}. ${student.nombres} ${student.apellidos}`);
                        console.log(`      📧 ${student.email}`);
                        console.log(`      📁 Proyecto: ${student.proyecto_titulo}`);
                    });
                } else {
                    console.log(`❌ No tiene estudiantes asignados`);
                }
            } else {
                console.log(`❌ No tiene proyectos asignados como coordinador`);
            }
            
        } else {
            console.log('❌ Usuario ananim@gmail.com no encontrado');
        }
        
        // 4. Mostrar instrucciones para cambiar de usuario
        console.log('\n📋 4. INSTRUCCIONES PARA CAMBIAR DE USUARIO:');
        console.log('='.repeat(60));
        console.log('🔄 PARA VER LOS ESTUDIANTES, NECESITAS CAMBIAR DE USUARIO:');
        console.log('');
        console.log('   1. 🚪 Cierra sesión (Logout) en el sistema');
        console.log('   2. 🔐 Inicia sesión con estas credenciales:');
        console.log('      📧 Email: coordinador1@test.com');
        console.log('      🔑 Contraseña: 123456');
        console.log('   3. 👥 Ve a "Mis Estudiantes"');
        console.log('   4. ✅ Ahora verás 1 estudiante asignado');
        console.log('');
        console.log('🎯 RAZÓN: El coordinador ananim@gmail.com no tiene estudiantes asignados.');
        console.log('   Solo coordinador1@test.com tiene el estudiante "Jostin Correa".');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

checkAnanim();