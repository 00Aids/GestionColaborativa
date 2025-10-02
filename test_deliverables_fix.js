const { pool } = require('./src/config/database');
const ProjectController = require('./src/controllers/ProjectController');

async function testDeliverablesFix() {
  try {
    console.log('🔧 Probando la corrección de entregables con s@test.com...');
    
    // Verificar específicamente el usuario s@test.com
    const [userResult] = await pool.execute(`
      SELECT u.id, u.email, u.nombres, u.apellidos, r.nombre as rol_nombre
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      WHERE u.email = 's@test.com'
    `);
    
    if (userResult.length === 0) {
      console.log('❌ Usuario s@test.com no encontrado');
      return;
    }
    
    const user = userResult[0];
    console.log(`👤 Usuario encontrado: ${user.email} (ID: ${user.id}) - Rol: ${user.rol_nombre}`);
    
    // Verificar si está asignado al proyecto 35
    const [memberResult] = await pool.execute(`
      SELECT * FROM project_members 
      WHERE usuario_id = ? AND proyecto_id = 35 AND activo = 1
    `, [user.id]);
    
    if (memberResult.length === 0) {
      console.log('❌ El usuario s@test.com no está asignado al proyecto 35');
      return;
    }
    
    console.log(`✅ Usuario asignado al proyecto 35 como: ${memberResult[0].rol_en_proyecto}`);
    
    // Simular una sesión de usuario estudiante
    const mockUser = {
      id: user.id,
      rol_nombre: user.rol_nombre,
      area_trabajo_id: 12
    };
    
    // Simular request y response
    const mockReq = {
      params: { id: 35 },
      session: { user: mockUser }
    };
    
    const mockRes = {
      json: function(data) {
        console.log('\n📤 Respuesta de la API:');
        console.log(`   Success: ${data.success}`);
        if (data.success) {
          console.log(`   Entregables encontrados: ${data.deliverables.length}`);
          
          if (data.deliverables.length > 0) {
            console.log('\n📋 Primeros 3 entregables:');
            data.deliverables.slice(0, 3).forEach((d, i) => {
              console.log(`   ${i+1}. ${d.titulo}`);
              console.log(`      Estado: ${d.estado}`);
              console.log(`      Fecha entrega: ${d.fecha_entrega}`);
              console.log('');
            });
            
            console.log('✅ La API está devolviendo los entregables correctamente');
            console.log('✅ La corrección en displayDeliverables debería funcionar');
          }
        } else {
          console.log(`   Error: ${data.error}`);
        }
        return this;
      },
      status: function(code) {
        console.log(`   Status Code: ${code}`);
        return this;
      }
    };
    
    // Instanciar el controlador
    const projectController = new ProjectController();
    
    // Llamar al método que maneja la API
    console.log('\n🚀 Llamando a getProjectDeliverables...');
    await projectController.getProjectDeliverables(mockReq, mockRes);
    
    console.log('\n✅ Prueba completada');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  } finally {
    process.exit(0);
  }
}

testDeliverablesFix();