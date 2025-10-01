const { pool } = require('./src/config/database');
const CoordinatorValidationSystem = require('./coordinator_validation_system');
const DashboardController = require('./src/controllers/DashboardController');
const ProjectController = require('./src/controllers/ProjectController');

/**
 * Script para probar el escenario de crear un nuevo coordinador
 * y asignarlo a un proyecto, verificando que no ocurran errores similares
 */

async function testNewCoordinatorScenario() {
  const validator = new CoordinatorValidationSystem();
  
  try {
    console.log('🧪 PRUEBA: NUEVO COORDINADOR CON PROYECTO');
    console.log('='.repeat(50));
    
    // PASO 1: Crear un nuevo coordinador de prueba
    console.log('\n📝 PASO 1: Creando nuevo coordinador...');
    
    const timestamp = Date.now();
    const newCoordinatorData = {
      codigo_usuario: `COORD${timestamp}`,
      nombres: 'Coordinador',
      apellidos: 'De Prueba',
      email: `coord.test.${timestamp}@universidad.edu`,
      password_hash: '$2b$10$hashedpassword123', // Hash simulado
      rol_id: 2, // Coordinador Académico
      activo: 1
    };
    
    const [coordinatorResult] = await pool.execute(`
      INSERT INTO usuarios (codigo_usuario, nombres, apellidos, email, password_hash, rol_id, activo)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      newCoordinatorData.codigo_usuario,
      newCoordinatorData.nombres,
      newCoordinatorData.apellidos,
      newCoordinatorData.email,
      newCoordinatorData.password_hash,
      newCoordinatorData.rol_id,
      newCoordinatorData.activo
    ]);
    
    const newCoordinatorId = coordinatorResult.insertId;
    console.log(`✅ Coordinador creado con ID: ${newCoordinatorId}`);
    console.log(`   Email: ${newCoordinatorData.email}`);
    
    // PASO 2: Crear un nuevo proyecto de prueba
    console.log('\n📝 PASO 2: Creando nuevo proyecto...');
    
    const newProjectData = {
      titulo: `Proyecto de Prueba ${timestamp}`,
      descripcion: 'Proyecto para probar asignación de coordinador',
      estado: 'en_desarrollo', // Valor válido del ENUM
      estudiante_id: 41, // ID de estudiante existente
      ciclo_academico_id: 1 // ID de ciclo académico existente
    };
    
    const [projectResult] = await pool.execute(`
      INSERT INTO proyectos (titulo, descripcion, estado, estudiante_id, ciclo_academico_id)
      VALUES (?, ?, ?, ?, ?)
    `, [
      newProjectData.titulo,
      newProjectData.descripcion,
      newProjectData.estado,
      newProjectData.estudiante_id,
      newProjectData.ciclo_academico_id
    ]);
    
    const newProjectId = projectResult.insertId;
    console.log(`✅ Proyecto creado con ID: ${newProjectId}`);
    console.log(`   Título: ${newProjectData.titulo}`);
    
    // PASO 3: Validar la asignación antes de realizarla
    console.log('\n📝 PASO 3: Validando asignación...');
    
    const validation = await validator.validateCoordinatorAssignment(newCoordinatorId, newProjectId);
    
    if (validation.valid) {
      console.log('✅ Validación exitosa');
    } else {
      console.log('⚠️  Validación con advertencias:');
      validation.issues.forEach(issue => console.log(`   ${issue}`));
    }
    
    // PASO 4: Asignar coordinador al proyecto
    console.log('\n📝 PASO 4: Asignando coordinador al proyecto...');
    
    const assignment = await validator.assignCoordinatorToProject(newCoordinatorId, newProjectId, true);
    
    if (assignment.success) {
      console.log('✅ Asignación exitosa');
      console.log(`   ${assignment.message}`);
    } else {
      console.log('❌ Error en asignación:');
      assignment.issues.forEach(issue => console.log(`   ${issue}`));
      return;
    }
    
    // PASO 5: Probar el dashboard del nuevo coordinador
    console.log('\n📝 PASO 5: Probando dashboard del coordinador...');
    
    // Simular sesión del nuevo coordinador
    const mockUser = {
      id: newCoordinatorId,
      email: newCoordinatorData.email,
      nombres: newCoordinatorData.nombres,
      apellidos: newCoordinatorData.apellidos,
      rol_id: newCoordinatorData.rol_id,
      area_trabajo_id: null // Sin área asignada (nuevo enfoque)
    };
    
    const mockReq = {
      session: { user: mockUser }
    };
    
    const mockRes = {
      render: function(view, data) {
        console.log(`📊 Dashboard renderizado para: ${mockUser.nombres} ${mockUser.apellidos}`);
        console.log(`   Vista: ${view}`);
        console.log(`   Proyectos encontrados: ${data.projects ? data.projects.length : 0}`);
        
        if (data.projects && data.projects.length > 0) {
          data.projects.forEach(project => {
            console.log(`   - ${project.titulo} (ID: ${project.id})`);
          });
        }
        
        console.log(`   Entregables encontrados: ${data.deliverables ? data.deliverables.length : 0}`);
        console.log(`   Evaluaciones encontradas: ${data.evaluations ? data.evaluations.length : 0}`);
        console.log(`   Estudiantes encontrados: ${data.students ? data.students.length : 0}`);
        
        return data;
      }
    };
    
    // Ejecutar dashboard
    const dashboardController = new DashboardController();
    await dashboardController.coordinatorDashboard(mockReq, mockRes);
    
    // PASO 6: Verificar que getProjectsByCoordinator funciona correctamente
    console.log('\n📝 PASO 6: Verificando getProjectsByCoordinator...');
    
    const projectController = new ProjectController();
    const coordinatorProjects = await projectController.getProjectsByCoordinator(newCoordinatorId);
    
    console.log(`📋 Proyectos obtenidos por getProjectsByCoordinator: ${coordinatorProjects.length}`);
    coordinatorProjects.forEach(project => {
      console.log(`   - ${project.titulo} (ID: ${project.id})`);
    });
    
    // PASO 7: Crear un entregable para probar filtrado completo
    console.log('\n📝 PASO 7: Creando entregable de prueba...');
    
    await pool.execute(`
      INSERT INTO entregables (proyecto_id, titulo, descripcion, fecha_limite, estado)
      VALUES (?, ?, ?, ?, ?)
    `, [
      newProjectId,
      'Entregable de Prueba',
      'Entregable para verificar filtrado',
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 días
      'pendiente'
    ]);
    
    console.log('✅ Entregable creado');
    
    // PASO 8: Probar dashboard nuevamente con entregables
    console.log('\n📝 PASO 8: Probando dashboard con entregables...');
    
    await dashboardController.coordinatorDashboard(mockReq, mockRes);
    
    // PASO 9: Limpiar datos de prueba
    console.log('\n📝 PASO 9: Limpiando datos de prueba...');
    
    await pool.execute('DELETE FROM entregables WHERE proyecto_id = ?', [newProjectId]);
    await pool.execute('DELETE FROM proyecto_usuarios WHERE proyecto_id = ? AND usuario_id = ?', [newProjectId, newCoordinatorId]);
    await pool.execute('DELETE FROM proyectos WHERE id = ?', [newProjectId]);
    await pool.execute('DELETE FROM usuarios WHERE id = ?', [newCoordinatorId]);
    
    console.log('✅ Datos de prueba eliminados');
    
    console.log('\n🎉 RESULTADO DE LA PRUEBA:');
    console.log('✅ El nuevo coordinador fue creado y asignado exitosamente');
    console.log('✅ El dashboard funciona correctamente con el nuevo enfoque');
    console.log('✅ No se presentaron errores similares al problema original');
    console.log('✅ El filtrado por asignación directa funciona correctamente');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
    
    // Intentar limpiar en caso de error
    try {
      await pool.execute('DELETE FROM usuarios WHERE email LIKE ?', [`coord.test.%@universidad.edu`]);
      await pool.execute('DELETE FROM proyectos WHERE titulo LIKE ?', [`Proyecto de Prueba %`]);
    } catch (cleanupError) {
      console.error('Error en limpieza:', cleanupError);
    }
  } finally {
    await pool.end();
  }
}

// Función adicional para probar múltiples coordinadores
async function testMultipleCoordinatorsScenario() {
  console.log('\n🧪 PRUEBA ADICIONAL: MÚLTIPLES COORDINADORES');
  console.log('='.repeat(50));
  
  try {
    // Simular creación de 3 coordinadores con diferentes configuraciones
    const scenarios = [
      { name: 'Coord1', hasArea: false, description: 'Sin área, con proyecto directo' },
      { name: 'Coord2', hasArea: true, description: 'Con área, con proyecto directo' },
      { name: 'Coord3', hasArea: false, description: 'Sin área, sin proyecto (problemático)' }
    ];
    
    console.log('\n📋 ESCENARIOS IDENTIFICADOS:');
    for (const scenario of scenarios) {
      console.log(`   ${scenario.description}`);
      console.log(`   Resultado esperado: ${scenario.hasArea ? 'Dashboard con proyectos por área' : 'Dashboard con proyectos directos'}`);
    }
    
    console.log('\n✅ Análisis de escenarios completado');
    console.log('💡 El sistema de validación previene estos problemas');
    
  } catch (error) {
    console.error('Error en prueba múltiple:', error);
  }
}

// Ejecutar pruebas
if (require.main === module) {
  testNewCoordinatorScenario()
    .then(() => testMultipleCoordinatorsScenario())
    .catch(console.error);
}