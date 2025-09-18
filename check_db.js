const { executeQuery } = require('./src/config/database');

async function checkDatabase() {
  try {
    console.log('=== VERIFICANDO TABLAS EXISTENTES ===');
    const tables = await executeQuery('SHOW TABLES');
    console.log('Tablas en la base de datos:');
    console.table(tables);
    
    // Verificar si existe la tabla users
    const tableNames = tables.map(table => Object.values(table)[0]);
    
    if (tableNames.includes('users')) {
      console.log('\n=== VERIFICANDO USUARIOS ADMINISTRADORES ===');
      const admins = await executeQuery('SELECT u.id, u.email, u.role, u.area_trabajo_id, at.nombre as area_nombre FROM users u LEFT JOIN areas_trabajo at ON u.area_trabajo_id = at.id WHERE u.role = "admin"');
      console.log('Administradores encontrados:');
      console.table(admins);
      
      // Verificar si hay administradores sin área asignada
      const adminsWithoutArea = admins.filter(admin => !admin.area_trabajo_id);
      if (adminsWithoutArea.length > 0) {
        console.log('\n⚠️  ADMINISTRADORES SIN ÁREA ASIGNADA:');
        console.table(adminsWithoutArea);
        
        // Asignar área por defecto a administradores sin área
        console.log('\n🔧 Asignando área por defecto a administradores...');
        for (const admin of adminsWithoutArea) {
          await executeQuery('UPDATE users SET area_trabajo_id = 5 WHERE id = ?', [admin.id]);
          console.log(`✅ Asignada área por defecto (ID: 5) al administrador ${admin.email}`);
        }
      }
      
      console.log('\n=== VERIFICANDO USUARIOS POR ÁREA (ACTUALIZADO) ===');
      const users = await executeQuery('SELECT u.id, u.email, u.role, u.area_trabajo_id, at.nombre as area_nombre FROM users u LEFT JOIN areas_trabajo at ON u.area_trabajo_id = at.id ORDER BY u.area_trabajo_id, u.role');
      console.log('Todos los usuarios por área:');
      console.table(users);
    } else {
      console.log('\n❌ La tabla "users" no existe');
    }
    
    if (tableNames.includes('areas_trabajo')) {
      console.log('\n=== VERIFICANDO TODAS LAS ÁREAS DE TRABAJO ===');
      const areas = await executeQuery('SELECT * FROM areas_trabajo');
      console.log('Áreas de trabajo disponibles:');
      console.table(areas);
    } else {
      console.log('\n❌ La tabla "areas_trabajo" no existe');
    }
    
    if (tableNames.includes('projects')) {
      console.log('\n=== VERIFICANDO PROYECTOS POR ÁREA ===');
      const projects = await executeQuery('SELECT p.id, p.title, p.area_trabajo_id, at.nombre as area_nombre FROM projects p LEFT JOIN areas_trabajo at ON p.area_trabajo_id = at.id ORDER BY p.area_trabajo_id');
      console.log('Proyectos por área:');
      console.table(projects);
    } else {
      console.log('\n❌ La tabla "projects" no existe');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDatabase();