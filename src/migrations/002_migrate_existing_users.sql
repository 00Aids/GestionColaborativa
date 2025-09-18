-- Migración: Migrar usuarios existentes al área por defecto
-- Fecha: 2024-01-20
-- Descripción: Asigna usuarios administradores existentes al área por defecto

INSERT INTO usuario_areas_trabajo (usuario_id, area_trabajo_id, es_admin, activo)
SELECT 
    u.id,
    (SELECT id FROM areas_trabajo WHERE codigo = 'A001' LIMIT 1),
    TRUE,
    TRUE
FROM usuarios u 
INNER JOIN roles r ON u.rol_id = r.id
WHERE r.nombre = 'admin' 
AND NOT EXISTS (
    SELECT 1 FROM usuario_areas_trabajo uat 
    WHERE uat.usuario_id = u.id
);