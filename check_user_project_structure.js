const { pool } = require('./src/config/database');

async function checkProjectUserStructure() {
    try {
        console.log('🔍 Verificando estructura de asignaciones usuario-proyecto...');
        
        // Verificar si existe tabla proyecto_usuarios
        const [tables] = await pool.execute(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME LIKE '%proyecto%'
        `);
        
        console.log('📋 Tablas relacionadas con proyectos:');
        tables.forEach(table => console.log('  -', table.TABLE_NAME));
        
        // Verificar estructura de la tabla proyectos
        const [projectColumns] = await pool.execute(`
            DESCRIBE proyectos
        `);
        
        console.log('\n📊 Estructura tabla proyectos:');
        projectColumns.forEach(col => {
            console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? col.Key : ''}`);
        });
        
        // Buscar usuario vsoyjostin2
        const [user] = await pool.execute(`
            SELECT id, email, nombres, apellidos, rol_id 
            FROM usuarios 
            WHERE email = 'vsoyjostin2@gmail.com'
        `);
        
        console.log('\n👤 Usuario vsoyjostin2:');
        if (user.length > 0) {
            console.log('  ID:', user[0].id);
            console.log('  Email:', user[0].email);
            console.log('  Nombre:', user[0].nombres, user[0].apellidos);
            console.log('  Rol ID:', user[0].rol_id);
        } else {
            console.log('  ❌ Usuario no encontrado');
        }
        
        // Verificar proyectos existentes
        const [projects] = await pool.execute(`
            SELECT id, titulo, descripcion, estado 
            FROM proyectos 
            LIMIT 5
        `);
        
        console.log('\n📁 Proyectos existentes (primeros 5):');
        projects.forEach(project => {
            console.log(`  ID: ${project.id} - ${project.titulo} (${project.estado})`);
        });
        
        // Verificar si existe tabla de relación proyecto_usuarios
        try {
            const [proyectoUsuarios] = await pool.execute(`
                DESCRIBE proyecto_usuarios
            `);
            
            console.log('\n🔗 Estructura tabla proyecto_usuarios:');
            proyectoUsuarios.forEach(col => {
                console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? col.Key : ''}`);
            });
        } catch (error) {
            console.log('\n❌ Tabla proyecto_usuarios no existe');
        }
        
        await pool.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkProjectUserStructure();