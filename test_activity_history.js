const AreaActivityLogger = require('./src/services/AreaActivityLogger');
const HistorialAreaTrabajo = require('./src/models/HistorialAreaTrabajo');

async function testActivityHistory() {
    console.log('🧪 Iniciando pruebas del sistema de historial de actividades...\n');

    try {
        // Instanciar el logger
        const logger = new AreaActivityLogger();
        const historialModel = new HistorialAreaTrabajo();

        // Datos de prueba
        const testAreaId = 1;
        const testUserId = 1;

        console.log('1. Probando registro de actividad de proyecto...');
        await logger.logProjectActivity(
            testAreaId,
            testUserId,
            'crear',
            {
                id: 999,
                titulo: 'Proyecto de Prueba',
                estado: 'activo'
            },
            null,
            null
        );
        console.log('✅ Actividad de proyecto registrada correctamente\n');

        console.log('2. Probando registro de actividad de usuario...');
        await logger.logUserActivity(
            testAreaId,
            testUserId,
            'actualizar',
            {
                id: 999,
                nombres: 'Usuario',
                apellidos: 'Prueba',
                rol: 'Estudiante'
            },
            {
                id: 999,
                nombres: 'Usuario',
                apellidos: 'Anterior',
                rol: 'Estudiante'
            },
            null
        );
        console.log('✅ Actividad de usuario registrada correctamente\n');

        console.log('3. Probando registro de actividad de entregable...');
        await logger.logDeliverableActivity(
            testAreaId,
            testUserId,
            'entregar',
            {
                id: 999,
                titulo: 'Entregable de Prueba'
            },
            null,
            null
        );
        console.log('✅ Actividad de entregable registrada correctamente\n');

        console.log('4. Probando obtención de historial...');
        const historial = await logger.getActivityHistory(testAreaId, {
            limit: 5
        });
        console.log(`✅ Historial obtenido: ${historial.data?.length || 0} actividades encontradas\n`);

        console.log('5. Probando obtención de actividad reciente...');
        const reciente = await logger.getRecentActivity(testAreaId, 3);
        console.log(`✅ Actividad reciente obtenida: ${reciente?.length || 0} actividades\n`);

        console.log('6. Probando obtención de estadísticas...');
        const estadisticas = await logger.getActivityStats(testAreaId, 30);
        console.log('✅ Estadísticas obtenidas correctamente\n');

        // Mostrar algunas actividades recientes
        if (reciente && reciente.length > 0) {
            console.log('📊 Últimas actividades registradas:');
            reciente.forEach((actividad, index) => {
                console.log(`   ${index + 1}. ${actividad.descripcion} (${actividad.accion})`);
            });
            console.log('');
        }

        // Limpiar datos de prueba
        console.log('7. Limpiando datos de prueba...');
        await historialModel.db.query(
            'DELETE FROM historial_area_trabajo WHERE entidad_id = 999 AND descripcion LIKE "%Prueba%"'
        );
        console.log('✅ Datos de prueba limpiados\n');

        console.log('🎉 ¡Todas las pruebas del sistema de historial completadas exitosamente!');

    } catch (error) {
        console.error('❌ Error durante las pruebas:', error);
        process.exit(1);
    }
}

// Ejecutar las pruebas
testActivityHistory();