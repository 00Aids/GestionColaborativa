-- Migración: Actualizar tareas existentes con área de trabajo
-- Fecha: 2024-01-20
-- Descripción: Actualiza las tareas existentes con el área de trabajo de su proyecto

-- Actualizar tareas existentes con el área de trabajo de su proyecto (ignorar error si tabla no existe)
UPDATE tareas t 
INNER JOIN proyectos p ON t.proyecto_id = p.id 
SET t.area_trabajo_id = p.area_trabajo_id 
WHERE t.area_trabajo_id IS NULL;