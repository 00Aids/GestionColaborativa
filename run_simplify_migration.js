const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runSimplifyMigration() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'gestion_academica'
    });

    try {
        console.log('=== SIMPLIFICACIÓN DE AREAS_TRABAJO ===\n');

        // 1. Mostrar estructura actual
        console.log('1. ESTRUCTURA ACTUAL:');
        const [currentStructure] = await connection.execute('DESCRIBE areas_trabajo');
        console.table(currentStructure);

        // 2. Mostrar datos actuales
        console.log('\n2. DATOS ACTUALES:');
        const [currentData] = await connection.execute('SELECT * FROM areas_trabajo ORDER BY codigo');
        console.table(currentData);

        // 3. Ejecutar migración
        console.log('\n3. EJECUTANDO MIGRACIÓN...');
        
        // Eliminar campo nombre si existe
        try {
            await connection.execute('ALTER TABLE areas_trabajo DROP COLUMN nombre');
            console.log('✓ Campo "nombre" eliminado');
        } catch (error) {
            if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                console.log('- Campo "nombre" ya no existe');
            } else {
                console.log('- Error eliminando "nombre":', error.message);
            }
        }

        // Eliminar campo descripcion si existe
        try {
            await connection.execute('ALTER TABLE areas_trabajo DROP COLUMN descripcion');
            console.log('✓ Campo "descripcion" eliminado');
        } catch (error) {
            if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                console.log('- Campo "descripcion" ya no existe');
            } else {
                console.log('- Error eliminando "descripcion":', error.message);
            }
        }

        // Asegurar que código sea único
        try {
            await connection.execute('ALTER TABLE areas_trabajo MODIFY COLUMN codigo VARCHAR(10) NOT NULL');
            console.log('✓ Campo "codigo" configurado como NOT NULL');
        } catch (error) {
            console.log('- Error modificando "codigo":', error.message);
        }

        // Agregar índice único si no existe
        try {
            await connection.execute('ALTER TABLE areas_trabajo ADD UNIQUE INDEX idx_codigo_unique (codigo)');
            console.log('✓ Índice único agregado al campo "codigo"');
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('- Índice único ya existe en "codigo"');
            } else {
                console.log('- Error agregando índice único:', error.message);
            }
        }

        // 4. Mostrar estructura final
        console.log('\n4. ESTRUCTURA FINAL:');
        const [finalStructure] = await connection.execute('DESCRIBE areas_trabajo');
        console.table(finalStructure);

        // 5. Mostrar datos finales
        console.log('\n5. DATOS FINALES:');
        const [finalData] = await connection.execute('SELECT * FROM areas_trabajo ORDER BY codigo');
        console.table(finalData);

        // 6. Verificar relaciones
        console.log('\n6. VERIFICACIÓN DE RELACIONES:');
        const [relations] = await connection.execute(`
            SELECT 
                a.codigo as area_codigo,
                COUNT(u.id) as usuarios_asignados,
                GROUP_CONCAT(CONCAT(u.nombres, ' ', u.apellidos) SEPARATOR ', ') as usuarios
            FROM areas_trabajo a
            LEFT JOIN usuarios u ON a.id = u.area_trabajo_id AND u.activo = 1
            GROUP BY a.id, a.codigo
            ORDER BY a.codigo
        `);
        console.table(relations);

        console.log('\n✅ Simplificación de areas_trabajo completada');
        console.log('📋 Ahora cada área es simplemente un código único asignado a un administrador');

    } catch (error) {
        console.error('❌ Error en la migración:', error);
    } finally {
        await connection.end();
    }
}

runSimplifyMigration();