const { pool } = require('./src/config/database');
const Entregable = require('./src/models/Entregable');
const User = require('./src/models/User');

async function debugStudentDeliverables() {
    try {
        console.log('=== DEBUG: Student Deliverables ===');
        
        // Crear instancias de los modelos
        const entregableModel = new Entregable();
        const userModel = new User();
        
        // Buscar el usuario s@test.com
        console.log('\n1. Buscando usuario s@test.com...');
        const student = await userModel.findByEmail('s@test.com');
        
        if (!student) {
            console.log('❌ Usuario s@test.com no encontrado');
            return;
        }
        
        console.log('✅ Usuario encontrado:', {
            id: student.id,
            email: student.email,
            nombres: student.nombres,
            apellidos: student.apellidos,
            rol: student.rol
        });
        
        // Verificar proyectos del estudiante
        console.log('\n2. Verificando proyectos del estudiante...');
        
        const [projects] = await pool.execute(`
            SELECT p.*, u.nombres, u.apellidos 
            FROM proyectos p 
            LEFT JOIN usuarios u ON p.estudiante_id = u.id 
            WHERE p.estudiante_id = ?
        `, [student.id]);
        
        console.log(`📁 Proyectos encontrados: ${projects.length}`);
        projects.forEach(project => {
            console.log(`  - ID: ${project.id}, Título: ${project.titulo}, Estado: ${project.estado}`);
        });
        
        // Verificar entregables usando el método del modelo
        console.log('\n3. Verificando entregables usando findByStudent...');
        const deliverables = await entregableModel.findByStudent(student.id);
        
        console.log(`📋 Entregables encontrados: ${deliverables ? deliverables.length : 0}`);
        if (deliverables && deliverables.length > 0) {
            deliverables.forEach(deliverable => {
                console.log(`  - ID: ${deliverable.id}, Título: ${deliverable.titulo}, Estado: ${deliverable.estado}, Proyecto: ${deliverable.proyecto_titulo}`);
            });
        } else {
            console.log('❌ No se encontraron entregables para este estudiante');
        }
        
        // Verificar entregables directamente en la base de datos
        console.log('\n4. Verificando entregables directamente en BD...');
        const [allDeliverables] = await pool.execute(`
            SELECT 
                e.*,
                p.titulo as proyecto_titulo,
                p.estudiante_id
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            WHERE p.estudiante_id = ?
        `, [student.id]);
        
        console.log(`📋 Entregables en BD: ${allDeliverables.length}`);
        allDeliverables.forEach(deliverable => {
            console.log(`  - ID: ${deliverable.id}, Título: ${deliverable.titulo}, Estado: ${deliverable.estado}, Proyecto: ${deliverable.proyecto_titulo}`);
        });
        
        // Verificar si hay entregables en general
        console.log('\n5. Verificando todos los entregables en el sistema...');
        const [totalDeliverables] = await pool.execute('SELECT COUNT(*) as total FROM entregables');
        console.log(`📊 Total de entregables en el sistema: ${totalDeliverables[0].total}`);
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

debugStudentDeliverables();