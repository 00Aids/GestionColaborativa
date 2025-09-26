const mysql = require('mysql2/promise');

// Configuración de la base de datos
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'gestion_academica'
};

async function fixAreaOwnership() {
    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('🔗 Conectado a la base de datos');

        // Definir asignaciones apropiadas para cada área
        const areaAssignments = [
            {
                codigo: 'INGIND',
                nombre: 'Ingeniería Industrial',
                userId: 41, // Coordinador1 primero - Director de Proyecto
                userName: 'Coordinador1 primero'
            },
            {
                codigo: 'ADMIN',
                nombre: 'Administración',
                userId: 20, // Admin Sistema - Administrador General
                userName: 'Admin Sistema'
            },
            {
                codigo: 'I295',
                nombre: 'Área de Trabajo #6',
                userId: 43, // Director1 Primero - Coordinador Académico
                userName: 'Director1 Primero'
            },
            {
                codigo: 'H714',
                nombre: 'Área de Trabajo #8',
                userId: 47, // Administrador de Prueba - Coordinador Académico
                userName: 'Administrador de Prueba'
            }
        ];

        console.log('\n🔧 Asignando propietarios a áreas sin propietario...');

        for (const assignment of areaAssignments) {
            console.log(`\n📋 Procesando área: ${assignment.codigo} - ${assignment.nombre}`);
            
            // Obtener el ID del área
            const [areaResult] = await connection.execute(`
                SELECT id FROM areas_trabajo WHERE codigo = ? AND activo = 1
            `, [assignment.codigo]);

            if (areaResult.length === 0) {
                console.log(`❌ Área ${assignment.codigo} no encontrada`);
                continue;
            }

            const areaId = areaResult[0].id;

            // Verificar si el usuario ya está en el área
            const [existingRelation] = await connection.execute(`
                SELECT id, es_admin, es_propietario 
                FROM usuario_areas_trabajo 
                WHERE usuario_id = ? AND area_trabajo_id = ? AND activo = 1
            `, [assignment.userId, areaId]);

            if (existingRelation.length > 0) {
                // Usuario ya está en el área, solo actualizar para hacerlo propietario y admin
                await connection.execute(`
                    UPDATE usuario_areas_trabajo 
                    SET es_admin = 1, es_propietario = 1 
                    WHERE id = ?
                `, [existingRelation[0].id]);
                
                console.log(`✅ ${assignment.userName} actualizado como propietario de ${assignment.codigo}`);
            } else {
                // Usuario no está en el área, crear nueva relación
                await connection.execute(`
                    INSERT INTO usuario_areas_trabajo 
                    (usuario_id, area_trabajo_id, es_admin, es_propietario, activo, created_at)
                    VALUES (?, ?, 1, 1, 1, NOW())
                `, [assignment.userId, areaId]);
                
                console.log(`✅ ${assignment.userName} asignado como propietario de ${assignment.codigo}`);
            }
        }

        // Verificar el resultado final
        console.log('\n📊 Verificando resultado final...');
        const [finalCheck] = await connection.execute(`
            SELECT 
                at.codigo,
                at.nombre,
                COUNT(uat.id) as total_propietarios,
                u.nombres,
                u.apellidos
            FROM areas_trabajo at
            LEFT JOIN usuario_areas_trabajo uat ON at.id = uat.area_trabajo_id 
                AND uat.es_propietario = 1 AND uat.activo = 1
            LEFT JOIN usuarios u ON uat.usuario_id = u.id
            WHERE at.activo = 1
            GROUP BY at.id, at.codigo, at.nombre, u.nombres, u.apellidos
            ORDER BY at.codigo
        `);

        console.log('\n📋 Estado final de propietarios por área:');
        finalCheck.forEach(area => {
            const status = area.total_propietarios === 1 ? '✅' : '❌';
            const owner = area.nombres ? `${area.nombres} ${area.apellidos}` : 'Sin propietario';
            console.log(`   ${status} ${area.codigo}: ${owner}`);
        });

        console.log('\n🎉 ¡Proceso de asignación de propietarios completado!');

    } catch (error) {
        console.error('❌ Error durante la asignación:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Conexión cerrada');
        }
    }
}

// Ejecutar la corrección
fixAreaOwnership().catch(console.error);