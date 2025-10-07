const mysql = require('mysql2/promise');
require('dotenv').config();

async function assignDirectorsToProjects() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    try {
        console.log('=== ASIGNANDO DIRECTORES A PROYECTOS ===\n');

        // 1. Obtener proyectos sin director asignado
        console.log('1. Proyectos sin director asignado:');
        const [projectsWithoutDirector] = await connection.execute(`
            SELECT id, titulo, estado, director_id
            FROM proyectos
            WHERE director_id IS NULL
            ORDER BY id
        `);
        
        console.table(projectsWithoutDirector);

        // 2. Obtener directores disponibles
        console.log('\n2. Directores disponibles:');
        const [directors] = await connection.execute(`
            SELECT u.id, u.nombres, u.email
            FROM usuarios u
            JOIN roles r ON u.rol_id = r.id
            WHERE r.nombre = 'Director de Proyecto'
            ORDER BY u.id
        `);
        
        console.table(directors);

        if (projectsWithoutDirector.length > 0 && directors.length > 0) {
            console.log('\n3. Asignando directores a proyectos...');
            
            // Asignar el primer director disponible a todos los proyectos sin director
            // En un caso real, esto se haría de manera más específica
            const directorToAssign = directors[0]; // Usar el primer director (alain, ID: 3)
            
            for (const project of projectsWithoutDirector) {
                await connection.execute(`
                    UPDATE proyectos 
                    SET director_id = ? 
                    WHERE id = ?
                `, [directorToAssign.id, project.id]);
                
                console.log(`✓ Proyecto "${project.titulo}" (ID: ${project.id}) asignado a director "${directorToAssign.nombres}" (ID: ${directorToAssign.id})`);
            }

            // 4. Verificar los cambios
            console.log('\n4. Verificando proyectos después de la asignación:');
            const [updatedProjects] = await connection.execute(`
                SELECT p.id, p.titulo, p.estado, p.director_id, u.nombres as director_nombre
                FROM proyectos p
                LEFT JOIN usuarios u ON p.director_id = u.id
                ORDER BY p.id
            `);
            
            console.table(updatedProjects);

            // 5. Probar la consulta que usa DirectorController.projects
            console.log(`\n5. Probando consulta para director "${directorToAssign.nombres}" (ID: ${directorToAssign.id}):`);
            const [directorProjects] = await connection.execute(`
                SELECT p.id, p.titulo, p.estado, p.director_id
                FROM proyectos p
                WHERE p.director_id = ?
                ORDER BY p.id
            `, [directorToAssign.id]);
            
            console.table(directorProjects);
            console.log(`\n✓ El director ahora puede ver ${directorProjects.length} proyecto(s) en /director/projects`);
        } else {
            console.log('\n⚠️  No hay proyectos sin director o no hay directores disponibles');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

assignDirectorsToProjects();