const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDirectorLogin() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'gestion_academica'
    });

    try {
        console.log('=== PRUEBA DE LOGIN DE DIRECTOR ===\n');

        // 1. Buscar directores disponibles
        console.log('1. DIRECTORES DISPONIBLES:');
        const [directors] = await connection.execute(`
            SELECT 
                u.id, 
                u.nombres, 
                u.apellidos, 
                u.email,
                r.nombre as rol,
                u.activo
            FROM usuarios u
            INNER JOIN roles r ON u.rol_id = r.id
            WHERE r.nombre = 'Director de Proyecto' AND u.activo = 1
            ORDER BY u.id
        `);
        
        console.log(`Total de directores: ${directors.length}`);
        directors.forEach(director => {
            console.log(`  - ID: ${director.id}, Nombre: ${director.nombres} ${director.apellidos}, Email: ${director.email}`);
        });

        if (directors.length === 0) {
            console.log('\n❌ No hay directores disponibles en el sistema');
            return;
        }

        // 2. Seleccionar el primer director para la prueba
        const testDirector = directors[0];
        console.log(`\n2. PROBANDO CON DIRECTOR: ${testDirector.nombres} ${testDirector.apellidos} (ID: ${testDirector.id})`);

        // 3. Verificar proyectos asignados a este director
        console.log('\n3. PROYECTOS ASIGNADOS AL DIRECTOR:');
        const [directorProjects] = await connection.execute(`
            SELECT 
                p.id,
                p.titulo,
                p.descripcion,
                p.estado,
                p.activo,
                CONCAT(e.nombres, ' ', e.apellidos) as estudiante_nombre
            FROM proyectos p
            LEFT JOIN usuarios e ON p.estudiante_id = e.id
            WHERE p.director_id = ? AND p.activo = 1
            ORDER BY p.created_at DESC
        `, [testDirector.id]);

        console.log(`Proyectos encontrados: ${directorProjects.length}`);
        directorProjects.forEach(project => {
            console.log(`  - ID: ${project.id}, Título: ${project.titulo}, Estado: ${project.estado}, Estudiante: ${project.estudiante_nombre || 'Sin asignar'}`);
        });

        // 4. Simular la consulta exacta del DirectorController
        console.log('\n4. SIMULACIÓN EXACTA DEL DirectorController.projects():');
        const [controllerQuery] = await connection.execute(`
            SELECT DISTINCT
              p.*,
              CONCAT(u.nombres, ' ', u.apellidos) as estudiante_nombre,
              u.nombres as estudiante_nombres,
              u.apellidos as estudiante_apellidos,
              u.email as estudiante_email,
              CONCAT(d.nombres, ' ', d.apellidos) as director_nombre,
              d.nombres as director_nombres,
              d.apellidos as director_apellidos
            FROM proyectos p
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            LEFT JOIN usuarios d ON p.director_id = d.id
            WHERE p.director_id = ?
            ORDER BY p.created_at DESC
        `, [testDirector.id]);

        console.log(`Resultados de la consulta del controlador: ${controllerQuery.length}`);
        controllerQuery.forEach(project => {
            console.log(`  - ID: ${project.id}, Título: ${project.titulo}, Estado: ${project.estado}`);
            console.log(`    Director: ${project.director_nombre}`);
            console.log(`    Estudiante: ${project.estudiante_nombre || 'Sin asignar'}`);
            console.log(`    Activo: ${project.activo}`);
            console.log('    ---');
        });

        // 5. Verificar estadísticas
        console.log('\n5. ESTADÍSTICAS DE PROYECTOS:');
        const stats = {
            total: controllerQuery.length,
            activos: controllerQuery.filter(p => ['en_desarrollo', 'en_revision'].includes(p.estado)).length,
            finalizados: controllerQuery.filter(p => p.estado === 'finalizado').length,
            pendientes: controllerQuery.filter(p => p.estado === 'borrador').length
        };

        console.log(`  Total: ${stats.total}`);
        console.log(`  Activos: ${stats.activos}`);
        console.log(`  Finalizados: ${stats.finalizados}`);
        console.log(`  Pendientes: ${stats.pendientes}`);

        // 6. Verificar si hay problemas con campos específicos
        console.log('\n6. VERIFICACIÓN DE CAMPOS PROBLEMÁTICOS:');
        for (const project of controllerQuery) {
            console.log(`Proyecto ${project.id}:`);
            console.log(`  - titulo: ${project.titulo ? '✓' : '❌'}`);
            console.log(`  - estado: ${project.estado ? '✓' : '❌'}`);
            console.log(`  - activo: ${project.activo !== null ? '✓' : '❌'}`);
            console.log(`  - director_id: ${project.director_id ? '✓' : '❌'}`);
            console.log(`  - created_at: ${project.created_at ? '✓' : '❌'}`);
        }

        // 7. Conclusión
        console.log('\n7. CONCLUSIÓN:');
        if (controllerQuery.length > 0) {
            console.log('✅ El director tiene proyectos asignados y la consulta funciona correctamente');
            console.log('✅ Los datos están disponibles para mostrar en la vista');
        } else {
            console.log('❌ El director no tiene proyectos asignados o hay un problema con la consulta');
        }

    } catch (error) {
        console.error('Error en la prueba:', error);
    } finally {
        await connection.end();
    }
}

testDirectorLogin();