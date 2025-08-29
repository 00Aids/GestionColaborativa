-- =============================================
-- MIGRACIÓN: Sistema de Workflow tipo Jira para Tareas
-- Fecha: 2025-01-24
-- Descripción: Agregar campos necesarios para implementar workflow de estados
-- =============================================

-- Modificar la tabla entregables para agregar campos del workflow
ALTER TABLE entregables 
ADD COLUMN estado_workflow ENUM('todo', 'in_progress', 'done') DEFAULT 'todo' AFTER estado,
ADD COLUMN asignado_a INT NULL AFTER estado_workflow,
ADD COLUMN completado_por INT NULL AFTER asignado_a,
ADD COLUMN fecha_completado TIMESTAMP NULL AFTER completado_por,
ADD COLUMN desarrollo_descripcion TEXT NULL AFTER fecha_completado,
ADD COLUMN archivos_adjuntos JSON NULL AFTER desarrollo_descripcion,
ADD COLUMN estimacion_horas INT NULL DEFAULT 0 AFTER archivos_adjuntos,
ADD COLUMN horas_trabajadas INT NULL DEFAULT 0 AFTER estimacion_horas,
ADD COLUMN etiquetas JSON NULL AFTER horas_trabajadas;

-- Agregar claves foráneas
ALTER TABLE entregables 
ADD CONSTRAINT fk_entregables_asignado_a 
    FOREIGN KEY (asignado_a) REFERENCES usuarios(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_entregables_completado_por 
    FOREIGN KEY (completado_por) REFERENCES usuarios(id) ON DELETE SET NULL;

-- =============================================
-- TABLA: tarea_comentarios
-- =============================================
CREATE TABLE IF NOT EXISTS tarea_comentarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tarea_id INT NOT NULL,
    usuario_id INT NOT NULL,
    comentario TEXT NOT NULL,
    tipo ENUM('comentario', 'sistema', 'archivo') DEFAULT 'comentario',
    archivo_adjunto VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tarea_id) REFERENCES entregables(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

-- =============================================
-- TABLA: tarea_historial
-- =============================================
CREATE TABLE IF NOT EXISTS tarea_historial (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tarea_id INT NOT NULL,
    usuario_id INT NOT NULL,
    accion VARCHAR(100) NOT NULL,
    campo_modificado VARCHAR(50) NULL,
    valor_anterior TEXT NULL,
    valor_nuevo TEXT NULL,
    descripcion TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tarea_id) REFERENCES entregables(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

-- =============================================
-- TABLA: subtareas
-- =============================================
CREATE TABLE IF NOT EXISTS subtareas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tarea_padre_id INT NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT NULL,
    estado ENUM('todo', 'in_progress', 'done') DEFAULT 'todo',
    asignado_a INT NULL,
    completado_por INT NULL,
    fecha_completado TIMESTAMP NULL,
    orden INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tarea_padre_id) REFERENCES entregables(id) ON DELETE CASCADE,
    FOREIGN KEY (asignado_a) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (completado_por) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- =============================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =============================================
CREATE INDEX IF NOT EXISTS idx_entregables_estado_workflow ON entregables(estado_workflow);
CREATE INDEX IF NOT EXISTS idx_entregables_asignado_a ON entregables(asignado_a);
CREATE INDEX IF NOT EXISTS idx_entregables_completado_por ON entregables(completado_por);
CREATE INDEX IF NOT EXISTS idx_tarea_comentarios_tarea ON tarea_comentarios(tarea_id);
CREATE INDEX IF NOT EXISTS idx_tarea_comentarios_usuario ON tarea_comentarios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_tarea_historial_tarea ON tarea_historial(tarea_id);
CREATE INDEX IF NOT EXISTS idx_tarea_historial_usuario ON tarea_historial(usuario_id);
CREATE INDEX IF NOT EXISTS idx_subtareas_padre ON subtareas(tarea_padre_id);
CREATE INDEX IF NOT EXISTS idx_subtareas_asignado ON subtareas(asignado_a);

-- =============================================
-- DATOS INICIALES
-- =============================================
-- Actualizar tareas existentes con estado workflow por defecto
UPDATE entregables SET estado_workflow = 'todo' WHERE estado_workflow IS NULL;

-- Asignar tareas existentes al estudiante del proyecto
UPDATE entregables e 
INNER JOIN proyectos p ON e.proyecto_id = p.id 
SET e.asignado_a = p.estudiante_id 
WHERE e.asignado_a IS NULL;

COMMIT;