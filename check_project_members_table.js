require('dotenv').config();
const mysql = require('mysql2/promise');

// Configuración de base de datos
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'gestion_colaborativa'
};

async function checkProjectMembersTable() {
    let connection;
    
    try {
        console.log('🔍 VERIFICANDO TABLA PROJECT_MEMBERS');
        console.log('===================================\n');
        
        // Conectar a la base de datos
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conexión a base de datos establecida\n');
        
        // 1. Verificar estructura de project_members
        console.log('1. ESTRUCTURA DE TABLA PROJECT_MEMBERS:');
        try {
            const [structure] = await connection.execute('DESCRIBE project_members');
            console.log('   Columnas disponibles:');
            structure.forEach(column => {
                console.log(`   - ${column.Field} (${column.Type}) ${column.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${column.Key ? `[${column.Key}]` : ''}`);
            });
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
        
        // 2. Buscar el director específico
        const [director] = await connection.execute(`
            SELECT id, nombres, apellidos, email
            FROM usuarios 
            WHERE email = ? AND activo = 1
        `, ['directofinal1@test.com']);
        
        if (director.length === 0) {
            console.log('❌ Director no encontrado');
            return;
        }
        
        const directorInfo = director[0];
        console.log('\n2. INFORMACIÓN DEL DIRECTOR:');
        console.log(`   Nombre: ${directorInfo.nombres} ${directorInfo.apellidos}`);
        console.log(`   ID: ${directorInfo.id}`);
        console.log(`   Email: ${directorInfo.email}`);
        
        // 3. Verificar membresía en project_members
        console.log('\n3. VERIFICANDO MEMBRESÍA EN PROJECT_MEMBERS:');
        try {
            const [membership] = await connection.execute(`
                SELECT 
                    pm.*,
                    p.titulo as proyecto_titulo,
                    p.estado as proyecto_estado,
                    p.activo as proyecto_activo,
                    CONCAT(u.nombres, ' ', u.apellidos) as usuario_nombre
                FROM project_members pm
                JOIN proyectos p ON pm.proyecto_id = p.id
                JOIN usuarios u ON pm.usuario_id = u.id
                WHERE pm.usuario_id = ?
                ORDER BY pm.created_at DESC
            `, [directorInfo.id]);
            
            console.log(`   Membresías encontradas: ${membership.length}`);
            if (membership.length > 0) {
                membership.forEach((member, index) => {
                    console.log(`\n   Membresía ${index + 1}:`);
                    console.log(`     Proyecto: "${member.proyecto_titulo}"`);
                    console.log(`     Proyecto ID: ${member.proyecto_id}`);
                    console.log(`     Estado Proyecto: ${member.proyecto_estado}`);
                    console.log(`     Proyecto Activo: ${member.proyecto_activo}`);
                    console.log(`     Rol en Proyecto: ${member.rol_en_proyecto || 'Sin especificar'}`);
                    console.log(`     Estado Membresía: ${member.activo ? 'Activo' : 'Inactivo'}`);
                    console.log(`     Fecha Unión: ${member.fecha_union || member.created_at}`);
                });
            } else {
                console.log('   ❌ No se encontraron membresías en project_members');
            }
        } catch (error) {
            console.log(`   ❌ Error verificando project_members: ${error.message}`);
        }
        
        // 4. Verificar también proyecto_usuarios (por si acaso)
        console.log('\n4. VERIFICANDO TABLA PROYECTO_USUARIOS:');
        try {
            const [projectUsers] = await connection.execute(`
                SELECT 
                    pu.*,
                    p.titulo as proyecto_titulo,
                    p.estado as proyecto_estado,
                    CONCAT(u.nombres, ' ', u.apellidos) as usuario_nombre
                FROM proyecto_usuarios pu
                JOIN proyectos p ON pu.proyecto_id = p.id
                JOIN usuarios u ON pu.usuario_id = u.id
                WHERE pu.usuario_id = ?
                ORDER BY pu.created_at DESC
            `, [directorInfo.id]);
            
            console.log(`   Registros encontrados: ${projectUsers.length}`);
            if (projectUsers.length > 0) {
                projectUsers.forEach((pu, index) => {
                    console.log(`\n   Registro ${index + 1}:`);
                    console.log(`     Proyecto: "${pu.proyecto_titulo}"`);
                    console.log(`     Proyecto ID: ${pu.proyecto_id}`);
                    console.log(`     Estado Proyecto: ${pu.proyecto_estado}`);
                    console.log(`     Rol: ${pu.rol || 'Sin especificar'}`);
                    console.log(`     Estado: ${pu.estado || 'Sin especificar'}`);
                    console.log(`     Fecha: ${pu.created_at}`);
                });
            } else {
                console.log('   ❌ No se encontraron registros en proyecto_usuarios');
            }
        } catch (error) {
            console.log(`   ❌ Error verificando proyecto_usuarios: ${error.message}`);
        }
        
        // 5. Buscar el proyecto "proyecto final" y sus miembros
        console.log('\n5. MIEMBROS DEL PROYECTO "PROYECTO FINAL":');
        const [finalProject] = await connection.execute(`
            SELECT id, titulo, director_id, estado, activo
            FROM proyectos 
            WHERE titulo LIKE '%proyecto final%' OR titulo LIKE '%final%'
            ORDER BY created_at DESC
            LIMIT 1
        `);
        
        if (finalProject.length > 0) {
            const project = finalProject[0];
            console.log(`   Proyecto encontrado: "${project.titulo}" (ID: ${project.id})`);
            
            // Verificar miembros en project_members
            try {
                const [members] = await connection.execute(`
                    SELECT 
                        pm.*,
                        CONCAT(u.nombres, ' ', u.apellidos) as usuario_nombre,
                        u.email,
                        r.nombre as rol_nombre
                    FROM project_members pm
                    JOIN usuarios u ON pm.user_id = u.id
                    JOIN roles r ON u.rol_id = r.id
                    WHERE pm.project_id = ?
                    ORDER BY pm.created_at DESC
                `, [project.id]);
                
                console.log(`\n   Miembros en project_members: ${members.length}`);
                members.forEach((member, index) => {
                    console.log(`     ${index + 1}. ${member.usuario_nombre} (${member.email})`);
                    console.log(`        - Rol Sistema: ${member.rol_nombre}`);
                    console.log(`        - Rol Proyecto: ${member.role || 'Sin especificar'}`);
                    console.log(`        - Estado: ${member.status || 'Sin especificar'}`);
                    console.log(`        - Fecha: ${member.created_at}`);
                    
                    if (member.user_id === directorInfo.id) {
                        console.log(`        ✅ ¡ESTE ES NUESTRO DIRECTOR!`);
                    }
                    console.log('');
                });
            } catch (error) {
                console.log(`   ❌ Error obteniendo miembros: ${error.message}`);
            }
        } else {
            console.log('   ❌ No se encontró proyecto "proyecto final"');
        }
        
        // 6. DIAGNÓSTICO FINAL
        console.log('\n6. DIAGNÓSTICO FINAL:');
        console.log('   🔍 ANÁLISIS DEL PROBLEMA:');
        console.log('   - La vista "Proyectos Dirigidos" busca proyectos donde director_id = usuario_id');
        console.log('   - Pero el director está como MIEMBRO del proyecto, no como DIRECTOR ASIGNADO');
        console.log('   - Necesitamos modificar la consulta o cambiar la asignación del proyecto');
        
        console.log('\n===================================');
        console.log('🏁 VERIFICACIÓN COMPLETADA');
        
    } catch (error) {
        console.error('❌ Error durante la verificación:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexión cerrada');
        }
    }
}

// Ejecutar la verificación
checkProjectMembersTable();