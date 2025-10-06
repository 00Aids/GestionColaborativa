const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkCoordinatorRelation() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'gestion_academica'
    });

    try {
        console.log('=== VERIFICANDO RELACIÓN COORDINADOR-PROYECTO-ESTUDIANTE ===');
        
        // Buscar el coordinador por email
        const [coordinador] = await connection.execute(`
            SELECT * FROM usuarios WHERE email = 'nuevocoordinador1@test.com'
        `);
        
        console.log('👨‍💼 Coordinador encontrado:', coordinador[0]);
        
        if (coordinador[0]) {
            const coordinadorId = coordinador[0].id;
            
            // Buscar proyectos donde este usuario es coordinador
            console.log('\n=== PROYECTOS DONDE ES COORDINADOR ===');
            const [proyectosCoordinador] = await connection.execute(`
                SELECT * FROM proyectos WHERE estudiante_id = ?
            `, [coordinadorId]);
            
            console.log('📁 Proyectos como coordinador:', proyectosCoordinador);
            
            // Verificar si hay una tabla de coordinadores o relación específica
            console.log('\n=== VERIFICANDO TABLA DE COORDINADORES ===');
            try {
                const [coordinadores] = await connection.execute(`
                    SELECT * FROM coordinadores WHERE usuario_id = ?
                `, [coordinadorId]);
                console.log('📋 Datos en tabla coordinadores:', coordinadores);
            } catch (error) {
                console.log('⚠️ No existe tabla coordinadores o error:', error.message);
            }
            
            // Verificar miembros de proyecto
            console.log('\n=== VERIFICANDO MIEMBROS DE PROYECTO ===');
            try {
                const [miembros] = await connection.execute(`
                    SELECT * FROM proyecto_miembros WHERE usuario_id = ?
                `, [coordinadorId]);
                console.log('👥 Miembros de proyecto:', miembros);
            } catch (error) {
                console.log('⚠️ No existe tabla proyecto_miembros o error:', error.message);
            }
            
            // Verificar el proyecto específico (ID 2)
            console.log('\n=== VERIFICANDO PROYECTO ID 2 ===');
            const [proyecto2] = await connection.execute(`
                SELECT * FROM proyectos WHERE id = 2
            `);
            console.log('📁 Proyecto ID 2:', proyecto2[0]);
            
            if (proyecto2[0]) {
                // Verificar quién debería ser el coordinador de este proyecto
                console.log('\n=== VERIFICANDO COORDINACIÓN DEL PROYECTO ===');
                
                // Buscar en área de trabajo
                const [areaInfo] = await connection.execute(`
                    SELECT u.*, at.nombre as area_nombre
                    FROM usuarios u
                    LEFT JOIN areas_trabajo at ON u.area_trabajo_id = at.id
                    WHERE u.area_trabajo_id = ? AND u.id != ?
                `, [proyecto2[0].area_trabajo_id, proyecto2[0].estudiante_id]);
                
                console.log('🏢 Usuarios en la misma área de trabajo:', areaInfo);
                
                // Verificar roles
                const [rolesCoordinador] = await connection.execute(`
                    SELECT u.*, r.nombre as rol_nombre
                    FROM usuarios u
                    LEFT JOIN roles r ON u.rol_id = r.id
                    WHERE u.email = 'nuevocoordinador1@test.com'
                `);
                
                console.log('🎭 Rol del coordinador:', rolesCoordinador[0]);
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

checkCoordinatorRelation();