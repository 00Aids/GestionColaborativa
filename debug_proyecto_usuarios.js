const mysql = require('mysql2/promise');
require('dotenv').config();

async function debugProyectoUsuarios() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'gestion_academica'
    });

    try {
        console.log('=== VERIFICANDO TABLA PROYECTO_USUARIOS ===');
        
        // Ver todos los datos en proyecto_usuarios
        const [allData] = await connection.execute('SELECT * FROM proyecto_usuarios');
        console.log('📋 Todos los datos en proyecto_usuarios:', allData);
        
        // Verificar específicamente el proyecto 2
        const [proyecto2Data] = await connection.execute(`
            SELECT * FROM proyecto_usuarios WHERE proyecto_id = 2
        `);
        console.log('\n📁 Datos del proyecto 2 en proyecto_usuarios:', proyecto2Data);
        
        // Verificar el coordinador específico
        const coordinadorId = 22;
        const [coordinadorData] = await connection.execute(`
            SELECT * FROM proyecto_usuarios WHERE usuario_id = ?
        `, [coordinadorId]);
        console.log('\n👨‍💼 Datos del coordinador en proyecto_usuarios:', coordinadorData);
        
        // Si no existe la relación, crearla
        if (proyecto2Data.length === 0 || !proyecto2Data.some(p => p.usuario_id === coordinadorId && p.rol === 'coordinador')) {
            console.log('\n⚠️ El coordinador no está asignado al proyecto. Creando la relación...');
            
            try {
                await connection.execute(`
                    INSERT INTO proyecto_usuarios (proyecto_id, usuario_id, rol, fecha_asignacion, estado)
                    VALUES (2, ?, 'coordinador', NOW(), 'activo')
                `, [coordinadorId]);
                
                console.log('✅ Coordinador asignado al proyecto exitosamente');
                
                // Verificar la nueva asignación
                const [newData] = await connection.execute(`
                    SELECT * FROM proyecto_usuarios WHERE proyecto_id = 2 AND usuario_id = ?
                `, [coordinadorId]);
                console.log('📋 Nueva asignación:', newData);
                
            } catch (insertError) {
                console.log('❌ Error al insertar:', insertError.message);
                
                // Verificar si ya existe pero con diferente rol
                const [existingData] = await connection.execute(`
                    SELECT * FROM proyecto_usuarios WHERE proyecto_id = 2 AND usuario_id = ?
                `, [coordinadorId]);
                
                if (existingData.length > 0) {
                    console.log('🔄 Actualizando rol existente...');
                    await connection.execute(`
                        UPDATE proyecto_usuarios 
                        SET rol = 'coordinador', estado = 'activo'
                        WHERE proyecto_id = 2 AND usuario_id = ?
                    `, [coordinadorId]);
                    console.log('✅ Rol actualizado a coordinador');
                }
            }
        } else {
            console.log('✅ El coordinador ya está correctamente asignado al proyecto');
        }
        
        // Probar nuevamente la consulta del coordinador
        console.log('\n=== PROBANDO CONSULTA DESPUÉS DE LA ASIGNACIÓN ===');
        const query = `
            SELECT 
                e.*,
                p.titulo as proyecto_titulo,
                p.estado as proyecto_estado,
                u.nombres as estudiante_nombres,
                u.apellidos as estudiante_apellidos
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            LEFT JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
            ORDER BY e.fecha_entrega DESC
        `;
        
        const [result] = await connection.execute(query, [coordinadorId]);
        console.log('📋 Entregables encontrados para el coordinador:', result);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

debugProyectoUsuarios();