const mysql = require('mysql2/promise');
require('dotenv').config();

async function investigateInactiveAssignments() {
    console.log('🔍 INVESTIGANDO CAUSA RAÍZ DE ASIGNACIONES INACTIVAS');
    console.log('=' .repeat(60));
    
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        // 1. Verificar la estructura de proyecto_usuarios
        console.log('\n📋 PASO 1: Verificando estructura de proyecto_usuarios...');
        const [structure] = await pool.execute('DESCRIBE proyecto_usuarios');
        
        console.log('   Columnas de proyecto_usuarios:');
        structure.forEach(col => {
            console.log(`   - ${col.Field}: ${col.Type} (Default: ${col.Default})`);
        });

        // 2. Buscar todas las asignaciones con estado inactivo
        console.log('\n📋 PASO 2: Buscando asignaciones inactivas...');
        const [inactiveAssignments] = await pool.execute(`
            SELECT pu.*, 
                   p.titulo as proyecto_titulo,
                   CONCAT(u.nombres, ' ', u.apellidos) as usuario_nombre,
                   u.email,
                   pu.fecha_asignacion
            FROM proyecto_usuarios pu
            JOIN proyectos p ON pu.proyecto_id = p.id
            JOIN usuarios u ON pu.usuario_id = u.id
            WHERE pu.estado = 'inactivo'
            ORDER BY pu.fecha_asignacion DESC
        `);

        if (inactiveAssignments.length > 0) {
            console.log(`   ❌ Encontradas ${inactiveAssignments.length} asignaciones inactivas:`);
            inactiveAssignments.forEach((assignment, index) => {
                console.log(`   ${index + 1}. ${assignment.usuario_nombre} (${assignment.email})`);
                console.log(`      Proyecto: ${assignment.proyecto_titulo}`);
                console.log(`      Rol: ${assignment.rol}`);
                console.log(`      Fecha asignación: ${assignment.fecha_asignacion}`);
                console.log(`      Estado: ${assignment.estado}`);
                console.log('');
            });
        } else {
            console.log('   ✅ No se encontraron asignaciones inactivas actualmente');
        }

        // 3. Revisar el código de joinProjectWithCode
        console.log('\n📋 PASO 3: Analizando el código de unión por invitación...');
        console.log('   El método joinProjectWithCode en Project.js establece:');
        console.log('   - estado: "activo" (línea 426)');
        console.log('   - rol: "estudiante"');
        console.log('   - fecha_asignacion: new Date()');
        console.log('   ✅ El código inicial parece correcto');

        // 4. Buscar otros lugares donde se pueda cambiar el estado
        console.log('\n📋 PASO 4: Buscando operaciones UPDATE en proyecto_usuarios...');
        
        // Simular búsqueda de archivos que contengan UPDATE proyecto_usuarios
        console.log('   Archivos que podrían modificar estado en proyecto_usuarios:');
        console.log('   - AdminController.js: removeMember, changeUserRole');
        console.log('   - Project.js: getProjectMembers (solo SELECT con filtro activo)');
        console.log('   - Posibles migraciones o scripts de limpieza');

        // 5. Verificar si hay triggers o procedimientos almacenados
        console.log('\n📋 PASO 5: Verificando triggers y procedimientos...');
        
        const [triggers] = await pool.execute(`
            SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE 
            FROM information_schema.TRIGGERS 
            WHERE EVENT_OBJECT_SCHEMA = ? AND EVENT_OBJECT_TABLE = 'proyecto_usuarios'
        `, [process.env.DB_NAME]);

        if (triggers.length > 0) {
            console.log('   ⚠️  Triggers encontrados:');
            triggers.forEach(trigger => {
                console.log(`   - ${trigger.TRIGGER_NAME} (${trigger.EVENT_MANIPULATION})`);
            });
        } else {
            console.log('   ✅ No hay triggers en proyecto_usuarios');
        }

        // 6. Verificar procedimientos almacenados
        const [procedures] = await pool.execute(`
            SELECT ROUTINE_NAME, ROUTINE_TYPE 
            FROM information_schema.ROUTINES 
            WHERE ROUTINE_SCHEMA = ?
        `, [process.env.DB_NAME]);

        if (procedures.length > 0) {
            console.log('   📋 Procedimientos almacenados encontrados:');
            procedures.forEach(proc => {
                console.log(`   - ${proc.ROUTINE_NAME} (${proc.ROUTINE_TYPE})`);
            });
        } else {
            console.log('   ✅ No hay procedimientos almacenados');
        }

        // 7. Buscar patrones en las asignaciones inactivas
        if (inactiveAssignments.length > 0) {
            console.log('\n📋 PASO 6: Analizando patrones en asignaciones inactivas...');
            
            // Agrupar por rol
            const roleGroups = {};
            inactiveAssignments.forEach(assignment => {
                if (!roleGroups[assignment.rol]) {
                    roleGroups[assignment.rol] = [];
                }
                roleGroups[assignment.rol].push(assignment);
            });

            console.log('   Distribución por rol:');
            Object.keys(roleGroups).forEach(rol => {
                console.log(`   - ${rol}: ${roleGroups[rol].length} asignaciones`);
            });

            // Verificar fechas
            const oldestInactive = inactiveAssignments[inactiveAssignments.length - 1];
            const newestInactive = inactiveAssignments[0];
            
            console.log(`   Rango de fechas: ${oldestInactive.fecha_asignacion} a ${newestInactive.fecha_asignacion}`);
        }

        // 8. Recomendaciones
        console.log('\n📋 PASO 7: RECOMENDACIONES');
        console.log('   1. Revisar AdminController.js para métodos que cambien estado');
        console.log('   2. Verificar si hay scripts de migración que cambien estados');
        console.log('   3. Revisar logs de aplicación para operaciones UPDATE');
        console.log('   4. Considerar agregar logging a operaciones de cambio de estado');
        console.log('   5. Implementar validación para prevenir estados inactivos no deseados');

        // 9. Propuesta de solución preventiva
        console.log('\n📋 PASO 8: PROPUESTA DE SOLUCIÓN PREVENTIVA');
        console.log('   - Modificar joinProjectWithCode para forzar estado activo');
        console.log('   - Agregar logging a cambios de estado en proyecto_usuarios');
        console.log('   - Crear validación que impida estados inactivos sin justificación');
        console.log('   - Implementar auditoría de cambios en asignaciones');

        console.log('\n✅ INVESTIGACIÓN COMPLETADA');
        
    } catch (error) {
        console.error('❌ Error durante la investigación:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await pool.end();
    }
}

investigateInactiveAssignments();