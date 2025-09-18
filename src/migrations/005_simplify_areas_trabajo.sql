-- Migración para simplificar areas_trabajo
-- Eliminar campos innecesarios: nombre y descripcion
-- Solo mantener: id, codigo, activo, created_at, updated_at

-- Paso 1: Verificar estructura actual
DESCRIBE areas_trabajo;

-- Paso 2: Eliminar campos innecesarios
ALTER TABLE areas_trabajo 
DROP COLUMN IF EXISTS nombre,
DROP COLUMN IF EXISTS descripcion;

-- Paso 3: Verificar que el código sea único y no nulo
ALTER TABLE areas_trabajo 
MODIFY COLUMN codigo VARCHAR(10) NOT NULL UNIQUE;

-- Paso 4: Verificar estructura final
DESCRIBE areas_trabajo;