-- Migración: Migrar proyectos existentes al área por defecto
-- Fecha: 2024-01-20
-- Descripción: Asigna proyectos existentes al área por defecto

UPDATE proyectos 
SET area_trabajo_id = (SELECT id FROM areas_trabajo WHERE codigo = 'A001' LIMIT 1)
WHERE area_trabajo_id IS NULL;