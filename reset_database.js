const { pool, testConnection } = require('./src/config/database');
const fs = require('fs').promises;
const path = require('path');

class DatabaseReset {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      await testConnection();
      this.connection = await pool.getConnection();
      console.log('✅ Conectado a la base de datos');
      return true;
    } catch (error) {
      console.error('❌ Error conectando a la base de datos:', error.message);
      return false;
    }
  }

  async disconnect() {
    if (this.connection) {
      this.connection.release();
      console.log('🔌 Conexión cerrada');
    }
  }

  // Deshabilitar verificación de claves foráneas
  async disableForeignKeyChecks() {
    try {
      await this.connection.execute('SET FOREIGN_KEY_CHECKS = 0');
      console.log('🔓 Verificación de claves foráneas deshabilitada');
    } catch (error) {
      console.error('❌ Error deshabilitando claves foráneas:', error.message);
      throw error;
    }
  }

  // Habilitar verificación de claves foráneas
  async enableForeignKeyChecks() {
    try {
      await this.connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      console.log('🔒 Verificación de claves foráneas habilitada');
    } catch (error) {
      console.error('❌ Error habilitando claves foráneas:', error.message);
      throw error;
    }
  }

  // Obtener todas las tablas de la base de datos
  async getAllTables() {
    try {
      const [rows] = await this.connection.execute(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_TYPE = 'BASE TABLE'
      `);
      return rows.map(row => row.TABLE_NAME);
    } catch (error) {
      console.error('❌ Error obteniendo tablas:', error.message);
      throw error;
    }
  }

  // Truncar todas las tablas
  async truncateAllTables() {
    try {
      const tables = await this.getAllTables();
      console.log(`📋 Encontradas ${tables.length} tablas para limpiar`);

      for (const table of tables) {
        try {
          await this.connection.execute(`TRUNCATE TABLE \`${table}\``);
          console.log(`🗑️  Tabla ${table} limpiada`);
        } catch (error) {
          console.log(`⚠️  No se pudo truncar ${table}, intentando DELETE: ${error.message}`);
          try {
            await this.connection.execute(`DELETE FROM \`${table}\``);
            console.log(`🗑️  Tabla ${table} limpiada con DELETE`);
          } catch (deleteError) {
            console.error(`❌ Error limpiando ${table}:`, deleteError.message);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error en truncateAllTables:', error.message);
      throw error;
    }
  }

  // Resetear AUTO_INCREMENT de todas las tablas
  async resetAutoIncrement() {
    try {
      const tables = await this.getAllTables();
      
      for (const table of tables) {
        try {
          await this.connection.execute(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`);
          console.log(`🔄 AUTO_INCREMENT reseteado para ${table}`);
        } catch (error) {
          // Algunas tablas pueden no tener AUTO_INCREMENT, ignorar error
          console.log(`ℹ️  ${table} no tiene AUTO_INCREMENT o ya está en 1`);
        }
      }
    } catch (error) {
      console.error('❌ Error reseteando AUTO_INCREMENT:', error.message);
      throw error;
    }
  }

  // Insertar datos iniciales básicos
  async insertInitialData() {
    try {
      console.log('📝 Insertando datos iniciales...');

      // Insertar roles básicos
      const roles = [
        { nombre: 'admin', descripcion: 'Administrador del sistema', permisos: '{}' },
        { nombre: 'director', descripcion: 'Director de proyecto', permisos: '{}' },
        { nombre: 'coordinador', descripcion: 'Coordinador de área', permisos: '{}' },
        { nombre: 'estudiante', descripcion: 'Estudiante', permisos: '{}' },
        { nombre: 'evaluador', descripcion: 'Evaluador de proyectos', permisos: '{}' }
      ];

      for (const rol of roles) {
        await this.connection.execute(`
          INSERT INTO roles (nombre, descripcion, permisos, activo) 
          VALUES (?, ?, ?, TRUE)
        `, [rol.nombre, rol.descripcion, rol.permisos]);
        console.log(`👤 Rol ${rol.nombre} creado`);
      }

      // Insertar área de trabajo por defecto
      await this.connection.execute(`
        INSERT INTO areas_trabajo (codigo, nombre, descripcion, activo) 
        VALUES ('DEFAULT', 'Área General', 'Área de trabajo por defecto', TRUE)
      `);
      console.log('🏢 Área de trabajo por defecto creada');

      // Insertar ciclo académico por defecto
      const currentYear = new Date().getFullYear();
      await this.connection.execute(`
        INSERT INTO ciclos_academicos (nombre, fecha_inicio, fecha_fin, activo) 
        VALUES (?, ?, ?, TRUE)
      `, [
        `Ciclo ${currentYear}`,
        `${currentYear}-01-01`,
        `${currentYear}-12-31`
      ]);
      console.log(`📅 Ciclo académico ${currentYear} creado`);

      // Insertar fases de proyecto por defecto
      const fases = [
        { nombre: 'Propuesta', descripcion: 'Fase de propuesta inicial', orden: 1 },
        { nombre: 'Desarrollo', descripcion: 'Fase de desarrollo', orden: 2 },
        { nombre: 'Evaluación', descripcion: 'Fase de evaluación', orden: 3 },
        { nombre: 'Finalización', descripcion: 'Fase de finalización', orden: 4 }
      ];

      for (const fase of fases) {
        await this.connection.execute(`
          INSERT INTO fases_proyecto (nombre, descripcion, orden, activo) 
          VALUES (?, ?, ?, TRUE)
        `, [fase.nombre, fase.descripcion, fase.orden]);
        console.log(`📋 Fase ${fase.nombre} creada`);
      }

      console.log('✅ Datos iniciales insertados correctamente');
    } catch (error) {
      console.error('❌ Error insertando datos iniciales:', error.message);
      throw error;
    }
  }

  // Limpiar archivos subidos
  async cleanUploadedFiles() {
    try {
      console.log('🗂️  Limpiando archivos subidos...');
      
      const uploadsPath = path.join(__dirname, 'public', 'uploads');
      const deliverables = path.join(uploadsPath, 'deliverables');
      const comments = path.join(uploadsPath, 'comments');

      // Limpiar carpeta de entregables
      try {
        const deliverableFiles = await fs.readdir(deliverables);
        for (const file of deliverableFiles) {
          if (file !== '.gitkeep') {
            await fs.unlink(path.join(deliverables, file));
            console.log(`🗑️  Archivo eliminado: ${file}`);
          }
        }
      } catch (error) {
        console.log('ℹ️  Carpeta deliverables no existe o está vacía');
      }

      // Limpiar carpeta de comentarios
      try {
        const commentFiles = await fs.readdir(comments);
        for (const file of commentFiles) {
          if (file !== '.gitkeep') {
            await fs.unlink(path.join(comments, file));
            console.log(`🗑️  Archivo eliminado: ${file}`);
          }
        }
      } catch (error) {
        console.log('ℹ️  Carpeta comments no existe o está vacía');
      }

      console.log('✅ Archivos subidos limpiados');
    } catch (error) {
      console.error('❌ Error limpiando archivos:', error.message);
    }
  }

  // Proceso completo de reset
  async resetDatabase() {
    console.log('🚀 Iniciando reset completo de la base de datos...\n');
    
    try {
      // Conectar
      const connected = await this.connect();
      if (!connected) {
        throw new Error('No se pudo conectar a la base de datos');
      }

      // Deshabilitar claves foráneas
      await this.disableForeignKeyChecks();

      // Limpiar todas las tablas
      await this.truncateAllTables();

      // Resetear AUTO_INCREMENT
      await this.resetAutoIncrement();

      // Habilitar claves foráneas
      await this.enableForeignKeyChecks();

      // Insertar datos iniciales
      await this.insertInitialData();

      // Limpiar archivos subidos
      await this.cleanUploadedFiles();

      console.log('\n🎉 ¡Base de datos reseteada exitosamente!');
      console.log('📊 La base de datos está ahora limpia y lista para usar');
      console.log('👤 Se han creado los roles básicos');
      console.log('🏢 Se ha creado el área de trabajo por defecto');
      console.log('📅 Se ha creado el ciclo académico actual');
      console.log('📋 Se han creado las fases de proyecto por defecto');

    } catch (error) {
      console.error('\n💥 Error durante el reset:', error.message);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const resetTool = new DatabaseReset();
  
  // Confirmar antes de ejecutar
  console.log('⚠️  ADVERTENCIA: Este script eliminará TODOS los datos de la base de datos');
  console.log('📋 Esto incluye: usuarios, proyectos, entregables, evaluaciones, etc.');
  console.log('🗂️  También eliminará todos los archivos subidos');
  console.log('\n¿Estás seguro de que quieres continuar? (escribe "SI" para confirmar)');

  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Confirmación: ', async (answer) => {
    if (answer.toUpperCase() === 'SI') {
      try {
        await resetTool.resetDatabase();
        process.exit(0);
      } catch (error) {
        console.error('💥 Error fatal:', error.message);
        process.exit(1);
      }
    } else {
      console.log('❌ Operación cancelada');
      process.exit(0);
    }
    rl.close();
  });
}

module.exports = DatabaseReset;