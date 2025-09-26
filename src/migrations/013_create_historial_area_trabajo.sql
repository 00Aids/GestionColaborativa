-- =============================================
-- MIGRACIÓN: Crear tabla historial_area_trabajo
-- Descripción: Tabla para registrar todas las actividades y cambios en las áreas de trabajo
-- Fecha: 2024-12-26
-- =============================================

CREATE TABLE IF NOT EXISTS historial_area_trabajo (
    id INT PRIMARY KEY AUTO_INCREMENT,
    area_trabajo_id INT NOT NULL,
    usuario_id INT NOT NULL,
    accion VARCHAR(100) NOT NULL,
    entidad_tipo ENUM('proyecto', 'usuario', 'entregable', 'evaluacion', 'configuracion') NOT NULL,
    entidad_id INT NULL,
    descripcion TEXT NOT NULL,
    datos_anteriores JSON NULL,
    datos_nuevos JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (area_trabajo_id) REFERENCES areas_trabajo(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

-- Índices para optimización
CREATE INDEX idx_historial_area_trabajo_area ON historial_area_trabajo(area_trabajo_id);
CREATE INDEX idx_historial_area_trabajo_usuario ON historial_area_trabajo(usuario_id);
CREATE INDEX idx_historial_area_trabajo_accion ON historial_area_trabajo(accion);
CREATE INDEX idx_historial_area_trabajo_entidad ON historial_area_trabajo(entidad_tipo, entidad_id);
CREATE INDEX idx_historial_area_trabajo_fecha ON historial_area_trabajo(created_at);