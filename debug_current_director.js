const mysql = require('mysql2/promise');
require('dotenv').config();

async function debugCurrentDirector() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    try {
        console.log('=== VERIFICANDO DIRECTORES Y SUS PROYECTOS ===\n');

        // 1. Obtener todos los usuarios con rol de Director de Proyecto
        console.log('1. Usuarios con rol "Director de Proyecto":');
        const [directors] = await connection.execute(`
            SELECT u.id, u.nombres, u.email, r.nombre as rol
            FROM usuarios u
            JOIN roles r ON u.rol_id = r.id
            WHERE r.nombre = 'Director de Proyecto'
            ORDER BY u.id
        `);
        
        console.table(directors);

        // 2. Obtener todos los proyectos y sus directores asignados
        console.log('\n2. Proyectos y sus directores asignados:');
        const [projects] = await connection.execute(`
            SELECT p.id, p.titulo, p.director_id, u.nombres as director_nombre
            FROM proyectos p
            LEFT JOIN usuarios u ON p.director_id = u.id
            ORDER BY p.id
        `);
        
        console.table(projects);

        // 3. Para cada director, verificar qué proyectos dirige directamente
        console.log('\n3. Proyectos por director (director_id directo):');
        for (const director of directors) {
            const [directorProjects] = await connection.execute(`
                SELECT p.id, p.titulo, p.estado, p.director_id
                FROM proyectos p
                WHERE p.director_id = ?
                ORDER BY p.id
            `, [director.id]);

            console.log(`\nDirector: ${director.nombres} (ID: ${director.id})`);
            if (directorProjects.length > 0) {
                console.table(directorProjects);
            } else {
                console.log('  - No tiene proyectos asignados como director directo');
            }
        }

        // 4. Verificar si hay proyectos sin director asignado
        console.log('\n4. Proyectos sin director asignado:');
        const [orphanProjects] = await connection.execute(`
            SELECT id, titulo, estado, director_id
            FROM proyectos
            WHERE director_id IS NULL
            ORDER BY id
        `);
        
        if (orphanProjects.length > 0) {
            console.table(orphanProjects);
        } else {
            console.log('  - Todos los proyectos tienen director asignado');
        }

        // 5. Simular la consulta que hace findByDirector para cada director
        console.log('\n5. Simulando consulta findByDirector para cada director:');
        for (const director of directors) {
            console.log(`\nDirector: ${director.nombres} (ID: ${director.id})`);
            
            // Esta es la consulta que hace findByDirector
            const [findByDirectorResult] = await connection.execute(`
                SELECT DISTINCT p.*, u.nombres as director_nombre
                FROM proyectos p
                LEFT JOIN usuarios u ON p.director_id = u.id
                WHERE p.director_id = ? 
                   OR EXISTS (
                       SELECT 1 FROM proyecto_usuarios pu 
                       WHERE pu.proyecto_id = p.id 
                       AND pu.usuario_id = ? 
                       AND pu.rol = 'coordinador'
                   )
                ORDER BY p.fecha_creacion DESC
            `, [director.id, director.id]);

            if (findByDirectorResult.length > 0) {
                console.table(findByDirectorResult);
            } else {
                console.log('  - findByDirector no retorna proyectos para este director');
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

debugCurrentDirector();