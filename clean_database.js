const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Script para limpiar la base de datos manteniendo solo datos esenciales
 * Elimina: usuarios, proyectos, entregables, áreas de trabajo, notificaciones, etc.
 * Mantiene: roles, fases_proyecto, rubricas_evaluacion (datos base del sistema)
 */

async function cleanDatabase() {
    let connection;
    
    try {
        // Conectar a la base de datos
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'gestion_proyectos'
        });
        
        console.log('🔌 Conectado a la base de datos');
        console.log('⚠️  INICIANDO LIMPIEZA DE BASE DE DATOS...');
        console.log('📋 Se mantendrán: roles, fases_proyecto, rubricas_evaluacion');
        console.log('🗑️  Se eliminarán: usuarios, proyectos, entregables, áreas de trabajo, etc.\n');
        
        // Deshabilitar verificación de claves foráneas temporalmente
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        console.log('🔓 Verificación de claves foráneas deshabilitada');
        
        // 1. ELIMINAR DATOS DE HISTORIAL Y AUDITORÍA
        console.log('\n📊 Eliminando datos de historial...');
        await connection.execute('DELETE FROM historial_proyecto');
        console.log('✅ historial_proyecto limpiado');
        
        try {
            await connection.execute('DELETE FROM historial_area_trabajo');
            console.log('✅ historial_area_trabajo limpiado');
        } catch (error) {
            console.log('ℹ️  historial_area_trabajo no existe o ya está vacío');
        }
        
        // 2. ELIMINAR NOTIFICACIONES
        console.log('\n🔔 Eliminando notificaciones...');
        await connection.execute('DELETE FROM notificaciones');
        console.log('✅ notificaciones limpiadas');
        
        // 3. ELIMINAR EVALUACIONES
        console.log('\n📝 Eliminando evaluaciones...');
        await connection.execute('DELETE FROM evaluaciones');
        console.log('✅ evaluaciones eliminadas');
        
        // 4. ELIMINAR ENTREGABLES
        console.log('\n📄 Eliminando entregables...');
        await connection.execute('DELETE FROM entregables');
        console.log('✅ entregables eliminados');
        
        // 5. ELIMINAR INVITACIONES Y MIEMBROS DE PROYECTOS
        console.log('\n👥 Eliminando invitaciones y miembros...');
        await connection.execute('DELETE FROM project_members');
        console.log('✅ project_members eliminados');
        
        await connection.execute('DELETE FROM project_invitations');
        console.log('✅ project_invitations eliminadas');
        
        // 6. ELIMINAR PROYECTOS
        console.log('\n🚀 Eliminando proyectos...');
        await connection.execute('DELETE FROM proyectos');
        console.log('✅ proyectos eliminados');
        
        // 7. ELIMINAR LÍNEAS DE INVESTIGACIÓN
        console.log('\n🔬 Eliminando líneas de investigación...');
        await connection.execute('DELETE FROM lineas_investigacion');
        console.log('✅ lineas_investigacion eliminadas');
        
        // 8. ELIMINAR CICLOS ACADÉMICOS
        console.log('\n📅 Eliminando ciclos académicos...');
        await connection.execute('DELETE FROM ciclos_academicos');
        console.log('✅ ciclos_academicos eliminados');
        
        // 9. ELIMINAR RELACIONES USUARIO-ÁREA
        console.log('\n🏢 Eliminando relaciones usuario-área...');
        try {
            await connection.execute('DELETE FROM usuario_areas_trabajo');
            console.log('✅ usuario_areas_trabajo eliminadas');
        } catch (error) {
            console.log('ℹ️  usuario_areas_trabajo no existe o ya está vacío');
        }
        
        // 10. ELIMINAR ÁREAS DE TRABAJO
        console.log('\n🏗️  Eliminando áreas de trabajo...');
        try {
            await connection.execute('DELETE FROM areas_trabajo');
            console.log('✅ areas_trabajo eliminadas');
        } catch (error) {
            console.log('ℹ️  areas_trabajo no existe o ya está vacío');
        }
        
        // 11. ELIMINAR USUARIOS
        console.log('\n👤 Eliminando usuarios...');
        await connection.execute('DELETE FROM usuarios');
        console.log('✅ usuarios eliminados');
        
        // 12. ELIMINAR TAREAS (si existe la tabla)
        console.log('\n✅ Eliminando tareas...');
        try {
            await connection.execute('DELETE FROM tareas');
            console.log('✅ tareas eliminadas');
        } catch (error) {
            console.log('ℹ️  tabla tareas no existe');
        }
        
        // 13. RESETEAR AUTO_INCREMENT
        console.log('\n🔄 Reseteando contadores AUTO_INCREMENT...');
        const tablesToReset = [
            'usuarios', 'proyectos', 'entregables', 'evaluaciones', 
            'notificaciones', 'historial_proyecto', 'project_invitations',
            'project_members', 'lineas_investigacion', 'ciclos_academicos'
        ];
        
        for (const table of tablesToReset) {
            try {
                await connection.execute(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
                console.log(`✅ ${table} contador reseteado`);
            } catch (error) {
                console.log(`ℹ️  ${table} no existe o no se pudo resetear`);
            }
        }
        
        // Resetear áreas de trabajo y usuario_areas_trabajo si existen
        try {
            await connection.execute('ALTER TABLE areas_trabajo AUTO_INCREMENT = 1');
            console.log('✅ areas_trabajo contador reseteado');
        } catch (error) {
            console.log('ℹ️  areas_trabajo no existe');
        }
        
        try {
            await connection.execute('ALTER TABLE usuario_areas_trabajo AUTO_INCREMENT = 1');
            console.log('✅ usuario_areas_trabajo contador reseteado');
        } catch (error) {
            console.log('ℹ️  usuario_areas_trabajo no existe');
        }
        
        // Rehabilitar verificación de claves foráneas
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
        console.log('🔒 Verificación de claves foráneas rehabilitada');
        
        // 14. VERIFICAR DATOS MANTENIDOS
        console.log('\n📋 Verificando datos esenciales mantenidos...');
        
        const [roles] = await connection.execute('SELECT COUNT(*) as count FROM roles');
        console.log(`✅ Roles mantenidos: ${roles[0].count}`);
        
        const [fases] = await connection.execute('SELECT COUNT(*) as count FROM fases_proyecto');
        console.log(`✅ Fases de proyecto mantenidas: ${fases[0].count}`);
        
        const [rubricas] = await connection.execute('SELECT COUNT(*) as count FROM rubricas_evaluacion');
        console.log(`✅ Rúbricas de evaluación mantenidas: ${rubricas[0].count}`);
        
        console.log('\n🎉 ¡LIMPIEZA COMPLETADA EXITOSAMENTE!');
        console.log('📊 Resumen:');
        console.log('   ✅ Todos los datos de usuarios eliminados');
        console.log('   ✅ Todos los proyectos y entregables eliminados');
        console.log('   ✅ Todas las áreas de trabajo eliminadas');
        console.log('   ✅ Datos esenciales del sistema mantenidos');
        console.log('   ✅ Base de datos lista para uso limpio');
        
    } catch (error) {
        console.error('❌ Error durante la limpieza:', error.message);
        console.error('🔍 Detalles del error:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Conexión a la base de datos cerrada');
        }
    }
}

// Ejecutar el script
if (require.main === module) {
    console.log('🚨 ADVERTENCIA: Este script eliminará TODOS los datos de usuarios, proyectos y áreas de trabajo');
    console.log('⏰ Iniciando en 3 segundos...');
    
    setTimeout(() => {
        cleanDatabase();
    }, 3000);
}

module.exports = cleanDatabase;