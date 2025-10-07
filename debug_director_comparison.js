const mysql = require('mysql2/promise');

async function debugDirectorComparison() {
  let connection;
  
  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'gestion_academica'
    });

    console.log('🔍 COMPARACIÓN: CONSULTAS DE PROYECTOS VS ENTREGABLES PARA DIRECTOR');
    console.log('================================================================\n');

    // 1. Encontrar el director alain lalin
    console.log('1. BUSCANDO DIRECTOR ALAIN LALIN:');
    const [directors] = await connection.execute(`
      SELECT u.id, u.nombres, u.apellidos, u.email, r.nombre as rol_nombre
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id
      WHERE r.nombre = 'Director de Proyecto' 
      AND (u.nombres LIKE '%alain%' OR u.apellidos LIKE '%lalin%')
    `);
    
    if (directors.length === 0) {
      console.log('❌ No se encontró el director alain lalin');
      return;
    }
    
    const director = directors[0];
    console.log(`✅ Director encontrado: ${director.nombres} ${director.apellidos} (ID: ${director.id})`);

    // 2. CONSULTA DE PROYECTOS (como la hace el controlador DirectorController.projects)
    console.log('\n2. CONSULTA DE PROYECTOS (DirectorController.projects):');
    console.log('Simulando: this.projectModel.findByDirector(user.id)');
    
    const projectQuery = `
      SELECT DISTINCT
        p.id,
        p.titulo,
        p.descripcion,
        p.estado,
        p.fecha_propuesta,
        p.fecha_finalizacion,
        p.director_id,
        p.created_at,
        p.updated_at,
        u_estudiante.nombres as estudiante_nombres,
        u_estudiante.apellidos as estudiante_apellidos,
        u_director.nombres as director_nombres,
        u_director.apellidos as director_apellidos
      FROM proyectos p
      LEFT JOIN usuarios u_estudiante ON p.estudiante_id = u_estudiante.id
      LEFT JOIN usuarios u_director ON p.director_id = u_director.id
      LEFT JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
      WHERE (p.director_id = ? OR (pu.usuario_id = ? AND pu.rol = 'coordinador'))
      ORDER BY p.created_at DESC
    `;
    
    const [projectResults] = await connection.execute(projectQuery, [director.id, director.id]);
    console.log(`   Proyectos encontrados: ${projectResults.length}`);
    
    if (projectResults.length > 0) {
      projectResults.forEach((project, index) => {
        console.log(`   📁 Proyecto ${index + 1}:`);
        console.log(`      ID: ${project.id}`);
        console.log(`      Título: ${project.titulo}`);
        console.log(`      Estado: ${project.estado}`);
        console.log(`      Director ID: ${project.director_id}`);
        console.log(`      Fecha propuesta: ${project.fecha_propuesta}`);
        console.log(`      Fecha finalización: ${project.fecha_finalizacion}`);
      });
    } else {
      console.log('   ❌ No se encontraron proyectos');
    }

    // 3. CONSULTA DE ENTREGABLES (como la hace el controlador DirectorController.deliverables)
    console.log('\n3. CONSULTA DE ENTREGABLES (DirectorController.deliverables):');
    console.log('Paso 1: Obtener proyectos dirigidos');
    
    // Primero obtiene los proyectos dirigidos (igual que arriba)
    const directedProjects = projectResults;
    const projectIds = directedProjects.map(p => p.id);
    
    console.log(`   IDs de proyectos dirigidos: [${projectIds.join(', ')}]`);
    
    if (projectIds.length > 0) {
      console.log('\nPaso 2: Obtener entregables de esos proyectos');
      
      // Luego obtiene entregables de cada proyecto
      let allDeliverables = [];
      for (const project of directedProjects) {
        const [deliverables] = await connection.execute(`
          SELECT DISTINCT
            e.id,
            e.proyecto_id,
            e.fase_id,
            e.titulo,
            e.descripcion,
            e.archivo_url,
            e.fecha_entrega,
            e.fecha_limite,
            e.estado,
            e.observaciones,
            e.created_at,
            e.updated_at
          FROM entregables e
          WHERE e.proyecto_id = ?
          ORDER BY e.fecha_entrega DESC
        `, [project.id]);
        
        if (deliverables && deliverables.length > 0) {
          const deliverablesWithProject = deliverables.map(deliverable => ({
            ...deliverable,
            proyecto_titulo: project.titulo,
            proyecto_estado: project.estado
          }));
          allDeliverables.push(...deliverablesWithProject);
        }
      }
      
      console.log(`   Entregables encontrados: ${allDeliverables.length}`);
      
      if (allDeliverables.length > 0) {
        allDeliverables.forEach((deliverable, index) => {
          console.log(`   📄 Entregable ${index + 1}:`);
          console.log(`      ID: ${deliverable.id}`);
          console.log(`      Título: ${deliverable.titulo}`);
          console.log(`      Proyecto: ${deliverable.proyecto_titulo} (ID: ${deliverable.proyecto_id})`);
          console.log(`      Estado: ${deliverable.estado}`);
        });
      }
    } else {
      console.log('   ❌ No hay proyectos dirigidos, por lo tanto no hay entregables');
    }

    // 4. VERIFICACIÓN DIRECTA EN LA BASE DE DATOS
    console.log('\n4. VERIFICACIÓN DIRECTA EN LA BASE DE DATOS:');
    
    // Verificar proyectos donde director_id = 3
    const [directProjects] = await connection.execute(`
      SELECT id, titulo, estado, director_id
      FROM proyectos 
      WHERE director_id = ?
    `, [director.id]);
    
    console.log(`   Proyectos con director_id = ${director.id}: ${directProjects.length}`);
    directProjects.forEach(p => {
      console.log(`     - ${p.titulo} (ID: ${p.id}, Estado: ${p.estado})`);
    });
    
    // Verificar proyectos en proyecto_usuarios como coordinador
    const [coordinatorProjects] = await connection.execute(`
      SELECT p.id, p.titulo, p.estado, pu.rol
      FROM proyectos p
      INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
      WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
    `, [director.id]);
    
    console.log(`   Proyectos como coordinador en proyecto_usuarios: ${coordinatorProjects.length}`);
    coordinatorProjects.forEach(p => {
      console.log(`     - ${p.titulo} (ID: ${p.id}, Estado: ${p.estado})`);
    });

    // 5. DIAGNÓSTICO FINAL
    console.log('\n5. DIAGNÓSTICO:');
    
    const totalProjectsFound = directProjects.length + coordinatorProjects.length;
    console.log(`   Total proyectos que debería encontrar: ${totalProjectsFound}`);
    console.log(`   Proyectos encontrados por findByDirector: ${projectResults.length}`);
    
    if (totalProjectsFound > 0 && projectResults.length === 0) {
      console.log('   ❌ PROBLEMA: findByDirector no está encontrando proyectos que existen');
    } else if (totalProjectsFound === projectResults.length) {
      console.log('   ✅ findByDirector está funcionando correctamente');
      console.log('   🔍 El problema debe estar en otro lugar (controlador, vista, etc.)');
    } else {
      console.log('   ⚠️  Discrepancia en el número de proyectos encontrados');
    }

  } catch (error) {
    console.error('❌ Error durante el debug:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Ejecutar el debug
debugDirectorComparison().catch(console.error);