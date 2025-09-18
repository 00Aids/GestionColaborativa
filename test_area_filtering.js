const mysql = require('mysql2/promise');
const User = require('./src/models/User');

// Configuración de la base de datos
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_academica'
};

async function testAreaFiltering() {
  let connection;
  
  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado a la base de datos');

    // Crear instancia del modelo User
    const userModel = new User();
    userModel.db = connection;

    console.log('\n=== PRUEBA DE FILTRADO POR ÁREA ===\n');

    // 1. Obtener todos los administradores con sus áreas
    console.log('1. Administradores y sus áreas asignadas:');
    const adminQuery = `
      SELECT 
        u.id,
        u.nombres,
        u.apellidos,
        u.email,
        r.nombre as rol,
        a.id as area_id,
        a.nombre as area_nombre,
        uat.es_admin
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id
      LEFT JOIN usuario_areas_trabajo uat ON u.id = uat.usuario_id AND uat.activo = 1
      LEFT JOIN areas_trabajo a ON uat.area_trabajo_id = a.id
      WHERE r.nombre LIKE '%Administrador%'
      ORDER BY u.id, a.id
    `;
    
    const [admins] = await connection.execute(adminQuery);
    console.table(admins);

    // 2. Probar métodos del modelo User
    console.log('\n2. Probando métodos del modelo User:');
    
    for (const admin of admins) {
      if (admin.area_id) {
        console.log(`\n--- Usuario: ${admin.nombres} ${admin.apellidos} (ID: ${admin.id}) ---`);
        
        // Probar getUserAreas
        const userAreas = await userModel.getUserAreas(admin.id);
        console.log('Áreas del usuario:', userAreas);
        
        // Probar isAreaAdmin
        const isAreaAdmin = await userModel.isAreaAdmin(admin.id, admin.area_id);
        console.log(`¿Es admin del área ${admin.area_id}?:`, isAreaAdmin);
        
        // Probar hasAreaAccess
        const hasAccess = await userModel.hasAreaAccess(admin.id, admin.area_id);
        console.log(`¿Tiene acceso al área ${admin.area_id}?:`, hasAccess);
      }
    }

    // 3. Simular filtrado de proyectos por área
    console.log('\n3. Simulando filtrado de proyectos por área:');
    
    const projectQuery = `
      SELECT 
        p.id,
        p.titulo,
        p.area_trabajo_id,
        a.nombre as area_nombre
      FROM proyectos p
      INNER JOIN areas_trabajo a ON p.area_trabajo_id = a.id
      ORDER BY p.area_trabajo_id, p.id
    `;
    
    const [projects] = await connection.execute(projectQuery);
    console.log('\nTodos los proyectos:');
    console.table(projects);

    // Mostrar proyectos filtrados por cada área de administrador
    for (const admin of admins) {
      if (admin.area_id) {
        const filteredProjects = projects.filter(p => p.area_trabajo_id === admin.area_id);
        console.log(`\nProyectos que vería ${admin.nombres} ${admin.apellidos} (Área: ${admin.area_nombre}):`);
        console.table(filteredProjects);
      }
    }

    // 4. Verificar que no hay acceso cruzado
    console.log('\n4. Verificando que no hay acceso cruzado entre áreas:');
    
    const adminAreas = [...new Set(admins.filter(a => a.area_id).map(a => a.area_id))];
    
    for (let i = 0; i < adminAreas.length; i++) {
      for (let j = 0; j < adminAreas.length; j++) {
        if (i !== j) {
          const admin = admins.find(a => a.area_id === adminAreas[i]);
          const otherArea = adminAreas[j];
          
          if (admin) {
            const hasAccessToOtherArea = await userModel.hasAreaAccess(admin.id, otherArea);
            const isAdminOfOtherArea = await userModel.isAreaAdmin(admin.id, otherArea);
            
            console.log(`${admin.nombres} ${admin.apellidos} (Área ${adminAreas[i]}) -> Área ${otherArea}:`);
            console.log(`  - Acceso: ${hasAccessToOtherArea}`);
            console.log(`  - Es admin: ${isAdminOfOtherArea}`);
          }
        }
      }
    }

    console.log('\n✅ Prueba completada exitosamente');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada');
    }
  }
}

// Ejecutar la prueba
testAreaFiltering();