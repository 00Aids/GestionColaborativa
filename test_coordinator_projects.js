const ProjectController = require('./src/controllers/ProjectController');

async function testCoordinatorProjects() {
  try {
    console.log('🔍 Probando método getProjectsByCoordinator...\n');
    
    const projectController = new ProjectController();
    const coordinatorId = 41; // ID del coordinador1@test.com
    
    console.log(`📋 Obteniendo proyectos para coordinador ID: ${coordinatorId}`);
    
    const projects = await projectController.getProjectsByCoordinator(coordinatorId);
    
    console.log('✅ Resultado:');
    console.log(`   Tipo: ${typeof projects}`);
    console.log(`   Es array: ${Array.isArray(projects)}`);
    console.log(`   Longitud: ${projects ? projects.length : 'N/A'}`);
    console.log(`   Contenido:`, projects);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testCoordinatorProjects();