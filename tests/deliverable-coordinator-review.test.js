const EntregableController = require('../src/controllers/EntregableController');
const User = require('../src/models/User');
const Entregable = require('../src/models/Entregable');

// Utilidad simple para ejecutar tests sin framework
async function run() {
  const results = [];

  // Mock de sesión y req/res
  function makeReqRes(user) {
    const flashes = { success: [], error: [] };
    const res = {
      rendered: null,
      redirectUrl: null,
      render: (view, data) => { 
        res.rendered = { view, data };
      },
      redirect: (url) => { res.redirectUrl = url; },
    };
    return {
      req: {
        session: { user },
        flash: (type, msg) => { flashes[type].push(msg); },
      },
      res,
      flashes
    };
  }

  // Test 1: Coordinador sin área debe poder ver deliverables y no redirigir
  try {
    const controller = new EntregableController();

    // Mockear métodos de modelos usados
    controller.userModel.getUserAreas = async () => [];
    controller.entregableModel.findByCoordinatorForReview = async (coordinatorId) => [
      { id: 1, estado: 'pendiente' },
      { id: 2, estado: 'entregado', fecha_limite: new Date(Date.now() - 86400000) },
      { id: 3, estado: 'en_revision' },
      { id: 4, estado: 'requiere_cambios' },
      { id: 5, estado: 'aceptado' }
    ];

    const user = { id: 123, rol: 'Coordinador Académico' };
    const { req, res, flashes } = makeReqRes(user);

    await controller.coordinatorReview(req, res);

    const passed = !res.redirectUrl && res.rendered && res.rendered.view === 'coordinator/deliverable-review';
    results.push({ name: 'Coordinador sin área: acceso a revisión de entregables', passed, details: { redirectUrl: res.redirectUrl, rendered: res.rendered, flashes } });
  } catch (err) {
    results.push({ name: 'Coordinador sin área: acceso a revisión de entregables', passed: false, error: err.message });
  }

  // Test 2: Fallback de estadísticas cuando no hay área
  try {
    const controller = new EntregableController();

    controller.userModel.getUserAreas = async () => [];
    controller.entregableModel.findByCoordinatorForReview = async () => [
      { estado: 'pendiente' },
      { estado: 'en_progreso' },
      { estado: 'entregado', fecha_limite: new Date(Date.now() - 86400000) },
      { estado: 'aceptado' },
      { estado: 'requiere_cambios' }
    ];
    controller.entregableModel.getWorkflowSummary = async () => { throw new Error('should not be called without area'); };

    const user = { id: 456, rol: 'Coordinador Académico' };
    const { req, res } = makeReqRes(user);

    await controller.coordinatorReview(req, res);

    const stats = res.rendered.data.areaStats;
    const passed = stats.total === 5
      && stats.pendientes === 1
      && stats.en_progreso === 1
      && stats.entregados === 1
      && stats.aprobados === 1
      && stats.requiere_cambios === 1
      && typeof stats.vencidos === 'number';

    results.push({ name: 'Fallback de estadísticas sin área', passed, details: stats });
  } catch (err) {
    results.push({ name: 'Fallback de estadísticas sin área', passed: false, error: err.message });
  }

  // Test 3: Con área asignada debe usar getWorkflowSummary
  try {
    const controller = new EntregableController();

    controller.userModel.getUserAreas = async () => [{ area_trabajo_id: 9 }];
    controller.entregableModel.findByCoordinatorForReview = async () => [];
    let calledWith = null;
    controller.entregableModel.getWorkflowSummary = async (areaId) => { calledWith = areaId; return { total: 0 }; };

    const user = { id: 789, rol: 'Coordinador Académico' };
    const { req, res } = makeReqRes(user);

    await controller.coordinatorReview(req, res);

    const passed = calledWith === 9;
    results.push({ name: 'Con área asignada: uso de getWorkflowSummary', passed, details: { calledWith, render: res.rendered } });
  } catch (err) {
    results.push({ name: 'Con área asignada: uso de getWorkflowSummary', passed: false, error: err.message });
  }

  // Reporte
  const allPassed = results.every(r => r.passed);
  console.log('=== Pruebas de revisión de entregables (coordinador) ===');
  for (const r of results) {
    console.log(`- ${r.name}: ${r.passed ? '✅ OK' : '❌ FALLO'}`);
    if (!r.passed) console.log('  Detalles:', r.details || r.error);
  }
  return { success: allPassed, results };
}

run().then(({ success }) => process.exit(success ? 0 : 1));