const Deliverable = require('../models/Deliverable');
const DeliverableNotificationService = require('../services/DeliverableNotificationService');

class DeliverableNotificationScript {
    constructor() {
        this.deliverableModel = new Deliverable();
        this.notificationService = new DeliverableNotificationService();
    }

    // Verificar entregables próximos a vencer (3 días antes)
    async checkUpcomingDeadlines() {
        try {
            console.log('🔍 Verificando entregables próximos a vencer...');
            
            const query = `
                SELECT 
                    e.id,
                    e.titulo,
                    e.fecha_limite,
                    p.estudiante_id,
                    p.titulo as proyecto_titulo,
                    p.director_id as coordinador_id,
                    DATEDIFF(e.fecha_limite, CURDATE()) as dias_restantes
                FROM entregables e
                JOIN proyectos p ON e.proyecto_id = p.id
                WHERE e.estado IN ('pendiente', 'entregado')
                AND DATEDIFF(e.fecha_limite, CURDATE()) IN (3, 1)
                AND e.fecha_limite >= CURDATE()
                AND p.estudiante_id IS NOT NULL
            `;

            const [deliverables] = await this.deliverableModel.db.execute(query);
            
            for (const deliverable of deliverables) {
                const deliverableData = {
                    estudiante_id: deliverable.estudiante_id,
                    titulo: deliverable.titulo,
                    proyecto_titulo: deliverable.proyecto_titulo,
                    fecha_limite: deliverable.fecha_limite
                };

                const daysUntilDue = Math.ceil((new Date(deliverable.fecha_limite) - new Date()) / (1000 * 60 * 60 * 24));
                
                await this.notificationService.notifyDeliverableDueSoon(
                    deliverable.id,
                    deliverableData,
                    daysUntilDue
                );
            }

            console.log(`✅ Procesados ${deliverables.length} entregables próximos a vencer`);
        } catch (error) {
            console.error('❌ Error checking upcoming deadlines:', error);
        }
    }

    // Verificar entregables vencidos
    async checkOverdueDeliverables() {
        try {
            console.log('🔍 Verificando entregables vencidos...');
            
            const query = `
                SELECT 
                    e.id,
                    e.titulo,
                    e.fecha_limite,
                    p.estudiante_id,
                    p.titulo as proyecto_titulo,
                    p.director_id as coordinador_id,
                    DATEDIFF(CURDATE(), e.fecha_limite) as dias_vencido
                FROM entregables e
                JOIN proyectos p ON e.proyecto_id = p.id
                WHERE e.estado IN ('pendiente', 'entregado')
                AND e.fecha_limite < CURDATE()
                AND p.estudiante_id IS NOT NULL
                AND NOT EXISTS (
                    SELECT 1 FROM notificaciones n 
                    WHERE n.tipo = 'entregable_vencido' 
                    AND n.url_accion LIKE CONCAT('%deliverable=', e.id, '%')
                    AND DATE(n.created_at) = CURDATE()
                )
            `;

            const [deliverables] = await this.deliverableModel.db.execute(query);
            
            for (const deliverable of deliverables) {
                const deliverableData = {
                    estudiante_id: deliverable.estudiante_id,
                    titulo: deliverable.titulo,
                    proyecto_titulo: deliverable.proyecto_titulo,
                    coordinador_id: deliverable.coordinador_id
                };

                await this.notificationService.notifyDeliverableOverdue(
                    deliverable.id,
                    deliverableData
                );
            }

            console.log(`✅ Procesados ${deliverables.length} entregables vencidos`);
        } catch (error) {
            console.error('❌ Error checking overdue deliverables:', error);
        }
    }

    // Verificar entregables que requieren atención del coordinador
    async checkPendingReviews() {
        try {
            console.log('🔍 Verificando entregables pendientes de revisión...');
            
            const query = `
                SELECT 
                    e.id,
                    e.titulo,
                    p.estudiante_id,
                    e.fecha_entrega,
                    p.id as proyecto_id,
                    p.titulo as proyecto_titulo,
                    p.director_id as coordinador_id,
                    DATEDIFF(CURDATE(), e.fecha_entrega) as dias_sin_revision
                FROM entregables e
                JOIN proyectos p ON e.proyecto_id = p.id
                WHERE e.estado = 'entregado'
                AND DATEDIFF(CURDATE(), e.fecha_entrega) >= 2
                AND p.estudiante_id IS NOT NULL
                AND NOT EXISTS (
                    SELECT 1 FROM notificaciones n 
                    WHERE n.tipo = 'entregable_nuevo' 
                    AND n.url_accion LIKE CONCAT('%deliverable=', e.id, '%')
                    AND DATE(n.created_at) = CURDATE()
                )
            `;

            const [deliverables] = await this.deliverableModel.db.execute(query);
            
            for (const deliverable of deliverables) {
                if (deliverable.coordinador_id) {
                    const deliverableData = {
                        proyecto_id: deliverable.proyecto_id,
                        estudiante_id: deliverable.estudiante_id,
                        titulo: deliverable.titulo
                    };

                    await this.notificationService.notifyDeliverableSubmitted(
                        deliverable.proyecto_id,
                        deliverable.id,
                        null,
                        deliverable.titulo
                    );
                }
            }

            console.log(`✅ Procesados ${deliverables.length} entregables pendientes de revisión`);
        } catch (error) {
            console.error('❌ Error checking pending reviews:', error);
        }
    }

    // Ejecutar todas las verificaciones
    async runAllChecks() {
        console.log('🚀 Iniciando verificación de notificaciones de entregables...');
        console.log(`📅 Fecha: ${new Date().toLocaleString()}`);
        
        await this.checkUpcomingDeadlines();
        await this.checkOverdueDeliverables();
        await this.checkPendingReviews();
        
        console.log('✅ Verificación de notificaciones completada');
    }
}

// Si se ejecuta directamente
if (require.main === module) {
    const script = new DeliverableNotificationScript();
    script.runAllChecks()
        .then(() => {
            console.log('🎉 Script ejecutado exitosamente');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Error ejecutando script:', error);
            process.exit(1);
        });
}

module.exports = DeliverableNotificationScript;