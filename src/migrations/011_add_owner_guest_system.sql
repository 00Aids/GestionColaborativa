-- Migración: Implementar sistema propietario/invitado
-- Fecha: 2025-01-XX
-- Descripción: Agrega la columna es_propietario para diferenciar entre propietarios e invitados de áreas

-- Paso 1: Agregar columna es_propietario
ALTER TABLE usuario_areas_trabajo 
ADD COLUMN es_propietario BOOLEAN DEFAULT FALSE 
COMMENT 'Indica si el usuario es propietario del área (creador original)' 
AFTER es_admin;

-- Paso 2: Marcar como propietarios a los primeros administradores de cada área
-- (Asumimos que el primer admin registrado en cada área es el propietario)
UPDATE usuario_areas_trabajo uat1
SET es_propietario = TRUE
WHERE es_admin = TRUE 
AND id = (
    SELECT MIN(uat2.id) 
    FROM (SELECT * FROM usuario_areas_trabajo) uat2 
    WHERE uat2.area_trabajo_id = uat1.area_trabajo_id 
    AND uat2.es_admin = TRUE 
    AND uat2.activo = TRUE
);

-- Paso 3: Agregar índice para optimizar consultas
ALTER TABLE usuario_areas_trabajo 
ADD INDEX idx_es_propietario (es_propietario);

-- Paso 4: Verificar que cada área tenga exactamente un propietario
SELECT 
    at.id as area_id,
    at.codigo as area_codigo,
    at.nombre as area_nombre,
    COUNT(uat.id) as total_propietarios
FROM areas_trabajo at
LEFT JOIN usuario_areas_trabajo uat ON at.id = uat.area_trabajo_id 
    AND uat.es_propietario = TRUE 
    AND uat.activo = TRUE
GROUP BY at.id, at.codigo, at.nombre
ORDER BY at.id;