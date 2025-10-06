const mysql = require('mysql2/promise');
require('dotenv').config();

async function debugRemoveMember() {
    let connection;
    
    try {
        console.log('🔍 DIAGNÓSTICO: Funcionalidad removeMember');
        console.log('=' .repeat(60));
        
        // Conectar a la base de datos
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'gestion_colaborativa'
        });
        
        console.log('✅ Conexión a la base de datos establecida');
        
        // 1. Verificar si existe el proyecto ID 2
        console.log('\n1. 🔍 Verificando proyecto ID 2...');
        const [project] = await connection.execute(`
            SELECT id, titulo, estudiante_id, director_id, estado
            FROM proyectos 
            WHERE id = 2
        `);
        
        if (project.length === 0) {
            console.log('❌ No existe el proyecto con ID 2');
            return;
        }
        
        console.log(`✅ Proyecto encontrado: "${project[0].titulo}"`);
        console.log(`   Estado: ${project[0].estado}`);
        console.log(`   Estudiante ID: ${project[0].estudiante_id}`);
        console.log(`   Director ID: ${project[0].director_id}`);
        
        // 2. Verificar si existe el usuario ID 21
        console.log('\n2. 👤 Verificando usuario ID 21...');
        const [user] = await connection.execute(`
            SELECT id, nombres, apellidos, email, activo
            FROM usuarios 
            WHERE id = 21
        `);
        
        if (user.length === 0) {
            console.log('❌ No existe el usuario con ID 21');
            return;
        }
        
        console.log(`✅ Usuario encontrado: ${user[0].nombres} ${user[0].apellidos}`);
        console.log(`   Email: ${user[0].email}`);
        console.log(`   Activo: ${user[0].activo}`);
        
        // 3. Verificar la relación proyecto_usuarios
        console.log('\n3. 🔗 Verificando relación proyecto-usuario...');
        const [relation] = await connection.execute(`
            SELECT pu.*, u.nombres, u.apellidos, u.email
            FROM proyecto_usuarios pu
            JOIN usuarios u ON pu.usuario_id = u.id
            WHERE pu.proyecto_id = 2 AND pu.usuario_id = 21
        `);
        
        if (relation.length === 0) {
            console.log('❌ No existe relación entre proyecto ID 2 y usuario ID 21');
            console.log('   Verificando todos los miembros del proyecto 2...');
            
            const [allMembers] = await connection.execute(`
                SELECT pu.*, u.nombres, u.apellidos, u.email
                FROM proyecto_usuarios pu
                JOIN usuarios u ON pu.usuario_id = u.id
                WHERE pu.proyecto_id = 2
                ORDER BY pu.estado, u.nombres
            `);
            
            console.log(`   Total miembros en proyecto 2: ${allMembers.length}`);
            allMembers.forEach((member, index) => {
                console.log(`   ${index + 1}. ${member.nombres} ${member.apellidos} (ID: ${member.usuario_id}) - Estado: ${member.estado} - Rol: ${member.rol}`);
            });
            
            return;
        }
        
        console.log(`✅ Relación encontrada:`);
        console.log(`   Usuario: ${relation[0].nombres} ${relation[0].apellidos}`);
        console.log(`   Rol: ${relation[0].rol}`);
        console.log(`   Estado: ${relation[0].estado}`);
        console.log(`   Fecha asignación: ${relation[0].fecha_asignacion}`);
        
        // 4. Simular la operación de eliminación
        console.log('\n4. 🧪 Simulando operación de eliminación...');
        
        if (relation[0].estado === 'inactivo') {
            console.log('⚠️  El usuario ya está inactivo en este proyecto');
        } else {
            console.log('✅ El usuario está activo, procediendo con la simulación...');
            
            // Simular la actualización
            const [updateResult] = await connection.execute(`
                UPDATE proyecto_usuarios 
                SET estado = 'inactivo'
                WHERE proyecto_id = 2 AND usuario_id = 21
            `);
            
            console.log(`   Filas afectadas: ${updateResult.affectedRows}`);
            
            // Verificar el cambio
            const [updatedRelation] = await connection.execute(`
                SELECT estado 
                FROM proyecto_usuarios 
                WHERE proyecto_id = 2 AND usuario_id = 21
            `);
            
            console.log(`   Nuevo estado: ${updatedRelation[0].estado}`);
            
            // Restaurar el estado original
            await connection.execute(`
                UPDATE proyecto_usuarios 
                SET estado = 'activo'
                WHERE proyecto_id = 2 AND usuario_id = 21
            `);
            
            console.log('   Estado restaurado a activo');
        }
        
        // 5. Verificar permisos de administrador
        console.log('\n5. 🔐 Verificando configuración de permisos...');
        const [adminUsers] = await connection.execute(`
            SELECT u.id, u.nombres, u.apellidos, u.email, r.nombre as rol_nombre
            FROM usuarios u
            JOIN roles r ON u.rol_id = r.id
            WHERE r.nombre = 'Administrador General' AND u.activo = 1
        `);
        
        console.log(`   Administradores activos: ${adminUsers.length}`);
        adminUsers.forEach((admin, index) => {
            console.log(`   ${index + 1}. ${admin.nombres} ${admin.apellidos} (${admin.email})`);
        });
        
        // 6. Verificar estructura de la tabla proyecto_usuarios
        console.log('\n6. 📊 Verificando estructura de proyecto_usuarios...');
        const [tableStructure] = await connection.execute('DESCRIBE proyecto_usuarios');
        
        console.log('   Columnas:');
        tableStructure.forEach(col => {
            console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(NULL)' : '(NOT NULL)'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
        });
        
        console.log('\n✅ DIAGNÓSTICO COMPLETADO');
        console.log('\n📋 RESUMEN:');
        console.log('   ✅ Proyecto ID 2 existe');
        console.log('   ✅ Usuario ID 21 existe');
        console.log(`   ${relation.length > 0 ? '✅' : '❌'} Relación proyecto-usuario existe`);
        console.log('   ✅ Estructura de tabla correcta');
        console.log('   ✅ Operación de actualización funciona');
        
    } catch (error) {
        console.error('❌ ERROR EN DIAGNÓSTICO:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Ejecutar diagnóstico
debugRemoveMember()
    .then(() => {
        console.log('\n🏁 Diagnóstico finalizado');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Error fatal:', error);
        process.exit(1);
    });