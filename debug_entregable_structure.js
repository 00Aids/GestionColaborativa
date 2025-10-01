const mysql = require('mysql2/promise');

async function debugEntregableStructure() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'gestion_academica'
    });

    try {
        console.log('=== DEBUGGING ENTREGABLE STRUCTURE ===\n');

        // 1. Verificar estructura de la tabla entregables
        console.log('1. Estructura de la tabla entregables:');
        const [columns] = await connection.execute(`
            DESCRIBE entregables
        `);
        console.log(columns.map(col => `${col.Field}: ${col.Type}`));

        // 2. Obtener el entregable específico
        console.log('\n2. Entregable específico (base de datos):');
        const [entregables] = await connection.execute(`
            SELECT e.*, p.area_trabajo_id as proyecto_area_trabajo_id
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            WHERE e.titulo = 'base de datos'
        `);
        console.log('Entregable encontrado:', entregables[0]);

        // 3. Verificar información del coordinador ananim
        console.log('\n3. Información del coordinador ananim:');
        const [coordinador] = await connection.execute(`
            SELECT id, nombres, apellidos, area_trabajo_id
            FROM usuarios 
            WHERE nombres = 'añañim'
        `);
        console.log('Coordinador:', coordinador[0]);

        // 4. Verificar método getUserAreas para el coordinador
        console.log('\n4. Áreas del coordinador (método getUserAreas):');
        const [userAreas] = await connection.execute(`
            SELECT DISTINCT at.id as area_trabajo_id, at.nombre as area_nombre
            FROM areas_trabajo at
            WHERE at.id = ?
        `, [coordinador[0].area_trabajo_id]);
        console.log('Áreas del coordinador:', userAreas);

        // 5. Simular la verificación de permisos actual (incorrecta)
        console.log('\n5. Verificación de permisos actual (INCORRECTA):');
        const entregable = entregables[0];
        const hasAccessIncorrect = userAreas.some(area => area.area_trabajo_id === entregable.area_trabajo_id);
        console.log(`entregable.area_trabajo_id: ${entregable.area_trabajo_id}`);
        console.log(`coordinador areas: ${userAreas.map(a => a.area_trabajo_id).join(', ')}`);
        console.log(`Acceso (incorrecto): ${hasAccessIncorrect}`);

        // 6. Simular la verificación de permisos correcta
        console.log('\n6. Verificación de permisos CORRECTA:');
        const hasAccessCorrect = userAreas.some(area => area.area_trabajo_id === entregable.proyecto_area_trabajo_id);
        console.log(`proyecto.area_trabajo_id: ${entregable.proyecto_area_trabajo_id}`);
        console.log(`coordinador areas: ${userAreas.map(a => a.area_trabajo_id).join(', ')}`);
        console.log(`Acceso (correcto): ${hasAccessCorrect}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

debugEntregableStructure();