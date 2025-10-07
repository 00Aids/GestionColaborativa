require('dotenv').config();
const mysql = require('mysql2/promise');

// Configuración de base de datos
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'gestion_colaborativa'
};

async function checkProjectMembership() {
    let connection;
    
    try {
        console.log('🔍 VERIFICANDO MEMBRESÍA EN PROYECTOS');
        console.log('====================================\n');
        
        // Conectar a la base de datos
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conexión a base de datos establecida\n');
        
        // 1. Buscar el director específico
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
        console.log('1. INFORMACIÓN DEL DIRECTOR:');
        console.log(`   Nombre: ${directorInfo.nombres} ${directorInfo.apellidos}`);
        console.log(`   ID: ${directorInfo.id}`);
        console.log(`   Email: ${directorInfo.email}`);
        
        // 2. Verificar proyectos donde es DIRECTOR ASIGNADO
        console.log('\n2. PROYECTOS DONDE ES DIRECTOR ASIGNADO (director_id):');
        const [assignedProjects] = await connection.execute(`
            SELECT 
                p.id,
                p.titulo,
                p.descripcion,
                p.estado,
                p.activo,
                p.created_at
            FROM proyectos p
            WHERE p.director_id = ?
            ORDER BY p.created_at DESC
        `, [directorInfo.id]);
        
        console.log(`   Proyectos como director asignado: ${assignedProjects.length}`);
        if (assignedProjects.length > 0) {
            assignedProjects.forEach((project, index) => {
                console.log(`   ${index + 1}. "${project.titulo}" (ID: ${project.id}, Estado: ${project.estado})`);
            });
        } else {
            console.log('   ❌ No es director asignado de ningún proyecto');
        }
        
        // 3. Verificar todas las tablas de la base de datos
        console.log('\n3. VERIFICANDO TODAS LAS TABLAS:');
        const [allTables] = await connection.execute('SHOW TABLES');
        
        console.log('   Tablas disponibles:');
        allTables.forEach(table => {
            const tableName = Object.values(table)[0];
            console.log(`   - ${tableName}`);
        });
        
        // 4. Buscar el proyecto "proyecto final" específicamente
        console.log('\n4. BUSCANDO PROYECTO "PROYECTO FINAL":');
        const [finalProject] = await connection.execute(`
            SELECT 
                p.*,
                CONCAT(d.nombres, ' ', d.apellidos) as director_nombre,
                d.email as director_email
            FROM proyectos p
            LEFT JOIN usuarios d ON p.director_id = d.id
            WHERE p.titulo LIKE '%proyecto final%' OR p.titulo LIKE '%final%'
            ORDER BY p.created_at DESC
        `);
        
        console.log(`   Proyectos encontrados: ${finalProject.length}`);
        if (finalProject.length > 0) {
            finalProject.forEach((project, index) => {
                console.log(`\n   Proyecto ${index + 1}:`);
                console.log(`     ID: ${project.id}`);
                console.log(`     Título: "${project.titulo}"`);
                console.log(`     Estado: ${project.estado}`);
                console.log(`     Director asignado: ${project.director_nombre || 'Sin asignar'}`);
                console.log(`     Email director: ${project.director_email || 'N/A'}`);
                console.log(`     Activo: ${project.activo}`);
                console.log(`     Creado: ${project.created_at}`);
                
                // Verificar si nuestro director puede evaluar entregables de este proyecto
                console.log(`\n     🔍 VERIFICANDO PERMISOS DE EVALUACIÓN:`);
                
                // Buscar entregables de este proyecto
                const projectId = project.id;
                connection.execute(`
                    SELECT 
                        e.id,
                        e.titulo,
                        e.estado,
                        e.created_at
                    FROM entregables e
                    WHERE e.proyecto_id = ?
                    ORDER BY e.created_at DESC
                    LIMIT 3
                `, [projectId]).then(([deliverables]) => {
                    console.log(`     Entregables del proyecto: ${deliverables.length}`);
                    if (deliverables.length > 0) {
                        deliverables.forEach((deliverable, idx) => {
                            console.log(`       ${idx + 1}. "${deliverable.titulo}" (Estado: ${deliverable.estado})`);
                        });
                    }
                });
            });
        } else {
            console.log('   ❌ No se encontró proyecto "proyecto final"');
        }
        
        // 5. Verificar invitaciones
        console.log('\n5. VERIFICANDO INVITACIONES:');
        try {
            const [invitations] = await connection.execute(`
                SELECT 
                    i.*,
                    p.titulo as proyecto_titulo,
                    CONCAT(inv.nombres, ' ', inv.apellidos) as invitado_por
                FROM invitaciones i
                LEFT JOIN proyectos p ON i.proyecto_id = p.id
                LEFT JOIN usuarios inv ON i.invitado_por = inv.id
                WHERE i.email = ? OR i.usuario_id = ?
                ORDER BY i.created_at DESC
            `, [directorInfo.email, directorInfo.id]);
            
            console.log(`   Invitaciones encontradas: ${invitations.length}`);
            if (invitations.length > 0) {
                invitations.forEach((invitation, index) => {
                    console.log(`\n   Invitación ${index + 1}:`);
                    console.log(`     Proyecto: "${invitation.proyecto_titulo}"`);
                    console.log(`     Estado: ${invitation.estado}`);
                    console.log(`     Código: ${invitation.codigo_invitacion}`);
                    console.log(`     Invitado por: ${invitation.invitado_por}`);
                    console.log(`     Fecha: ${invitation.created_at}`);
                    console.log(`     Proyecto ID: ${invitation.proyecto_id}`);
                });
            } else {
                console.log('   ❌ No se encontraron invitaciones');
            }
        } catch (error) {
            console.log(`   ❌ Error verificando invitaciones: ${error.message}`);
        }
        
        // 6. DIAGNÓSTICO Y SOLUCIÓN
        console.log('\n6. DIAGNÓSTICO:');
        console.log('   🔍 PROBLEMA IDENTIFICADO:');
        console.log('   - El director puede ser MIEMBRO de un proyecto (invitado)');
        console.log('   - Pero NO es el DIRECTOR ASIGNADO (director_id) del proyecto');
        console.log('   - La vista de "Proyectos Dirigidos" solo muestra proyectos donde director_id = su ID');
        console.log('\n   💡 SOLUCIONES POSIBLES:');
        console.log('   1. Cambiar el director_id del proyecto "proyecto final" a este director');
        console.log('   2. Modificar la vista para mostrar también proyectos donde es miembro');
        console.log('   3. Crear una vista separada para "Proyectos Participando"');
        
        console.log('\n====================================');
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
checkProjectMembership();