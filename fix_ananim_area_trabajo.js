const { pool } = require('./src/config/database');

async function fixAnanimAreaTrabajo() {
    try {
        console.log('🔧 CORRIGIENDO ÁREA DE TRABAJO DEL COORDINADOR ANANIM');
        console.log('='.repeat(60));

        // 1. Verificar estado actual del coordinador
        console.log('\n📋 1. ESTADO ACTUAL DEL COORDINADOR:');
        const [coordinator] = await pool.execute(`
            SELECT id, nombres, apellidos, email, area_trabajo_id 
            FROM usuarios 
            WHERE email = 'ananim@gmail.com'
        `);

        if (coordinator.length === 0) {
            console.log('❌ Coordinador ananim no encontrado');
            return;
        }

        const coord = coordinator[0];
        console.log(`✅ Coordinador: ${coord.nombres} ${coord.apellidos}`);
        console.log(`   ID: ${coord.id}`);
        console.log(`   Área de trabajo actual: ${coord.area_trabajo_id || 'NULL'}`);

        // 2. Verificar proyectos asignados al coordinador
        console.log('\n📋 2. PROYECTOS ASIGNADOS AL COORDINADOR:');
        const [assignedProjects] = await pool.execute(`
            SELECT DISTINCT p.id, p.titulo, p.area_trabajo_id, at.nombre as area_nombre
            FROM proyectos p
            LEFT JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            LEFT JOIN areas_trabajo at ON p.area_trabajo_id = at.id
            WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
        `, [coord.id]);

        console.log(`📊 Proyectos asignados: ${assignedProjects.length}`);
        assignedProjects.forEach(project => {
            console.log(`   - ${project.titulo} (Área ID: ${project.area_trabajo_id}, Área: ${project.area_nombre})`);
        });

        // 3. Verificar todas las áreas de trabajo disponibles
        console.log('\n📋 3. ÁREAS DE TRABAJO DISPONIBLES:');
        const [allAreas] = await pool.execute(`
            SELECT id, nombre, descripcion 
            FROM areas_trabajo 
            ORDER BY id
        `);

        console.log(`📊 Áreas disponibles: ${allAreas.length}`);
        allAreas.forEach(area => {
            console.log(`   - ID: ${area.id}, Nombre: ${area.nombre}`);
        });

        // 4. Determinar el área de trabajo correcta
        let correctAreaId = null;
        if (assignedProjects.length > 0) {
            // Usar el área del primer proyecto asignado
            correctAreaId = assignedProjects[0].area_trabajo_id;
            console.log(`\n💡 Área de trabajo determinada por proyecto asignado: ${correctAreaId}`);
        } else {
            // Si no hay proyectos asignados, usar la primera área disponible
            if (allAreas.length > 0) {
                correctAreaId = allAreas[0].id;
                console.log(`\n💡 Área de trabajo por defecto (primera disponible): ${correctAreaId}`);
            }
        }

        if (!correctAreaId) {
            console.log('\n❌ No se pudo determinar un área de trabajo válida');
            return;
        }

        // 5. Actualizar el área de trabajo del coordinador
        console.log('\n📋 5. ACTUALIZANDO ÁREA DE TRABAJO:');
        const [updateResult] = await pool.execute(`
            UPDATE usuarios 
            SET area_trabajo_id = ? 
            WHERE id = ?
        `, [correctAreaId, coord.id]);

        console.log(`✅ Área de trabajo actualizada: ${updateResult.affectedRows} fila(s) afectada(s)`);

        // 6. Verificar la actualización
        console.log('\n📋 6. VERIFICANDO ACTUALIZACIÓN:');
        const [updatedCoordinator] = await pool.execute(`
            SELECT u.id, u.nombres, u.apellidos, u.area_trabajo_id, at.nombre as area_nombre
            FROM usuarios u
            LEFT JOIN areas_trabajo at ON u.area_trabajo_id = at.id
            WHERE u.id = ?
        `, [coord.id]);

        const updated = updatedCoordinator[0];
        console.log(`✅ Coordinador actualizado:`);
        console.log(`   Nombre: ${updated.nombres} ${updated.apellidos}`);
        console.log(`   Área ID: ${updated.area_trabajo_id}`);
        console.log(`   Área nombre: ${updated.area_nombre}`);

        // 7. Probar consulta de entregables con el área corregida
        console.log('\n📋 7. PROBANDO CONSULTA DE ENTREGABLES:');
        const [entregables] = await pool.execute(`
            SELECT 
                e.id,
                e.titulo,
                e.estado,
                p.titulo as proyecto_titulo,
                u.nombres as estudiante_nombres,
                u.apellidos as estudiante_apellidos
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            WHERE p.area_trabajo_id = ?
            ORDER BY e.created_at DESC
        `, [correctAreaId]);

        console.log(`📊 Entregables encontrados: ${entregables.length}`);
        entregables.forEach(e => {
            console.log(`   - ${e.titulo} (${e.estado}) - Proyecto: ${e.proyecto_titulo}`);
            console.log(`     Estudiante: ${e.estudiante_nombres || 'Sin asignar'} ${e.estudiante_apellidos || ''}`);
        });

        console.log('\n✅ CORRECCIÓN COMPLETADA');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Error en la corrección:', error);
    } finally {
        await pool.end();
    }
}

fixAnanimAreaTrabajo();