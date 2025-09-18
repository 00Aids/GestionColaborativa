const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class MigrationRunner {
  constructor() {
    this.db = null;
  }

  async connect() {
    try {
      this.db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'proyecto_grado',
        multipleStatements: true
      });
      console.log('✅ Conectado a la base de datos');
    } catch (error) {
      console.error('❌ Error conectando a la base de datos:', error.message);
      throw error;
    }
  }

  async createMigrationsTable() {
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS migrations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          filename VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_filename (filename)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `;
      
      await this.db.execute(query);
      console.log('✅ Tabla de migraciones creada/verificada');
    } catch (error) {
      console.error('❌ Error creando tabla de migraciones:', error.message);
      throw error;
    }
  }

  async getExecutedMigrations() {
    try {
      const [rows] = await this.db.execute('SELECT filename FROM migrations ORDER BY filename');
      return rows.map(row => row.filename);
    } catch (error) {
      console.error('❌ Error obteniendo migraciones ejecutadas:', error.message);
      return [];
    }
  }

  async getMigrationFiles() {
    try {
      const migrationsDir = __dirname;
      const files = await fs.readdir(migrationsDir);
      
      return files
        .filter(file => file.endsWith('.sql'))
        .sort();
    } catch (error) {
      console.error('❌ Error leyendo archivos de migración:', error.message);
      return [];
    }
  }

  async executeMigration(filename) {
    try {
      const filePath = path.join(__dirname, filename);
      const sql = await fs.readFile(filePath, 'utf8');
      
      console.log(`🔄 Ejecutando migración: ${filename}`);
      
      // Ejecutar la migración
      await this.db.execute(sql);
      
      // Registrar la migración como ejecutada
      await this.db.execute(
        'INSERT INTO migrations (filename) VALUES (?)',
        [filename]
      );
      
      console.log(`✅ Migración completada: ${filename}`);
    } catch (error) {
      // Ignorar errores específicos de duplicados y tablas no existentes
      const ignorableErrors = [
        'Duplicate key name',
        'Duplicate column name',
        'already exists',
        'Duplicate entry',
        "doesn't exist",
        "Table",
        "Unknown table"
      ];
      
      const shouldIgnore = ignorableErrors.some(errorText => 
        error.message.includes(errorText)
      );
      
      if (shouldIgnore) {
        console.log(`⚠️ Advertencia en migración ${filename}: ${error.message} (ignorado)`);
        
        // Registrar la migración como ejecutada aunque haya tenido advertencias
        await this.db.execute(
          'INSERT INTO migrations (filename) VALUES (?)',
          [filename]
        );
        
        console.log(`✅ Migración completada con advertencias: ${filename}`);
      } else {
        console.error(`❌ Error ejecutando migración ${filename}:`, error.message);
        throw error;
      }
    }
  }

  async runMigrations() {
    try {
      await this.connect();
      await this.createMigrationsTable();
      
      const executedMigrations = await this.getExecutedMigrations();
      const migrationFiles = await this.getMigrationFiles();
      
      const pendingMigrations = migrationFiles.filter(
        file => !executedMigrations.includes(file)
      );
      
      if (pendingMigrations.length === 0) {
        console.log('✅ No hay migraciones pendientes');
        return;
      }
      
      console.log(`📋 Migraciones pendientes: ${pendingMigrations.length}`);
      
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }
      
      console.log('🎉 Todas las migraciones completadas exitosamente');
      
    } catch (error) {
      console.error('❌ Error ejecutando migraciones:', error.message);
      throw error;
    } finally {
      if (this.db) {
        await this.db.end();
        console.log('🔌 Conexión a la base de datos cerrada');
      }
    }
  }
}

// Ejecutar migraciones si el script se ejecuta directamente
if (require.main === module) {
  const runner = new MigrationRunner();
  runner.runMigrations()
    .then(() => {
      console.log('✅ Proceso de migración completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en el proceso de migración:', error.message);
      process.exit(1);
    });
}

module.exports = MigrationRunner;