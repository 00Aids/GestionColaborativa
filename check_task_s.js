const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTask() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'gestion_academica',
            port: process.env.DB_PORT || 3306
        });
        
        // First, check the table structure
        const [structure] = await connection.execute('DESCRIBE entregables');
        console.log('Table structure:');
        structure.forEach(col => {
            console.log(`- ${col.Field}: ${col.Type}`);
        });
        
        // Check for task with title 's'
        const [rows] = await connection.execute(
            'SELECT * FROM entregables WHERE titulo = ? ORDER BY id DESC LIMIT 5', 
            ['s']
        );
        
        console.log('\nTasks with title "s":', rows);
        
        // Also check the last 5 tasks created
        const [lastTasks] = await connection.execute(
            'SELECT id, titulo, descripcion, prioridad, estado FROM entregables ORDER BY id DESC LIMIT 5'
        );
        
        console.log('\nLast 5 tasks created:');
        lastTasks.forEach(task => {
            console.log(`ID: ${task.id}, Title: "${task.titulo}", Priority: ${task.prioridad}, Status: ${task.estado}`);
        });
        
        await connection.end();
    } catch (error) {
        console.error('Error checking tasks:', error);
    }
}

checkTask();