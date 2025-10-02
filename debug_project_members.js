const mysql = require('mysql2/promise');
require('dotenv').config();

// Importar el modelo Project
const Project = require('./src/models/Project');

async function debugProjectMembers() {
    console.log('=== DEBUG MIEMBROS DEL PROYECTO 35 ===\n');
    
    try {
        // Crear instancia del modelo Project
        const projectModel = new Project();
        
        console.log('1. Obteniendo miembros del proyecto 35 usando projectModel.getProjectMembers(35)...');
        const members = await projectModel.getProjectMembers(35);
        
        console.log('2. Miembros obtenidos:');
        console.log('Cantidad:', members.length);
        console.log('Datos completos:');
        members.forEach((member, index) => {
            console.log(`  ${index + 1}. ID: ${member.id}, Nombre: ${member.nombres} ${member.apellidos}, Rol: ${member.rol_nombre || 'N/A'}`);
        });
        
        // Verificar si el ID 12 está en la lista
        const member12 = members.find(m => m.id == 12);
        if (member12) {
            console.log('\n❌ PROBLEMA ENCONTRADO: El usuario ID 12 SÍ está en la lista de miembros:');
            console.log('   Datos del usuario 12:', JSON.stringify(member12, null, 2));
        } else {
            console.log('\n✅ El usuario ID 12 NO está en la lista de miembros del proyecto.');
        }
        
        console.log('\n3. Verificando directamente en la base de datos...');
        
        // Conexión directa a la base de datos para verificar
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'root',
            database: process.env.DB_NAME || 'gestion_colaborativa',
            port: process.env.DB_PORT || 3306
        });
        
        // Consulta directa para obtener miembros del proyecto 35
        const [rows] = await connection.execute(`
            SELECT 
                u.id,
                u.nombres,
                u.apellidos,
                u.email,
                pu.estado,
                r.nombre as rol_nombre
            FROM proyecto_usuarios pu
            JOIN usuarios u ON pu.usuario_id = u.id
            LEFT JOIN roles r ON pu.rol_id = r.id
            WHERE pu.proyecto_id = ? AND pu.estado = 'activo'
            ORDER BY u.nombres, u.apellidos
        `, [35]);
        
        console.log('\n4. Consulta directa a la base de datos:');
        console.log('Cantidad:', rows.length);
        rows.forEach((row, index) => {
            console.log(`  ${index + 1}. ID: ${row.id}, Nombre: ${row.nombres} ${row.apellidos}, Email: ${row.email}, Estado: ${row.estado}, Rol: ${row.rol_nombre || 'N/A'}`);
        });
        
        // Verificar si el ID 12 está en la consulta directa
        const directMember12 = rows.find(r => r.id == 12);
        if (directMember12) {
            console.log('\n❌ PROBLEMA CONFIRMADO: El usuario ID 12 SÍ está en la base de datos como miembro activo:');
            console.log('   Datos del usuario 12:', JSON.stringify(directMember12, null, 2));
            console.log('\n🔍 PERO sabemos que el usuario ID 12 no existe en la tabla usuarios.');
            console.log('   Esto indica un problema de integridad referencial en la base de datos.');
        } else {
            console.log('\n✅ El usuario ID 12 NO está en la consulta directa.');
        }
        
        await connection.end();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

debugProjectMembers();