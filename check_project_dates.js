const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkProjectDates() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'gestion_academica'
    });

    try {
        console.log('Verificando fechas de proyectos...\n');

        // Obtener todos los proyectos con sus fechas
        const [projects] = await connection.execute(`
            SELECT 
                p.id,
                p.titulo,
                p.fecha_inicio,
                p.fecha_fin,
                p.estado,
                CONCAT(u.nombres, ' ', COALESCE(u.apellidos, '')) as estudiante_nombre,
                u.email as estudiante_email
            FROM proyectos p
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            ORDER BY p.id
        `);

        console.log(`Total de proyectos encontrados: ${projects.length}\n`);

        projects.forEach(project => {
            console.log(`Proyecto ID: ${project.id}`);
            console.log(`Título: ${project.titulo}`);
            console.log(`Estudiante: ${project.estudiante_nombre} (${project.estudiante_email})`);
            console.log(`Fecha Inicio: ${project.fecha_inicio || 'NO DEFINIDA'}`);
            console.log(`Fecha Fin: ${project.fecha_fin || 'NO DEFINIDA'}`);
            console.log(`Estado: ${project.estado}`);
            
            // Calcular días restantes si las fechas están definidas
            if (project.fecha_inicio && project.fecha_fin) {
                const startDate = new Date(project.fecha_inicio);
                const endDate = new Date(project.fecha_fin);
                const today = new Date();
                
                const remainingTime = endDate - today;
                const daysRemaining = Math.max(0, Math.ceil(remainingTime / (1000 * 60 * 60 * 24)));
                
                console.log(`Días restantes calculados: ${daysRemaining}`);
            } else {
                console.log(`Días restantes: NO SE PUEDE CALCULAR (fechas faltantes)`);
            }
            
            console.log('-----------------------------------\n');
        });

        // Verificar específicamente el proyecto del usuario que funciona
        const [workingProject] = await connection.execute(`
            SELECT 
                p.id,
                p.titulo,
                p.fecha_inicio,
                p.fecha_fin,
                p.estado,
                u.email as estudiante_email
            FROM proyectos p
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            WHERE u.email = 'nuevoestudiante@test.com'
        `);

        if (workingProject.length > 0) {
            console.log('PROYECTO QUE FUNCIONA CORRECTAMENTE:');
            console.log(JSON.stringify(workingProject[0], null, 2));
        }

    } catch (error) {
        console.error('Error al verificar fechas de proyectos:', error);
    } finally {
        await connection.end();
    }
}

checkProjectDates();