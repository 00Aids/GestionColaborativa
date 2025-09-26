const { pool } = require('./src/config/database');

async function generateUserCode() {
    try {
        const prefix = 'USR';
        let isUnique = false;
        let codigo;
        
        while (!isUnique) {
            const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            codigo = `${prefix}${randomNum}`;
            
            const [existing] = await pool.execute(
                'SELECT id FROM usuarios WHERE codigo_usuario = ?',
                [codigo]
            );
            
            if (existing.length === 0) {
                isUnique = true;
            }
        }
        
        return codigo;
    } catch (error) {
        throw new Error(`Error generating user code: ${error.message}`);
    }
}

async function assignUserCodes() {
    try {
        console.log('🔍 Buscando usuarios sin código asignado...');
        
        // Buscar usuarios sin código asignado
        const [users] = await pool.execute(`
            SELECT id, nombres, apellidos, email 
            FROM usuarios 
            WHERE codigo_usuario IS NULL OR codigo_usuario = ''
        `);
        
        console.log(`📊 Encontrados ${users.length} usuarios sin código`);
        
        if (users.length === 0) {
            console.log('✅ Todos los usuarios ya tienen códigos asignados');
            return;
        }
        
        console.log(`📝 Encontrados ${users.length} usuarios sin código. Asignando códigos...`);

        for (const user of users) {
            const newCode = await generateUniqueUserCode();
            
            await pool.execute(`
                UPDATE usuarios 
                SET codigo_usuario = ? 
                WHERE id = ?
            `, [newCode, user.id]);

            console.log(`✅ Usuario ${user.nombres} ${user.apellidos} (${user.email}) - Código asignado: ${newCode}`);
        }
        
        console.log(`🎉 Proceso completado. ${users.length} códigos asignados.`);
        
    } catch (error) {
        console.error('❌ Error asignando códigos de usuario:', error);
    } finally {
        await pool.end();
    }
}

// Ejecutar el script
assignUserCodes();