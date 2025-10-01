const { pool } = require('./src/config/database');

async function debugEntregablesCoordinator() {
    console.log('🔍 Diagnosticando problema de entregables para coordinador ananim...\n');

    try {
        // 1. Verificar información del coordinador
        console.log('📋 1. INFORMACIÓN DEL COORDINADOR:');
        const [coordinatorInfo] = await pool.execute(`
            SELECT id, nombres, apellidos, email 
            FROM usuarios 
            WHERE email = 'ananim@gmail.com'
        `);

        if (coordinatorInfo.length === 0) {
            console.log('❌ No se encontró el coordinador ananim@gmail.com');
            return;
        }

        const coordinator = coordinatorInfo[0];
        console.log(`✅ Coordinador: ${coordinator.nombres} ${coordinator.apellidos} (ID: ${coordinator.id})`);

        // 2. Verificar proyectos del coordinador
        console.log('\n📋 2. PROYECTOS DEL COORDINADOR:');
        const [coordinatorProjects] = await pool.execute(`
            SELECT 
                p.id,
                p.titulo,
                p.estado,
                p.estudiante_id,
                u.nombres as estudiante_nombres,
                u.apellidos as estudiante_apellidos
            FROM proyecto_usuarios pu
            INNER JOIN proyectos p ON pu.proyecto_id = p.id
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
        `, [coordinator.id]);

        console.log(`✅ Proyectos asignados: ${coordinatorProjects.length}`);
        coordinatorProjects.forEach(project => {
            console.log(`   - ${project.titulo} (ID: ${project.id})`);
            console.log(`     Estado: ${project.estado}`);
            console.log(`     Estudiante: ${project.estudiante_nombres || 'Sin asignar'} ${project.estudiante_apellidos || ''}`);
        });

        // 3. Verificar entregables en esos proyectos
        console.log('\n📋 3. ENTREGABLES EN LOS PROYECTOS:');
        
        for (const project of coordinatorProjects) {
            console.log(`\n🔍 Proyecto: ${project.titulo}`);
            
            const [entregables] = await pool.execute(`
                SELECT 
                    e.id,
                    e.titulo,
                    e.descripcion,
                    e.estado,
                    e.fecha_limite,
                    e.fecha_entrega,
                    e.created_at
                FROM entregables e
                WHERE e.proyecto_id = ?
                ORDER BY e.created_at DESC
            `, [project.id]);

            console.log(`   📊 Entregables encontrados: ${entregables.length}`);
            
            if (entregables.length > 0) {
                entregables.forEach(entregable => {
                    console.log(`     - ${entregable.titulo} (Estado: ${entregable.estado})`);
                    console.log(`       Fecha límite: ${entregable.fecha_limite || 'No definida'}`);
                    console.log(`       Fecha entrega: ${entregable.fecha_entrega || 'No entregado'}`);
                });
            } else {
                console.log(`     ⚠️  No hay entregables en este proyecto`);
            }
        }

        // 4. Buscar el método que obtiene entregables para coordinadores
        console.log('\n📋 4. PROBANDO CONSULTAS DE ENTREGABLES PARA COORDINADOR:');
        
        // Consulta típica para entregables de coordinador
        const [coordinatorDeliverables] = await pool.execute(`
            SELECT DISTINCT
                e.id,
                e.titulo,
                e.descripcion,
                e.estado,
                e.fecha_limite,
                e.fecha_entrega,
                e.archivo_path,
                p.titulo as proyecto_titulo,
                u.nombres as estudiante_nombres,
                u.apellidos as estudiante_apellidos
            FROM entregables e
            INNER JOIN proyectos p ON e.proyecto_id = p.id
            INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
            ORDER BY e.created_at DESC
        `, [coordinator.id]);

        console.log(`📊 Entregables encontrados con consulta de coordinador: ${coordinatorDeliverables.length}`);
        
        if (coordinatorDeliverables.length > 0) {
            coordinatorDeliverables.forEach(entregable => {
                console.log(`   - ${entregable.titulo} (${entregable.estado})`);
                console.log(`     Proyecto: ${entregable.proyecto_titulo}`);
                console.log(`     Estudiante: ${entregable.estudiante_nombres || 'Sin asignar'} ${entregable.estudiante_apellidos || ''}`);
            });
        } else {
            console.log('❌ No se encontraron entregables para el coordinador');
        }

        // 5. Verificar si hay entregables en general en el sistema
        console.log('\n📋 5. ENTREGABLES TOTALES EN EL SISTEMA:');
        const [allDeliverables] = await pool.execute(`
            SELECT COUNT(*) as total FROM entregables
        `);
        console.log(`📊 Total de entregables en el sistema: ${allDeliverables[0].total}`);

        // 6. Verificar estructura de la tabla entregables
        console.log('\n📋 6. ESTRUCTURA DE LA TABLA ENTREGABLES:');
        const [tableStructure] = await pool.execute(`
            DESCRIBE entregables
        `);
        
        console.log('   Columnas de la tabla entregables:');
        tableStructure.forEach(column => {
            console.log(`     - ${column.Field}: ${column.Type} (${column.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
        });

        // 7. Crear entregable de prueba si no existe ninguno
        if (coordinatorDeliverables.length === 0 && coordinatorProjects.length > 0) {
            console.log('\n📋 7. CREANDO ENTREGABLE DE PRUEBA:');
            const projectId = coordinatorProjects[0].id;
            
            try {
                const [insertResult] = await pool.execute(`
                    INSERT INTO entregables (
                        titulo, 
                        descripcion, 
                        proyecto_id, 
                        estado, 
                        fecha_limite,
                        created_at
                    ) VALUES (?, ?, ?, ?, ?, NOW())
                `, [
                    'Entregable de Prueba',
                    'Este es un entregable de prueba para verificar la funcionalidad',
                    projectId,
                    'pendiente',
                    '2024-12-31'
                ]);

                console.log(`✅ Entregable de prueba creado con ID: ${insertResult.insertId}`);
                console.log(`   Proyecto: ${coordinatorProjects[0].titulo}`);
                
                // Verificar que ahora aparezca
                const [newCheck] = await pool.execute(`
                    SELECT DISTINCT
                        e.id,
                        e.titulo,
                        e.estado,
                        p.titulo as proyecto_titulo
                    FROM entregables e
                    INNER JOIN proyectos p ON e.proyecto_id = p.id
                    INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
                    WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
                `, [coordinator.id]);

                console.log(`📊 Entregables después de crear prueba: ${newCheck.length}`);
                
            } catch (error) {
                console.error('❌ Error creando entregable de prueba:', error.message);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

debugEntregablesCoordinator();