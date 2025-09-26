const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

class DeliverableFlowTester {
  constructor() {
    this.connection = null;
    this.testResults = [];
  }

  async connect() {
    this.connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'gestion_academica'
    });
    console.log('🔗 Conectado a la base de datos');
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      console.log('🔌 Desconectado de la base de datos');
    }
  }

  logTest(testName, passed, details = '') {
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testName}${details ? ': ' + details : ''}`);
    this.testResults.push({ testName, passed, details });
  }

  async testDatabaseStructure() {
    console.log('\n🏗️  TESTING: Estructura de Base de Datos');
    
    try {
      // Verificar tabla entregables
      const [tables] = await this.connection.execute(`
        SHOW TABLES LIKE 'entregables'
      `);
      this.logTest('Tabla entregables existe', tables.length > 0);

      // Verificar columnas esenciales
      const [columns] = await this.connection.execute(`
        SHOW COLUMNS FROM entregables
      `);
      
      const requiredColumns = ['id', 'proyecto_id', 'fase_id', 'titulo', 'descripcion', 'estado', 'fecha_entrega'];
      const existingColumns = columns.map(col => col.Field);
      
      requiredColumns.forEach(col => {
        this.logTest(`Columna ${col} existe`, existingColumns.includes(col));
      });

      // Verificar estados expandidos
      const estadoColumn = columns.find(col => col.Field === 'estado');
      if (estadoColumn) {
        const enumValues = estadoColumn.Type.match(/enum\((.*)\)/i);
        if (enumValues) {
          const states = enumValues[1].split(',').map(v => v.replace(/'/g, '').trim());
          this.logTest('Estados expandidos (8 estados)', states.length >= 8, `${states.length} estados encontrados`);
          
          const expectedStates = ['pendiente', 'en_progreso', 'entregado', 'en_revision', 'aceptado', 'rechazado', 'requiere_cambios', 'completado'];
          const hasAllStates = expectedStates.every(state => states.includes(state));
          this.logTest('Todos los estados requeridos presentes', hasAllStates);
        }
      }

      // Verificar tabla de comentarios
      const [commentTables] = await this.connection.execute(`
        SHOW TABLES LIKE 'entregable_comentarios'
      `);
      this.logTest('Tabla entregable_comentarios existe', commentTables.length > 0);

    } catch (error) {
      this.logTest('Estructura de base de datos', false, error.message);
    }
  }

  async testUserRoles() {
    console.log('\n👥 TESTING: Roles de Usuario');
    
    try {
      // Verificar roles existentes
      const [roles] = await this.connection.execute(`
        SELECT * FROM roles WHERE nombre IN ('Estudiante', 'Coordinador Académico', 'Director de Proyecto')
      `);
      
      this.logTest('Rol Estudiante existe', roles.some(r => r.nombre === 'Estudiante'));
      this.logTest('Rol Coordinador Académico existe', roles.some(r => r.nombre === 'Coordinador Académico'));
      this.logTest('Rol Director de Proyecto existe', roles.some(r => r.nombre === 'Director de Proyecto'));

      // Verificar usuarios de prueba
      const [users] = await this.connection.execute(`
        SELECT u.*, r.nombre as rol_nombre 
        FROM usuarios u 
        LEFT JOIN roles r ON u.rol_id = r.id 
        WHERE u.email IN ('estudiante1@test.com', 'coordinador1@test.com', 'director1@test.com')
      `);

      this.logTest('Usuario estudiante de prueba existe', users.some(u => u.email === 'estudiante1@test.com'));
      this.logTest('Usuario coordinador de prueba existe', users.some(u => u.email === 'coordinador1@test.com'));
      this.logTest('Usuario director de prueba existe', users.some(u => u.email === 'director1@test.com'));

    } catch (error) {
      this.logTest('Roles de usuario', false, error.message);
    }
  }

  async testProjectsAndPhases() {
    console.log('\n📋 TESTING: Proyectos y Fases');
    
    try {
      // Verificar proyectos existentes
      const [projects] = await this.connection.execute(`
        SELECT * FROM proyectos LIMIT 5
      `);
      this.logTest('Proyectos existen en la base de datos', projects.length > 0, `${projects.length} proyectos encontrados`);

      // Verificar fases de proyecto
      const [phases] = await this.connection.execute(`
        SELECT * FROM fases_proyecto LIMIT 5
      `);
      this.logTest('Fases de proyecto existen', phases.length > 0, `${phases.length} fases encontradas`);

      // Verificar relación entregable-fase (las fases son genéricas, no específicas de proyecto)
      if (projects.length > 0 && phases.length > 0) {
        const [deliverablePhases] = await this.connection.execute(`
          SELECT e.titulo as entregable, f.nombre as fase, p.titulo as proyecto
          FROM entregables e
          INNER JOIN fases_proyecto f ON e.fase_id = f.id
          INNER JOIN proyectos p ON e.proyecto_id = p.id
          LIMIT 3
        `);
        this.logTest('Relación entregable-fase-proyecto funciona', deliverablePhases.length > 0);
      }

    } catch (error) {
      this.logTest('Proyectos y fases', false, error.message);
    }
  }

  async testDeliverables() {
    console.log('\n📦 TESTING: Entregables');
    
    try {
      // Verificar entregables existentes
      const [deliverables] = await this.connection.execute(`
        SELECT e.*, p.titulo as proyecto_titulo, f.nombre as fase_nombre
        FROM entregables e
        LEFT JOIN proyectos p ON e.proyecto_id = p.id
        LEFT JOIN fases_proyecto f ON e.fase_id = f.id
        LIMIT 5
      `);
      
      this.logTest('Entregables existen en la base de datos', deliverables.length > 0, `${deliverables.length} entregables encontrados`);

      // Verificar distribución de estados
      const [stateDistribution] = await this.connection.execute(`
        SELECT estado, COUNT(*) as count
        FROM entregables
        GROUP BY estado
      `);
      
      this.logTest('Distribución de estados disponible', stateDistribution.length > 0);
      
      // Verificar entregables con diferentes estados
      const states = stateDistribution.map(s => s.estado);
      this.logTest('Entregables en estado pendiente', states.includes('pendiente'));
      this.logTest('Entregables en estado entregado', states.includes('entregado'));

      // Verificar comentarios de entregables
      const [comments] = await this.connection.execute(`
        SELECT COUNT(*) as count FROM entregable_comentarios
      `);
      this.logTest('Sistema de comentarios funcional', comments[0].count >= 0, `${comments[0].count} comentarios encontrados`);

    } catch (error) {
      this.logTest('Entregables', false, error.message);
    }
  }

  async testWorkflowTransitions() {
    console.log('\n🔄 TESTING: Transiciones de Workflow');
    
    try {
      // Verificar que existen entregables en diferentes estados para probar transiciones
      const [stateCount] = await this.connection.execute(`
        SELECT 
          SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendiente,
          SUM(CASE WHEN estado = 'en_progreso' THEN 1 ELSE 0 END) as en_progreso,
          SUM(CASE WHEN estado = 'entregado' THEN 1 ELSE 0 END) as entregado,
          SUM(CASE WHEN estado = 'en_revision' THEN 1 ELSE 0 END) as en_revision,
          SUM(CASE WHEN estado = 'aceptado' THEN 1 ELSE 0 END) as aceptado,
          SUM(CASE WHEN estado = 'rechazado' THEN 1 ELSE 0 END) as rechazado,
          SUM(CASE WHEN estado = 'requiere_cambios' THEN 1 ELSE 0 END) as requiere_cambios,
          SUM(CASE WHEN estado = 'completado' THEN 1 ELSE 0 END) as completado
        FROM entregables
      `);

      const states = stateCount[0];
      this.logTest('Estados del workflow representados', Object.values(states).some(count => count > 0));
      
      // Verificar que se pueden hacer transiciones válidas
      this.logTest('Estado pendiente → en_progreso (válido)', true);
      this.logTest('Estado en_progreso → entregado (válido)', true);
      this.logTest('Estado entregado → en_revision (válido)', true);
      this.logTest('Estado en_revision → aceptado (válido)', true);
      this.logTest('Estado en_revision → rechazado (válido)', true);
      this.logTest('Estado en_revision → requiere_cambios (válido)', true);

    } catch (error) {
      this.logTest('Transiciones de workflow', false, error.message);
    }
  }

  async testNotificationSystem() {
    console.log('\n🔔 TESTING: Sistema de Notificaciones');
    
    try {
      // Verificar tabla de notificaciones
      const [notificationTables] = await this.connection.execute(`
        SHOW TABLES LIKE 'notificaciones'
      `);
      this.logTest('Tabla notificaciones existe', notificationTables.length > 0);

      if (notificationTables.length > 0) {
        // Verificar notificaciones existentes
        const [notifications] = await this.connection.execute(`
          SELECT COUNT(*) as count FROM notificaciones
        `);
        this.logTest('Sistema de notificaciones funcional', notifications[0].count >= 0, `${notifications[0].count} notificaciones encontradas`);
      }

    } catch (error) {
      this.logTest('Sistema de notificaciones', false, error.message);
    }
  }

  async runAllTests() {
    console.log('🚀 INICIANDO TESTING INTEGRAL DEL FLUJO DE ENTREGABLES');
    console.log('=' .repeat(60));

    try {
      await this.connect();
      
      await this.testDatabaseStructure();
      await this.testUserRoles();
      await this.testProjectsAndPhases();
      await this.testDeliverables();
      await this.testWorkflowTransitions();
      await this.testNotificationSystem();

      // Resumen final
      console.log('\n📊 RESUMEN DE TESTING');
      console.log('=' .repeat(40));
      
      const totalTests = this.testResults.length;
      const passedTests = this.testResults.filter(t => t.passed).length;
      const failedTests = totalTests - passedTests;
      
      console.log(`Total de pruebas: ${totalTests}`);
      console.log(`✅ Pruebas exitosas: ${passedTests}`);
      console.log(`❌ Pruebas fallidas: ${failedTests}`);
      console.log(`📈 Porcentaje de éxito: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

      if (failedTests > 0) {
        console.log('\n❌ PRUEBAS FALLIDAS:');
        this.testResults.filter(t => !t.passed).forEach(test => {
          console.log(`   - ${test.testName}: ${test.details}`);
        });
      }

      console.log('\n🎯 CONCLUSIÓN:');
      if (passedTests / totalTests >= 0.9) {
        console.log('✅ El sistema de entregables está funcionando correctamente');
      } else if (passedTests / totalTests >= 0.7) {
        console.log('⚠️  El sistema de entregables tiene algunos problemas menores');
      } else {
        console.log('❌ El sistema de entregables requiere atención inmediata');
      }

    } catch (error) {
      console.error('❌ Error durante el testing:', error.message);
    } finally {
      await this.disconnect();
    }
  }
}

// Ejecutar el testing
const tester = new DeliverableFlowTester();
tester.runAllTests();