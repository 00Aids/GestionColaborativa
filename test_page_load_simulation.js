const { pool } = require('./src/config/database');
const ProjectController = require('./src/controllers/ProjectController');

async function simulatePageLoad() {
  try {
    console.log('🔄 Simulando carga de página del proyecto 35...');
    
    // 1. Simular la carga del proyecto (como lo hace el controlador show)
    console.log('\n1. 📄 Obteniendo datos del proyecto...');
    const [projectResult] = await pool.execute(`
      SELECT p.*, u.nombres, u.apellidos, u.email as estudiante_email
      FROM proyectos p
      LEFT JOIN usuarios u ON p.estudiante_id = u.id
      WHERE p.id = 35
    `);
    
    if (projectResult.length === 0) {
      console.log('❌ Proyecto no encontrado');
      return;
    }
    
    const project = projectResult[0];
    console.log(`   ✅ Proyecto encontrado: ${project.titulo}`);
    console.log(`   📧 Estudiante principal: ${project.estudiante_email || 'No asignado'}`);
    
    // 2. Simular la verificación de acceso del usuario s@test.com
    console.log('\n2. 🔐 Verificando acceso del usuario s@test.com...');
    const [userResult] = await pool.execute(`
      SELECT u.id, u.email, u.nombres, u.apellidos, r.nombre as rol_nombre
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      WHERE u.email = 's@test.com'
    `);
    
    const user = userResult[0];
    console.log(`   👤 Usuario: ${user.email} (ID: ${user.id}) - Rol: ${user.rol_nombre}`);
    
    // 3. Verificar si el usuario tiene acceso al proyecto
    const [accessResult] = await pool.execute(`
      SELECT * FROM project_members 
      WHERE usuario_id = ? AND proyecto_id = 35 AND activo = 1
    `, [user.id]);
    
    if (accessResult.length === 0) {
      console.log('   ❌ Usuario no tiene acceso al proyecto');
      return;
    }
    
    console.log(`   ✅ Usuario tiene acceso como: ${accessResult[0].rol_en_proyecto}`);
    
    // 4. Simular la llamada AJAX que se hace automáticamente
    console.log('\n3. 🚀 Simulando llamada AJAX automática...');
    
    const mockReq = {
      params: { id: 35 },
      session: { user: user }
    };
    
    let apiResponse = null;
    const mockRes = {
      json: function(data) {
        apiResponse = data;
        return this;
      },
      status: function(code) {
        return this;
      }
    };
    
    const projectController = new ProjectController();
    await projectController.getProjectDeliverables(mockReq, mockRes);
    
    console.log(`   📦 API Response success: ${apiResponse.success}`);
    if (apiResponse.success) {
      console.log(`   📋 Entregables devueltos: ${apiResponse.deliverables.length}`);
      
      // 5. Simular lo que haría displayDeliverables
      console.log('\n4. 🎨 Simulando displayDeliverables...');
      const deliverables = apiResponse.deliverables;
      
      if (deliverables.length === 0) {
        console.log('   📭 Se mostraría: "No hay entregables"');
      } else {
        console.log('   📋 Se mostrarían los siguientes entregables:');
        deliverables.forEach((d, i) => {
          console.log(`      ${i+1}. ${d.titulo} (${d.estado})`);
        });
        
        // Verificar si hay problemas con las fechas
        console.log('\n   🗓️ Verificando fechas:');
        deliverables.forEach((d, i) => {
          try {
            const dueDate = new Date(d.fecha_entrega);
            console.log(`      ${i+1}. ${d.titulo}: ${dueDate.toLocaleDateString('es-ES')} (válida: ${!isNaN(dueDate.getTime())})`);
          } catch (error) {
            console.log(`      ${i+1}. ${d.titulo}: ERROR en fecha - ${error.message}`);
          }
        });
      }
      
      // 6. Verificar condiciones de permisos
      console.log('\n5. 🔒 Verificando condiciones de permisos:');
      console.log(`   - user.rol_nombre === 'Estudiante': ${user.rol_nombre === 'Estudiante'}`);
      console.log(`   - project.estudiante_id: ${project.estudiante_id}`);
      console.log(`   - user.id: ${user.id}`);
      console.log(`   - project.estudiante_id === user.id: ${project.estudiante_id === user.id}`);
      
      if (user.rol_nombre === 'Estudiante' && project.estudiante_id === user.id) {
        console.log('   ✅ Usuario puede editar/eliminar entregables');
      } else {
        console.log('   ℹ️ Usuario solo puede ver entregables (sin botones de edición)');
      }
      
    } else {
      console.log(`   ❌ Error en API: ${apiResponse.error}`);
    }
    
    console.log('\n✅ Simulación completada');
    
  } catch (error) {
    console.error('❌ Error en la simulación:', error);
  } finally {
    process.exit(0);
  }
}

simulatePageLoad();