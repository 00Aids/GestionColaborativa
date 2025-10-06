const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkNuevoEstudiante2() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('=== VERIFICANDO USUARIO nuevoestudiante2@test.com ===\n');

        // 1. Verificar información del usuario
        const [userInfo] = await connection.execute(`
            SELECT u.id, u.nombres, u.apellidos, u.email, u.area_trabajo_id, r.nombre as rol
            FROM usuarios u
            LEFT JOIN roles r ON u.rol_id = r.id
            WHERE u.email = ?
        `, ['nuevoestudiante2@test.com']);

        if (userInfo.length === 0) {
            console.log('❌ Usuario no encontrado con email: nuevoestudiante2@test.com');
            return;
        }

        const user = userInfo[0];
        console.log('👤 Información del usuario:');
        console.log(`   ID: ${user.id}`);
        console.log(`   Nombre: ${user.nombres} ${user.apellidos}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Área de trabajo ID: ${user.area_trabajo_id}`);
        console.log(`   Rol: ${user.rol}\n`);

        // 2. Verificar proyectos asignados como estudiante principal
        const [projectsAsMain] = await connection.execute(`
            SELECT p.id, p.titulo, p.descripcion, p.estudiante_id
            FROM proyectos p
            WHERE p.estudiante_id = ?
        `, [user.id]);

        console.log('📋 Proyectos donde es estudiante principal:');
        if (projectsAsMain.length === 0) {
            console.log('   ❌ No hay proyectos asignados como estudiante principal\n');
        } else {
            projectsAsMain.forEach(project => {
                console.log(`   - ID: ${project.id}, Título: ${project.titulo}`);
            });
            console.log('');
        }

        // 3. Verificar proyectos en proyecto_usuarios
        const [projectsAsUser] = await connection.execute(`
            SELECT p.id, p.titulo, p.descripcion, pu.rol
            FROM proyectos p
            INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            WHERE pu.usuario_id = ?
        `, [user.id]);

        console.log('📋 Proyectos en tabla proyecto_usuarios:');
        if (projectsAsUser.length === 0) {
            console.log('   ❌ No hay proyectos en proyecto_usuarios\n');
        } else {
            projectsAsUser.forEach(project => {
                console.log(`   - ID: ${project.id}, Título: ${project.titulo}, Rol: ${project.rol}`);
            });
            console.log('');
        }

        // 4. Verificar entregables usando el método findByStudent
        const [deliverables] = await connection.execute(`
            SELECT 
                e.id,
                e.titulo,
                e.descripcion,
                e.fecha_limite,
                e.estado,
                p.titulo as proyecto_titulo,
                p.id as proyecto_id,
                p.estudiante_id
            FROM entregables e
            INNER JOIN proyectos p ON e.proyecto_id = p.id
            INNER JOIN fases_proyecto fp ON e.fase_id = fp.id
            INNER JOIN areas_trabajo at ON fp.area_trabajo_id = at.id
            WHERE p.estudiante_id = ?
            ORDER BY e.fecha_limite ASC
        `, [user.id]);

        console.log('📦 Entregables encontrados con findByStudent:');
        if (deliverables.length === 0) {
            console.log('   ❌ No se encontraron entregables para este estudiante\n');
        } else {
            deliverables.forEach(deliverable => {
                console.log(`   - ID: ${deliverable.id}`);
                console.log(`     Título: ${deliverable.titulo}`);
                console.log(`     Proyecto: ${deliverable.proyecto_titulo} (ID: ${deliverable.proyecto_id})`);
                console.log(`     Estado: ${deliverable.estado}`);
                console.log(`     Fecha límite: ${deliverable.fecha_limite}`);
                console.log('');
            });
        }

        // 5. Verificar todos los entregables disponibles
        const [allDeliverables] = await connection.execute(`
            SELECT 
                e.id,
                e.titulo,
                e.proyecto_id,
                p.titulo as proyecto_titulo,
                p.estudiante_id,
                u.nombres as estudiante_nombres,
                u.apellidos as estudiante_apellidos,
                u.email as estudiante_email
            FROM entregables e
            INNER JOIN proyectos p ON e.proyecto_id = p.id
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            ORDER BY e.id DESC
            LIMIT 10
        `);

        console.log('📦 Últimos 10 entregables en el sistema:');
        allDeliverables.forEach(deliverable => {
            console.log(`   - ID: ${deliverable.id}, Título: ${deliverable.titulo}`);
            console.log(`     Proyecto: ${deliverable.proyecto_titulo} (ID: ${deliverable.proyecto_id})`);
            const estudianteNombre = deliverable.estudiante_nombres && deliverable.estudiante_apellidos 
                ? `${deliverable.estudiante_nombres} ${deliverable.estudiante_apellidos}` 
                : 'Sin asignar';
            console.log(`     Estudiante asignado: ${estudianteNombre} (${deliverable.estudiante_email || 'N/A'})`);
            console.log('');
        });

        // 6. Verificar si hay proyectos sin estudiante asignado
        const [unassignedProjects] = await connection.execute(`
            SELECT p.id, p.titulo, p.descripcion
            FROM proyectos p
            WHERE p.estudiante_id IS NULL
            AND EXISTS (SELECT 1 FROM entregables e WHERE e.proyecto_id = p.id)
        `);

        console.log('🔍 Proyectos con entregables pero sin estudiante asignado:');
        if (unassignedProjects.length === 0) {
            console.log('   ✅ Todos los proyectos con entregables tienen estudiante asignado\n');
        } else {
            unassignedProjects.forEach(project => {
                console.log(`   - ID: ${project.id}, Título: ${project.titulo}`);
            });
            console.log('');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkNuevoEstudiante2();