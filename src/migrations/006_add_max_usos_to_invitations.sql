-- Agregar campo max_usos a la tabla invitaciones
-- Este campo permite controlar cuántas veces se puede usar una invitación

ALTER TABLE invitaciones 
ADD COLUMN max_usos INT DEFAULT 1 NOT NULL COMMENT 'Número máximo de usos permitidos para esta invitación';

-- Agregar campo usos_actuales para llevar el conteo
ALTER TABLE invitaciones 
ADD COLUMN usos_actuales INT DEFAULT 0 NOT NULL COMMENT 'Número actual de usos de esta invitación';

-- Agregar índice para optimizar consultas
ALTER TABLE invitaciones 
ADD INDEX idx_max_usos (max_usos);

-- Actualizar invitaciones existentes para que tengan max_usos = 1
UPDATE invitaciones SET max_usos = 1, usos_actuales = 0 WHERE max_usos IS NULL;