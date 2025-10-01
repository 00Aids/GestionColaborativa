const { pool } = require('./src/config/database');
const bcrypt = require('bcrypt');

async function testInvitationCodesAllRoles() {
    console.log('🧪 INICIANDO TEST COMPLETO DE CÓDIGOS DE INVITACIÓN PARA TODOS LOS ROLES');
    console.log('=' .repeat(80));

    try {
        // 1. Preparar datos de prueba
        console.log('\n📋 PASO 1: Preparando datos de prueba...');
        
        // Crear usuarios de prueba para diferentes roles
        const testUsers = [
            {
                nombres: 'Estudiante',
                apellidos: 'Test',
                email: 'estudiante.test@example.com',
                password_hash: await bcrypt.hash('password123', 10),
                codigo_usuario: 'EST' + Math.random().toString(36).substring(2, 8).toUpperCase(),
                rol_id: 1, // Estudiante
                rol_nombre: 'Estudiante'
            },
            {
                nombres: 'Coordinador',
                apellidos: 'Test',
                email: 'coordinador.test@example.com',
                password_hash: await bcrypt.hash('password123', 10),
                codigo_usuario: 'COORD' + Math.random().toString(36).substring(2, 6).toUpperCase(),
                rol_id: 2, // Coordinador Académico
                rol_nombre: 'Coordinador Académico'
            },
            {
                nombres: 'Director',
                apellidos: 'Test',
                email: 'director.test@example.com',
                password_hash: await bcrypt.hash('password123', 10),
                codigo_usuario: 'DIR' + Math.random().toString(36).substring(2, 8).toUpperCase(),
                rol_id: 3, // Director
                rol_nombre: 'Director'
            }
        ];

        // Limpiar datos de prueba existentes (respetando restricciones de FK)
        for (const user of testUsers) {
            // Primero eliminar invitaciones creadas por este usuario
            await pool.execute('DELETE FROM project_invitations WHERE creado_por_id IN (SELECT id FROM usuarios WHERE email = ?)', [user.email]);
            // Luego eliminar el usuario
            await pool.execute('DELETE FROM usuarios WHERE email = ?', [user.email]);
        }

        // Crear usuarios de prueba
        const createdUsers = [];
        for (const user of testUsers) {
            const [result] = await pool.execute(
                `INSERT INTO usuarios (nombres, apellidos, email, password_hash, codigo_usuario, rol_id, activo) 
                 VALUES (?, ?, ?, ?, ?, ?, 1)`,
                [user.nombres, user.apellidos, user.email, user.password_hash, user.codigo_usuario, user.rol_id]
            );
            createdUsers.push({ ...user, id: result.insertId });
            console.log(`   ✅ Usuario creado: ${user.rol_nombre} (ID: ${result.insertId})`);
        }

        // 2. Crear proyecto de prueba
        console.log('\n📋 PASO 2: Creando proyecto de prueba...');
        
        // Limpiar proyecto de prueba existente
        await pool.execute('DELETE FROM proyectos WHERE titulo = ?', ['Proyecto Test Invitaciones']);
        
        // Necesitamos obtener un ciclo académico válido
        const [cicloResult] = await pool.execute('SELECT id FROM ciclos_academicos LIMIT 1');
        const cicloId = cicloResult.length > 0 ? cicloResult[0].id : 1;
        
        const [projectResult] = await pool.execute(
            `INSERT INTO proyectos (titulo, descripcion, estudiante_id, area_trabajo_id, ciclo_academico_id, estado) 
             VALUES (?, ?, ?, 1, ?, 'en_desarrollo')`,
            ['Proyecto Test Invitaciones', 'Proyecto para probar códigos de invitación', createdUsers[0].id, cicloId]
        );
        const projectId = projectResult.insertId;
        console.log(`   ✅ Proyecto creado (ID: ${projectId})`);

        // 3. Crear código de invitación válido
        console.log('\n📋 PASO 3: Creando código de invitación...');
        
        const invitationCode = 'TEST' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 7); // Expira en 7 días

        const [invitationResult] = await pool.execute(
            `INSERT INTO project_invitations (proyecto_id, codigo_invitacion, creado_por_id, max_usos, usos_actuales, 
             fecha_expiracion, activo) 
             VALUES (?, ?, ?, 5, 0, ?, 1)`,
            [projectId, invitationCode, createdUsers[0].id, expirationDate]
        );
        const invitationId = invitationResult.insertId;
        console.log(`   ✅ Código de invitación creado: ${invitationCode} (ID: ${invitationId})`);

        // 4. Test de acceso al formulario para diferentes roles
        console.log('\n📋 PASO 4: Probando acceso al formulario de unirse con código...');
        
        const ProjectController = require('./src/controllers/ProjectController');
        const projectController = new ProjectController();
        
        for (const user of createdUsers) {
            console.log(`\n   🔍 Probando acceso para ${user.rol_nombre}...`);
            
            // Simular request y response
            const req = {
                user: user,
                flash: () => []
            };
            const res = {
                rendered: false,
                redirected: false,
                render: function(view, data) {
                    this.rendered = true;
                    this.view = view;
                    this.data = data;
                    console.log(`      ✅ Vista renderizada: ${view}`);
                },
                redirect: function(url) {
                    this.redirected = true;
                    this.redirectUrl = url;
                    console.log(`      ❌ Redirigido a: ${url}`);
                }
            };

            try {
                await projectController.showJoinForm(req, res);
                if (res.rendered) {
                    console.log(`      ✅ ${user.rol_nombre} puede acceder al formulario`);
                } else if (res.redirected) {
                    console.log(`      ❌ ${user.rol_nombre} fue redirigido: ${res.redirectUrl}`);
                }
            } catch (error) {
                console.log(`      ❌ Error para ${user.rol_nombre}: ${error.message}`);
            }
        }

        // 5. Test de unirse con código válido
        console.log('\n📋 PASO 5: Probando unirse con código válido...');
        
        for (const user of createdUsers) {
            console.log(`\n   🔍 Probando unirse para ${user.rol_nombre}...`);
            
            // Verificar si ya está en el proyecto
            const [existingMember] = await pool.execute(
                'SELECT * FROM proyecto_usuarios WHERE proyecto_id = ? AND usuario_id = ?',
                [projectId, user.id]
            );
            
            if (existingMember.length > 0) {
                console.log(`      ⚠️  ${user.rol_nombre} ya está en el proyecto, saltando...`);
                continue;
            }

            const req = {
                user: user,
                body: { codigo: invitationCode },
                flash: function(type, message) {
                    this.flashMessages = this.flashMessages || {};
                    this.flashMessages[type] = this.flashMessages[type] || [];
                    this.flashMessages[type].push(message);
                }
            };
            const res = {
                rendered: false,
                redirected: false,
                render: function(view, data) {
                    this.rendered = true;
                    this.view = view;
                    this.data = data;
                },
                redirect: function(url) {
                    this.redirected = true;
                    this.redirectUrl = url;
                    console.log(`      ✅ Redirigido a: ${url}`);
                }
            };

            try {
                await projectController.joinWithCode(req, res);
                
                if (res.redirected && res.redirectUrl.includes('/dashboard')) {
                    console.log(`      ✅ ${user.rol_nombre} se unió exitosamente`);
                    
                    // Verificar que se agregó a la base de datos
                    const [newMember] = await pool.execute(
                        'SELECT * FROM proyecto_usuarios WHERE proyecto_id = ? AND usuario_id = ?',
                        [projectId, user.id]
                    );
                    
                    if (newMember.length > 0) {
                        console.log(`      ✅ ${user.rol_nombre} confirmado en la base de datos`);
                    } else {
                        console.log(`      ❌ ${user.rol_nombre} NO se encuentra en la base de datos`);
                    }
                } else {
                    console.log(`      ❌ ${user.rol_nombre} no pudo unirse`);
                    if (req.flashMessages && req.flashMessages.error) {
                        console.log(`         Error: ${req.flashMessages.error.join(', ')}`);
                    }
                }
            } catch (error) {
                console.log(`      ❌ Error para ${user.rol_nombre}: ${error.message}`);
            }
        }

        // 6. Test con código inválido
        console.log('\n📋 PASO 6: Probando con código inválido...');
        
        const invalidCode = 'INVALID123';
        const testUser = createdUsers[1]; // Usar coordinador
        
        const req = {
            user: testUser,
            body: { codigo: invalidCode },
            flash: function(type, message) {
                this.flashMessages = this.flashMessages || {};
                this.flashMessages[type] = this.flashMessages[type] || [];
                this.flashMessages[type].push(message);
            }
        };
        const res = {
            rendered: false,
            redirected: false,
            render: function(view, data) {
                this.rendered = true;
                this.view = view;
                this.data = data;
            },
            redirect: function(url) {
                this.redirected = true;
                this.redirectUrl = url;
            }
        };

        try {
            await projectController.joinWithCode(req, res);
            
            if (req.flashMessages && req.flashMessages.error) {
                console.log(`   ✅ Código inválido rechazado correctamente: ${req.flashMessages.error.join(', ')}`);
            } else {
                console.log(`   ❌ Código inválido no fue rechazado apropiadamente`);
            }
        } catch (error) {
            console.log(`   ✅ Código inválido rechazado con error: ${error.message}`);
        }

        // 7. Test con código expirado
        console.log('\n📋 PASO 7: Probando con código expirado...');
        
        // Crear código expirado
        const expiredCode = 'EXPIRED' + Math.random().toString(36).substring(2, 6).toUpperCase();
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1); // Expiró ayer

        await pool.execute(
            `INSERT INTO project_invitations (proyecto_id, codigo_invitacion, creado_por_id, max_usos, usos_actuales, 
             fecha_expiracion, activo) 
             VALUES (?, ?, ?, 1, 0, ?, 1)`,
            [projectId, expiredCode, createdUsers[0].id, pastDate]
        );

        const reqExpired = {
            user: testUser,
            body: { codigo: expiredCode },
            flash: function(type, message) {
                this.flashMessages = this.flashMessages || {};
                this.flashMessages[type] = this.flashMessages[type] || [];
                this.flashMessages[type].push(message);
            }
        };
        const resExpired = {
            rendered: false,
            redirected: false,
            render: function(view, data) {
                this.rendered = true;
                this.view = view;
                this.data = data;
            },
            redirect: function(url) {
                this.redirected = true;
                this.redirectUrl = url;
            }
        };

        try {
            await projectController.joinWithCode(reqExpired, resExpired);
            
            if (reqExpired.flashMessages && reqExpired.flashMessages.error) {
                console.log(`   ✅ Código expirado rechazado correctamente: ${reqExpired.flashMessages.error.join(', ')}`);
            } else {
                console.log(`   ❌ Código expirado no fue rechazado apropiadamente`);
            }
        } catch (error) {
            console.log(`   ✅ Código expirado rechazado con error: ${error.message}`);
        }

        // 8. Verificar estadísticas finales
        console.log('\n📋 PASO 8: Verificando estadísticas finales...');
        
        // Contar miembros del proyecto
        const [members] = await pool.execute(
            'SELECT COUNT(*) as total FROM proyecto_usuarios WHERE proyecto_id = ?',
            [projectId]
        );
        console.log(`   📊 Total de miembros en el proyecto: ${members[0].total}`);

        // Verificar usos del código
        const [codeStats] = await pool.execute(
            'SELECT usos_actuales, max_usos FROM project_invitations WHERE codigo_invitacion = ?',
            [invitationCode]
        );
        if (codeStats.length > 0) {
            console.log(`   📊 Usos del código ${invitationCode}: ${codeStats[0].usos_actuales}/${codeStats[0].max_usos}`);
        }

        // Mostrar miembros del proyecto
        const [projectMembers] = await pool.execute(`
            SELECT u.nombres, u.apellidos, r.nombre as rol_nombre, pu.rol, pu.fecha_asignacion
            FROM proyecto_usuarios pu
            JOIN usuarios u ON pu.usuario_id = u.id
            JOIN roles r ON u.rol_id = r.id
            WHERE pu.proyecto_id = ?
            ORDER BY pu.fecha_asignacion
        `, [projectId]);

        console.log('\n   👥 Miembros del proyecto:');
        projectMembers.forEach(member => {
            console.log(`      - ${member.nombres} ${member.apellidos} (${member.rol_nombre}) - Rol en proyecto: ${member.rol}`);
        });

        console.log('\n🎉 TEST COMPLETADO EXITOSAMENTE');
        console.log('=' .repeat(80));

        // Limpiar datos de prueba
        console.log('\n🧹 Limpiando datos de prueba...');
        await pool.execute('DELETE FROM proyecto_usuarios WHERE proyecto_id = ?', [projectId]);
        await pool.execute('DELETE FROM project_invitations WHERE proyecto_id = ?', [projectId]);
        await pool.execute('DELETE FROM proyectos WHERE id = ?', [projectId]);
        for (const user of createdUsers) {
            await pool.execute('DELETE FROM usuarios WHERE id = ?', [user.id]);
        }
        console.log('   ✅ Datos de prueba eliminados');

    } catch (error) {
        console.error('❌ ERROR EN EL TEST:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Ejecutar el test
if (require.main === module) {
    testInvitationCodesAllRoles()
        .then(() => {
            console.log('\n✅ Test finalizado correctamente');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Test falló:', error);
            process.exit(1);
        });
}

module.exports = testInvitationCodesAllRoles;