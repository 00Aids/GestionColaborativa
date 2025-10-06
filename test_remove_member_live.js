const mysql = require('mysql2/promise');
require('dotenv').config();

async function testRemoveMemberLive() {
    let connection;
    
    try {
        // Conectar a la base de datos
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'gestion_colaborativa'
        });

        console.log('✅ Conectado a la base de datos');
        console.log('🔍 PRUEBA EN TIEMPO REAL - Eliminación de Miembro');
        console.log('=' .repeat(60));

        const projectId = 2;
        const userId = 21;

        // 1. Estado inicial
        console.log('\n📊 1. ESTADO INICIAL:');
        const [initialState] = await connection.execute(`
            SELECT pu.*, u.nombres, u.apellidos, u.email
            FROM proyecto_usuarios pu
            JOIN usuarios u ON pu.usuario_id = u.id
            WHERE pu.proyecto_id = ? AND pu.usuario_id = ?
        `, [projectId, userId]);

        if (initialState.length === 0) {
            console.log('❌ Usuario no encontrado en el proyecto');
            return;
        }

        console.log(`   Usuario: ${initialState[0].nombres} ${initialState[0].apellidos}`);
        console.log(`   Email: ${initialState[0].email}`);
        console.log(`   Estado actual: ${initialState[0].estado}`);
        console.log(`   Rol: ${initialState[0].rol}`);

        // 2. Simular la petición DELETE (lo que debería hacer el frontend)
        console.log('\n🌐 2. SIMULANDO PETICIÓN DELETE:');
        console.log(`   URL: /admin/projects/${projectId}/members/${userId}`);
        console.log(`   Método: DELETE`);
        
        // Simular la lógica del backend
        console.log('\n⚙️ 3. EJECUTANDO LÓGICA DEL BACKEND:');
        
        // Verificar que el usuario es miembro activo
        const [member] = await connection.execute(`
            SELECT * FROM proyecto_usuarios 
            WHERE proyecto_id = ? AND usuario_id = ? AND estado = 'activo'
        `, [projectId, userId]);

        if (member.length === 0) {
            console.log('❌ Usuario no es miembro activo');
            return;
        }

        console.log('✅ Usuario es miembro activo, procediendo a desactivar...');

        // Ejecutar la actualización
        const [updateResult] = await connection.execute(`
            UPDATE proyecto_usuarios 
            SET estado = 'inactivo'
            WHERE proyecto_id = ? AND usuario_id = ?
        `, [projectId, userId]);

        console.log('📝 Resultado de la actualización:', {
            affectedRows: updateResult.affectedRows,
            changedRows: updateResult.changedRows,
            info: updateResult.info
        });

        // 3. Verificar estado final
        console.log('\n📊 4. ESTADO FINAL:');
        const [finalState] = await connection.execute(`
            SELECT pu.*, u.nombres, u.apellidos, u.email
            FROM proyecto_usuarios pu
            JOIN usuarios u ON pu.usuario_id = u.id
            WHERE pu.proyecto_id = ? AND pu.usuario_id = ?
        `, [projectId, userId]);

        if (finalState.length > 0) {
            console.log(`   Usuario: ${finalState[0].nombres} ${finalState[0].apellidos}`);
            console.log(`   Estado final: ${finalState[0].estado}`);
            console.log(`   Cambio exitoso: ${initialState[0].estado} → ${finalState[0].estado}`);
        }

        // 4. Contar miembros activos restantes
        const [activeMembers] = await connection.execute(`
            SELECT COUNT(*) as count
            FROM proyecto_usuarios
            WHERE proyecto_id = ? AND estado = 'activo'
        `, [projectId]);

        console.log(`\n📈 5. ESTADÍSTICAS FINALES:`);
        console.log(`   Miembros activos restantes: ${activeMembers[0].count}`);

        // 5. Restaurar para próximas pruebas (opcional)
        console.log('\n🔄 6. RESTAURANDO PARA PRÓXIMAS PRUEBAS:');
        await connection.execute(`
            UPDATE proyecto_usuarios 
            SET estado = 'activo'
            WHERE proyecto_id = ? AND usuario_id = ?
        `, [projectId, userId]);
        console.log('✅ Usuario restaurado a estado activo');

        console.log('\n🎉 PRUEBA COMPLETADA EXITOSAMENTE');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n✅ Conexión cerrada');
        }
    }
}

testRemoveMemberLive();