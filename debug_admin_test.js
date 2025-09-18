const mysql = require('mysql2/promise');
require('dotenv').config();

async function debugAdminTest() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'sistema_gestion_academica'
    });

    try {
        console.log('🔍 Investigando usuario admin@test.com...\n');

        // 1. Verificar datos del usuario
        console.log('1️⃣ Datos del usuario:');
        const [userRows] = await connection.execute(`
            SELECT u.id, u.nombres, u.apellidos, u.email, u.area_trabajo_id, r.nombre as rol_nombre,
                   at.id as area_id, at.codigo as area_codigo
            FROM usuarios u 
            LEFT JOIN roles r ON u.rol_id = r.id
            LEFT JOIN areas_trabajo at ON u.area_trabajo_id = at.id
            WHERE u.email = ?
        `, ['admin@test.com']);

        if (userRows.length === 0) {
            console.log('❌ Usuario admin@test.com no encontrado');
            return;
        }

        const user = userRows[0];
        console.log(`   👤 Usuario: ${user.nombres} ${user.apellidos} (${user.email})`);
        console.log(`   🎭 Rol: ${user.rol_nombre}`);
        console.log(`   🏢 Área ID: ${user.area_trabajo_id}`);
        console.log(`   📍 Área Código: ${user.area_codigo || 'No asignada'}\n`);

        // 2. Verificar proyectos en su área
        console.log('2️⃣ Proyectos en su área de trabajo:');
        if (user.area_trabajo_id) {
            const [projectRows] = await connection.execute(`
                SELECT p.id, p.titulo, p.estado, p.area_trabajo_id,
                       at.codigo as area_codigo
                FROM proyectos p
                LEFT JOIN areas_trabajo at ON p.area_trabajo_id = at.id
                WHERE p.area_trabajo_id = ?
            `, [user.area_trabajo_id]);

            console.log(`   📊 Total proyectos en área ${user.area_codigo}: ${projectRows.length}`);
            projectRows.forEach(project => {
                console.log(`   📋 ${project.titulo} (Estado: ${project.estado})`);
            });
        } else {
            console.log('   ⚠️  Usuario no tiene área asignada');
        }

        // 3. Verificar todos los proyectos (para comparar)
        console.log('\n3️⃣ Todos los proyectos en el sistema:');
        const [allProjects] = await connection.execute(`
            SELECT p.id, p.titulo, p.estado, p.area_trabajo_id,
                   at.codigo as area_codigo
            FROM proyectos p
            LEFT JOIN areas_trabajo at ON p.area_trabajo_id = at.id
            ORDER BY p.area_trabajo_id
        `);

        console.log(`   📊 Total proyectos en sistema: ${allProjects.length}`);
        const projectsByArea = {};
        allProjects.forEach(project => {
            const areaKey = project.area_codigo || 'Sin área';
            if (!projectsByArea[areaKey]) {
                projectsByArea[areaKey] = [];
            }
            projectsByArea[areaKey].push(project);
        });

        Object.keys(projectsByArea).forEach(area => {
            console.log(`   🏢 Área ${area}: ${projectsByArea[area].length} proyectos`);
            projectsByArea[area].forEach(p => {
                console.log(`      - ${p.titulo} (Estado: ${p.estado})`);
            });
        });

        // 4. Verificar estadísticas que debería ver
        console.log('\n4️⃣ Estadísticas que debería ver el usuario:');
        if (user.area_trabajo_id) {
            // Proyectos por estado
            const [statsRows] = await connection.execute(`
                SELECT estado, COUNT(*) as total
                FROM proyectos 
                WHERE area_trabajo_id = ?
                GROUP BY estado
            `, [user.area_trabajo_id]);

            console.log('   📈 Proyectos por estado:');
            statsRows.forEach(stat => {
                console.log(`      ${stat.estado}: ${stat.total}`);
            });

            // Entregables
            const [deliverableRows] = await connection.execute(`
                SELECT COUNT(*) as total
                FROM entregables e
                JOIN proyectos p ON e.proyecto_id = p.id
                WHERE p.area_trabajo_id = ?
            `, [user.area_trabajo_id]);

            console.log(`   📦 Total entregables: ${deliverableRows[0].total}`);

            // Evaluaciones
            const [evaluationRows] = await connection.execute(`
                SELECT COUNT(*) as total
                FROM evaluaciones ev
                JOIN proyectos p ON ev.proyecto_id = p.id
                WHERE p.area_trabajo_id = ? AND ev.estado = 'pendiente'
            `, [user.area_trabajo_id]);

            console.log(`   📝 Evaluaciones pendientes: ${evaluationRows[0].total}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

debugAdminTest();