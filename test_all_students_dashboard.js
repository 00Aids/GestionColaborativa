require('dotenv').config();
const { pool } = require('./src/config/database');
const Project = require('./src/models/Project');
const Entregable = require('./src/models/Entregable');
const Evaluation = require('./src/models/Evaluation');

async function testAllStudentsDashboard() {
    try {
        console.log('🔍 Probando dashboard de TODOS los estudiantes...\n');
        
        // Obtener todos los usuarios con rol de estudiante
        const [students] = await pool.execute(`
            SELECT u.id, u.email, u.nombres, u.apellidos, u.rol_id, r.nombre as rol_nombre
            FROM usuarios u
            JOIN roles r ON u.rol_id = r.id
            WHERE r.nombre = 'Estudiante'
            ORDER BY u.email
        `);
        
        if (students.length === 0) {
            console.log('❌ No se encontraron estudiantes');
            return;
        }
        
        console.log(`📊 Encontrados ${students.length} estudiantes:\n`);
        
        // Instanciar modelos
        const projectModel = new Project();
        const entregableModel = new Entregable();
        const evaluationModel = new Evaluation();
        
        for (const student of students) {
            console.log(`\n👤 ESTUDIANTE: ${student.nombres} ${student.apellidos}`);
            console.log(`📧 Email: ${student.email}`);
            console.log(`🆔 ID: ${student.id}`);
            console.log('─'.repeat(50));
            
            try {
                // Simular exactamente la lógica del studentDashboard
                console.log('🔍 Obteniendo proyectos del estudiante...');
                const myProjects = await projectModel.findStudentProjects(student.id);
                console.log(`📁 Proyectos encontrados: ${myProjects ? myProjects.length : 0}`);
                
                if (myProjects && myProjects.length > 0) {
                    myProjects.forEach((project, index) => {
                        console.log(`  ${index + 1}. ${project.titulo} (ID: ${project.id})`);
                        console.log(`     Estado: ${project.estado}`);
                        if (project.fecha_inicio && project.fecha_fin) {
                            const startDate = new Date(project.fecha_inicio);
                            const endDate = new Date(project.fecha_fin);
                            const today = new Date();
                            const remainingTime = endDate - today;
                            const daysRemaining = Math.max(0, Math.ceil(remainingTime / (1000 * 60 * 60 * 24)));
                            console.log(`     Fecha inicio: ${project.fecha_inicio}`);
                            console.log(`     Fecha fin: ${project.fecha_fin}`);
                            console.log(`     Días restantes: ${daysRemaining}`);
                        } else {
                            console.log(`     ⚠️ Fechas no definidas`);
                        }
                    });
                } else {
                    console.log('  ❌ No tiene proyectos asignados');
                }
                
                // Obtener entregables
                console.log('\n📋 Obteniendo entregables del estudiante...');
                const myDeliverables = await entregableModel.findByStudent(student.id);
                console.log(`📋 Entregables encontrados: ${myDeliverables ? myDeliverables.length : 0}`);
                
                // Obtener evaluaciones
                console.log('\n📝 Obteniendo evaluaciones del estudiante...');
                const myEvaluations = [];
                if (myProjects && myProjects.length > 0) {
                    for (const project of myProjects) {
                        const evaluations = await evaluationModel.findByProject(project.id);
                        if (evaluations && evaluations.length > 0) {
                            myEvaluations.push(...evaluations);
                        }
                    }
                }
                console.log(`📝 Evaluaciones encontradas: ${myEvaluations.length}`);
                
                // Calcular estadísticas como en el controlador
                const pendingDeliverables = myDeliverables ? myDeliverables.filter(d => 
                    d.estado !== 'completado' && d.estado !== 'aprobado'
                ) : [];
                
                const stats = {
                    totalProjects: myProjects ? myProjects.length : 0,
                    totalDeliverables: myDeliverables ? myDeliverables.length : 0,
                    pendingDeliverables: pendingDeliverables.length,
                    completedEvaluations: myEvaluations.filter(e => e.estado === 'completada').length,
                    pendingEvaluations: myEvaluations.filter(e => e.estado === 'pendiente').length
                };
                
                console.log('\n📊 ESTADÍSTICAS CALCULADAS:');
                console.log(`  Total proyectos: ${stats.totalProjects}`);
                console.log(`  Total entregables: ${stats.totalDeliverables}`);
                console.log(`  Entregables pendientes: ${stats.pendingDeliverables}`);
                console.log(`  Evaluaciones completadas: ${stats.completedEvaluations}`);
                console.log(`  Evaluaciones pendientes: ${stats.pendingEvaluations}`);
                
                // Verificar si el estudiante debería ver tiempo restante
                if (myProjects && myProjects.length > 0) {
                    let minDaysRemaining = null;
                    myProjects.forEach(project => {
                        if (project.fecha_fin) {
                            const endDate = new Date(project.fecha_fin);
                            const today = new Date();
                            const timeDiff = endDate - today;
                            const daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
                            if (minDaysRemaining === null || daysRemaining < minDaysRemaining) {
                                minDaysRemaining = daysRemaining;
                            }
                        }
                    });
                    
                    if (minDaysRemaining !== null) {
                        console.log(`\n⏰ TIEMPO RESTANTE MÍNIMO: ${minDaysRemaining} días`);
                        console.log(`   Color sugerido: ${minDaysRemaining <= 7 ? 'ROJO' : minDaysRemaining <= 30 ? 'AMARILLO' : 'VERDE'}`);
                    } else {
                        console.log('\n⚠️ No se puede calcular tiempo restante (fechas faltantes)');
                    }
                } else {
                    console.log('\n❌ No puede ver tiempo restante (sin proyectos)');
                }
                
            } catch (error) {
                console.log(`❌ Error procesando estudiante ${student.email}:`, error.message);
            }
            
            console.log('\n' + '='.repeat(70));
        }
        
    } catch (error) {
        console.error('❌ Error general:', error);
    } finally {
        await pool.end();
    }
}

testAllStudentsDashboard();