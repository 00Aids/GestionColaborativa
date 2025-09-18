const mysql = require('mysql2/promise');

async function testAdminRegistration() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'gestion_academica'
    });

    try {
        console.log('=== PRUEBA DE REGISTRO DE ADMINISTRADORES CON CÓDIGOS ÚNICOS ===\n');

        // Simular registro de dos administradores
        const administradores = [
            {
                nombres: 'Omar',
                apellidos: 'Rector UTS',
                email: 'omar.uts@universidad.edu',
                password: 'password123', // Simplificado para la prueba
                rol_id: 1 // Administrador General
            },
            {
                nombres: 'Miguel',
                apellidos: 'Rector UPB',
                email: 'miguel.upb@universidad.edu',
                password: 'password123', // Simplificado para la prueba
                rol_id: 1 // Administrador General
            }
        ];

        for (const admin of administradores) {
            console.log(`\n--- Registrando administrador: ${admin.nombres} ${admin.apellidos} ---`);

            // 1. Crear área de trabajo con código único
            const timestamp = Date.now();
            const areaData = {
            codigo: codigoUnico
        };

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

            areaData.codigo = codigoUnico;

            // Insertar área de trabajo
            const [areaResult] = await connection.execute(`
                INSERT INTO areas_trabajo (codigo, activo, created_at, updated_at)
                VALUES (?, 1, NOW(), NOW())
            `, [areaData.codigo]);

            const areaId = areaResult.insertId;
            console.log(`✓ Área de trabajo creada: ${codigoUnico} (ID: ${areaId})`);

            // 2. Generar código de usuario único
            let codigoUsuario;
            let intentosUsuario = 0;
            do {
                const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                codigoUsuario = `USR${randomNum}`;
                
                const [existingUser] = await connection.execute(
                    'SELECT id FROM usuarios WHERE codigo_usuario = ?', 
                    [codigoUsuario]
                );
                
                if (existingUser.length === 0) break;
                intentosUsuario++;
            } while (intentosUsuario < 10);

            // 3. Crear usuario administrador
            const [userResult] = await connection.execute(`
                INSERT INTO usuarios (codigo_usuario, nombres, apellidos, email, password_hash, rol_id, area_trabajo_id, activo, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
            `, [codigoUsuario, admin.nombres, admin.apellidos, admin.email, admin.password, admin.rol_id, areaId]);

            const userId = userResult.insertId;
            console.log(`✓ Usuario creado: ${codigoUsuario} (ID: ${userId})`);

            // 4. Asignar usuario al área de trabajo como administrador
            await connection.execute(`
                INSERT INTO usuario_areas_trabajo (usuario_id, area_trabajo_id, es_admin, activo, created_at)
                VALUES (?, ?, 1, 1, NOW())
            `, [userId, areaId]);

            console.log(`✓ Usuario asignado como administrador del área ${codigoUnico}`);
        }

        // Verificar la separación entre administradores
        console.log('\n=== VERIFICACIÓN DE SEPARACIÓN ENTRE ADMINISTRADORES ===\n');

        const [usuarios] = await connection.execute(`
            SELECT u.id, u.nombres, u.apellidos, u.email, u.codigo_usuario,
                   a.codigo as area_codigo, a.nombre as area_nombre
            FROM usuarios u
            LEFT JOIN areas_trabajo a ON u.area_trabajo_id = a.id
            WHERE u.rol_id = 1 AND u.activo = 1
            ORDER BY u.id DESC
            LIMIT 10
        `);

        console.log('Administradores registrados:');
        console.table(usuarios);

        // Verificar proyectos por área
        console.log('\n=== PROYECTOS POR ÁREA DE TRABAJO ===\n');

        const [proyectosPorArea] = await connection.execute(`
            SELECT a.codigo as area_codigo, a.nombre as area_nombre,
                   COUNT(p.id) as total_proyectos,
                   GROUP_CONCAT(p.titulo SEPARATOR ', ') as proyectos
            FROM areas_trabajo a
            LEFT JOIN proyectos p ON a.id = p.area_trabajo_id
            WHERE a.activo = 1
            GROUP BY a.id, a.codigo, a.nombre
            ORDER BY a.codigo
        `);

        console.table(proyectosPorArea);

        // Simular acceso cruzado (debe fallar)
        console.log('\n=== PRUEBA DE ACCESO CRUZADO (DEBE FALLAR) ===\n');

        const [admin1] = await connection.execute(`
            SELECT u.id as user_id, a.id as area_id, a.codigo as area_codigo
            FROM usuarios u
            JOIN areas_trabajo a ON u.area_trabajo_id = a.id
            WHERE u.rol_id = 1 AND u.activo = 1
            ORDER BY u.id DESC
            LIMIT 1
        `);

        const [admin2] = await connection.execute(`
            SELECT u.id as user_id, a.id as area_id, a.codigo as area_codigo
            FROM usuarios u
            JOIN areas_trabajo a ON u.area_trabajo_id = a.id
            WHERE u.rol_id = 1 AND u.activo = 1 AND u.id != ?
            ORDER BY u.id DESC
            LIMIT 1
        `, [admin1[0].user_id]);

        if (admin1.length > 0 && admin2.length > 0) {
            // Verificar si admin1 tiene acceso al área de admin2
            const [accesocruzado] = await connection.execute(`
                SELECT 1 FROM usuario_areas_trabajo 
                WHERE usuario_id = ? AND area_trabajo_id = ? AND activo = 1
            `, [admin1[0].user_id, admin2[0].area_id]);

            console.log(`Admin ${admin1[0].area_codigo} intentando acceder al área ${admin2[0].area_codigo}:`);
            console.log(accesocruzado.length > 0 ? '❌ ACCESO PERMITIDO (ERROR)' : '✅ ACCESO DENEGADO (CORRECTO)');
        }

        console.log('\n✅ Prueba de registro con códigos únicos completada exitosamente');

    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    } finally {
        await connection.end();
    }
}

testAdminRegistration();