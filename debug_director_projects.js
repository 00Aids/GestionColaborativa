const mysql = require('mysql2/promise');
require('dotenv').config();

async function debugDirectorProjects() {
    let connection;
    
    try {
        // Conectar a la base de datos
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'gestion_colaborativa'
        });

        console.log('🔍 DIAGNÓSTICO: Director no ve proyectos pero sí entregables\n');

        // 1. Verificar qué directores existen
        console.log('=== PASO 1: Verificando directores existentes ===');
        const [directors] = await connection.execute(`
            SELECT u.id, u.codigo_usuario, u.nombres, u.apellidos, u.email, r.nombre as rol_nombre
            FROM usuarios u
            JOIN roles r ON u.rol_id = r.id
            WHERE r.nombre IN ('Director de Proyecto', 'Coordinador Académico')
            ORDER BY u.id
        `);
        
        console.log('Directores encontrados:');
        directors.forEach(dir => {
            console.log(`- ID: ${dir.id}, Código: ${dir.codigo_usuario}, Nombre: ${dir.nombres} ${dir.apellidos}, Email: ${dir.email}, Rol: ${dir.rol_nombre}`);
        });

        if (directors.length === 0) {
            console.log('❌ No se encontraron directores');
            return;
        }

        // Tomar el primer director para las pruebas
        const testDirector = directors[0];
        console.log(`\n🎯 Usando director de prueba: ${testDirector.nombres} ${testDirector.apellidos} (ID: ${testDirector.id})`);

        // 2. Verificar proyectos asociados al director
        console.log('\n=== PASO 2: Verificando proyectos asociados al director ===');
        
        // Consulta A: Por director_id en tabla proyectos
        console.log('A) Proyectos donde director_id = ' + testDirector.id);
        const [projectsByDirectorId] = await connection.execute(`
            SELECT p.id, p.titulo, p.director_id, p.estado
            FROM proyectos p
            WHERE p.director_id = ?
        `, [testDirector.id]);
        
        console.log(`   Encontrados: ${projectsByDirectorId.length} proyectos`);
        projectsByDirectorId.forEach(proj => {
            console.log(`   - Proyecto ${proj.id}: "${proj.titulo}" (Estado: ${proj.estado})`);
        });

        // Consulta B: Por proyecto_usuarios con rol coordinador
        console.log('\nB) Proyectos donde está como coordinador en proyecto_usuarios');
        const [projectsByRole] = await connection.execute(`
            SELECT p.id, p.titulo, p.director_id, p.estado, pu.rol, pu.estado as estado_usuario
            FROM proyectos p
            JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            WHERE pu.usuario_id = ? AND pu.rol = 'coordinador' AND pu.estado = 'activo'
        `, [testDirector.id]);
        
        console.log(`   Encontrados: ${projectsByRole.length} proyectos`);
        projectsByRole.forEach(proj => {
            console.log(`   - Proyecto ${proj.id}: "${proj.titulo}" (Director ID: ${proj.director_id}, Rol: ${proj.rol}, Estado Usuario: ${proj.estado_usuario})`);
        });

        // 4. Verificar entregables visibles para este director
        console.log('\n📋 4. ENTREGABLES VISIBLES PARA EL DIRECTOR:');
        const [deliverables] = await connection.execute(`
            SELECT DISTINCT
                e.id,
                e.titulo,
                e.descripcion,
                e.estado,
                e.fecha_limite,
                e.fecha_entrega,
                p.titulo as proyecto_titulo,
                p.id as proyecto_id
            FROM entregables e
            INNER JOIN proyectos p ON e.proyecto_id = p.id
            INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
            ORDER BY e.fecha_entrega DESC
        `, [testDirector.id]);

        console.log(`Entregables encontrados: ${deliverables.length}`);
        deliverables.forEach(del => {
            console.log(`   - Entregable "${del.titulo}" del proyecto "${del.proyecto_titulo}" (ID: ${del.proyecto_id}) por ${del.estudiante_nombre}`);
        });

        // 5. Simular la consulta que usa findByDirector
        console.log('\n=== PASO 5: Simulando consulta findByDirector actual ===');
        
        // Primero verificar qué hace findByDirector actualmente
        const [findByDirectorResult] = await connection.execute(`
            SELECT DISTINCT p.*, 
                   CONCAT(u.nombres, ' ', u.apellidos) as director_nombre,
                   at.nombre as area_trabajo_nombre
            FROM proyectos p
            LEFT JOIN usuarios u ON p.director_id = u.id
            LEFT JOIN areas_trabajo at ON p.area_trabajo_id = at.id
            WHERE (p.director_id = ? OR p.id IN (
                SELECT DISTINCT pu.proyecto_id 
                FROM proyecto_usuarios pu 
                WHERE pu.usuario_id = ? AND pu.rol = 'coordinador' AND pu.estado = 'activo'
            ))
            ORDER BY p.created_at DESC
        `, [testDirector.id, testDirector.id]);

        console.log(`Resultado de findByDirector: ${findByDirectorResult.length} proyectos`);
        findByDirectorResult.forEach(proj => {
            console.log(`   - Proyecto ${proj.id}: "${proj.titulo}" (Director: ${proj.director_nombre}, Área: ${proj.area_trabajo_nombre})`);
        });

        // 6. Verificar si hay problemas con el estado de los proyectos
        console.log('\n=== PASO 6: Verificando estados de proyectos ===');
        const [allProjectStates] = await connection.execute(`
            SELECT p.id, p.titulo, p.estado, p.director_id,
                   COUNT(pu.id) as total_miembros,
                   COUNT(CASE WHEN pu.rol = 'coordinador' THEN 1 END) as coordinadores
            FROM proyectos p
            LEFT JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id AND pu.estado = 'activo'
            WHERE p.director_id = ? OR p.id IN (
                SELECT DISTINCT pu2.proyecto_id 
                FROM proyecto_usuarios pu2 
                WHERE pu2.usuario_id = ? AND pu2.rol = 'coordinador' AND pu2.estado = 'activo'
            )
            GROUP BY p.id, p.titulo, p.estado, p.director_id
        `, [testDirector.id, testDirector.id]);

        console.log('Estados de proyectos asociados:');
        allProjectStates.forEach(proj => {
            console.log(`   - Proyecto ${proj.id}: "${proj.titulo}" - Estado: ${proj.estado}, Miembros: ${proj.total_miembros}, Coordinadores: ${proj.coordinadores}`);
        });

        console.log('\n🎯 RESUMEN DEL DIAGNÓSTICO:');
        console.log(`- Director analizado: ${testDirector.nombres} ${testDirector.apellidos} (ID: ${testDirector.id})`);
        console.log(`- Proyectos por director_id: ${projectsByDirectorId.length}`);
        console.log(`- Proyectos por rol coordinador: ${projectsByRole.length}`);
        console.log(`- Entregables visibles: ${deliverables.length}`);
        console.log(`- Resultado findByDirector: ${findByDirectorResult.length}`);

        if (findByDirectorResult.length === 0 && deliverables.length > 0) {
            console.log('\n❌ PROBLEMA IDENTIFICADO: findByDirector no encuentra proyectos pero sí hay entregables');
            console.log('   Esto sugiere que hay un problema en la consulta de findByDirector');
        } else if (findByDirectorResult.length > 0) {
            console.log('\n✅ findByDirector SÍ encuentra proyectos');
            console.log('   El problema podría estar en el controlador o la vista');
        }

    } catch (error) {
        console.error('❌ Error en el diagnóstico:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

debugDirectorProjects();