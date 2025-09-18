-- Migración: Agregar área de trabajo a proyectos
-- Fecha: 2024-01-20
-- Descripción: Agrega el campo area_trabajo_id a la tabla proyectos

-- Agregar columna area_trabajo_id a la tabla proyectos (ignorar error si ya existe)
ALTER TABLE proyectos 
ADD COLUMN area_trabajo_id INT NULL COMMENT 'ID del área de trabajo asignada';