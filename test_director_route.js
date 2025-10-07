require('dotenv').config();
const mysql = require('mysql2/promise');
const express = require('express');
const session = require('express-session');

// Configuración de base de datos
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'gestion_colaborativa'
};

async function testDirectorRoute() {
    let connection;
    
    try {
        console.log('🔍 TESTING DIRECTOR ROUTE - Simulando la ruta /director/projects');
        console.log('=====================================\n');
        
        // Conectar a la base de datos
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conexión a base de datos establecida\n');
        
        // 1. Encontrar un director disponible
        console.log('1. BUSCANDO DIRECTORES DISPONIBLES:');
        const [directors] = await connection.execute(`
            SELECT u.id, u.nombres, u.apellidos, r.nombre as rol
            FROM usuarios u
            JOIN roles r ON u.rol_id = r.id
            WHERE r.nombre = 'Director de Proyecto' AND u.activo = 1
            LIMIT 5
        `);
        
        console.log(`   Directores encontrados: ${directors.length}`);
        directors.forEach(dir => {
            console.log(`   - ID: ${dir.id}, Nombre: ${dir.nombres} ${dir.apellidos}, Rol: ${dir.rol}`);
        });
        
        if (directors.length === 0) {
            console.log('❌ No hay directores disponibles');
            return;
        }
        
        // Usar el primer director
        const director = directors[0];
        console.log(`\n   📋 Usando director: ${director.nombres} ${director.apellidos} (ID: ${director.id})\n`);
        
        // 2. Simular la consulta del DirectorController.projects()
        console.log('2. SIMULANDO DirectorController.projects():');
        
        // Parámetros de la consulta (simulando req.query)
        const queryParams = {
            page: 1,
            limit: 10,
            search: '',
            estado: ''
        };
        
        console.log(`   Parámetros: page=${queryParams.page}, limit=${queryParams.limit}, search='${queryParams.search}', estado='${queryParams.estado}'`);
        
        // Construir la consulta SQL (copiada del DirectorController)
        let sql = `
            SELECT 
                p.id,
                p.titulo,
                p.descripcion,
                p.estado,
                p.fecha_inicio,
                p.fecha_fin,
                p.activo,
                p.created_at,
                CONCAT(e.nombres, ' ', e.apellidos) as estudiante_nombres,
                e.apellidos as estudiante_apellidos,
                CONCAT(d.nombres, ' ', d.apellidos) as director_nombre,
                rl.nombre as linea_investigacion,
                ca.nombre as ciclo_academico,
                (SELECT COUNT(*) FROM entregables WHERE proyecto_id = p.id) as total_entregables,
                (SELECT COUNT(*) FROM entregables WHERE proyecto_id = p.id AND estado = 'completado') as entregables_completados,
                CASE 
                    WHEN (SELECT COUNT(*) FROM entregables WHERE proyecto_id = p.id) = 0 THEN 0
                    ELSE ROUND(((SELECT COUNT(*) FROM entregables WHERE proyecto_id = p.id AND estado = 'completado') * 100.0 / (SELECT COUNT(*) FROM entregables WHERE proyecto_id = p.id)), 0)
                END as progreso
            FROM proyectos p
            LEFT JOIN usuarios e ON p.estudiante_id = e.id
            LEFT JOIN usuarios d ON p.director_id = d.id
            LEFT JOIN lineas_investigacion rl ON p.linea_investigacion_id = rl.id
            LEFT JOIN ciclos_academicos ca ON p.ciclo_academico_id = ca.id
            WHERE p.director_id = ?
        `;
        
        const params = [director.id];
        
        // Agregar filtros adicionales si existen
        if (queryParams.search) {
            sql += ` AND (p.titulo LIKE ? OR p.descripcion LIKE ?)`;
            params.push(`%${queryParams.search}%`, `%${queryParams.search}%`);
        }
        
        if (queryParams.estado) {
            sql += ` AND p.estado = ?`;
            params.push(queryParams.estado);
        }
        
        sql += ` ORDER BY p.created_at DESC`;
        
        // Ejecutar consulta para contar total
        const countSql = sql.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM');
        const [countResult] = await connection.execute(countSql, params);
        const totalProjects = countResult[0].total;
        
        console.log(`   Total de proyectos encontrados: ${totalProjects}`);
        
        // Agregar paginación
        const offset = (queryParams.page - 1) * queryParams.limit;
        sql += ` LIMIT ? OFFSET ?`;
        params.push(queryParams.limit, offset);
        
        console.log(`   SQL Query: ${sql}`);
        console.log(`   Parámetros: [${params.join(', ')}]`);
        
        // Ejecutar consulta principal
        const [projects] = await connection.execute(sql, params);
        
        console.log(`\n   ✅ Proyectos obtenidos: ${projects.length}`);
        
        if (projects.length > 0) {
            console.log('\n   DETALLES DE PROYECTOS:');
            projects.forEach((project, index) => {
                console.log(`   ${index + 1}. ${project.titulo}`);
                console.log(`      - ID: ${project.id}`);
                console.log(`      - Estado: ${project.estado}`);
                console.log(`      - Director: ${project.director_nombre}`);
                console.log(`      - Estudiante: ${project.estudiante_nombres} ${project.estudiante_apellidos || ''}`);
                console.log(`      - Activo: ${project.activo}`);
                console.log(`      - Fecha inicio: ${project.fecha_inicio}`);
                console.log(`      - Progreso: ${project.progreso}%`);
                console.log(`      - Entregables: ${project.entregables_completados}/${project.total_entregables}`);
                console.log('');
            });
        } else {
            console.log('   ❌ No se encontraron proyectos para este director');
        }
        
        // 3. Calcular estadísticas
        console.log('3. CALCULANDO ESTADÍSTICAS:');
        const [statsResult] = await connection.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN estado IN ('aprobado', 'en_desarrollo') THEN 1 ELSE 0 END) as activos,
                SUM(CASE WHEN estado = 'finalizado' THEN 1 ELSE 0 END) as finalizados,
                SUM(CASE WHEN estado IN ('borrador', 'enviado', 'en_revision') THEN 1 ELSE 0 END) as pendientes
            FROM proyectos 
            WHERE director_id = ?
        `, [director.id]);
        
        const stats = statsResult[0];
        console.log(`   Total: ${stats.total}`);
        console.log(`   Activos: ${stats.activos}`);
        console.log(`   Finalizados: ${stats.finalizados}`);
        console.log(`   Pendientes: ${stats.pendientes}`);
        
        // 4. Simular los datos que se pasarían a la vista
        console.log('\n4. DATOS QUE SE PASARÍAN A LA VISTA:');
        const viewData = {
            user: {
                nombres: director.nombres,
                apellidos: director.apellidos
            },
            projects: projects,
            stats: stats,
            currentPage: queryParams.page,
            totalPages: Math.ceil(totalProjects / queryParams.limit),
            search: queryParams.search,
            estado: queryParams.estado,
            totalProjects: totalProjects
        };
        
        console.log(`   user: ${viewData.user.nombres} ${viewData.user.apellidos}`);
        console.log(`   projects.length: ${viewData.projects.length}`);
        console.log(`   stats: ${JSON.stringify(viewData.stats)}`);
        console.log(`   currentPage: ${viewData.currentPage}`);
        console.log(`   totalPages: ${viewData.totalPages}`);
        console.log(`   search: '${viewData.search}'`);
        console.log(`   estado: '${viewData.estado}'`);
        
        // 5. Verificar si la vista mostraría el estado vacío
        console.log('\n5. ANÁLISIS DE RENDERIZADO:');
        if (viewData.projects.length === 0) {
            console.log('   ❌ LA VISTA MOSTRARÍA EL ESTADO VACÍO');
            console.log('   Mensaje: "No hay proyectos dirigidos"');
            if (viewData.search || viewData.estado) {
                console.log('   Submensaje: "No se encontraron proyectos que coincidan con los filtros aplicados."');
            } else {
                console.log('   Submensaje: "Aún no tienes proyectos bajo tu dirección."');
            }
        } else {
            console.log('   ✅ LA VISTA MOSTRARÍA LOS PROYECTOS');
            console.log(`   Se renderizarían ${viewData.projects.length} tarjetas de proyecto`);
        }
        
        console.log('\n=====================================');
        console.log('🏁 PRUEBA COMPLETADA');
        
    } catch (error) {
        console.error('❌ Error durante la prueba:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexión cerrada');
        }
    }
}

// Ejecutar la prueba
testDirectorRoute();