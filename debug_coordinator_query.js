const mysql = require('mysql2/promise');
require('dotenv').config();

async function testCoordinatorQuery() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'gestion_academica'
    });

    try {
        console.log('=== PROBANDO CONSULTA DEL COORDINADOR ===');
        
        // ID del coordinador
        const coordinadorId = 22; // nuevocoordinador1@test.com
        
        // Consulta exacta del método findByCoordinatorForReview
        console.log('\n📋 Ejecutando consulta findByCoordinatorForReview:');
        const query1 = `
            SELECT 
                e.*,
                p.titulo as proyecto_titulo,
                p.estado as proyecto_estado,
                u.nombres as estudiante_nombres,
                u.apellidos as estudiante_apellidos,
                fp.nombre as fase_nombre
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            LEFT JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
            WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
            ORDER BY e.fecha_entrega DESC
        `;
        
        const [result1] = await connection.execute(query1, [coordinadorId]);
        console.log('Resultado:', result1);
        
        // Verificar si existe la tabla proyecto_usuarios
        console.log('\n🔍 Verificando tabla proyecto_usuarios:');
        try {
            const [tableCheck] = await connection.execute('DESCRIBE proyecto_usuarios');
            console.log('Estructura tabla proyecto_usuarios:', tableCheck);
        } catch (error) {
            console.log('❌ Tabla proyecto_usuarios no existe:', error.message);
        }
        
        // Verificar si existe la tabla proyecto_miembros
        console.log('\n🔍 Verificando tabla proyecto_miembros:');
        try {
            const [tableCheck2] = await connection.execute('DESCRIBE proyecto_miembros');
            console.log('Estructura tabla proyecto_miembros:', tableCheck2);
            
            // Buscar datos del coordinador en proyecto_miembros
            const [miembrosData] = await connection.execute(`
                SELECT * FROM proyecto_miembros WHERE usuario_id = ?
            `, [coordinadorId]);
            console.log('Datos en proyecto_miembros:', miembrosData);
            
        } catch (error) {
            console.log('❌ Tabla proyecto_miembros no existe:', error.message);
        }
        
        // Consulta alternativa usando proyecto_miembros
        console.log('\n📋 Probando consulta alternativa con proyecto_miembros:');
        const query2 = `
            SELECT 
                e.*,
                p.titulo as proyecto_titulo,
                p.estado as proyecto_estado,
                u.nombres as estudiante_nombres,
                u.apellidos as estudiante_apellidos
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            LEFT JOIN proyecto_miembros pm ON p.id = pm.proyecto_id
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            WHERE pm.usuario_id = ? AND pm.rol = 'coordinador'
            ORDER BY e.fecha_entrega DESC
        `;
        
        try {
            const [result2] = await connection.execute(query2, [coordinadorId]);
            console.log('Resultado con proyecto_miembros:', result2);
        } catch (error) {
            console.log('❌ Error con proyecto_miembros:', error.message);
        }
        
        // Consulta por área de trabajo
        console.log('\n📋 Probando consulta por área de trabajo:');
        const query3 = `
            SELECT 
                e.*,
                p.titulo as proyecto_titulo,
                p.estado as proyecto_estado,
                u.nombres as estudiante_nombres,
                u.apellidos as estudiante_apellidos
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            WHERE p.area_trabajo_id = (
                SELECT area_trabajo_id FROM usuarios WHERE id = ?
            ) AND e.estado = 'entregado'
            ORDER BY e.fecha_entrega DESC
        `;
        
        try {
            const [result3] = await connection.execute(query3, [coordinadorId]);
            console.log('Resultado por área de trabajo:', result3);
        } catch (error) {
            console.log('❌ Error por área de trabajo:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

testCoordinatorQuery();