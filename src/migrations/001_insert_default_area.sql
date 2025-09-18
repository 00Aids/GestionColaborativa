-- Migración: Insertar área de trabajo por defecto
-- Fecha: 2024-01-20
-- Descripción: Inserta el área de trabajo por defecto para migración de datos existentes

INSERT INTO areas_trabajo (codigo, nombre, descripcion) 
VALUES ('A001', 'Area General', 'Area de trabajo por defecto para proyectos existentes')
ON DUPLICATE KEY UPDATE nombre = nombre;