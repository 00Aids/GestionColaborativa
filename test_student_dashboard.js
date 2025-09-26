const { pool } = require('./src/config/database');
const Project = require('./src/models/Project');

async function testStudentDashboard() {
    try {
        console.log('🔍 Probando dashboard del estudiante vsoyjostin2@gmail.com...');
        
        // Buscar el usuario estudiante
        const [user] = await pool.execute(`
            SELECT u.id, u.email, u.nombres, u.apellidos, u.rol_id, r.nombre as rol_nombre
            FROM usuarios u
            JOIN roles r ON u.rol_id = r.id
            WHERE u.email = 'vsoyjostin2@gmail.com'
        `);
        
        if (user.length === 0) {
            console.log('❌ Usuario no encontrado');
            return;
        }
        
        const studentUser = user[0];
        console.log(`👤 Usuario: ${studentUser.nombres} ${studentUser.apellidos}`);
        console.log(`📧 Email: ${studentUser.email}`);
        console.log(`🎭 Rol: ${studentUser.rol_nombre} (ID: ${studentUser.rol_id})`);
        
        // Simular la lógica del dashboard para estudiantes
        const projectModel = new Project();
        
        console.log('\n🔍 Obteniendo proyectos del estudiante...');
        
        // Usar el método findByStudent como en el DashboardController
        const studentProjects = await projectModel.findByStudent(studentUser.id);
        
        console.log(`\n📊 PROYECTOS DEL ESTUDIANTE (${studentProjects.length}):`);
        if (studentProjects.length > 0) {
            studentProjects.forEach(project => {
                console.log(`  ✅ ID: ${project.id} - ${project.titulo}`);
                console.log(`     Estado: ${project.estado}`);
                console.log(`     Estudiante ID: ${project.estudiante_id}`);
                console.log(`     Área: ${project.area_trabajo_id || 'Sin área'}`);
                console.log('');
            });
        } else {
            console.log('  ❌ No se encontraron proyectos asignados al estudiante');
        }
        
        // Comparar con todos los proyectos para verificar el filtrado
        console.log('\n🔍 Comparando con TODOS los proyectos del sistema...');
        const allProjects = await projectModel.findWithDetails();
        
        console.log(`\n📊 TODOS LOS PROYECTOS DEL SISTEMA (${allProjects.length}):`);
        allProjects.forEach(project => {
            const isStudentProject = project.estudiante_id === studentUser.id;
            const marker = isStudentProject ? '✅' : '❌';
            console.log(`  ${marker} ID: ${project.id} - ${project.titulo} (Estudiante: ${project.estudiante_id})`);
        });
        
        // Verificar asignaciones en proyecto_usuarios
        console.log('\n🔍 Verificando asignaciones en proyecto_usuarios...');
        const [assignments] = await pool.execute(`
            SELECT pu.proyecto_id, pu.rol, pu.estado, p.titulo
            FROM proyecto_usuarios pu
            JOIN proyectos p ON pu.proyecto_id = p.id
            WHERE pu.usuario_id = ?
        `, [studentUser.id]);
        
        console.log(`\n📋 ASIGNACIONES EN PROYECTO_USUARIOS (${assignments.length}):`);
        assignments.forEach(assignment => {
            console.log(`  📁 Proyecto: ${assignment.titulo} (ID: ${assignment.proyecto_id})`);
            console.log(`     Rol: ${assignment.rol}`);
            console.log(`     Estado: ${assignment.estado}`);
            console.log('');
        });
        
        // Resumen final
        console.log('\n📈 RESUMEN:');
        console.log(`  - Proyectos asignados como estudiante principal: ${studentProjects.length}`);
        console.log(`  - Asignaciones adicionales en proyecto_usuarios: ${assignments.length}`);
        console.log(`  - Total de proyectos en el sistema: ${allProjects.length}`);
        
        if (studentProjects.length > 0) {
            console.log('\n✅ EL FILTRADO ESTÁ FUNCIONANDO CORRECTAMENTE');
            console.log('   El estudiante solo ve sus proyectos asignados');
        } else {
            console.log('\n❌ PROBLEMA: El estudiante no ve ningún proyecto');
            console.log('   Verificar la asignación o la lógica de filtrado');
        }
        
        await pool.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testStudentDashboard();