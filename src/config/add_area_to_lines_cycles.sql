-- =============================================
-- MIGRACIÓN: Agregar area_trabajo_id a líneas de investigación y ciclos académicos
-- Fecha: 2025-01-26
-- Propósito: Hacer que cada área de trabajo tenga sus propias líneas y ciclos
-- =============================================

-- 1. Agregar campo area_trabajo_id a lineas_investigacion
ALTER TABLE lineas_investigacion 
ADD COLUMN area_trabajo_id INT NULL AFTER descripcion,
ADD FOREIGN KEY (area_trabajo_id) REFERENCES areas_trabajo(id) ON DELETE CASCADE;

-- 2. Agregar campo area_trabajo_id a ciclos_academicos
ALTER TABLE ciclos_academicos 
ADD COLUMN area_trabajo_id INT NULL AFTER activo,
ADD FOREIGN KEY (area_trabajo_id) REFERENCES areas_trabajo(id) ON DELETE CASCADE;

-- 3. Crear índices para optimizar consultas por área
CREATE INDEX idx_lineas_investigacion_area ON lineas_investigacion(area_trabajo_id);
CREATE INDEX idx_ciclos_academicos_area ON ciclos_academicos(area_trabajo_id);

-- 4. Migrar datos existentes al área por defecto (ID 1)
-- Nota: Esto asigna las líneas y ciclos existentes al área por defecto
UPDATE lineas_investigacion SET area_trabajo_id = 1 WHERE area_trabajo_id IS NULL;
UPDATE ciclos_academicos SET area_trabajo_id = 1 WHERE area_trabajo_id IS NULL;

-- 5. Hacer el campo obligatorio después de la migración
ALTER TABLE lineas_investigacion MODIFY COLUMN area_trabajo_id INT NOT NULL;
ALTER TABLE ciclos_academicos MODIFY COLUMN area_trabajo_id INT NOT NULL;

-- =============================================
-- VERIFICACIÓN DE LA MIGRACIÓN
-- =============================================
-- Verificar estructura de lineas_investigacion
-- DESCRIBE lineas_investigacion;

-- Verificar estructura de ciclos_academicos  
-- DESCRIBE ciclos_academicos;

-- Verificar datos migrados
-- SELECT * FROM lineas_investigacion;
-- SELECT * FROM ciclos_academicos;