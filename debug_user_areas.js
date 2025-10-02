const User = require('./src/models/User');
const { pool } = require('./src/config/database');

async function debugUserAreas() {
    try {
        console.log('🔍 Verificando áreas del usuario s@test.com...\n');

        // Obtener información básica del usuario
        const [userRows] = await pool.execute(`
            SELECT u.id, u.email, u.area_trabajo_id, r.nombre as rol_nombre
            FROM usuarios u
            JOIN roles r ON u.rol_id = r.id
            WHERE u.email = ?
        `, ['s@test.com']);

        if (userRows.length === 0) {
            console.log('❌ Usuario no encontrado');
            return;
        }

        const user = userRows[0];
        console.log('👤 Usuario en tabla usuarios:');
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Área de trabajo ID: ${user.area_trabajo_id}`);
        console.log(`   Rol: ${user.rol_nombre}\n`);

        // Verificar qué devuelve getUserAreas
        const userModel = new User();
        const userAreas = await userModel.getUserAreas(user.id);
        
        console.log('🏢 Áreas devueltas por getUserAreas:');
        if (userAreas.length === 0) {
            console.log('   ❌ No se encontraron áreas');
        } else {
            userAreas.forEach((area, index) => {
                console.log(`   ${index + 1}. Área ID: ${area.area_trabajo_id || area.id}`);
                console.log(`      Nombre: ${area.nombre || area.area_nombre || 'N/A'}`);
                console.log(`      Código: ${area.codigo || area.area_codigo || 'N/A'}`);
                console.log('');
            });
            
            console.log(`📌 Primera área (la que usa el middleware): ${userAreas[0].area_trabajo_id || userAreas[0].id}`);
        }

        // Verificar si hay discrepancia
        const firstAreaId = userAreas.length > 0 ? (userAreas[0].area_trabajo_id || userAreas[0].id) : null;
        if (firstAreaId && firstAreaId !== user.area_trabajo_id) {
            console.log('\n⚠️  DISCREPANCIA DETECTADA:');
            console.log(`   Usuario.area_trabajo_id: ${user.area_trabajo_id}`);
            console.log(`   Primera área de getUserAreas: ${firstAreaId}`);
        } else {
            console.log('\n✅ Las áreas coinciden correctamente');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

debugUserAreas();