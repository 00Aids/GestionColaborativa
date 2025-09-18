-- Migración: Agregar área de trabajo a tareas
-- Fecha: 2024-01-20
-- Descripción: Agrega el campo area_trabajo_id a la tabla tareas para filtrado por área

-- Agregar columna area_trabajo_id a la tabla tareas (ignorar error si ya existe o tabla no existe)
ALTER TABLE tareas 
ADD COLUMN area_trabajo_id INT NULL COMMENT 'ID del área de trabajo (heredado del proyecto)';