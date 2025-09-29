-- Migration: Allow NULL values for estudiante_id in proyectos table
-- This allows creating projects without initially assigning a student
-- Students can be assigned later through invitations

USE gestion_colaborativa;

-- Modify the estudiante_id column to allow NULL values
ALTER TABLE proyectos 
MODIFY COLUMN estudiante_id INT NULL;

-- Update the foreign key constraint to handle NULL values properly
-- The existing constraint should already handle this, but we ensure it's correct
ALTER TABLE proyectos 
DROP FOREIGN KEY proyectos_ibfk_1;

ALTER TABLE proyectos 
ADD CONSTRAINT proyectos_ibfk_1 
FOREIGN KEY (estudiante_id) REFERENCES usuarios(id) ON DELETE SET NULL;

-- Verification query (optional - can be run to check the change)
-- DESCRIBE proyectos;