const { pool } = require('./src/config/database');

async function checkEntregablesStructure() {
    console.log('🔍 Verificando estructura de entregables y corrigiendo consulta...\n');

    try {
        // 1. Verificar estructura de la tabla entregables
        console.log('📋 1. ESTRUCTURA DE LA TABLA ENTREGABLES:');
        const [tableStructure] = await pool.execute(`
            DESCRIBE entregables
        `);
        
        console.log('   Columnas disponibles:');
        const availableColumns = [];
        tableStructure.forEach(column => {
            console.log(`     - ${column.Field}: ${column.Type}`);
            availableColumns.push(column.Field);
        });

        // 2. Verificar coordinador
        console.log('\n📋 2. COORDINADOR ANANIM:');
        const [coordinatorInfo] = await pool.execute(`
            SELECT id, nombres, apellidos, email 
            FROM usuarios 
            WHERE email = 'ananim@gmail.com'
        `);
        const coordinator = coordinatorInfo[0];
        console.log(`✅ Coordinador: ${coordinator.nombres} ${coordinator.apellidos} (ID: ${coordinator.id})`);

        // 3. Consulta corregida sin archivo_path
        console.log('\n📋 3. CONSULTA CORREGIDA PARA ENTREGABLES:');
        const query = `
            SELECT DISTINCT
                e.id,
                e.titulo,
                e.descripcion,
                e.estado,
                e.fecha_limite,
                e.fecha_entrega,
                e.created_at,
                p.titulo as proyecto_titulo,
                p.id as proyecto_id,
                u.nombres as estudiante_nombres,
                u.apellidos as estudiante_apellidos
            FROM entregables e
            INNER JOIN proyectos p ON e.proyecto_id = p.id
            INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
            ORDER BY e.created_at DESC
        `;

        console.log('   Ejecutando consulta corregida...');
        const [coordinatorDeliverables] = await pool.execute(query, [coordinator.id]);

        console.log(`📊 Entregables encontrados: ${coordinatorDeliverables.length}`);
        
        if (coordinatorDeliverables.length > 0) {
            console.log('\n✅ ENTREGABLES ENCONTRADOS:');
            coordinatorDeliverables.forEach((entregable, index) => {
                console.log(`   ${index + 1}. ${entregable.titulo}`);
                console.log(`      Estado: ${entregable.estado}`);
                console.log(`      Proyecto: ${entregable.proyecto_titulo}`);
                console.log(`      Estudiante: ${entregable.estudiante_nombres || 'Sin asignar'} ${entregable.estudiante_apellidos || ''}`);
                console.log(`      Fecha límite: ${entregable.fecha_limite || 'No definida'}`);
                console.log(`      Fecha entrega: ${entregable.fecha_entrega || 'No entregado'}`);
                console.log('');
            });

            // 4. Calcular estadísticas como en la vista
            console.log('📈 ESTADÍSTICAS PARA LA VISTA:');
            const nuevos = coordinatorDeliverables.filter(e => e.estado === 'pendiente' || e.estado === 'nuevo').length;
            const enRevision = coordinatorDeliverables.filter(e => e.estado === 'en_revision').length;
            const requierenCambios = coordinatorDeliverables.filter(e => e.estado === 'requiere_cambios').length;
            const aprobadosHoy = coordinatorDeliverables.filter(e => {
                if (e.estado === 'aprobado' && e.fecha_entrega) {
                    const today = new Date().toDateString();
                    const entregaDate = new Date(e.fecha_entrega).toDateString();
                    return today === entregaDate;
                }
                return false;
            }).length;

            console.log(`   - Nuevos Entregables: ${nuevos}`);
            console.log(`   - En Revisión: ${enRevision}`);
            console.log(`   - Requieren Cambios: ${requierenCambios}`);
            console.log(`   - Aprobados Hoy: ${aprobadosHoy}`);

        } else {
            console.log('\n❌ NO SE ENCONTRARON ENTREGABLES');
            
            // Verificar si el problema es la consulta o no hay entregables
            console.log('\n🔍 DIAGNÓSTICO ADICIONAL:');
            
            // Verificar entregables directos del proyecto
            const [directDeliverables] = await pool.execute(`
                SELECT e.*, p.titulo as proyecto_titulo
                FROM entregables e
                INNER JOIN proyectos p ON e.proyecto_id = p.id
                WHERE p.id IN (
                    SELECT pu.proyecto_id 
                    FROM proyecto_usuarios pu 
                    WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
                )
            `, [coordinator.id]);

            console.log(`   Entregables en proyectos del coordinador: ${directDeliverables.length}`);
            if (directDeliverables.length > 0) {
                directDeliverables.forEach(e => {
                    console.log(`     - ${e.titulo} (${e.estado}) en ${e.proyecto_titulo}`);
                });
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

checkEntregablesStructure();