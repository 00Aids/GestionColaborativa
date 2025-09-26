-- Migración 012: Expandir estados de entregables
-- Fecha: 2024-01-XX
-- Descripción: Agregar nuevos estados al ENUM de entregables para mejorar el workflow

-- 1. Expandir el ENUM del campo estado para incluir nuevos estados
ALTER TABLE entregables 
MODIFY COLUMN estado ENUM(
  'pendiente',           -- Estado inicial
  'en_progreso',         -- Estudiante trabajando en el entregable
  'entregado',           -- Entregado por el estudiante
  'en_revision',         -- En proceso de revisión por coordinador
  'aceptado',            -- Aceptado por el coordinador (final positivo)
  'rechazado',           -- Rechazado por el coordinador (final negativo)
  'requiere_cambios',    -- Requiere modificaciones (vuelta al estudiante)
  'completado'           -- Proceso completamente finalizado
) DEFAULT 'pendiente'
COMMENT 'Estados expandidos del entregable para mejor control de workflow';

-- 2. Migrar estados existentes a los nuevos valores
-- 'revisado' -> 'en_revision' (estado intermedio)
UPDATE entregables 
SET estado = 'en_revision' 
WHERE estado = 'revisado';

-- 'aprobado' -> 'aceptado' (estado final positivo)
UPDATE entregables 
SET estado = 'aceptado' 
WHERE estado = 'aprobado';

-- 3. Agregar índice para mejorar consultas por estado
CREATE INDEX idx_entregables_estado ON entregables(estado);

-- 4. Agregar índice compuesto para consultas frecuentes
CREATE INDEX idx_entregables_estado_fecha ON entregables(estado, fecha_entrega);

-- 5. Verificación de la migración
SELECT 
  'Estados después de migración' as verificacion,
  estado,
  COUNT(*) as cantidad
FROM entregables 
GROUP BY estado 
ORDER BY cantidad DESC;