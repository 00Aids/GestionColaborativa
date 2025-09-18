-- Migración: Agregar índice para área de trabajo en proyectos
-- Fecha: 2024-01-20
-- Descripción: Agrega índice para area_trabajo_id en proyectos

-- Agregar índice para area_trabajo_id (ignorar error si ya existe)
ALTER TABLE proyectos ADD INDEX idx_area_trabajo_id (area_trabajo_id);