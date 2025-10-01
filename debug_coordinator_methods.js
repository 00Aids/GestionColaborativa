const { pool } = require('./src/config/database');
const ProjectController = require('./src/controllers/ProjectController');
const DashboardController = require('./src/controllers/DashboardController');

async function debugCoordinatorMethods() {
  try {
    console.log('🔍 Comparando métodos del coordinador...\n');
    
    const coordinatorEmail = 'ananim@gmail.com';
    
    // 1. Obtener información del coordinador
    const [coordinatorData] = await pool.execute(
      'SELECT id, nombres, apellidos, email, rol_id, area_trabajo_id FROM usuarios WHERE email = ?',
      [coordinatorEmail]
    );
    
    if (!coordinatorData.length) {
      console.log('❌ Coordinador no encontrado');
      return;
    }
    
    const coordinator = coordinatorData[0];
    console.log('👤 Coordinador:', {
      id: coordinator.id,
      nombre: `${coordinator.nombres} ${coordinator.apellidos}`,
      email: coordinator.email,
      rol_id: coordinator.rol_id,
      area_trabajo_id: coordinator.area_trabajo_id
    });
    
    // 2. Probar getProjectsByCoordinator
    console.log('\n📁 Probando getProjectsByCoordinator...');
    const projectController = new ProjectController();
    const coordinatorProjects = await projectController.getProjectsByCoordinator(coordinator.id);
    
    console.log(`   Proyectos encontrados: ${coordinatorProjects.length}`);
    coordinatorProjects.forEach(project => {
      console.log(`   - ${project.titulo} (ID: ${project.id}, Estado: ${project.estado})`);
    });
    
    // 3. Verificar asignaciones directas en proyecto_usuarios
    console.log('\n🔗 Verificando asignaciones en proyecto_usuarios...');
    const [assignments] = await pool.execute(
      `SELECT pu.*, p.titulo, p.estado 
       FROM proyecto_usuarios pu 
       JOIN proyectos p ON pu.proyecto_id = p.id 
       WHERE pu.usuario_id = ?`,
      [coordinator.id]
    );
    
    console.log(`   Asignaciones encontradas: ${assignments.length}`);
    assignments.forEach(assignment => {
      console.log(`   - ${assignment.titulo} (ID: ${assignment.proyecto_id}, Rol: ${assignment.rol}, Estado: ${assignment.estado})`);
    });
    
    // 4. Verificar proyectos por área de trabajo
    if (coordinator.area_trabajo_id) {
      console.log('\n🏢 Verificando proyectos por área de trabajo...');
      const [areaProjects] = await pool.execute(
        'SELECT id, titulo, estado FROM proyectos WHERE area_trabajo_id = ?',
        [coordinator.area_trabajo_id]
      );
      
      console.log(`   Proyectos por área: ${areaProjects.length}`);
      areaProjects.forEach(project => {
        console.log(`   - ${project.titulo} (ID: ${project.id}, Estado: ${project.estado})`);
      });
    } else {
      console.log('\n🏢 No tiene área de trabajo asignada');
    }
    
    // 5. Simular el dashboard
    console.log('\n📊 Simulando lógica del dashboard...');
    
    // Obtener proyectos donde el coordinador está específicamente asignado
    let allProjects = coordinatorProjects;
    console.log(`   Proyectos asignados directamente: ${coordinatorProjects.length}`);
    
    // Si no hay proyectos asignados, usar filtro por área como fallback
    if (coordinatorProjects.length === 0 && coordinator.area_trabajo_id) {
      const [areaProjects] = await pool.execute(
        'SELECT * FROM proyectos WHERE area_trabajo_id = ?',
        [coordinator.area_trabajo_id]
      );
      allProjects = areaProjects;
      console.log(`   Usando fallback por área: ${areaProjects.length} proyectos`);
    }
    
    console.log(`   Total de proyectos para el dashboard: ${allProjects.length}`);
    allProjects.forEach(project => {
      console.log(`   - ${project.titulo} (ID: ${project.id}, Estado: ${project.estado})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

debugCoordinatorMethods();