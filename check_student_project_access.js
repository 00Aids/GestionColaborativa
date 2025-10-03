const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkStudentProjectAccess() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'gestion_academica'
    });

    try {
        console.log('Verificando acceso de estudiantes a proyectos...\n');

        // Obtener todos los estudiantes
        const [students] = await connection.execute(`
            SELECT 
                u.id,
                u.nombres,
                u.apellidos,
                u.email,
                r.nombre as rol
            FROM usuarios u
            INNER JOIN roles r ON u.rol_id = r.id
            WHERE r.nombre LIKE '%Estudiante%' AND u.activo = 1
            ORDER BY u.id
        `);

        console.log(`Total de estudiantes encontrados: ${students.length}\n`);

        for (const student of students) {
            console.log(`=== ESTUDIANTE: ${student.nombres} ${student.apellidos || ''} (${student.email}) ===`);
            
            // Verificar proyectos asignados directamente
            const [directProjects] = await connection.execute(`
                SELECT 
                    p.id,
                    p.titulo,
                    p.fecha_inicio,
                    p.fecha_fin,
                    p.estado,
                    p.estudiante_id
                FROM proyectos p
                WHERE p.estudiante_id = ?
            `, [student.id]);

            console.log(`Proyectos asignados directamente: ${directProjects.length}`);
            
            if (directProjects.length > 0) {
                directProjects.forEach(project => {
                    console.log(`  - Proyecto ID: ${project.id} - ${project.titulo}`);
                    console.log(`    Fecha Inicio: ${project.fecha_inicio || 'NO DEFINIDA'}`);
                    console.log(`    Fecha Fin: ${project.fecha_fin || 'NO DEFINIDA'}`);
                    console.log(`    Estado: ${project.estado}`);
                    
                    // Calcular días restantes
                    if (project.fecha_inicio && project.fecha_fin) {
                        const startDate = new Date(project.fecha_inicio);
                        const endDate = new Date(project.fecha_fin);
                        const today = new Date();
                        
                        const remainingTime = endDate - today;
                        const daysRemaining = Math.max(0, Math.ceil(remainingTime / (1000 * 60 * 60 * 24)));
                        
                        console.log(`    Días restantes: ${daysRemaining}`);
                    } else {
                        console.log(`    Días restantes: NO SE PUEDE CALCULAR`);
                    }
                    console.log('');
                });
            }

            // Verificar áreas del estudiante
            const [studentAreas] = await connection.execute(`
                SELECT 
                    uat.area_trabajo_id,
                    at.codigo,
                    at.nombre as area_nombre,
                    uat.es_admin,
                    uat.activo
                FROM usuario_areas_trabajo uat
                INNER JOIN areas_trabajo at ON uat.area_trabajo_id = at.id
                WHERE uat.usuario_id = ? AND uat.activo = 1
            `, [student.id]);

            console.log(`Áreas asignadas: ${studentAreas.length}`);
            if (studentAreas.length > 0) {
                studentAreas.forEach(area => {
                    console.log(`  - Área: ${area.codigo} - ${area.area_nombre} (Admin: ${area.es_admin ? 'Sí' : 'No'})`);
                });
            }

            // Verificar proyectos accesibles por área
            if (studentAreas.length > 0) {
                const areaIds = studentAreas.map(area => area.area_trabajo_id);
                const placeholders = areaIds.map(() => '?').join(',');
                
                const [areaProjects] = await connection.execute(`
                    SELECT 
                        p.id,
                        p.titulo,
                        p.fecha_inicio,
                        p.fecha_fin,
                        p.estado,
                        p.area_trabajo_id,
                        at.codigo as area_codigo,
                        at.nombre as area_nombre
                    FROM proyectos p
                    INNER JOIN areas_trabajo at ON p.area_trabajo_id = at.id
                    WHERE p.area_trabajo_id IN (${placeholders})
                `, areaIds);

                console.log(`Proyectos accesibles por área: ${areaProjects.length}`);
                if (areaProjects.length > 0) {
                    areaProjects.forEach(project => {
                        console.log(`  - Proyecto ID: ${project.id} - ${project.titulo} (Área: ${project.area_codigo})`);
                        console.log(`    Fecha Inicio: ${project.fecha_inicio || 'NO DEFINIDA'}`);
                        console.log(`    Fecha Fin: ${project.fecha_fin || 'NO DEFINIDA'}`);
                        
                        // Calcular días restantes
                        if (project.fecha_inicio && project.fecha_fin) {
                            const startDate = new Date(project.fecha_inicio);
                            const endDate = new Date(project.fecha_fin);
                            const today = new Date();
                            
                            const remainingTime = endDate - today;
                            const daysRemaining = Math.max(0, Math.ceil(remainingTime / (1000 * 60 * 60 * 24)));
                            
                            console.log(`    Días restantes: ${daysRemaining}`);
                        } else {
                            console.log(`    Días restantes: NO SE PUEDE CALCULAR`);
                        }
                        console.log('');
                    });
                }
            }

            console.log('-----------------------------------\n');
        }

        // Verificar específicamente el usuario que funciona
        console.log('=== VERIFICACIÓN ESPECÍFICA DEL USUARIO QUE FUNCIONA ===');
        const [workingUser] = await connection.execute(`
            SELECT 
                u.id,
                u.nombres,
                u.apellidos,
                u.email,
                r.nombre as rol
            FROM usuarios u
            INNER JOIN roles r ON u.rol_id = r.id
            WHERE u.email = 'nuevoestudiante@test.com'
        `);

        if (workingUser.length > 0) {
            const user = workingUser[0];
            console.log(`Usuario: ${user.nombres} ${user.apellidos || ''} (${user.email})`);
            
            // Sus proyectos
            const [userProjects] = await connection.execute(`
                SELECT 
                    p.id,
                    p.titulo,
                    p.fecha_inicio,
                    p.fecha_fin,
                    p.estado,
                    p.estudiante_id,
                    p.area_trabajo_id
                FROM proyectos p
                WHERE p.estudiante_id = ?
            `, [user.id]);

            console.log(`Proyectos del usuario que funciona: ${userProjects.length}`);
            userProjects.forEach(project => {
                console.log(`  - Proyecto: ${project.titulo}`);
                console.log(`    Fechas: ${project.fecha_inicio} - ${project.fecha_fin}`);
                console.log(`    Área ID: ${project.area_trabajo_id}`);
            });
        }

    } catch (error) {
        console.error('Error al verificar acceso de estudiantes:', error);
    } finally {
        await connection.end();
    }
}

checkStudentProjectAccess();