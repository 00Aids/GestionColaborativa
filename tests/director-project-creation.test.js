const AdminController = require('../src/controllers/AdminController');
const AuthMiddleware = require('../src/middlewares/auth');

// Utilidad simple para ejecutar tests sin framework
async function run() {
  const results = [];

  function makeReqRes(user) {
    const flashes = { success: [], error: [] };
    const res = {
      rendered: null,
      redirectUrl: null,
      jsonPayload: null,
      statusCode: null,
      render: (view, data) => { res.rendered = { view, data }; },
      redirect: (url) => { res.redirectUrl = url; },
      status: (code) => { res.statusCode = code; return res; },
      json: (payload) => { res.jsonPayload = payload; }
    };
    const req = {
      session: { user },
      flash: (type, msg) => { flashes[type].push(msg); },
      headers: { accept: 'application/json' },
      xhr: true, // simular petición API por defecto
      originalUrl: '/projects/create',
      method: 'POST',
      areaTrabajoId: user && user.area_trabajo_id ? user.area_trabajo_id : 1,
      userAreas: [{ area_trabajo_id: user && user.area_trabajo_id ? user.area_trabajo_id : 1 }]
    };
    return { req, res, flashes };
  }

  // Test 1: Director accede al formulario de creación (GET /projects/create)
  try {
    const controller = new AdminController();

    // Mock de métodos usados en newProject
    controller.lineasInvestigacionModel.query = async () => [{ id: 1, nombre: 'Línea 1' }];
    controller.ciclosAcademicosModel.query = async () => [{ id: 1, nombre: '2025-1' }];
    controller.userModel.findWithRole = async () => [
      { id: 10, rol_nombre: 'Director de Proyecto', nombres: 'Dir Uno' },
      { id: 20, rol_nombre: 'Estudiante', nombres: 'Est Uno' },
      { id: 30, rol_nombre: 'Administrador General', nombres: 'Admin Uno' }
    ];

    const user = { id: 999, rol_nombre: 'Director de Proyecto', area_trabajo_id: 1 };
    const { req, res } = makeReqRes(user);
    // Ajustar a GET y navegación HTML
    req.method = 'GET';
    req.xhr = false;
    req.headers.accept = 'text/html';

    await controller.newProject(req, res);

    const passed = !res.redirectUrl && res.rendered && res.rendered.view === 'admin/project-new';
    results.push({ name: 'Director puede ver formulario de creación de proyectos', passed, details: { rendered: res.rendered, redirectUrl: res.redirectUrl } });
  } catch (err) {
    results.push({ name: 'Director puede ver formulario de creación de proyectos', passed: false, error: err.message });
  }

  // Test 2: Director crea proyecto exitosamente (POST /projects/create)
  try {
    const controller = new AdminController();

    // Mock de creación de proyecto
    controller.projectModel.create = async (data) => {
      // Validar que el área de trabajo se está asignando
      if (!data.area_trabajo_id) throw new Error('area_trabajo_id faltante');
      return 123; // ID simulado
    };

    const user = { id: 1001, rol_nombre: 'Director de Proyecto', area_trabajo_id: 2 };
    const { req, res } = makeReqRes(user);
    req.body = {
      titulo: 'Proyecto Director',
      descripcion: 'Descripción del proyecto',
      ciclo_academico_id: 1,
      fecha_inicio: '2025-01-10',
      fecha_fin: '2025-03-10',
      director_id: user.id
    };

    await controller.createProject(req, res);

    const passed = res.statusCode === null && res.jsonPayload && res.jsonPayload.success === true && res.jsonPayload.projectId === 123;
    results.push({ name: 'Director puede crear proyectos (API)', passed, details: { json: res.jsonPayload, statusCode: res.statusCode } });
  } catch (err) {
    results.push({ name: 'Director puede crear proyectos (API)', passed: false, error: err.message });
  }

  // Test 3: Middleware permite acceso al director para /projects/create
  try {
    const mw = AuthMiddleware.requireRole(['Coordinador Académico', 'Administrador General', 'Director de Proyecto']);
    const user = { id: 2002, rol_nombre: 'Director de Proyecto', area_trabajo_id: 1 };
    const { req, res } = makeReqRes(user);
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await mw(req, res, next);

    const passed = nextCalled === true && res.statusCode === null;
    results.push({ name: 'Middleware requireRole permite director en /projects/create', passed, details: { nextCalled, statusCode: res.statusCode } });
  } catch (err) {
    results.push({ name: 'Middleware requireRole permite director en /projects/create', passed: false, error: err.message });
  }

  // Test 4: Middleware bloquea a Estudiante en /projects/create (API)
  try {
    const mw = AuthMiddleware.requireRole(['Coordinador Académico', 'Administrador General', 'Director de Proyecto']);
    const user = { id: 3003, rol_nombre: 'Estudiante', area_trabajo_id: 1 };
    const { req, res } = makeReqRes(user);
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await mw(req, res, next);

    const passed = nextCalled === false && res.statusCode === 403 && res.jsonPayload && res.jsonPayload.error === 'Acceso denegado';
    results.push({ name: 'Middleware requireRole bloquea estudiante en /projects/create', passed, details: { nextCalled, statusCode: res.statusCode, json: res.jsonPayload } });
  } catch (err) {
    results.push({ name: 'Middleware requireRole bloquea estudiante en /projects/create', passed: false, error: err.message });
  }

  // Reporte
  const allPassed = results.every(r => r.passed);
  console.log('=== Pruebas de creación de proyectos (rol Director) ===');
  for (const r of results) {
    console.log(`- ${r.name}: ${r.passed ? '✅ OK' : '❌ FALLO'}`);
    if (!r.passed) console.log('  Detalles:', r.details || r.error);
  }
  return { success: allPassed, results };
}

run().then(({ success }) => process.exit(success ? 0 : 1));