-- =============================================
-- DATOS INICIALES DEL SISTEMA
-- =============================================
-- Nota: Este archivo asume que ya estamos conectados a la base de datos

-- =============================================
-- INSERTAR ROLES
-- =============================================
INSERT IGNORE INTO roles (nombre, descripcion, permisos) VALUES
('Administrador General', 'Control total del sistema', JSON_OBJECT(
    'usuarios', JSON_ARRAY('crear', 'leer', 'actualizar', 'eliminar'),
    'proyectos', JSON_ARRAY('crear', 'leer', 'actualizar', 'eliminar'),
    'evaluaciones', JSON_ARRAY('crear', 'leer', 'actualizar', 'eliminar'),
    'reportes', JSON_ARRAY('generar', 'exportar'),
    'configuracion', JSON_ARRAY('modificar')
)),
('Coordinador Académico', 'Gestión académica y asignaciones', JSON_OBJECT(
    'usuarios', JSON_ARRAY('crear', 'leer', 'actualizar'),
    'proyectos', JSON_ARRAY('leer', 'actualizar', 'asignar'),
    'evaluaciones', JSON_ARRAY('leer'),
    'reportes', JSON_ARRAY('generar')
)),
('Director de Proyecto', 'Dirección y evaluación de proyectos', JSON_OBJECT(
    'proyectos', JSON_ARRAY('leer', 'actualizar'),
    'evaluaciones', JSON_ARRAY('crear', 'leer', 'actualizar'),
    'entregables', JSON_ARRAY('revisar', 'calificar')
)),
('Evaluador', 'Evaluación de proyectos asignados', JSON_OBJECT(
    'proyectos', JSON_ARRAY('leer'),
    'evaluaciones', JSON_ARRAY('crear', 'leer', 'actualizar'),
    'entregables', JSON_ARRAY('revisar', 'calificar')
)),
('Estudiante', 'Gestión de proyecto personal', JSON_OBJECT(
    'proyectos', JSON_ARRAY('crear', 'leer', 'actualizar'),
    'entregables', JSON_ARRAY('crear', 'leer', 'actualizar'),
    'evaluaciones', JSON_ARRAY('leer')
));

-- =============================================
-- INSERTAR FASES DEL PROYECTO
-- =============================================
INSERT IGNORE INTO fases_proyecto (nombre, descripcion, orden, duracion_dias, requiere_evaluacion) VALUES
('Propuesta', 'Presentación inicial del proyecto de tesis', 1, 15, true),
('Anteproyecto', 'Desarrollo detallado del marco teórico y metodología', 2, 30, true),
('Desarrollo', 'Ejecución de la investigación y desarrollo del proyecto', 3, 90, true),
('Borrador Final', 'Primera versión completa del documento de tesis', 4, 30, true),
('Revisión Final', 'Correcciones y ajustes finales', 5, 15, true),
('Sustentación', 'Presentación y defensa del proyecto', 6, 7, true);

-- =============================================
-- INSERTAR LÍNEAS DE INVESTIGACIÓN
-- =============================================
INSERT IGNORE INTO lineas_investigacion (nombre, descripcion) VALUES
('Tecnologías de la Información', 'Desarrollo de software, sistemas web, inteligencia artificial'),
('Ingeniería de Software', 'Metodologías de desarrollo, calidad de software, arquitecturas'),
('Ciencias de Datos', 'Análisis de datos, machine learning, big data'),
('Ciberseguridad', 'Seguridad informática, criptografía, auditoría de sistemas'),
('Redes y Telecomunicaciones', 'Infraestructura de red, protocolos, comunicaciones'),
('Sistemas Embebidos', 'IoT, microcontroladores, sistemas en tiempo real');

-- =============================================
-- INSERTAR CICLO ACADÉMICO ACTUAL
-- =============================================
INSERT IGNORE INTO ciclos_academicos (nombre, fecha_inicio, fecha_fin, activo) VALUES
('2024-I', '2024-03-01', '2024-07-31', true),
('2024-II', '2024-08-01', '2024-12-31', false);

-- =============================================
-- INSERTAR USUARIO ADMINISTRADOR
-- =============================================
INSERT IGNORE INTO usuarios (codigo_usuario, email, password_hash, nombres, apellidos, rol_id) VALUES
('ADMIN001', 'admin@universidad.edu', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrador', 'Sistema', 1);

-- =============================================
-- INSERTAR RÚBRICAS DE EVALUACIÓN
-- =============================================
INSERT IGNORE INTO rubricas_evaluacion (nombre, descripcion, criterios, puntaje_maximo, tipo) VALUES
('Evaluación de Propuesta', 'Rúbrica para evaluar propuestas de tesis', JSON_OBJECT(
    'originalidad', JSON_OBJECT('peso', 25, 'descripcion', 'Originalidad y novedad del tema'),
    'viabilidad', JSON_OBJECT('peso', 25, 'descripcion', 'Viabilidad técnica y metodológica'),
    'relevancia', JSON_OBJECT('peso', 25, 'descripcion', 'Relevancia académica y práctica'),
    'presentacion', JSON_OBJECT('peso', 25, 'descripcion', 'Calidad de la presentación')
), 100.00, 'propuesta'),

('Evaluación de Entregable', 'Rúbrica para evaluar entregables por fase', JSON_OBJECT(
    'contenido', JSON_OBJECT('peso', 40, 'descripcion', 'Calidad y completitud del contenido'),
    'metodologia', JSON_OBJECT('peso', 30, 'descripcion', 'Aplicación correcta de metodología'),
    'redaccion', JSON_OBJECT('peso', 20, 'descripcion', 'Calidad de redacción y ortografía'),
    'formato', JSON_OBJECT('peso', 10, 'descripcion', 'Cumplimiento de formato requerido')
), 100.00, 'entregable'),

('Evaluación Final', 'Rúbrica para evaluación final del proyecto', JSON_OBJECT(
    'investigacion', JSON_OBJECT('peso', 35, 'descripcion', 'Calidad de la investigación realizada'),
    'resultados', JSON_OBJECT('peso', 30, 'descripcion', 'Resultados obtenidos y análisis'),
    'documento', JSON_OBJECT('peso', 25, 'descripcion', 'Calidad del documento final'),
    'sustentacion', JSON_OBJECT('peso', 10, 'descripcion', 'Calidad de la sustentación')
), 100.00, 'final');