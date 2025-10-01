const mysql = require('mysql2/promise');
const Entregable = require('./src/models/Entregable');
const EntregableController = require('./src/controllers/EntregableController');
const Project = require('./src/models/Project');
const User = require('./src/models/User');

// Configuración de base de datos para testing
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gestion_academica'
};

class EntregableCreationTester {
    constructor() {
        this.connection = null;
        this.entregableModel = new Entregable();
        this.projectModel = new Project();
        this.userModel = new User();
        this.controller = new EntregableController();
        this.testResults = [];
    }

    async connect() {
        try {
            this.connection = await mysql.createConnection(dbConfig);
            console.log('✅ Conexión a base de datos establecida');
            return true;
        } catch (error) {
            console.error('❌ Error conectando a la base de datos:', error.message);
            return false;
        }
    }

    async disconnect() {
        if (this.connection) {
            await this.connection.end();
            console.log('🔌 Conexión cerrada');
        }
    }

    logTest(testName, success, message, data = null) {
        const result = {
            test: testName,
            success,
            message,
            data,
            timestamp: new Date().toISOString()
        };
        this.testResults.push(result);
        
        const icon = success ? '✅' : '❌';
        console.log(`${icon} ${testName}: ${message}`);
        if (data) {
            console.log('   📊 Datos:', JSON.stringify(data, null, 2));
        }
    }

    async getTestProject() {
        try {
            const projects = await this.projectModel.findAll();
            if (projects.length > 0) {
                return projects[0];
            }
            
            // Si no hay proyectos, crear uno de prueba
            const testProject = {
                nombre: 'Proyecto Test Entregables',
                descripcion: 'Proyecto creado para testing de entregables',
                fecha_inicio: new Date().toISOString().split('T')[0],
                fecha_fin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                estado: 'activo'
            };
            
            const result = await this.projectModel.create(testProject);
            return { id: result.id, ...testProject };
        } catch (error) {
            console.error('Error obteniendo proyecto de prueba:', error);
            return null;
        }
    }

    async getTestUser() {
        try {
            const users = await this.userModel.findAll();
            // Buscar un usuario activo
            return users.find(user => user.activo === 1) || users[0] || null;
        } catch (error) {
            console.error('Error obteniendo usuario de prueba:', error);
            return null;
        }
    }

    async testModelCreation() {
        console.log('\n🧪 === TESTING MODELO ENTREGABLE ===');
        
        const project = await this.getTestProject();
        if (!project) {
            this.logTest('Preparación Proyecto', false, 'No se pudo obtener proyecto de prueba');
            return;
        }

        const user = await this.getTestUser();
        if (!user) {
            this.logTest('Preparación Usuario', false, 'No se pudo obtener usuario de prueba');
            return;
        }

        // Test 1: Crear entregable básico
        try {
            const entregableData = {
                titulo: 'Test Entregable - ' + Date.now(),
                descripcion: 'Entregable creado para testing automático',
                fecha_limite: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                proyecto_id: project.id,
                creado_por: user.id,
                estado: 'pendiente',
                prioridad: 'media'
            };

            const entregableId = await this.entregableModel.create(entregableData);
            
            if (entregableId) {
                this.logTest('Creación Entregable Básico', true, 'Entregable creado exitosamente', { id: entregableId });
                
                // Verificar que se creó correctamente
                const createdEntregable = await this.entregableModel.findById(entregableId.id);
                if (createdEntregable) {
                    this.logTest('Verificación Entregable', true, 'Entregable recuperado correctamente', createdEntregable);
                } else {
                    this.logTest('Verificación Entregable', false, 'No se pudo recuperar el entregable creado');
                }
            } else {
                this.logTest('Creación Entregable Básico', false, 'No se pudo crear el entregable');
            }
        } catch (error) {
            this.logTest('Creación Entregable Básico', false, 'Error: ' + error.message);
        }

        // Test 2: Crear entregable con datos completos
        try {
            const entregableCompleto = {
                titulo: 'Test Entregable Completo - ' + Date.now(),
                descripcion: 'Entregable con todos los campos para testing',
                fecha_limite: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                proyecto_id: project.id,
                creado_por: user.id,
                estado: 'en_progreso',
                prioridad: 'alta',
                tipo: 'documento',
                categoria: 'investigacion',
                puntos: 100,
                instrucciones: 'Instrucciones detalladas para el entregable de prueba'
            };

            const entregableCompletoId = await this.entregableModel.create(entregableCompleto);
            
            if (entregableCompletoId) {
                this.logTest('Creación Entregable Completo', true, 'Entregable completo creado exitosamente', { id: entregableCompletoId });
            } else {
                this.logTest('Creación Entregable Completo', false, 'No se pudo crear el entregable completo');
            }
        } catch (error) {
            this.logTest('Creación Entregable Completo', false, 'Error: ' + error.message);
        }

        // Test 3: Validar campos requeridos
        try {
            const entregableIncompleto = {
                descripcion: 'Entregable sin título para testing de validación'
                // Falta título, proyecto_id, etc.
            };

            const result = await this.entregableModel.create(entregableIncompleto);
            this.logTest('Validación Campos Requeridos', false, 'Se creó entregable sin campos requeridos (no debería pasar)');
        } catch (error) {
            this.logTest('Validación Campos Requeridos', true, 'Validación funcionando correctamente: ' + error.message);
        }
    }

