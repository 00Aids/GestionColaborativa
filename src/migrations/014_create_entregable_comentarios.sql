-- Migración: Crear tabla entregable_comentarios
-- Fecha: 2024-01-20
-- Descripción: Crea la tabla para almacenar comentarios de entregables

-- Crear tabla entregable_comentarios
CREATE TABLE IF NOT EXISTS entregable_comentarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    entregable_id INT NOT NULL,
    usuario_id INT NOT NULL,
    comentario TEXT NOT NULL,
    tipo ENUM('revision', 'feedback', 'aprobacion', 'rechazo', 'cambios') DEFAULT 'revision',
    es_publico BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (entregable_id) REFERENCES entregables(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Crear índices para optimización
CREATE INDEX idx_entregable_comentarios_entregable ON entregable_comentarios(entregable_id);
CREATE INDEX idx_entregable_comentarios_usuario ON entregable_comentarios(usuario_id);
CREATE INDEX idx_entregable_comentarios_tipo ON entregable_comentarios(tipo);
CREATE INDEX idx_entregable_comentarios_fecha ON entregable_comentarios(created_at);

-- Tabla creada exitosamente
-- Los comentarios de ejemplo se pueden agregar después de verificar los IDs existentes