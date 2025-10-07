require('dotenv').config();
const mysql = require('mysql2/promise');

// Configuración de base de datos
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'gestion_colaborativa'
};

async function addDirectorToProject() {
    let connection;
    
    try {
        console.log('🔧 AGREGANDO DIRECTOR AL PROYECTO FINAL');
        console.log('=====================================\n');
        
        // Conectar a la base de datos
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conexión a base de datos establecida\n');
        
        // 1. Buscar el director
        const [director] = await connection.execute(`
            SELECT id, nombres, apellidos, email
            FROM usuarios 
            WHERE email = ? AND activo = 1
        `, ['directofinal1@test.com']);
        
        if (director.length === 0) {
            console.log('❌ Director no encontrado');
            return;
        }
        
        const directorInfo = director[0];
        console.log('1. DIRECTOR ENCONTRADO:');
        console.log(`   Nombre: ${directorInfo.nombres} ${directorInfo.apellidos}`);
        console.log(`   ID: ${directorInfo.id}`);
        console.log(`   Email: ${directorInfo.email}`);
        
        // 2. Buscar el proyecto "proyecto final"
        const [project] = await connection.execute(`
            SELECT id, titulo, estado, activo
            FROM proyectos 
            WHERE titulo LIKE '%proyecto final%' OR titulo LIKE '%final%'
            ORDER BY created_at DESC
            LIMIT 1
        `);
        
        if (project.length === 0) {
            console.log('\n❌ Proyecto "proyecto final" no encontrado');
            return;
        }
        
        const projectInfo = project[0];
        console.log('\n2. PROYECTO ENCONTRADO:');
        console.log(`   Título: ${projectInfo.titulo}`);
        console.log(`   ID: ${projectInfo.id}`);
        console.log(`   Estado: ${projectInfo.estado}`);
        console.log(`   Activo: ${projectInfo.activo}`);
        
        // 3. Verificar si ya existe la membresía
        const [existingMembership] = await connection.execute(`
            SELECT * FROM project_members 
            WHERE proyecto_id = ? AND usuario_id = ?
        `, [projectInfo.id, directorInfo.id]);
        
        if (existingMembership.length > 0) {
            console.log('\n3. MEMBRESÍA EXISTENTE:');
            const membership = existingMembership[0];
            console.log(`   Rol actual: ${membership.rol_en_proyecto}`);
            console.log(`   Estado: ${membership.activo ? 'Activo' : 'Inactivo'}`);
            console.log(`   Fecha unión: ${membership.fecha_union || membership.created_at}`);
            
            // Actualizar si es necesario
            if (membership.rol_en_proyecto !== 'director' || !membership.activo) {
                console.log('\n   🔄 Actualizando membresía...');
                await connection.execute(`
                    UPDATE project_members 
                    SET rol_en_proyecto = 'director', activo = 1, fecha_union = NOW()
                    WHERE id = ?
                `, [membership.id]);
                console.log('   ✅ Membresía actualizada correctamente');
            } else {
                console.log('   ✅ La membresía ya está correcta');
            }
        } else {
            console.log('\n3. CREANDO NUEVA MEMBRESÍA:');
            await connection.execute(`
                INSERT INTO project_members (proyecto_id, usuario_id, rol_en_proyecto, fecha_union, activo, created_at)
                VALUES (?, ?, 'director', NOW(), 1, NOW())
            `, [projectInfo.id, directorInfo.id]);
            console.log('   ✅ Membresía creada correctamente');
        }
        
        // 4. Verificar el resultado final
        console.log('\n4. VERIFICACIÓN FINAL:');
        const [finalCheck] = await connection.execute(`
            SELECT 
                pm.*,
                p.titulo as proyecto_titulo,
                CONCAT(u.nombres, ' ', u.apellidos) as usuario_nombre
            FROM project_members pm
            JOIN proyectos p ON pm.proyecto_id = p.id
            JOIN usuarios u ON pm.usuario_id = u.id
            WHERE pm.proyecto_id = ? AND pm.usuario_id = ?
        `, [projectInfo.id, directorInfo.id]);
        
        if (finalCheck.length > 0) {
            const result = finalCheck[0];
            console.log('   ✅ MEMBRESÍA CONFIRMADA:');
            console.log(`      Usuario: ${result.usuario_nombre}`);
            console.log(`      Proyecto: ${result.proyecto_titulo}`);
            console.log(`      Rol: ${result.rol_en_proyecto}`);
            console.log(`      Estado: ${result.activo ? 'Activo' : 'Inactivo'}`);
            console.log(`      Fecha: ${result.fecha_union || result.created_at}`);
        } else {
            console.log('   ❌ Error: No se pudo verificar la membresía');
        }
        
        console.log('\n=====================================');
        console.log('🏁 PROCESO COMPLETADO');
        console.log('💡 Ahora el director debería poder ver el proyecto en "Proyectos Dirigidos"');
        
    } catch (error) {
        console.error('❌ Error durante el proceso:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexión cerrada');
        }
    }
}

// Ejecutar el proceso
addDirectorToProject();