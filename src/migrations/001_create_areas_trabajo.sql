-- Migración: Crear tabla de áreas de trabajo
-- Fecha: 2024-01-20
-- Descripción: Crea la tabla areas_trabajo para gestionar grupos de trabajo únicos

CREATE TABLE IF NOT EXISTS areas_trabajo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL UNIQUE COMMENT 'Código único del área (ej: A345)',
    nombre VARCHAR(255) NOT NULL COMMENT 'Nombre descriptivo del área',
    descripcion TEXT COMMENT 'Descripción del área de trabajo',
    activo BOOLEAN DEFAULT TRUE COMMENT 'Estado del área de trabajo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_codigo (codigo),
    INDEX idx_activo (activo),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;