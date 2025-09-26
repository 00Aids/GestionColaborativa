-- Migración para expandir estados de entregables
-- Fecha: 2024-01-24
-- Descripción: Expandir estados de entregables de 5 a 8 estados para mejorar el flujo de trabajo

-- Expandir ENUM de estados en tabla entregables
ALTER TABLE entregables 
MODIFY COLUMN estado ENUM(
    'pendiente', 
    'en_progreso', 
    'entregado', 
    'en_revision', 
    'aceptado', 
    'rechazado', 
    'requiere_cambios', 
    'completado'
) DEFAULT 'pendiente';

-- Crear índice para optimizar consultas por estado
CREATE INDEX IF NOT EXISTS idx_entregables_estado ON entregables(estado);

-- Crear índice compuesto para consultas de coordinador
CREATE INDEX IF NOT EXISTS idx_entregables_revision ON entregables(estado, fecha_entrega);

-- Actualizar entregables existentes con estados antiguos
UPDATE entregables SET estado = 'aceptado' WHERE estado = 'aprobado';
UPDATE entregables SET estado = 'en_revision' WHERE estado = 'revisado';

-- Comentario sobre los nuevos estados:
-- pendiente: Estado inicial cuando se crea el entregable
-- en_progreso: Estudiante está trabajando en el entregable
-- entregado: Estudiante ha subido el entregable, esperando revisión
-- en_revision: Coordinador está revisando el entregable
-- aceptado: Entregable aprobado por el coordinador
-- rechazado: Entregable rechazado, requiere rehacer completamente
-- requiere_cambios: Entregable necesita modificaciones específicas
-- completado: Entregable finalizado y cerrado