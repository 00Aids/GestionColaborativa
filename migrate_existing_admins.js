const mysql = require('mysql2/promise');

async function migrateExistingAdmins() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'gestion_academica'
    });

    try {
        console.log('=== MIGRACIÓN DE ADMINISTRADORES EXISTENTES ===\n');

        // 1. Buscar administradores que no tienen área de trabajo asignada
        const [adminsWithoutArea] = await connection.execute(`
            SELECT u.id, u.nombres, u.apellidos, u.email, u.codigo_usuario, r.nombre as rol_nombre
            FROM usuarios u
            JOIN roles r ON u.rol_id = r.id
            WHERE r.nombre = 'Administrador General' 
            AND u.activo = 1 
            AND (u.area_trabajo_id IS NULL OR u.area_trabajo_id = 0)
        `);

        console.log(`Encontrados ${adminsWithoutArea.length} administradores sin área asignada:`);
        console.table(adminsWithoutArea);

        if (adminsWithoutArea.length === 0) {
            console.log('✅ Todos los administradores ya tienen áreas asignadas');
            return;
        }

        // 2. Migrar cada administrador
        for (const admin of adminsWithoutArea) {
            console.log(`\n--- Migrando administrador: ${admin.nombres} ${admin.apellidos} ---`);

            // Generar código único para el área
            let codigoUnico;
            let intentos = 0;
            do {
                const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                const letter = letters[Math.floor(Math.random() * letters.length)];
                const numbers = Math.floor(Math.random() * 900) + 100;
                codigoUnico = `${letter}${numbers}`;
                
                const [existing] = await connection.execute(
                    'SELECT id FROM areas_trabajo WHERE codigo = ?', 
                    [codigoUnico]
                );
                
                if (existing.length === 0) break;
                intentos++;
            } while (intentos < 10);

            // Crear área de trabajo para el administrador
            const [areaResult] = await connection.execute(`
                INSERT INTO areas_trabajo (codigo, activo, created_at, updated_at)
                VALUES (?, 1, NOW(), NOW())
            `, [
                codigoUnico
            ]);

            const areaId = areaResult.insertId;
            console.log(`✓ Área de trabajo creada: ${codigoUnico} (ID: ${areaId})`);

            // Asignar el área al usuario
            await connection.execute(`
                UPDATE usuarios SET area_trabajo_id = ?, updated_at = NOW()
                WHERE id = ?
            `, [areaId, admin.id]);

            console.log(`✓ Usuario ${admin.codigo_usuario} asignado al área ${codigoUnico}`);

            // Crear relación en usuario_areas_trabajo como administrador
            await connection.execute(`
                INSERT INTO usuario_areas_trabajo (usuario_id, area_trabajo_id, es_admin, activo, created_at)
                VALUES (?, ?, 1, 1, NOW())
                ON DUPLICATE KEY UPDATE es_admin = 1, activo = 1, updated_at = NOW()
            `, [admin.id, areaId]);

            console.log(`✓ Relación de administrador creada en usuario_areas_trabajo`);
        }

        // 3. Verificar la migración
        console.log('\n=== VERIFICACIÓN POST-MIGRACIÓN ===\n');

        const [allAdmins] = await connection.execute(`
            SELECT u.id, u.nombres, u.apellidos, u.codigo_usuario,
                   a.codigo as area_codigo, a.nombre as area_nombre,
                   uat.es_admin
            FROM usuarios u
            JOIN roles r ON u.rol_id = r.id
            LEFT JOIN areas_trabajo a ON u.area_trabajo_id = a.id
            LEFT JOIN usuario_areas_trabajo uat ON u.id = uat.usuario_id AND a.id = uat.area_trabajo_id
            WHERE r.nombre = 'Administrador General' AND u.activo = 1
            ORDER BY u.id
        `);

        console.log('Estado final de todos los administradores:');
        console.table(allAdmins);

        // 4. Verificar que no hay acceso cruzado
        console.log('\n=== VERIFICACIÓN DE ACCESO CRUZADO ===\n');

        const [accessCheck] = await connection.execute(`
            SELECT 
                u1.codigo_usuario as admin1,
                a1.codigo as area1,
                u2.codigo_usuario as admin2,
                a2.codigo as area2,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM usuario_areas_trabajo 
                        WHERE usuario_id = u1.id AND area_trabajo_id = a2.id AND activo = 1
                    ) THEN 'SÍ' 
                    ELSE 'NO' 
                END as acceso_cruzado
            FROM usuarios u1
            JOIN areas_trabajo a1 ON u1.area_trabajo_id = a1.id
            JOIN roles r1 ON u1.rol_id = r1.id
            CROSS JOIN usuarios u2
            JOIN areas_trabajo a2 ON u2.area_trabajo_id = a2.id
            JOIN roles r2 ON u2.rol_id = r2.id
            WHERE r1.nombre = 'Administrador General' 
            AND r2.nombre = 'Administrador General'
            AND u1.id != u2.id
            AND u1.activo = 1 AND u2.activo = 1
            LIMIT 5
        `);

        if (accessCheck.length > 0) {
            console.log('Verificación de acceso cruzado entre administradores:');
            console.table(accessCheck);
            
            const hasAccess = accessCheck.some(row => row.acceso_cruzado === 'SÍ');
            console.log(hasAccess ? '❌ PROBLEMA: Hay acceso cruzado detectado' : '✅ CORRECTO: No hay acceso cruzado');
        }

        console.log('\n✅ Migración de administradores existentes completada');

    } catch (error) {
        console.error('❌ Error en la migración:', error);
    } finally {
        await connection.end();
    }
}

migrateExistingAdmins();