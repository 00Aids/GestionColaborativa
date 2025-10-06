-- Migración 010: Mejorar estructura de asignaciones de proyecto (Versión Simplificada)
-- Fecha: 2024-01-XX
-- Descripción: Actualizar tabla proyecto_usuarios para soportar múltiples usuarios por rol

-- 1. Verificar si la tabla proyecto_usuarios existe, si no, crearla
CREATE TABLE IF NOT EXISTS proyecto_usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    proyecto_id INT NOT NULL,
    usuario_id INT NOT NULL,
    rol_en_proyecto ENUM('estudiante', 'director', 'coordinador', 'evaluador') NOT NULL DEFAULT 'estudiante',
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- 2. Agregar columna a proyectos para marcar uso de nueva estructura
ALTER TABLE proyectos 
ADD COLUMN IF NOT EXISTS usa_asignaciones_multiples BOOLEAN DEFAULT TRUE;

-- 3. Migrar datos existentes de campos individuales a proyecto_usuarios
-- Solo migrar si no existen ya en proyecto_usuarios

-- Migrar estudiantes
INSERT IGNORE INTO proyecto_usuarios (proyecto_id, usuario_id, rol_en_proyecto, fecha_asignacion)
SELECT 
    p.id as proyecto_id,
    p.estudiante_id as usuario_id,
    'estudiante' as rol_en_proyecto,
    p.fecha_creacion as fecha_asignacion
FROM proyectos p 
WHERE p.estudiante_id IS NOT NULL;

-- Migrar directores
INSERT IGNORE INTO proyecto_usuarios (proyecto_id, usuario_id, rol_en_proyecto, fecha_asignacion)
SELECT 
    p.id as proyecto_id,
    p.director_id as usuario_id,
    'director' as rol_en_proyecto,
    p.fecha_creacion as fecha_asignacion
FROM proyectos p 
WHERE p.director_id IS NOT NULL;

-- Migrar evaluadores
INSERT IGNORE INTO proyecto_usuarios (proyecto_id, usuario_id, rol_en_proyecto, fecha_asignacion)
SELECT 
    p.id as proyecto_id,
    p.evaluador_id as usuario_id,
    'evaluador' as rol_en_proyecto,
    p.fecha_creacion as fecha_asignacion
FROM proyectos p 
WHERE p.evaluador_id IS NOT NULL;

-- 4. Actualizar registros existentes en proyecto_usuarios que tengan rol genérico
-- Actualizar roles basados en el tipo de usuario
UPDATE proyecto_usuarios pu
JOIN usuarios u ON pu.usuario_id = u.id
SET pu.rol_en_proyecto = CASE 
    WHEN u.tipo_usuario = 'Estudiante' THEN 'estudiante'
    WHEN u.tipo_usuario = 'Director Académico' THEN 'director'
    WHEN u.tipo_usuario = 'Coordinador Académico' THEN 'coordinador'
    WHEN u.tipo_usuario = 'Evaluador' THEN 'evaluador'
    WHEN u.tipo_usuario = 'Administrador General' THEN 'director'
    ELSE 'estudiante'
END
WHERE pu.rol_en_proyecto = 'estudiante' 
AND u.tipo_usuario != 'Estudiante';

-- 5. Marcar todos los proyectos como usando la nueva estructura
UPDATE proyectos SET usa_asignaciones_multiples = TRUE;

-- 6. Agregar comentarios a las tablas
ALTER TABLE proyecto_usuarios COMMENT = 'Tabla mejorada para asignaciones múltiples de usuarios a proyectos por rol';
ALTER TABLE proyectos COMMENT = 'Tabla principal de proyectos. Campos individuales (estudiante_id, director_id, evaluador_id) deprecados en favor de proyecto_usuarios';