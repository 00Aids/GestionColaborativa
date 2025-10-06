const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function runMigrationStepByStep() {
    let connection;
    
    try {
        // Crear conexión a la base de datos
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'root',
            database: 'gestion_academica'
        });

        console.log('✅ Conectado a la base de datos');

        // Paso 1: Crear tabla proyecto_usuarios si no existe
        console.log('\n🔄 Paso 1: Creando tabla proyecto_usuarios...');
        try {
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS proyecto_usuarios (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    proyecto_id INT NOT NULL,
                    usuario_id INT NOT NULL,
                    rol_en_proyecto ENUM('estudiante', 'director', 'coordinador', 'evaluador') NOT NULL DEFAULT 'estudiante',
                    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    activo BOOLEAN DEFAULT TRUE,
                    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
                    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
                )
            `);
            console.log('✅ Tabla proyecto_usuarios creada/verificada');
        } catch (error) {
            console.log('⚠️ Error creando tabla proyecto_usuarios:', error.message);
        }

        // Paso 2: Agregar columna usa_asignaciones_multiples
        console.log('\n🔄 Paso 2: Agregando columna usa_asignaciones_multiples...');
        try {
            await connection.execute(`
                ALTER TABLE proyectos 
                ADD COLUMN usa_asignaciones_multiples BOOLEAN DEFAULT TRUE
            `);
            console.log('✅ Columna usa_asignaciones_multiples agregada');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ Columna usa_asignaciones_multiples ya existe');
            } else {
                console.log('⚠️ Error agregando columna:', error.message);
            }
        }

        // Paso 3: Migrar estudiantes
        console.log('\n🔄 Paso 3: Migrando estudiantes...');
        const [estudiantesResult] = await connection.execute(`
            INSERT IGNORE INTO proyecto_usuarios (proyecto_id, usuario_id, rol, fecha_asignacion, estado)
            SELECT 
                p.id as proyecto_id,
                p.estudiante_id as usuario_id,
                'estudiante' as rol,
                p.created_at as fecha_asignacion,
                'activo' as estado
            FROM proyectos p 
            WHERE p.estudiante_id IS NOT NULL
        `);
        console.log(`✅ Estudiantes migrados: ${estudiantesResult.affectedRows}`);

        // Paso 4: Migrar directores
        console.log('\n🔄 Paso 4: Migrando directores...');
        const [directoresResult] = await connection.execute(`
            INSERT IGNORE INTO proyecto_usuarios (proyecto_id, usuario_id, rol, fecha_asignacion, estado)
            SELECT 
                p.id as proyecto_id,
                p.director_id as usuario_id,
                'coordinador' as rol,
                p.created_at as fecha_asignacion,
                'activo' as estado
            FROM proyectos p 
            WHERE p.director_id IS NOT NULL
        `);
        console.log(`✅ Directores migrados: ${directoresResult.affectedRows}`);

        // Paso 5: Migrar evaluadores
        console.log('\n🔄 Paso 5: Migrando evaluadores...');
        const [evaluadoresResult] = await connection.execute(`
            INSERT IGNORE INTO proyecto_usuarios (proyecto_id, usuario_id, rol, fecha_asignacion, estado)
            SELECT 
                p.id as proyecto_id,
                p.evaluador_id as usuario_id,
                'evaluador' as rol,
                p.created_at as fecha_asignacion,
                'activo' as estado
            FROM proyectos p 
            WHERE p.evaluador_id IS NOT NULL
        `);
        console.log(`✅ Evaluadores migrados: ${evaluadoresResult.affectedRows}`);

        // Paso 6: Actualizar roles basados en rol_id
        console.log('\n🔄 Paso 6: Actualizando roles basados en rol_id...');
        const [rolesResult] = await connection.execute(`
            UPDATE proyecto_usuarios pu
            JOIN usuarios u ON pu.usuario_id = u.id
            JOIN roles r ON u.rol_id = r.id
            SET pu.rol = CASE 
                WHEN r.nombre = 'Estudiante' THEN 'estudiante'
                WHEN r.nombre = 'Director de Proyecto' THEN 'coordinador'
                WHEN r.nombre = 'Coordinador Académico' THEN 'coordinador'
                WHEN r.nombre = 'Evaluador' THEN 'evaluador'
                WHEN r.nombre = 'Administrador General' THEN 'administrador'
                ELSE 'estudiante'
            END
            WHERE pu.rol = 'estudiante' 
            AND r.nombre != 'Estudiante'
        `);
        console.log(`✅ Roles actualizados: ${rolesResult.affectedRows}`);

        // Paso 7: Marcar proyectos como usando nueva estructura
        console.log('\n🔄 Paso 7: Marcando proyectos con nueva estructura...');
        const [markResult] = await connection.execute(`
            UPDATE proyectos SET usa_asignaciones_multiples = TRUE
        `);
        console.log(`✅ ${markResult.affectedRows} proyectos marcados`);

        // Verificar los resultados
        console.log('\n📊 Verificando resultados...');
        
        // Contar registros en proyecto_usuarios
        const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM proyecto_usuarios');
        console.log(`📈 Total de asignaciones en proyecto_usuarios: ${countResult[0].total}`);

        // Mostrar distribución por roles
        const [roleDistribution] = await connection.execute(`
            SELECT rol, COUNT(*) as cantidad 
            FROM proyecto_usuarios 
            GROUP BY rol
        `);
        console.log('\n📊 Distribución por roles:');
        roleDistribution.forEach(row => {
            console.log(`   ${row.rol}: ${row.cantidad}`);
        });

        // Verificar asignación específica del coordinador
        console.log('\n🔍 Verificando asignación de nuevocoordinador3@test.com...');
        const [coordinatorCheck] = await connection.execute(`
            SELECT 
                u.email,
                r.nombre as rol_usuario,
                p.titulo as proyecto_nombre,
                pu.rol,
                pu.fecha_asignacion
            FROM usuarios u
            JOIN proyecto_usuarios pu ON u.id = pu.usuario_id
            JOIN proyectos p ON pu.proyecto_id = p.id
            JOIN roles r ON u.rol_id = r.id
            WHERE u.email = 'nuevocoordinador3@test.com'
            AND pu.estado = 'activo'
        `);

        if (coordinatorCheck.length > 0) {
            coordinatorCheck.forEach(row => {
                console.log(`   ✅ Asignado a "${row.proyecto_nombre}" como ${row.rol} (${row.fecha_asignacion})`);
            });
        } else {
            console.log('   ❌ No se encontraron asignaciones para nuevocoordinador3@test.com');
        }

        console.log('\n✅ Migración completada exitosamente');

    } catch (error) {
        console.error('❌ Error ejecutando migración:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexión cerrada');
        }
    }
}

// Ejecutar la migración
runMigrationStepByStep().catch(console.error);