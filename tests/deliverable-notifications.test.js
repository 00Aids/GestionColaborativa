/**
 * Test para verificar el flujo de notificaciones de entregables
 * Verifica que cuando un estudiante envía un entregable, 
 * se notifique tanto al director como al evaluador
 */

const mysql = require('mysql2/promise');
const DeliverableNotificationService = require('../src/services/DeliverableNotificationService');
const Project = require('../src/models/Project');
const Notification = require('../src/models/Notification');
const User = require('../src/models/User');
const Deliverable = require('../src/models/Deliverable');

// Configuración de base de datos de prueba
const testDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gestion_proyectos_test'
};

class DeliverableNotificationTest {
  constructor() {
    this.db = null;
    this.notificationService = null;
    this.projectModel = null;
    this.notificationModel = null;
    this.userModel = null;
    this.deliverableModel = null;
    this.testData = {};
  }

  async setup() {
    try {
      console.log('🔧 Configurando test de notificaciones de entregables...');
      
      // Conectar a la base de datos
      this.db = await mysql.createConnection(testDbConfig);
      
      // Inicializar modelos y servicios
      this.projectModel = new Project();
      this.notificationModel = new Notification();
      this.userModel = new User();
      this.deliverableModel = new Deliverable();
      this.notificationService = new DeliverableNotificationService();
      
      console.log('✅ Configuración completada');
    } catch (error) {
      console.error('❌ Error en configuración:', error);
      throw error;
    }
  }

  async createTestData() {
    try {
      console.log('📝 Creando datos de prueba...');
      
      // Generar códigos únicos usando timestamp
      const timestamp = Date.now();
      
      // Crear usuarios de prueba
      const estudiante = await this.userModel.create({
        codigo_usuario: `EST${timestamp}`,
        nombres: 'Juan Carlos',
        apellidos: 'Pérez López',
        email: `juan.perez.${timestamp}@universidad.edu`,
        password: 'password123',
        rol_id: 1, // Estudiante
        activo: true
      });

      const director = await this.userModel.create({
        codigo_usuario: `DIR${timestamp}`,
        nombres: 'María Elena',
        apellidos: 'García Rodríguez',
        email: `maria.garcia.${timestamp}@universidad.edu`,
        password: 'password123',
        rol_id: 3, // Director
        activo: true
      });

      const evaluador = await this.userModel.create({
        codigo_usuario: `EVA${timestamp}`,
        nombres: 'Carlos Alberto',
        apellidos: 'Martínez Silva',
        email: `carlos.martinez.${timestamp}@universidad.edu`,
        password: 'password123',
        rol_id: 4, // Evaluador
        activo: true
      });

      // Crear proyecto de prueba
      const projectData = {
        titulo: 'Sistema de Gestión de Proyectos - Test',
        descripcion: 'Proyecto de prueba para testing de notificaciones',
        estudiante_id: estudiante.id,
        director_id: director.id,
        evaluador_id: evaluador.id,
        ciclo_academico_id: 1, // Asumiendo que existe un ciclo académico con ID 1
        linea_investigacion_id: 1, // Asumiendo que existe una línea con ID 1
        fase_actual_id: 1, // Asumiendo que existe una fase con ID 1
        estado: 'en_desarrollo',
        fecha_propuesta: new Date(),
        activo: true
      };
      
      console.log('📊 Datos del proyecto:', JSON.stringify(projectData, null, 2));
      const proyecto = await this.projectModel.create(projectData);

      // Crear entregable de prueba
      const entregable = await this.deliverableModel.create({
        proyecto_id: proyecto.id,
        fase_id: 1, // Asumiendo que existe una fase con ID 1
        titulo: 'Entregable de Prueba - Análisis de Requisitos',
        descripcion: 'Documento de análisis de requisitos del sistema',
        fecha_limite: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
        estado: 'pendiente'
      });

      this.testData = {
        estudiante: { id: estudiante.id, nombres: 'Juan Carlos', apellidos: 'Pérez López' },
        director: { id: director.id, nombres: 'María Elena', apellidos: 'García Rodríguez' },
        evaluador: { id: evaluador.id, nombres: 'Carlos Alberto', apellidos: 'Martínez Silva' },
        proyecto: { id: proyecto.id, titulo: 'Sistema de Gestión de Proyectos - Test' },
        entregable: { id: entregable.id, titulo: 'Entregable de Prueba - Análisis de Requisitos' }
      };

      console.log('✅ Datos de prueba creados:', this.testData);
    } catch (error) {
      console.error('❌ Error creando datos de prueba:', error);
      throw error;
    }
  }