    async testControllerCreation() {
        console.log('\n🎮 === TESTING CONTROLADOR ENTREGABLE ===');
        
        const project = await this.getTestProject();
        const user = await this.getTestUser();

        if (!project || !user) {
            this.logTest('Preparación Controller Test', false, 'No se pudieron obtener datos de prueba');
            return;
        }

        // Simular request y response objects
        const mockReq = {
            body: {
                titulo: 'Test Controller Entregable - ' + Date.now(),
                descripcion: 'Entregable creado a través del controlador',
                fecha_limite: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                proyecto_id: project.id,
                estado: 'pendiente',
                prioridad: 'media',
                tipo: 'tarea'
            },
            user: { id: user.id },
            params: { projectId: project.id }
        };

        const mockRes = {
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                this.responseData = data;
                return this;
            },
            redirect: function(url) {
                this.redirectUrl = url;
                return this;
            }
        };

        // Test 1: Crear entregable a través del controlador
        try {
            await this.controller.create(mockReq, mockRes);
            
            if (mockRes.statusCode === 201 || mockRes.redirectUrl) {
                this.logTest('Controller - Crear Entregable', true, 'Entregable creado a través del controlador', mockRes.responseData);
            } else {
                this.logTest('Controller - Crear Entregable', false, 'Respuesta inesperada del controlador', { status: mockRes.statusCode, data: mockRes.responseData });
            }
        } catch (error) {
            this.logTest('Controller - Crear Entregable', false, 'Error en controlador: ' + error.message);
        }
    }

    async testStateTransitions() {
        console.log('\n🔄 === TESTING TRANSICIONES DE ESTADO ===');
        
        const project = await this.getTestProject();
        const user = await this.getTestUser();

        if (!project || !user) {
            this.logTest('Preparación Estados Test', false, 'No se pudieron obtener datos de prueba');
            return;
        }

        try {
            // Crear entregable para testing de estados
            const entregableData = {
                titulo: 'Test Estados - ' + Date.now(),
                descripcion: 'Entregable para testing de transiciones de estado',
                fecha_limite: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                proyecto_id: project.id,
                creado_por: user.id,
                estado: 'pendiente',
                prioridad: 'media'
            };

            const entregableId = await this.entregableModel.create(entregableData);
            
            if (!entregableId) {
                this.logTest('Preparación Entregable Estados', false, 'No se pudo crear entregable para testing');
                return;
            }

            // Test transiciones de estado
            const estados = ['en_progreso', 'revision', 'completado'];
            
            for (const estado of estados) {
                try {
                    const updated = await this.entregableModel.update(entregableId.id, { estado: estado });
                    if (updated) {
                        this.logTest(`Transición a ${estado}`, true, `Estado cambiado exitosamente a ${estado}`);
                    } else {
                        this.logTest(`Transición a ${estado}`, false, `No se pudo cambiar estado a ${estado}`);
                    }
                } catch (error) {
                    this.logTest(`Transición a ${estado}`, false, `Error cambiando estado: ${error.message}`);
                }
            }

        } catch (error) {
            this.logTest('Testing Estados', false, 'Error general: ' + error.message);
        }
    }

    async testKanbanIntegration() {
        console.log('\n📋 === TESTING INTEGRACIÓN KANBAN ===');
        
        const project = await this.getTestProject();
        
        if (!project) {
            this.logTest('Preparación Kanban Test', false, 'No se pudo obtener proyecto de prueba');
            return;
        }

        try {
            // Obtener entregables del proyecto para Kanban
            const entregables = await this.entregableModel.findByProject(project.id);
            
            if (entregables && entregables.length > 0) {
                this.logTest('Obtener Entregables Kanban', true, `Se obtuvieron ${entregables.length} entregables para Kanban`, { count: entregables.length });
                
                // Agrupar por estado (simulando vista Kanban)
                const kanbanData = {
                    pendiente: entregables.filter(e => e.estado === 'pendiente'),
                    en_progreso: entregables.filter(e => e.estado === 'en_progreso'),
                    revision: entregables.filter(e => e.estado === 'revision'),
                    completado: entregables.filter(e => e.estado === 'completado')
                };
                
                this.logTest('Agrupación Kanban', true, 'Entregables agrupados por estado', {
                    pendiente: kanbanData.pendiente.length,
                    en_progreso: kanbanData.en_progreso.length,
                    revision: kanbanData.revision.length,
                    completado: kanbanData.completado.length
                });
                
            } else {
                this.logTest('Obtener Entregables Kanban', false, 'No se encontraron entregables para el proyecto');
            }
            
        } catch (error) {
            this.logTest('Testing Kanban', false, 'Error: ' + error.message);
        }
    }

    async runAllTests() {
        console.log('🚀 === INICIANDO TESTS DE CREACIÓN DE ENTREGABLES/TAREAS ===\n');
        
        const connected = await this.connect();
        if (!connected) {
            console.log('❌ No se pudo conectar a la base de datos. Abortando tests.');
            return;
        }

        try {
            await this.testModelCreation();
            await this.testControllerCreation();
            await this.testStateTransitions();
            await this.testKanbanIntegration();
            
            this.printSummary();
            
        } catch (error) {
            console.error('❌ Error durante la ejecución de tests:', error);
        } finally {
            await this.disconnect();
        }
    }

    printSummary() {
        console.log('\n📊 === RESUMEN DE TESTS ===');
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.success).length;
        const failedTests = totalTests - passedTests;
        
        console.log(`Total de tests: ${totalTests}`);
        console.log(`✅ Exitosos: ${passedTests}`);
        console.log(`❌ Fallidos: ${failedTests}`);
        console.log(`📈 Porcentaje de éxito: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        
        if (failedTests > 0) {
            console.log('\n❌ Tests fallidos:');
            this.testResults.filter(r => !r.success).forEach(test => {
                console.log(`   - ${test.test}: ${test.message}`);
            });
        }
        
        console.log('\n🎯 === TESTS COMPLETADOS ===');
    }
}

// Ejecutar tests
async function runTests() {
    const tester = new EntregableCreationTester();
    await tester.runAllTests();
}

// Ejecutar si se llama directamente
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = EntregableCreationTester;