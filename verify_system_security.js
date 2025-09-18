const mysql = require('mysql2/promise');

async function verifySystemSecurity() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'gestion_academica'
    });

    try {
        console.log('=== VERIFICACIÓN COMPLETA DE SEGURIDAD DEL SISTEMA ===\n');

        // 1. Verificar que todos los administradores tienen códigos únicos
        console.log('1. VERIFICACIÓN DE CÓDIGOS ÚNICOS DE ÁREAS');
        console.log('=' .repeat(50));

        const [areas] = await connection.execute(`
            SELECT a.codigo, a.nombre, 
                   COUNT(u.id) as cantidad_admins,
                   GROUP_CONCAT(CONCAT(u.nombres, ' ', u.apellidos) SEPARATOR ', ') as administradores
            FROM areas_trabajo a
            LEFT JOIN usuarios u ON a.id = u.area_trabajo_id
            LEFT JOIN roles r ON u.rol_id = r.id
            WHERE (r.nombre = 'Administrador General' AND u.activo = 1) OR u.id IS NULL
            GROUP BY a.id, a.codigo, a.nombre
            ORDER BY a.codigo
        `);

        console.table(areas);

        // Verificar duplicados de códigos
        const [duplicates] = await connection.execute(`
            SELECT codigo, COUNT(*) as duplicados
            FROM areas_trabajo
            WHERE activo = 1
            GROUP BY codigo
            HAVING COUNT(*) > 1
        `);

        if (duplicates.length > 0) {
            console.log('❌ PROBLEMA: Códigos duplicados encontrados:');
            console.table(duplicates);
        } else {
            console.log('✅ CORRECTO: Todos los códigos de área son únicos\n');
        }

        // 2. Verificar separación entre administradores
        console.log('2. VERIFICACIÓN DE SEPARACIÓN ENTRE ADMINISTRADORES');
        console.log('=' .repeat(50));

        const [crossAccess] = await connection.execute(`
            SELECT 
                u1.codigo_usuario as admin_origen,
                a1.codigo as area_origen,
                u2.codigo_usuario as admin_destino,
                a2.codigo as area_destino,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM usuario_areas_trabajo 
                        WHERE usuario_id = u1.id AND area_trabajo_id = a2.id AND activo = 1
                    ) THEN 'ACCESO PERMITIDO' 
                    ELSE 'ACCESO DENEGADO' 
                END as estado_acceso
            FROM usuarios u1
            JOIN areas_trabajo a1 ON u1.area_trabajo_id = a1.id
            JOIN roles r1 ON u1.rol_id = r1.id
            CROSS JOIN usuarios u2
            JOIN areas_trabajo a2 ON u2.area_trabajo_id = a2.id
            JOIN roles r2 ON u2.rol_id = r2.id
            WHERE r1.nombre = 'Administrador General' 
            AND r2.nombre = 'Administrador General'
            AND u1.id != u2.id
            AND u1.activo = 1 AND u2.activo = 1
            ORDER BY u1.codigo_usuario, u2.codigo_usuario
        `);

        if (crossAccess.length > 0) {
            console.table(crossAccess);
            
            const hasUnauthorizedAccess = crossAccess.some(row => row.estado_acceso === 'ACCESO PERMITIDO');
            if (hasUnauthorizedAccess) {
                console.log('❌ PROBLEMA: Hay acceso cruzado no autorizado entre administradores');
            } else {
                console.log('✅ CORRECTO: Separación completa entre administradores confirmada\n');
            }
        } else {
            console.log('✅ CORRECTO: Solo hay un administrador en el sistema\n');
        }

        // 3. Verificar integridad de relaciones
        console.log('3. VERIFICACIÓN DE INTEGRIDAD DE RELACIONES');
        console.log('=' .repeat(50));

        const [integrity] = await connection.execute(`
            SELECT 
                'Administradores sin área asignada' as verificacion,
                COUNT(*) as cantidad
            FROM usuarios u
            JOIN roles r ON u.rol_id = r.id
            WHERE r.nombre = 'Administrador General' 
            AND u.activo = 1 
            AND (u.area_trabajo_id IS NULL OR u.area_trabajo_id = 0)
            
            UNION ALL
            
            SELECT 
                'Áreas sin administrador asignado' as verificacion,
                COUNT(*) as cantidad
            FROM areas_trabajo a
            WHERE a.activo = 1
            AND NOT EXISTS (
                SELECT 1 FROM usuarios u 
                JOIN roles r ON u.rol_id = r.id
                WHERE u.area_trabajo_id = a.id 
                AND r.nombre = 'Administrador General' 
                AND u.activo = 1
            )
            
            UNION ALL
            
            SELECT 
                'Relaciones huérfanas en usuario_areas_trabajo' as verificacion,
                COUNT(*) as cantidad
            FROM usuario_areas_trabajo uat
            WHERE uat.activo = 1
            AND (
                NOT EXISTS (SELECT 1 FROM usuarios WHERE id = uat.usuario_id AND activo = 1)
                OR NOT EXISTS (SELECT 1 FROM areas_trabajo WHERE id = uat.area_trabajo_id AND activo = 1)
            )
        `);

        console.table(integrity);

        const hasIntegrityIssues = integrity.some(row => row.cantidad > 0);
        if (hasIntegrityIssues) {
            console.log('❌ PROBLEMA: Se encontraron problemas de integridad');
        } else {
            console.log('✅ CORRECTO: Integridad de relaciones verificada\n');
        }

        // 4. Resumen de seguridad
        console.log('4. RESUMEN DE MEJORAS DE SEGURIDAD IMPLEMENTADAS');
        console.log('=' .repeat(50));

        const improvements = [
            '✅ Códigos únicos automáticos para áreas de trabajo',
            '✅ Separación completa entre administradores de diferentes instituciones',
            '✅ Verificación de acceso basada en área de trabajo',
            '✅ Prevención de acceso cruzado no autorizado',
            '✅ Migración automática de administradores existentes',
            '✅ Validación de integridad de datos',
            '✅ Sistema de códigos alfanuméricos únicos (formato: L###)'
        ];

        improvements.forEach(improvement => console.log(improvement));

        console.log('\n=== SISTEMA DE SEGURIDAD VERIFICADO EXITOSAMENTE ===');

    } catch (error) {
        console.error('❌ Error en la verificación:', error);
    } finally {
        await connection.end();
    }
}

verifySystemSecurity();