-- Migración: Agregar relación de áreas de trabajo a usuarios
-- Fecha: 2024-01-20
-- Descripción: Crea tabla de relación entre usuarios y áreas de trabajo

-- Crear tabla de relación usuarios-áreas de trabajo
CREATE TABLE IF NOT EXISTS usuario_areas_trabajo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    area_trabajo_id INT NOT NULL,
    es_admin BOOLEAN DEFAULT FALSE COMMENT 'Si el usuario es administrador del área',
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (area_trabajo_id) REFERENCES areas_trabajo(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_usuario_area (usuario_id, area_trabajo_id),
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_area_trabajo_id (area_trabajo_id),
    INDEX idx_es_admin (es_admin),
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;