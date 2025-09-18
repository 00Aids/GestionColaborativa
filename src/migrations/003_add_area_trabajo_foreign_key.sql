-- Migración: Agregar clave foránea para área de trabajo en proyectos
-- Fecha: 2024-01-20
-- Descripción: Agrega clave foránea para area_trabajo_id en proyectos

-- Agregar clave foránea para area_trabajo_id (ignorar error si ya existe)
ALTER TABLE proyectos 
ADD CONSTRAINT fk_proyectos_area_trabajo 
FOREIGN KEY (area_trabajo_id) REFERENCES areas_trabajo(id) ON DELETE SET NULL;