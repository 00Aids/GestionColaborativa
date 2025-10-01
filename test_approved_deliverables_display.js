const mysql = require('mysql2/promise');
const EntregableController = require('./src/controllers/EntregableController');
const Entregable = require('./src/models/Entregable');
const User = require('./src/models/User');

// Configuración de la base de datos
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gestion_academica'
};

async function testApprovedDeliverablesDisplay() {
    let connection;
    
    try {
        console.log('🧪 Iniciando test de visualización de entregables aprobados...\n');
        
        // Conectar a la base de datos
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conexión a la base de datos establecida');
        
        // Verificar que existen entregables con estado 'aceptado'
        const [approvedDeliverables] = await connection.execute(
            'SELECT * FROM entregables WHERE estado = ?',
            ['aceptado']
        );
        
        console.log(`📊 Entregables con estado 'aceptado' en la BD: ${approvedDeliverables.length}`);
        
        if (approvedDeliverables.length === 0) {
            console.log('⚠️  No hay entregables aprobados para probar. Creando uno de prueba...');
            
            // Buscar un entregable existente para cambiar su estado
            const [existingDeliverables] = await connection.execute(
                'SELECT * FROM entregables LIMIT 1'
            );
            
            if (existingDeliverables.length > 0) {
                const deliverableId = existingDeliverables[0].id;
                await connection.execute(
                    'UPDATE entregables SET estado = ? WHERE id = ?',
                    ['aceptado', deliverableId]
                );
                console.log(`✅ Entregable ${deliverableId} marcado como 'aceptado' para prueba`);
            } else {
                console.log('❌ No hay entregables en la base de datos para probar');
                return;
            }
        }
        
        // Verificar que existe un coordinador para probar
        const [coordinators] = await connection.execute(
            `SELECT u.*, r.nombre as rol_nombre 
             FROM usuarios u 
             JOIN roles r ON u.rol_id = r.id 
             WHERE r.nombre = 'Coordinador Académico' 
             LIMIT 1`
        );
        
        if (coordinators.length === 0) {
            console.log('❌ No hay coordinadores en la base de datos para probar');
            return;
        }
        
        const coordinator = coordinators[0];
        console.log(`👤 Usando coordinador: ${coordinator.nombres} ${coordinator.apellidos}`);
        
        // Simular una sesión de coordinador
        const mockReq = {
            session: {
                user: coordinator
            },
            flash: () => []
        };
        
        const mockRes = {
            render: (template, data) => {
                console.log(`\n📄 Template renderizado: ${template}`);
                console.log('📊 Datos enviados a la vista:');
                
                if (data.deliverablesByStatus) {
                    console.log('   - Entregados:', data.deliverablesByStatus.entregado?.length || 0);
                    console.log('   - En revisión:', data.deliverablesByStatus.en_revision?.length || 0);
                    console.log('   - Requieren cambios:', data.deliverablesByStatus.requiere_cambios?.length || 0);
                    console.log('   - Rechazados:', data.deliverablesByStatus.rechazado?.length || 0);
                    console.log('   - Aprobados:', data.deliverablesByStatus.aceptado?.length || 0);
                    
                    if (data.deliverablesByStatus.aceptado && data.deliverablesByStatus.aceptado.length > 0) {
                        console.log('✅ ¡Los entregables aprobados están incluidos en deliverablesByStatus!');
                        console.log('📋 Entregables aprobados encontrados:');
                        data.deliverablesByStatus.aceptado.forEach((deliverable, index) => {
                            console.log(`   ${index + 1}. ${deliverable.titulo} (ID: ${deliverable.id})`);
                        });
                    } else {
                        console.log('❌ Los entregables aprobados NO están incluidos en deliverablesByStatus');
                    }
                } else {
                    console.log('❌ No se encontró deliverablesByStatus en los datos');
                }
                
                // Verificar también en el array general de deliverables
                if (data.deliverables) {
                    const approvedInGeneral = data.deliverables.filter(d => d.estado === 'aceptado');
                    console.log(`\n📊 Entregables aprobados en el array general: ${approvedInGeneral.length}`);
                }
            },
            redirect: (url) => {
                console.log(`🔄 Redirección a: ${url}`);
            }
        };
        
        // Crear instancia del controlador y ejecutar el método
        const entregableController = new EntregableController();
        
        console.log('\n🎯 Ejecutando coordinatorReview...');
        await entregableController.coordinatorReview(mockReq, mockRes);
        
        console.log('\n✅ Test completado exitosamente');
        
    } catch (error) {
        console.error('❌ Error durante el test:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexión a la base de datos cerrada');
        }
    }
}

// Ejecutar el test
testApprovedDeliverablesDisplay();