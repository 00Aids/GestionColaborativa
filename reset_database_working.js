const { pool, testConnection } = require('./src/config/database');

async function resetDatabaseWorking() {
  let connection;
  
  try {
    console.log('🚀 Iniciando reset completo de la base de datos...');
    
    // Conectar
    await testConnection();
    connection = await pool.getConnection();
    console.log('✅ Conectado a la base de datos');

    // Deshabilitar verificación de claves foráneas
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    console.log('🔓 Claves foráneas deshabilitadas');

    // Obtener todas las tablas existentes
    const [tables] = await connection.execute('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]).filter(name => name !== 'migrations');
    
    console.log(`📋 Encontradas ${tableNames.length} tablas para limpiar`);

    // Limpiar todas las tablas
    for (const tableName of tableNames) {
      try {
        await connection.execute(`DELETE FROM ${tableName}`);
        // Intentar resetear AUTO_INCREMENT solo si la tabla lo tiene
        try {
          await connection.execute(`ALTER TABLE ${tableName} AUTO_INCREMENT = 1`);
        } catch (e) {
          // Ignorar si la tabla no tiene AUTO_INCREMENT
        }
        console.log(`🗑️  ${tableName} limpiada`);
      } catch (error) {
        console.log(`⚠️  Error limpiando ${tableName}: ${error.message}`);
      }
    }

    // Habilitar verificación de claves foráneas
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('🔒 Claves foráneas habilitadas');

    // Insertar datos básicos
    console.log('📝 Insertando datos iniciales...');

    // 1. Roles básicos
    const roles = [
      ['admin', 'Administrador del sistema'],
      ['director', 'Director de proyecto'],
      ['coordinador', 'Coordinador de área'],
      ['estudiante', 'Estudiante'],
      ['evaluador', 'Evaluador de proyectos']
    ];

    for (const [nombre, descripcion] of roles) {
      await connection.execute(
        'INSERT INTO roles (nombre, descripcion, permisos, activo) VALUES (?, ?, "{}", TRUE)',
        [nombre, descripcion]
      );
    }
    console.log('👤 Roles creados');

    // 2. Área de trabajo por defecto
    await connection.execute(`
      INSERT INTO areas_trabajo (codigo, nombre, coordinador_id, activo) 
      VALUES ('DEFAULT', 'Área General', NULL, TRUE)
    `);
    console.log('🏢 Área por defecto creada');

    // 3. Ciclo académico actual
    const currentYear = new Date().getFullYear();
    await connection.execute(`
      INSERT INTO ciclos_academicos (nombre, fecha_inicio, fecha_fin, activo) 
      VALUES (?, ?, ?, TRUE)
    `, [`Ciclo ${currentYear}`, `${currentYear}-01-01`, `${currentYear}-12-31`]);
    console.log('📅 Ciclo académico creado');

    // 4. Fases de proyecto
    const fases = [
      ['Propuesta', 'Fase de propuesta inicial', 1],
      ['Desarrollo', 'Fase de desarrollo', 2],
      ['Evaluación', 'Fase de evaluación', 3],
      ['Finalización', 'Fase de finalización', 4]
    ];

    for (const [nombre, descripcion, orden] of fases) {
      await connection.execute(
        'INSERT INTO fases_proyecto (nombre, descripcion, orden, activo) VALUES (?, ?, ?, TRUE)',
        [nombre, descripcion, orden]
      );
    }
    console.log('📋 Fases de proyecto creadas');

    // 5. Línea de investigación por defecto (usando estructura real)
    await connection.execute(`
      INSERT INTO lineas_investigacion (nombre, descripcion, area_trabajo_id, coordinador_id, activo) 
      VALUES ('General', 'Línea de investigación general', 1, NULL, TRUE)
    `);
    console.log('🔬 Línea de investigación creada');

    console.log('\n🎉 ¡Base de datos reseteada exitosamente!');
    console.log('✨ La base de datos está completamente limpia y lista para usar');
    console.log('📊 Datos iniciales insertados correctamente');
    console.log('\n📋 Resumen de datos creados:');
    console.log('   • 5 roles básicos (admin, director, coordinador, estudiante, evaluador)');
    console.log('   • 1 área de trabajo por defecto');
    console.log('   • 1 ciclo académico actual (' + currentYear + ')');
    console.log('   • 4 fases de proyecto (Propuesta → Desarrollo → Evaluación → Finalización)');
    console.log('   • 1 línea de investigación general');
    console.log('\n🚀 ¡Tu sistema está listo para empezar de nuevo!');

  } catch (error) {
    console.error('❌ Error durante el reset:', error.message);
    throw error;
  } finally {
    if (connection) {
      connection.release();
      console.log('🔌 Conexión cerrada');
    }
  }
}

// Ejecutar
resetDatabaseWorking()
  .then(() => {
    console.log('\n✅ Proceso completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error.message);
    process.exit(1);
  });