  async testNotificationFlow() {
    try {
      console.log('🧪 Iniciando test de flujo de notificaciones...');
      
      // Contar notificaciones antes del envío
      const notificationsBefore = await this.notificationModel.findByUser(this.testData.director.id);
      const evaluatorNotificationsBefore = await this.notificationModel.findByUser(this.testData.evaluador.id);
      
      console.log(`📊 Notificaciones antes - Director: ${notificationsBefore.length}, Evaluador: ${evaluatorNotificationsBefore.length}`);

      // Simular envío de entregable
      const studentName = `${this.testData.estudiante.nombres} ${this.testData.estudiante.apellidos}`;
      
      await this.notificationService.notifyDeliverableSubmitted(
        this.testData.proyecto.id,
        this.testData.entregable.id,
        studentName,
        this.testData.entregable.titulo
      );

      console.log('✅ Servicio de notificaciones ejecutado');

      // Verificar notificaciones después del envío
      const notificationsAfter = await this.notificationModel.findByUser(this.testData.director.id);
      const evaluatorNotificationsAfter = await this.notificationModel.findByUser(this.testData.evaluador.id);
      
      console.log(`📊 Notificaciones después - Director: ${notificationsAfter.length}, Evaluador: ${evaluatorNotificationsAfter.length}`);

      // Verificar que se crearon las notificaciones
      const directorNewNotifications = notificationsAfter.length - notificationsBefore.length;
      const evaluatorNewNotifications = evaluatorNotificationsAfter.length - evaluatorNotificationsBefore.length;

      console.log(`📈 Nuevas notificaciones - Director: ${directorNewNotifications}, Evaluador: ${evaluatorNewNotifications}`);

      // Validar resultados
      if (directorNewNotifications >= 1) {
        console.log('✅ ÉXITO: Notificación enviada al director');
      } else {
        console.log('❌ FALLO: No se envió notificación al director');
      }

      if (evaluatorNewNotifications >= 1) {
        console.log('✅ ÉXITO: Notificación enviada al evaluador');
      } else {
        console.log('❌ FALLO: No se envió notificación al evaluador');
      }

      // Mostrar detalles de las notificaciones más recientes
      if (notificationsAfter.length > 0) {
        const latestDirectorNotification = notificationsAfter[notificationsAfter.length - 1];
        console.log('📧 Última notificación del director:', {
          titulo: latestDirectorNotification.titulo,
          mensaje: latestDirectorNotification.mensaje,
          tipo: latestDirectorNotification.tipo
        });
      }

      if (evaluatorNotificationsAfter.length > 0) {
        const latestEvaluatorNotification = evaluatorNotificationsAfter[evaluatorNotificationsAfter.length - 1];
        console.log('📧 Última notificación del evaluador:', {
          titulo: latestEvaluatorNotification.titulo,
          mensaje: latestEvaluatorNotification.mensaje,
          tipo: latestEvaluatorNotification.tipo
        });
      }

      return {
        success: directorNewNotifications >= 1 && evaluatorNewNotifications >= 1,
        directorNotifications: directorNewNotifications,
        evaluatorNotifications: evaluatorNewNotifications
      };

    } catch (error) {
      console.error('❌ Error en test de notificaciones:', error);
      throw error;
    }
  }

  async cleanup() {
    try {
      console.log('🧹 Limpiando datos de prueba...');
      
      if (this.testData.entregable?.id) {
        await this.deliverableModel.delete(this.testData.entregable.id);
      }
      
      if (this.testData.proyecto?.id) {
        await this.projectModel.delete(this.testData.proyecto.id);
      }
      
      if (this.testData.estudiante?.id) {
        await this.userModel.delete(this.testData.estudiante.id);
      }
      
      if (this.testData.director?.id) {
        await this.userModel.delete(this.testData.director.id);
      }
      
      if (this.testData.evaluador?.id) {
        await this.userModel.delete(this.testData.evaluador.id);
      }

      if (this.db) {
        await this.db.end();
      }
      
      console.log('✅ Limpieza completada');
    } catch (error) {
      console.error('⚠️ Error en limpieza:', error);
    }
  }

  async run() {
    try {
      console.log('🚀 Iniciando test de notificaciones de entregables');
      console.log('=' .repeat(60));
      
      await this.setup();
      await this.createTestData();
      const result = await this.testNotificationFlow();
      
      console.log('=' .repeat(60));
      console.log('📋 RESUMEN DEL TEST:');
      console.log(`✅ Test exitoso: ${result.success ? 'SÍ' : 'NO'}`);
      console.log(`📧 Notificaciones al director: ${result.directorNotifications}`);
      console.log(`📧 Notificaciones al evaluador: ${result.evaluatorNotifications}`);
      console.log('=' .repeat(60));
      
      return result;
      
    } catch (error) {
      console.error('❌ Error ejecutando test:', error);
      return { success: false, error: error.message };
    } finally {
      await this.cleanup();
    }
  }
}

// Ejecutar test si se llama directamente
if (require.main === module) {
  const test = new DeliverableNotificationTest();
  test.run().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = DeliverableNotificationTest;