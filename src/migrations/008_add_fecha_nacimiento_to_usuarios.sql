-- Migración 008: Agregar campo fecha_nacimiento a la tabla usuarios
-- ================================================================

-- Agregar campo fecha_nacimiento
ALTER TABLE usuarios 
ADD COLUMN fecha_nacimiento DATE NULL 
COMMENT 'Fecha de nacimiento del usuario';

-- Crear índice para optimizar consultas por fecha de nacimiento (opcional)
CREATE INDEX idx_usuarios_fecha_nacimiento ON usuarios(fecha_nacimiento);