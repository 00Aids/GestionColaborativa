const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Middleware para monitorear todas las peticiones
function requestMonitor(req, res, next) {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.originalUrl;
    const userAgent = req.get('User-Agent') || 'Unknown';
    
    console.log('\n🌐 PETICIÓN RECIBIDA:');
    console.log(`   Timestamp: ${timestamp}`);
    console.log(`   Método: ${method}`);
    console.log(`   URL: ${url}`);
    console.log(`   User-Agent: ${userAgent.substring(0, 50)}...`);
    console.log(`   Headers: ${JSON.stringify(req.headers, null, 2)}`);
    
    if (method === 'DELETE' && url.includes('/members/')) {
        console.log('🚨 PETICIÓN DELETE DETECTADA PARA ELIMINAR MIEMBRO!');
        console.log(`   Parámetros: ${JSON.stringify(req.params)}`);
        console.log(`   Query: ${JSON.stringify(req.query)}`);
        console.log(`   Body: ${JSON.stringify(req.body)}`);
    }
    
    next();
}

async function startMonitoring() {
    console.log('🔍 MONITOR DE PETICIONES HTTP INICIADO');
    console.log('=' .repeat(50));
    console.log('Monitoreando todas las peticiones HTTP...');
    console.log('Prestando especial atención a peticiones DELETE para eliminar miembros');
    console.log('=' .repeat(50));
    
    // Conectar a la base de datos para verificar cambios
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'gestion_colaborativa'
        });
        
        console.log('✅ Conectado a la base de datos para monitoreo');
        
        // Verificar estado inicial del usuario 21
        const [initialState] = await connection.execute(`
            SELECT estado FROM proyecto_usuarios 
            WHERE proyecto_id = 2 AND usuario_id = 21
        `);
        
        if (initialState.length > 0) {
            console.log(`📊 Estado inicial del usuario 21: ${initialState[0].estado}`);
        }
        
        // Monitorear cambios cada 5 segundos
        setInterval(async () => {
            try {
                const [currentState] = await connection.execute(`
                    SELECT estado FROM proyecto_usuarios 
                    WHERE proyecto_id = 2 AND usuario_id = 21
                `);
                
                if (currentState.length > 0) {
                    const estado = currentState[0].estado;
                    if (estado !== 'activo') {
                        console.log(`🔄 CAMBIO DETECTADO: Usuario 21 ahora está ${estado}`);
                    }
                }
            } catch (error) {
                console.error('Error monitoreando base de datos:', error.message);
            }
        }, 5000);
        
    } catch (error) {
        console.error('Error conectando a la base de datos:', error.message);
    }
}

// Instrucciones para el usuario
console.log(`
📋 INSTRUCCIONES PARA USAR EL MONITOR:

1. Ejecuta este script: node monitor_requests.js
2. En otra terminal, inicia el servidor: npm start
3. Ve a http://localhost:3000/admin/projects/2/details
4. Intenta eliminar el usuario ID 21
5. Observa los logs en esta consola

El monitor detectará:
- Todas las peticiones HTTP que lleguen al servidor
- Específicamente las peticiones DELETE para eliminar miembros
- Cambios en el estado del usuario 21 en la base de datos

Si no ves logs de peticiones DELETE, significa que el problema está en el frontend.
Si ves las peticiones pero no hay cambios en la base de datos, el problema está en el backend.
`);

startMonitoring();

// Mantener el script ejecutándose
process.on('SIGINT', () => {
    console.log('\n👋 Monitor detenido');
    process.exit(0);
});