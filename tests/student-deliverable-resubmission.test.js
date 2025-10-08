const DashboardController = require('../src/controllers/DashboardController');

// Utilidad simple para ejecutar tests sin framework
async function run() {
  const results = [];

  // Mock de req/res con session y flash
  function makeReqRes(user, body = {}, files = []) {
    const flashes = { success: [], error: [] };
    const res = {
      rendered: null,
      redirectUrl: null,
      render: (view, data) => { res.rendered = { view, data }; },
      redirect: (url) => { res.redirectUrl = url; },
    };
    const req = {
      session: { user },
      body,
      files,
      flash: (type, msg) => { flashes[type].push(msg); }
    };
    return { req, res, flashes };
  }

  // Test 1: Permite reenviar cuando estado requiere_cambios
  try {
    const controller = new DashboardController();

    const deliverable = {
      id: 10,
      estado: 'requiere_cambios',
      proyecto_id: 99,
      titulo: 'Informe parcial',
      archivos_adjuntos: JSON.stringify([{ url: '/uploads/deliverables/prev.pdf', nombre_original: 'prev.pdf', nombre_archivo: 'prev.pdf', tipo: 'entregado' }])
    };

    // Mocks de modelo y servicio
    controller.entregableModel.findById = async (id) => id == deliverable.id ? deliverable : null;
    let updatedData = null;
    controller.entregableModel.update = async (id, data) => { updatedData = { id, data }; };
    controller.deliverableNotificationService.notifyDeliverableSubmitted = async () => {};

    const user = { id: 1, email: 'student@test.com', nombres: 'Ana', apellidos: 'Pérez' };
    const body = { deliverable_id: '10', content: 'Contenido actualizado con más detalle' };
    const files = [{ filename: 'nuevo.docx', originalname: 'nuevo.docx' }];
    const { req, res, flashes } = makeReqRes(user, body, files);

    await controller.uploadDeliverable(req, res);

    const passed = res.redirectUrl === '/student/deliverables'
      && flashes.success.some(m => m.includes('Entregable enviado'))
      && updatedData
      && updatedData.data.estado === 'entregado'
      && updatedData.data.archivos_adjuntos && JSON.parse(updatedData.data.archivos_adjuntos).length === 2;

    results.push({ name: 'Reenvío permitido en estado requiere_cambios', passed, details: { flashes, redirectUrl: res.redirectUrl, updatedData } });
  } catch (err) {
    results.push({ name: 'Reenvío permitido en estado requiere_cambios', passed: false, error: err.message });
  }

  // Test 2: Bloquea en estado en_revision
  try {
    const controller = new DashboardController();

    const deliverable = { id: 20, estado: 'en_revision', proyecto_id: 1, titulo: 'Documento' };
    controller.entregableModel.findById = async (id) => id == deliverable.id ? deliverable : null;
    controller.entregableModel.update = async () => { throw new Error('No debería actualizarse'); };

    const user = { id: 1, email: 'student@test.com' };
    const body = { deliverable_id: '20', content: 'Contenido válido para prueba' };
    const { req, res, flashes } = makeReqRes(user, body, []);

    await controller.uploadDeliverable(req, res);

    const passed = res.redirectUrl === '/student/deliverables'
      && flashes.error.some(m => m.includes('No puedes modificar'));

    results.push({ name: 'Bloqueo en estado en_revision', passed, details: { flashes, redirectUrl: res.redirectUrl } });
  } catch (err) {
    results.push({ name: 'Bloqueo en estado en_revision', passed: false, error: err.message });
  }

  // Test 3: Requiere contenido o archivos
  try {
    const controller = new DashboardController();
    const deliverable = { id: 30, estado: 'pendiente', proyecto_id: 1, titulo: 'Documento' };

    controller.entregableModel.findById = async (id) => id == deliverable.id ? deliverable : null;

    const user = { id: 1, email: 'student@test.com' };
    const body = { deliverable_id: '30', content: '   ' };
    const { req, res, flashes } = makeReqRes(user, body, []);

    await controller.uploadDeliverable(req, res);

    const passed = res.redirectUrl === '/student/deliverables'
      && flashes.error.some(m => m.includes('Debes proporcionar contenido'));

    results.push({ name: 'Validación de contenido/archivos', passed, details: { flashes, redirectUrl: res.redirectUrl } });
  } catch (err) {
    results.push({ name: 'Validación de contenido/archivos', passed: false, error: err.message });
  }

  // Reporte
  const allPassed = results.every(r => r.passed);
  console.log('=== Pruebas de reenvío de entregables (estudiante) ===');
  for (const r of results) {
    console.log(`- ${r.name}: ${r.passed ? '✅ OK' : '❌ FALLO'}`);
    if (!r.passed) console.log('  Detalles:', r.details || r.error);
  }
  return { success: allPassed, results };
}

run().then(({ success }) => process.exit(success ? 0 : 1));