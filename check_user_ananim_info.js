const { pool } = require('./src/config/database');

async function checkUserAnanim() {
    console.log('🔍 CONSULTANDO INFORMACIÓN DEL USUARIO ananim@gmail.com');
    console.log('=' .repeat(60));

    try {
        // 1. Información básica del usuario
        console.log('\n👤 INFORMACIÓN BÁSICA DEL USUARIO:');
        const [userRows] = await pool.execute(`
            SELECT 
                u.id,
                u.codigo_usuario,
                u.email,
                u.nombres,
                u.apellidos,
                u.telefono,
                u.activo,
                u.ultimo_acceso,
                u.created_at,
                r.nombre as rol_nombre,
                at.nombre as area_trabajo_nombre,
                at.codigo as area_trabajo_codigo
            FROM usuarios u
            LEFT JOIN roles r ON u.rol_id = r.id
            LEFT JOIN areas_trabajo at ON u.area_trabajo_id = at.id
            WHERE u.email = ?
        `, ['ananim@gmail.com']);

        if (userRows.length === 0) {
            console.log('❌ Usuario no encontrado');
            return;
        }

        const user = userRows[0];
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   👤 Nombre: ${user.nombres} ${user.apellidos}`);
        console.log(`   🆔 ID: ${user.id}`);
        console.log(`   📱 Código: ${user.codigo_usuario}`);
        console.log(`   📞 Teléfono: ${user.telefono || 'No especificado'}`);
        console.log(`   🎭 Rol: ${user.rol_nombre}`);
        console.log(`   🏢 Área de trabajo: ${user.area_trabajo_nombre} (${user.area_trabajo_codigo})`);
        console.log(`   ✅ Activo: ${user.activo ? 'Sí' : 'No'}`);
        console.log(`   🕐 Último acceso: ${user.ultimo_acceso || 'Nunca'}`);
        console.log(`   📅 Creado: ${user.created_at}`);

        // 2. Proyectos donde participa
        console.log('\n📋 PROYECTOS DONDE PARTICIPA:');
        const [projectRows] = await pool.execute(`
            SELECT 
                p.id,
                p.titulo,
                p.descripcion,
                p.estado,
                p.created_at,
                pu.rol as rol_en_proyecto,
                pu.fecha_asignacion,
                estudiante.nombres as estudiante_nombres,
                estudiante.apellidos as estudiante_apellidos,
                director.nombres as director_nombres,
                director.apellidos as director_apellidos,
                evaluador.nombres as evaluador_nombres,
                evaluador.apellidos as evaluador_apellidos,
                li.nombre as linea_investigacion,
                at_proyecto.nombre as area_proyecto,
                ca.nombre as ciclo_academico,
                fa.nombre as fase_actual
            FROM proyecto_usuarios pu
            JOIN proyectos p ON pu.proyecto_id = p.id
            LEFT JOIN usuarios estudiante ON p.estudiante_id = estudiante.id
            LEFT JOIN usuarios director ON p.director_id = director.id
            LEFT JOIN usuarios evaluador ON p.evaluador_id = evaluador.id
            LEFT JOIN lineas_investigacion li ON p.linea_investigacion_id = li.id
            LEFT JOIN areas_trabajo at_proyecto ON p.area_trabajo_id = at_proyecto.id
            LEFT JOIN ciclos_academicos ca ON p.ciclo_academico_id = ca.id
            LEFT JOIN fases_proyecto fa ON p.fase_actual_id = fa.id
            WHERE pu.usuario_id = ?
            ORDER BY pu.fecha_asignacion DESC
        `, [user.id]);

        if (projectRows.length === 0) {
            console.log('   📭 No participa en ningún proyecto');
        } else {
            projectRows.forEach((project, index) => {
                console.log(`\n   📋 PROYECTO ${index + 1}:`);
                console.log(`      🆔 ID: ${project.id}`);
                console.log(`      📝 Título: ${project.titulo}`);
                console.log(`      📄 Descripción: ${project.descripcion || 'Sin descripción'}`);
                console.log(`      🎭 Rol en proyecto: ${project.rol_en_proyecto}`);
                console.log(`      📅 Fecha asignación: ${project.fecha_asignacion}`);
                console.log(`      📊 Estado: ${project.estado}`);
                console.log(`      🎓 Estudiante: ${project.estudiante_nombres} ${project.estudiante_apellidos}`);
                console.log(`      👨‍🏫 Director: ${project.director_nombres} ${project.director_apellidos}`);
                console.log(`      👨‍⚖️ Evaluador: ${project.evaluador_nombres || 'No asignado'} ${project.evaluador_apellidos || ''}`);
                console.log(`      🔬 Línea investigación: ${project.linea_investigacion || 'No especificada'}`);
                console.log(`      🏢 Área proyecto: ${project.area_proyecto || 'No especificada'}`);
                console.log(`      📚 Ciclo académico: ${project.ciclo_academico || 'No especificado'}`);
                console.log(`      📈 Fase actual: ${project.fase_actual || 'No especificada'}`);
                console.log(`      📅 Creado: ${project.created_at}`);
            });
        }

        // 3. Entregables asignados
        console.log('\n📦 ENTREGABLES ASIGNADOS:');
        const [deliverableRows] = await pool.execute(`
            SELECT 
                e.id,
                e.titulo,
                e.descripcion,
                e.estado,
                e.estado_workflow,
                e.prioridad,
                e.fecha_limite,
                e.fecha_entrega,
                e.archivo_url,
                e.observaciones,
                e.created_at,
                p.titulo as proyecto_titulo,
                p.id as proyecto_id,
                asignado.nombres as asignado_nombres,
                asignado.apellidos as asignado_apellidos
            FROM entregables e
            JOIN proyectos p ON e.proyecto_id = p.id
            JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            LEFT JOIN usuarios asignado ON e.asignado_a = asignado.id
            WHERE pu.usuario_id = ? OR e.asignado_a = ?
            ORDER BY e.fecha_limite ASC
        `, [user.id, user.id]);

        if (deliverableRows.length === 0) {
            console.log('   📭 No tiene entregables asignados');
        } else {
            deliverableRows.forEach((deliverable, index) => {
                console.log(`\n   📦 ENTREGABLE ${index + 1}:`);
                console.log(`      🆔 ID: ${deliverable.id}`);
                console.log(`      📝 Título: ${deliverable.titulo}`);
                console.log(`      📄 Descripción: ${deliverable.descripcion || 'Sin descripción'}`);
                console.log(`      📊 Estado: ${deliverable.estado}`);
                console.log(`      🔄 Estado workflow: ${deliverable.estado_workflow}`);
                console.log(`      🔥 Prioridad: ${deliverable.prioridad}`);
                console.log(`      ⏰ Fecha límite: ${deliverable.fecha_limite}`);
                console.log(`      📅 Fecha entrega: ${deliverable.fecha_entrega || 'No entregado'}`);
                console.log(`      📁 Archivo URL: ${deliverable.archivo_url || 'Sin archivo'}`);
                console.log(`      💬 Observaciones: ${deliverable.observaciones || 'Sin observaciones'}`);
                console.log(`      👤 Asignado a: ${deliverable.asignado_nombres || 'No asignado'} ${deliverable.asignado_apellidos || ''}`);
                console.log(`      📋 Proyecto: ${deliverable.proyecto_titulo} (ID: ${deliverable.proyecto_id})`);
                console.log(`      📅 Creado: ${deliverable.created_at}`);
            });
        }

        // 4. Subtareas asignadas
        console.log('\n✅ SUBTAREAS ASIGNADAS:');
        const [taskRows] = await pool.execute(`
            SELECT 
                st.id,
                st.titulo,
                st.descripcion,
                st.estado,
                st.fecha_completado,
                st.orden,
                st.created_at,
                asignado.nombres as asignado_nombres,
                asignado.apellidos as asignado_apellidos,
                completado.nombres as completado_nombres,
                completado.apellidos as completado_apellidos
            FROM subtareas st
            LEFT JOIN usuarios asignado ON st.asignado_a = asignado.id
            LEFT JOIN usuarios completado ON st.completado_por = completado.id
            WHERE st.asignado_a = ?
            ORDER BY st.created_at DESC
        `, [user.id]);

        if (taskRows.length === 0) {
            console.log('   📭 No tiene subtareas asignadas');
        } else {
            taskRows.forEach((task, index) => {
                console.log(`\n   ✅ SUBTAREA ${index + 1}:`);
                console.log(`      🆔 ID: ${task.id}`);
                console.log(`      📝 Título: ${task.titulo}`);
                console.log(`      📄 Descripción: ${task.descripcion || 'Sin descripción'}`);
                console.log(`      📊 Estado: ${task.estado}`);
                console.log(`      📋 Orden: ${task.orden}`);
                console.log(`      ✅ Fecha completada: ${task.fecha_completado || 'No completada'}`);
                console.log(`      👤 Asignado a: ${task.asignado_nombres} ${task.asignado_apellidos}`);
                console.log(`      ✅ Completado por: ${task.completado_nombres || 'No completada'} ${task.completado_apellidos || ''}`);
                console.log(`      📅 Creado: ${task.created_at}`);
            });
        }

        // 5. Invitaciones enviadas o recibidas
        console.log('\n📨 INVITACIONES:');
        const [invitationRows] = await pool.execute(`
            SELECT 
                pi.id,
                pi.codigo_invitacion,
                pi.max_usos,
                pi.usos_actuales,
                pi.fecha_expiracion,
                pi.activo,
                pi.created_at,
                p.titulo as proyecto_titulo,
                p.id as proyecto_id,
                creador.nombres as creador_nombres,
                creador.apellidos as creador_apellidos
            FROM project_invitations pi
            JOIN proyectos p ON pi.proyecto_id = p.id
            LEFT JOIN usuarios creador ON pi.creado_por_id = creador.id
            WHERE pi.creado_por_id = ?
            ORDER BY pi.created_at DESC
        `, [user.id]);

        if (invitationRows.length === 0) {
            console.log('   📭 No ha creado invitaciones');
        } else {
            invitationRows.forEach((invitation, index) => {
                console.log(`\n   📨 INVITACIÓN ${index + 1}:`);
                console.log(`      🆔 ID: ${invitation.id}`);
                console.log(`      🔑 Código: ${invitation.codigo_invitacion}`);
                console.log(`      📊 Usos: ${invitation.usos_actuales}/${invitation.max_usos}`);
                console.log(`      ⏰ Expira: ${invitation.fecha_expiracion}`);
                console.log(`      ✅ Activo: ${invitation.activo ? 'Sí' : 'No'}`);
                console.log(`      📋 Proyecto: ${invitation.proyecto_titulo} (ID: ${invitation.proyecto_id})`);
                console.log(`      👤 Creado por: ${invitation.creador_nombres} ${invitation.creador_apellidos}`);
                console.log(`      📅 Creado: ${invitation.created_at}`);
            });
        }

        // 6. Resumen estadístico
        console.log('\n📊 RESUMEN ESTADÍSTICO:');
        console.log(`   📋 Total proyectos: ${projectRows.length}`);
        console.log(`   📦 Total entregables: ${deliverableRows.length}`);
        console.log(`   ✅ Total subtareas: ${taskRows.length}`);
        console.log(`   📨 Total invitaciones creadas: ${invitationRows.length}`);

        // Contar entregables por estado
        const entregablesPorEstado = {};
        deliverableRows.forEach(d => {
            entregablesPorEstado[d.estado] = (entregablesPorEstado[d.estado] || 0) + 1;
        });
        
        if (Object.keys(entregablesPorEstado).length > 0) {
            console.log('\n   📦 Entregables por estado:');
            Object.entries(entregablesPorEstado).forEach(([estado, count]) => {
                console.log(`      ${estado}: ${count}`);
            });
        }

        // Contar subtareas por estado
        const subtareasPorEstado = {};
        taskRows.forEach(t => {
            subtareasPorEstado[t.estado] = (subtareasPorEstado[t.estado] || 0) + 1;
        });
        
        if (Object.keys(subtareasPorEstado).length > 0) {
            console.log('\n   ✅ Subtareas por estado:');
            Object.entries(subtareasPorEstado).forEach(([estado, count]) => {
                console.log(`      ${estado}: ${count}`);
            });
        }

    } catch (error) {
        console.error('❌ Error al consultar información del usuario:', error);
    } finally {
        await pool.end();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    checkUserAnanim()
        .then(() => {
            console.log('\n✅ Consulta completada');
        })
        .catch(error => {
            console.error('❌ Error:', error);
            process.exit(1);
        });
}

module.exports = checkUserAnanim;