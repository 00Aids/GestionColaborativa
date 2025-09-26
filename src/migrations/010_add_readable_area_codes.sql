-- Migración: Implementar códigos de área legibles
-- Fecha: 2025-09-XX
-- Descripción: Modifica la tabla areas_trabajo para soportar códigos legibles tipo "XZ4F-92A"

-- Paso 1: Modificar la columna codigo para soportar códigos más largos
ALTER TABLE areas_trabajo 
MODIFY COLUMN codigo VARCHAR(20) NOT NULL UNIQUE COMMENT 'Código único del área (ej: XZ4F-92A)';

-- Paso 2: Agregar columna para nombre visual del área
ALTER TABLE areas_trabajo 
ADD COLUMN nombre VARCHAR(255) NULL COMMENT 'Nombre descriptivo del área de trabajo' AFTER codigo;

-- Paso 3: Actualizar áreas existentes con nombres descriptivos basados en códigos actuales
UPDATE areas_trabajo SET nombre = 'Ingeniería de Sistemas' WHERE codigo = 'INGSIST';
UPDATE areas_trabajo SET nombre = 'Ingeniería Industrial' WHERE codigo = 'INGIND';
UPDATE areas_trabajo SET nombre = 'Administración' WHERE codigo = 'ADMIN';
UPDATE areas_trabajo SET nombre = 'Ciencias Básicas' WHERE codigo = 'CIENBAS';
UPDATE areas_trabajo SET nombre = 'Área General' WHERE codigo = 'A001';

-- Paso 4: Agregar nombre por defecto a cualquier área sin nombre
UPDATE areas_trabajo 
SET nombre = CONCAT('Área de Trabajo #', id)
WHERE nombre IS NULL;

-- Paso 5: Verificar estructura final
SELECT 'Migración completada - Estructura actualizada' as status;