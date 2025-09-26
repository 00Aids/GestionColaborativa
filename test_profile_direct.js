const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function testProfileUpdate() {
    console.log('🧪 Probando actualización directa de perfil...');
    
    try {
        // Conectar a la base de datos
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'root',
            database: 'gestion_academica'
        });

        console.log('✅ Conectado a la base de datos');

        // Buscar un usuario de prueba
        const [users] = await connection.execute(
            'SELECT id, email, nombres, apellidos, telefono, fecha_nacimiento FROM usuarios WHERE email = "estudiante1@test.com" LIMIT 1'
        );

        if (users.length === 0) {
            console.log('❌ No se encontraron usuarios estudiantes');
            return;
        }

        const user = users[0];
        console.log('👤 Usuario encontrado:', {
            id: user.id,
            email: user.email,
            nombres: user.nombres,
            apellidos: user.apellidos,
            telefono: user.telefono,
            fecha_nacimiento: user.fecha_nacimiento
        });

        // Datos de prueba para actualizar
        const updateData = {
            nombres: 'Juan Carlos',
            apellidos: 'Pérez García',
            email: user.email, // Mantener el mismo email
            telefono: '3001234567',
            fecha_nacimiento: '1995-05-15'
        };

        console.log('📝 Datos para actualizar:', updateData);

        // Actualizar el usuario
        const [result] = await connection.execute(
            'UPDATE usuarios SET nombres = ?, apellidos = ?, email = ?, telefono = ?, fecha_nacimiento = ? WHERE id = ?',
            [updateData.nombres, updateData.apellidos, updateData.email, updateData.telefono, updateData.fecha_nacimiento, user.id]
        );

        console.log('✅ Resultado de la actualización:', result);

        // Verificar la actualización
        const [updatedUsers] = await connection.execute(
            'SELECT id, email, nombres, apellidos, telefono, fecha_nacimiento FROM usuarios WHERE id = ?',
            [user.id]
        );

        console.log('🔍 Usuario después de la actualización:', updatedUsers[0]);

        await connection.end();
        console.log('✅ Prueba completada exitosamente');

    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    }
}

testProfileUpdate();