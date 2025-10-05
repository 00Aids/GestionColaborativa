const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkProjectMembers() {
    let connection;
    
    try {
        // Conectar a la base de datos
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'gestion_colaborativa'
        });

        console.log('✅ Conectado a la base de datos');

        // Buscar el proyecto "proyecto1"
        const [projects] = await connection.execute(
            'SELECT id, titulo, descripcion FROM proyectos WHERE titulo = ?',
            ['proyecto1']
        );

        if (projects.length === 0) {
            console.log('❌ No se encontró el proyecto "proyecto1"');
            return;
        }

        const project = projects[0];
        console.log(`\n📋 Proyecto encontrado:`);
        console.log(`   ID: ${project.id}`);
        console.log(`   Título: ${project.titulo}`);
        console.log(`   Descripción: ${project.descripcion}`);

        // Obtener todos los usuarios vinculados al proyecto
        const [members] = await connection.execute(`
            SELECT 
                u.id as usuario_id,
                u.codigo_usuario,
                u.nombres,
                u.apellidos,
                u.email,
                pu.rol,
                pu.estado,
                pu.fecha_asignacion,
                r.nombre as rol_sistema
            FROM proyecto_usuarios pu
            JOIN usuarios u ON pu.usuario_id = u.id
            LEFT JOIN roles r ON u.rol_id = r.id
            WHERE pu.proyecto_id = ?
            ORDER BY pu.fecha_asignacion DESC
        `, [project.id]);

        console.log(`\n👥 Usuarios vinculados al proyecto "${project.titulo}" (Total: ${members.length}):`);
        console.log('=' .repeat(80));

        if (members.length === 0) {
            console.log('   No hay usuarios vinculados a este proyecto');
        } else {
            members.forEach((member, index) => {
                console.log(`\n${index + 1}. Usuario ID: ${member.usuario_id}`);
                console.log(`   Código: ${member.codigo_usuario}`);
                console.log(`   Nombre: ${member.nombres} ${member.apellidos}`);
                console.log(`   Email: ${member.email}`);
                console.log(`   Rol en proyecto: ${member.rol}`);
                console.log(`   Estado: ${member.estado}`);
                console.log(`   Rol del sistema: ${member.rol_sistema}`);
                console.log(`   Fecha asignación: ${member.fecha_asignacion}`);
            });
        }

        // Mostrar estadísticas
        const activeMembers = members.filter(m => m.estado === 'activo');
        const inactiveMembers = members.filter(m => m.estado === 'inactivo');

        console.log(`\n📊 Estadísticas:`);
        console.log(`   Miembros activos: ${activeMembers.length}`);
        console.log(`   Miembros inactivos: ${inactiveMembers.length}`);
        console.log(`   Total: ${members.length}`);

        // Verificar específicamente el usuario ID 21
        const user21 = members.find(m => m.usuario_id === 21);
        if (user21) {
            console.log(`\n🔍 Usuario ID 21 encontrado:`);
            console.log(`   Nombre: ${user21.nombres} ${user21.apellidos}`);
            console.log(`   Estado: ${user21.estado}`);
            console.log(`   Rol: ${user21.rol}`);
        } else {
            console.log(`\n❌ Usuario ID 21 NO está vinculado a este proyecto`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n✅ Conexión cerrada');
        }
    }
}

checkProjectMembers();