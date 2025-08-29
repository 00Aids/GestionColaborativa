-- Migración: Agregar campo de prioridad a la tabla entregables
-- Fecha: 2025-01-24

ALTER TABLE entregables 
ADD COLUMN prioridad ENUM('low', 'medium', 'high', 'info') DEFAULT 'medium' 
AFTER descripcion;

-- Actualizar tareas existentes con prioridades variadas para testing
UPDATE entregables SET prioridad = 'high' WHERE id IN (1, 4);
UPDATE entregables SET prioridad = 'medium' WHERE id IN (2, 5);
UPDATE entregables SET prioridad = 'low' WHERE id = 3;

-- Crear índice para optimizar consultas por prioridad
CREATE INDEX idx_entregables_prioridad ON entregables(prioridad);