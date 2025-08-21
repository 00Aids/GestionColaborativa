const { pool } = require('../config/database');

class BaseModel {
  constructor(tableName) {
    this.tableName = tableName;
    this.db = pool;
  }

  // Crear un nuevo registro
  async create(data) {
    try {
      const fields = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);
      
      const query = `INSERT INTO ${this.tableName} (${fields}) VALUES (${placeholders})`;
      const [result] = await this.db.execute(query, values);
      
      return { id: result.insertId, ...data };
    } catch (error) {
      throw new Error(`Error creating ${this.tableName}: ${error.message}`);
    }
  }

  // Obtener todos los registros
  async findAll(conditions = {}, limit = null, offset = null) {
    try {
      let query = `SELECT * FROM ${this.tableName}`;
      const values = [];
      
      if (Object.keys(conditions).length > 0) {
        const whereClause = Object.keys(conditions)
          .map(key => `${key} = ?`)
          .join(' AND ');
        query += ` WHERE ${whereClause}`;
        values.push(...Object.values(conditions));
      }
      
      if (limit) {
        query += ` LIMIT ?`;
        values.push(limit);
        
        if (offset) {
          query += ` OFFSET ?`;
          values.push(offset);
        }
      }
      
      const [rows] = await this.db.execute(query, values);
      return rows;
    } catch (error) {
      throw new Error(`Error finding ${this.tableName}: ${error.message}`);
    }
  }

  // Obtener un registro por ID
  async findById(id) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
      const [rows] = await this.db.execute(query, [id]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding ${this.tableName} by ID: ${error.message}`);
    }
  }

  // Obtener un registro por condiciones
  async findOne(conditions) {
    try {
      const whereClause = Object.keys(conditions)
        .map(key => `${key} = ?`)
        .join(' AND ');
      const values = Object.values(conditions);
      
      const query = `SELECT * FROM ${this.tableName} WHERE ${whereClause} LIMIT 1`;
      const [rows] = await this.db.execute(query, values);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding ${this.tableName}: ${error.message}`);
    }
  }

  // Actualizar un registro
  async update(id, data) {
    try {
      const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(data), id];
      
      const query = `UPDATE ${this.tableName} SET ${fields} WHERE id = ?`;
      const [result] = await this.db.execute(query, values);
      
      if (result.affectedRows === 0) {
        throw new Error(`${this.tableName} not found`);
      }
      
      return await this.findById(id);
    } catch (error) {
      throw new Error(`Error updating ${this.tableName}: ${error.message}`);
    }
  }

  // Eliminar un registro
  async delete(id) {
    try {
      const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
      const [result] = await this.db.execute(query, [id]);
      
      if (result.affectedRows === 0) {
        throw new Error(`${this.tableName} not found`);
      }
      
      return { message: `${this.tableName} deleted successfully` };
    } catch (error) {
      throw new Error(`Error deleting ${this.tableName}: ${error.message}`);
    }
  }

  // Contar registros
  async count(conditions = {}) {
    try {
      let query = `SELECT COUNT(*) as total FROM ${this.tableName}`;
      const values = [];
      
      if (Object.keys(conditions).length > 0) {
        const whereClause = Object.keys(conditions)
          .map(key => `${key} = ?`)
          .join(' AND ');
        query += ` WHERE ${whereClause}`;
        values.push(...Object.values(conditions));
      }
      
      const [rows] = await this.db.execute(query, values);
      return rows[0].total;
    } catch (error) {
      throw new Error(`Error counting ${this.tableName}: ${error.message}`);
    }
  }
}

module.exports = BaseModel;