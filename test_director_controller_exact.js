require('dotenv').config();
const mysql = require('mysql2/promise');

// Configuración de base de datos
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'gestion_colaborativa'
};

async function testDirectorControllerExact() {
    let connection;
    
    try {
        console.log('🔍 TESTING DIRECTOR CONTROLLER - Replicando exactamente la lógica');
        console.log('=================================================================\n');
        
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
        
        // 2. Simular exactamente la consulta del DirectorController.projects()
        console.log('2. REPLICANDO DirectorController.projects() EXACTAMENTE:');
        
        // Simular req.query
        const reqQuery = {
            search: '',
            estado: '',
            page: 1
        };
        
        const user = { id: director.id };
        const { search, estado, page = 1 } = reqQuery;
        const limit = 10;
        const offset = (page - 1) * limit;
        
        console.log(`   Parámetros simulados: search='${search}', estado='${estado}', page=${page}`);
        
        // Usar la consulta EXACTA del DirectorController
        let query = `
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
      `;
      
        const values = [user.id];
        
        // Aplicar filtro de estado si existe
        if (estado) {
            query += ` AND p.estado = ?`;
            values.push(estado);
        }
        
        query += ` ORDER BY p.created_at DESC`;
        
        console.log(`   SQL Query: ${query.replace(/\s+/g, ' ').trim()}`);
        console.log(`   Parámetros: [${values.join(', ')}]`);
        
        // Ejecutar la consulta
        const [directedProjects] = await connection.execute(query, values);
        
        console.log(`\n   ✅ Proyectos obtenidos de la consulta: ${directedProjects.length}`);
        
        if (directedProjects.length > 0) {
            console.log('\n   DETALLES DE PROYECTOS ENCONTRADOS:');
            directedProjects.forEach((project, index) => {
                console.log(`   ${index + 1}. ${project.titulo}`);
                console.log(`      - ID: ${project.id}`);
                console.log(`      - Estado: ${project.estado}`);
                console.log(`      - Director: ${project.director_nombre}`);
                console.log(`      - Estudiante: ${project.estudiante_nombre || 'Sin asignar'}`);
                console.log(`      - Activo: ${project.activo}`);
                console.log(`      - Fecha inicio: ${project.fecha_inicio}`);
                console.log(`      - Created at: ${project.created_at}`);
                console.log('');
            });
        } else {
            console.log('   ❌ No se encontraron proyectos en la consulta inicial');
        }
        
        // 3. Aplicar búsqueda por título si se especifica (lógica del controlador)
        console.log('3. APLICANDO FILTRO DE BÚSQUEDA:');
        let filteredProjects = directedProjects;
        if (search) {
            filteredProjects = directedProjects.filter(project => 
                project.titulo.toLowerCase().includes(search.toLowerCase())
            );
            console.log(`   Filtro de búsqueda aplicado: '${search}'`);
        } else {
            console.log('   Sin filtro de búsqueda aplicado');
        }
        console.log(`   Proyectos después del filtro: ${filteredProjects.length}`);
        
        // 4. Calcular estadísticas (lógica del controlador)
        console.log('\n4. CALCULANDO ESTADÍSTICAS:');
        const stats = {
            total: filteredProjects.length,
            activos: filteredProjects.filter(p => ['en_desarrollo', 'en_revision'].includes(p.estado)).length,
            finalizados: filteredProjects.filter(p => p.estado === 'finalizado').length,
            pendientes: filteredProjects.filter(p => p.estado === 'borrador').length
        };
        
        console.log(`   Total: ${stats.total}`);
        console.log(`   Activos: ${stats.activos}`);
        console.log(`   Finalizados: ${stats.finalizados}`);
        console.log(`   Pendientes: ${stats.pendientes}`);
        
        // 5. Paginación (lógica del controlador)
        console.log('\n5. APLICANDO PAGINACIÓN:');
        const totalProjects = filteredProjects.length;
        const paginatedProjects = filteredProjects.slice(offset, offset + limit);
        const totalPages = Math.ceil(totalProjects / limit);
        
        console.log(`   Total proyectos: ${totalProjects}`);
        console.log(`   Offset: ${offset}, Limit: ${limit}`);
        console.log(`   Proyectos paginados: ${paginatedProjects.length}`);
        console.log(`   Total páginas: ${totalPages}`);
        
        // 6. Simular los datos que se pasarían a la vista
        console.log('\n6. DATOS FINALES PARA LA VISTA:');
        const viewData = {
            title: 'Proyectos Dirigidos',
            user: {
                id: director.id,
                nombres: director.nombres,
                apellidos: director.apellidos
            },
            projects: paginatedProjects,
            stats: stats,
            currentPage: parseInt(page),
            totalPages: totalPages,
            search: search,
            estado: estado,
            success: [],
            error: []
        };
        
        console.log(`   user: ${viewData.user.nombres} ${viewData.user.apellidos} (ID: ${viewData.user.id})`);
        console.log(`   projects.length: ${viewData.projects.length}`);
        console.log(`   stats: ${JSON.stringify(viewData.stats)}`);
        console.log(`   currentPage: ${viewData.currentPage}`);
        console.log(`   totalPages: ${viewData.totalPages}`);
        console.log(`   search: '${viewData.search}'`);
        console.log(`   estado: '${viewData.estado}'`);
        
        // 7. Análisis final
        console.log('\n7. ANÁLISIS FINAL:');
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
            
            console.log('\n   PROYECTOS QUE SE MOSTRARÍAN:');
            viewData.projects.forEach((project, index) => {
                console.log(`   ${index + 1}. "${project.titulo}" - Estado: ${project.estado} - Activo: ${project.activo}`);
            });
        }
        
        console.log('\n=================================================================');
        console.log('🏁 PRUEBA COMPLETADA - LÓGICA EXACTA DEL CONTROLADOR REPLICADA');
        
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
testDirectorControllerExact();