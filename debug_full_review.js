const mysql = require('mysql2/promise');
require('dotenv').config();

async function debugFullReview() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'gestion_academica'
    });

    try {
        console.log('=== REVISIÓN COMPLETA DEL SISTEMA ===\n');

        // 1. Verificar proyectos en la base de datos
        console.log('1. PROYECTOS EN LA BASE DE DATOS:');
        const [projects] = await connection.execute(`
            SELECT 
                p.id, 
                p.titulo, 
                p.director_id,
                CONCAT(d.nombres, ' ', d.apellidos) as director_nombre,
                p.estado,
                p.activo
            FROM proyectos p
            LEFT JOIN usuarios d ON p.director_id = d.id
            ORDER BY p.id
        `);
        
        console.log(`Total de proyectos: ${projects.length}`);
        projects.forEach(project => {
            console.log(`  - ID: ${project.id}, Título: ${project.titulo}, Director: ${project.director_nombre || 'SIN ASIGNAR'}, Estado: ${project.estado}, Activo: ${project.activo}`);
        });

        // 2. Verificar directores
        console.log('\n2. DIRECTORES EN EL SISTEMA:');
        const [directors] = await connection.execute(`
            SELECT 
                u.id, 
                CONCAT(u.nombres, ' ', u.apellidos) as nombre_completo,
                u.email,
                u.activo
            FROM usuarios u
            INNER JOIN roles r ON u.rol_id = r.id
            WHERE r.nombre = 'director' AND u.activo = 1
            ORDER BY u.id
        `);
        
        console.log(`Total de directores activos: ${directors.length}`);
        directors.forEach(director => {
            console.log(`  - ID: ${director.id}, Nombre: ${director.nombre_completo}, Email: ${director.email}`);
        });

        // 3. Verificar proyectos por director
        console.log('\n3. PROYECTOS POR DIRECTOR:');
        for (const director of directors) {
            const [directorProjects] = await connection.execute(`
                SELECT 
                    p.id, 
                    p.titulo, 
                    p.estado,
                    p.activo
                FROM proyectos p
                WHERE p.director_id = ? AND p.activo = 1
                ORDER BY p.id
            `, [director.id]);
            
            console.log(`  Director ${director.nombre_completo} (ID: ${director.id}): ${directorProjects.length} proyectos`);
            directorProjects.forEach(project => {
                console.log(`    - ${project.titulo} (Estado: ${project.estado})`);
            });
        }

        // 4. Simular la consulta del DirectorController
        console.log('\n4. SIMULACIÓN DE CONSULTA DirectorController.projects():');
        
        // Probar con cada director
        for (const director of directors) {
            console.log(`\n  Probando con director: ${director.nombre_completo} (ID: ${director.id})`);
            
            const [controllerResults] = await connection.execute(`
                SELECT 
                    p.id,
                    p.titulo,
                    p.descripcion,
                    p.fecha_inicio,
                    p.fecha_fin,
                    p.estado,
                    p.presupuesto,
                    p.activo,
                    CONCAT(d.nombres, ' ', d.apellidos) as director_nombre
                FROM proyectos p
                LEFT JOIN usuarios d ON p.director_id = d.id
                WHERE p.director_id = ? AND p.activo = 1
                ORDER BY p.id DESC
            `, [director.id]);
            
            console.log(`    Resultados encontrados: ${controllerResults.length}`);
            controllerResults.forEach(project => {
                console.log(`      - ${project.titulo} (ID: ${project.id}, Estado: ${project.estado})`);
            });
        }

        // 5. Verificar estructura de la tabla proyectos
        console.log('\n5. ESTRUCTURA DE LA TABLA PROYECTOS:');
        const [tableStructure] = await connection.execute('DESCRIBE proyectos');
        tableStructure.forEach(column => {
            console.log(`  - ${column.Field}: ${column.Type} (${column.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
        });

        // 6. Verificar si hay problemas con fechas o campos específicos
        console.log('\n6. VERIFICACIÓN DE CAMPOS PROBLEMÁTICOS:');
        const [fieldCheck] = await connection.execute(`
            SELECT 
                COUNT(*) as total,
                COUNT(director_id) as con_director,
                COUNT(fecha_inicio) as con_fecha_inicio,
                COUNT(fecha_fin) as con_fecha_fin,
                SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activos
            FROM proyectos
        `);
        
        console.log(`  Total proyectos: ${fieldCheck[0].total}`);
        console.log(`  Con director asignado: ${fieldCheck[0].con_director}`);
        console.log(`  Con fecha inicio: ${fieldCheck[0].con_fecha_inicio}`);
        console.log(`  Con fecha fin: ${fieldCheck[0].con_fecha_fin}`);
        console.log(`  Proyectos activos: ${fieldCheck[0].activos}`);

    } catch (error) {
        console.error('Error en la revisión:', error);
    } finally {
        await connection.end();
    }
}

debugFullReview();