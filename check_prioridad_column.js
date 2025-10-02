const mysql = require('mysql2/promise');

async function checkPrioridadColumn() {
    console.log('🔍 Verificando la columna prioridad...\n');
    
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'root',
            database: 'gestion_academica'
        });
        
        // 1. Verificar estructura de la columna prioridad
        console.log('📋 Estructura de la columna prioridad:');
        const [columns] = await connection.execute(
            "SHOW COLUMNS FROM entregables WHERE Field = 'prioridad'"
        );
        
        if (columns.length > 0) {
            const column = columns[0];
            console.log(`   Tipo: ${column.Type}`);
            console.log(`   Null: ${column.Null}`);
            console.log(`   Default: ${column.Default}`);
            console.log(`   Extra: ${column.Extra}`);
            
            // Si es ENUM, extraer los valores permitidos
            if (column.Type.includes('enum')) {
                const enumValues = column.Type.match(/enum\(([^)]+)\)/)[1];
                console.log(`   Valores permitidos: ${enumValues}`);
            }
        } else {
            console.log('❌ Columna prioridad no encontrada');
        }
        
        // 2. Verificar valores únicos existentes en la tabla
        console.log('\n📊 Valores únicos de prioridad en la tabla:');
        const [priorities] = await connection.execute(
            'SELECT DISTINCT prioridad, COUNT(*) as count FROM entregables GROUP BY prioridad ORDER BY count DESC'
        );
        
        priorities.forEach(p => {
            console.log(`   "${p.prioridad}" (${p.count} tareas)`);
        });
        
        // 3. Verificar el formulario task-create.ejs para ver qué valores envía
        console.log('\n🔍 Verificando valores en el formulario...');
        const fs = require('fs');
        const path = require('path');
        
        const formPath = path.join(__dirname, 'src', 'views', 'admin', 'task-create.ejs');
        const formContent = fs.readFileSync(formPath, 'utf8');
        
        // Buscar el select de prioridad
        const prioritySelectMatch = formContent.match(/<select[^>]*name=["']prioridad["'][^>]*>([\s\S]*?)<\/select>/i);
        
        if (prioritySelectMatch) {
            console.log('✅ Select de prioridad encontrado:');
            const selectContent = prioritySelectMatch[1];
            
            // Extraer opciones
            const optionMatches = selectContent.match(/<option[^>]*value=["']([^"']+)["'][^>]*>/g);
            if (optionMatches) {
                console.log('   Valores en el formulario:');
                optionMatches.forEach(option => {
                    const valueMatch = option.match(/value=["']([^"']+)["']/);
                    if (valueMatch) {
                        console.log(`     - "${valueMatch[1]}"`);
                    }
                });
            }
        } else {
            console.log('❌ Select de prioridad no encontrado en el formulario');
        }
        
        await connection.end();
        
        console.log('\n🔧 SOLUCIÓN:');
        console.log('1. Verificar que los valores del formulario coincidan con los permitidos en la BD');
        console.log('2. Si no coinciden, actualizar el formulario o la estructura de la BD');
        console.log('3. Los valores más comunes suelen ser: "baja", "media", "alta" o "low", "medium", "high"');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkPrioridadColumn();