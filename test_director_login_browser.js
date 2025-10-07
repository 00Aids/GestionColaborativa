require('dotenv').config();
const mysql = require('mysql2/promise');

// Configuración de base de datos
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'gestion_colaborativa'
};

async function testDirectorLoginCredentials() {
    let connection;
    
    try {
        console.log('🔍 TESTING DIRECTOR LOGIN CREDENTIALS');
        console.log('=====================================\n');
        
        // Conectar a la base de datos
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conexión a base de datos establecida\n');
        
        // 1. Buscar directores con proyectos asignados
        console.log('1. BUSCANDO DIRECTORES CON PROYECTOS ASIGNADOS:');
        const [directorsWithProjects] = await connection.execute(`
            SELECT DISTINCT
                u.id,
                u.nombres,
                u.apellidos,
                u.email,
                u.password_hash,
                u.activo,
                r.nombre as rol,
                COUNT(p.id) as total_proyectos
            FROM usuarios u
            JOIN roles r ON u.rol_id = r.id
            LEFT JOIN proyectos p ON p.director_id = u.id
            WHERE r.nombre = 'Director de Proyecto' 
            AND u.activo = 1
            AND p.id IS NOT NULL
            GROUP BY u.id, u.nombres, u.apellidos, u.email, u.password_hash, u.activo, r.nombre
            ORDER BY total_proyectos DESC
        `);
        
        console.log(`   Directores con proyectos encontrados: ${directorsWithProjects.length}\n`);
        
        if (directorsWithProjects.length === 0) {
            console.log('❌ No hay directores con proyectos asignados');
            return;
        }
        
        directorsWithProjects.forEach((director, index) => {
            console.log(`   ${index + 1}. ${director.nombres} ${director.apellidos}`);
            console.log(`      - ID: ${director.id}`);
            console.log(`      - Email: ${director.email}`);
            console.log(`      - Password Hash: ${director.password_hash ? director.password_hash.substring(0, 20) + '...' : 'Sin password'}`);
            console.log(`      - Activo: ${director.activo}`);
            console.log(`      - Rol: ${director.rol}`);
            console.log(`      - Proyectos: ${director.total_proyectos}`);
            console.log('');
        });
        
        // 2. Verificar credenciales específicas del director principal
        const mainDirector = directorsWithProjects[0];
        console.log('2. VERIFICANDO CREDENCIALES DEL DIRECTOR PRINCIPAL:');
        console.log(`   Director seleccionado: ${mainDirector.nombres} ${mainDirector.apellidos}`);
        console.log(`   Email para login: ${mainDirector.email}`);
        
        // 3. Verificar si existe una contraseña en texto plano (para testing)
        console.log('\n3. VERIFICANDO CONTRASEÑAS DISPONIBLES:');
        const [passwordCheck] = await connection.execute(`
            SELECT id, nombres, apellidos, email, password_hash
            FROM usuarios 
            WHERE id = ? AND activo = 1
        `, [mainDirector.id]);
        
        if (passwordCheck.length > 0) {
            const user = passwordCheck[0];
            console.log(`   Usuario: ${user.nombres} ${user.apellidos}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Password hash: ${user.password_hash ? 'Existe' : 'No existe'}`);
            
            // Verificar si hay contraseñas comunes para testing
            const commonPasswords = ['123456', 'password', 'admin', 'director', 'test', '12345'];
            console.log('\n   💡 SUGERENCIAS DE CONTRASEÑAS PARA PROBAR:');
            commonPasswords.forEach(pwd => {
                console.log(`      - ${pwd}`);
            });
        }
        
        // 4. Verificar proyectos específicos del director
        console.log('\n4. PROYECTOS ASIGNADOS AL DIRECTOR:');
        const [projects] = await connection.execute(`
            SELECT 
                p.id,
                p.titulo,
                p.estado,
                p.activo,
                p.created_at,
                CONCAT(e.nombres, ' ', e.apellidos) as estudiante_nombre
            FROM proyectos p
            LEFT JOIN usuarios e ON p.estudiante_id = e.id
            WHERE p.director_id = ?
            ORDER BY p.created_at DESC
        `, [mainDirector.id]);
        
        console.log(`   Proyectos encontrados: ${projects.length}`);
        projects.forEach((project, index) => {
            console.log(`   ${index + 1}. "${project.titulo}"`);
            console.log(`      - ID: ${project.id}`);
            console.log(`      - Estado: ${project.estado}`);
            console.log(`      - Activo: ${project.activo}`);
            console.log(`      - Estudiante: ${project.estudiante_nombre || 'Sin asignar'}`);
            console.log(`      - Creado: ${project.created_at}`);
            console.log('');
        });
        
        // 5. Instrucciones para el usuario
        console.log('5. INSTRUCCIONES PARA PROBAR EN EL NAVEGADOR:');
        console.log('==============================================');
        console.log('   1. Abre http://localhost:3000 en tu navegador');
        console.log('   2. Ve a la página de login');
        console.log(`   3. Usa estas credenciales:`);
        console.log(`      - Email: ${mainDirector.email}`);
        console.log(`      - Contraseña: Prueba con las sugerencias de arriba`);
        console.log('   4. Una vez logueado, navega a la sección de "Proyectos Dirigidos"');
        console.log(`   5. Deberías ver ${projects.length} proyectos listados`);
        console.log('');
        console.log('   📋 PROYECTOS ESPERADOS:');
        projects.forEach((project, index) => {
            console.log(`      ${index + 1}. "${project.titulo}" (Estado: ${project.estado})`);
        });
        
        console.log('\n=====================================');
        console.log('🏁 INFORMACIÓN DE LOGIN PREPARADA');
        
    } catch (error) {
        console.error('❌ Error durante la prueba:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexión cerrada');
        }
    }
}

// Ejecutar la prueba
testDirectorLoginCredentials();