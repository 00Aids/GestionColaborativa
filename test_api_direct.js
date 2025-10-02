const ProjectController = require('./src/controllers/ProjectController');
const { pool } = require('./src/config/database');

async function testAPIDirectly() {
    try {
        console.log('🔍 Probando API getProjectDeliverables directamente...\n');

        // Obtener información del usuario s@test.com
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
        console.log('👤 Usuario encontrado:', user);

        // Simular req y res
        const req = {
            params: { id: 35 },
            session: { user: user }
        };

        const res = {
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                console.log(`📤 Response Status: ${this.statusCode || 200}`);
                console.log('📦 Response Data:', JSON.stringify(data, null, 2));
                return this;
            }
        };

        // Crear instancia del controlador y probar
        const controller = new ProjectController();
        await controller.getProjectDeliverables(req, res);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

testAPIDirectly();