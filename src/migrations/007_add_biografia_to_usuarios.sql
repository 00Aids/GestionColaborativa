-- Migración: Agregar campo biografia a la tabla usuarios
-- Fecha: 2024-01-24
-- Descripción: Agrega el campo biografia para almacenar información adicional del usuario

ALTER TABLE usuarios 
ADD COLUMN biografia TEXT NULL 
COMMENT 'Información adicional del usuario: biografía, intereses académicos, proyectos personales, etc.';