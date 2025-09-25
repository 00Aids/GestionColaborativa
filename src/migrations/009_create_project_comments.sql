-- Migración para crear tabla de comentarios de proyectos
-- Fecha: 2024-01-24

-- TABLA: proyecto_comentarios
DROP TABLE IF EXISTS proyecto_comentarios;
CREATE TABLE proyecto_comentarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proyecto_id INT NOT NULL,
    usuario_id INT NOT NULL,
    comentario TEXT NOT NULL,
    tipo ENUM('comentario', 'sistema', 'archivo') DEFAULT 'comentario',
    archivo_adjunto JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- TABLA: entregable_comentarios
DROP TABLE IF EXISTS entregable_comentarios;
CREATE TABLE entregable_comentarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entregable_id INT NOT NULL,
    usuario_id INT NOT NULL,
    comentario TEXT NOT NULL,
    tipo ENUM('comentario', 'sistema', 'archivo') DEFAULT 'comentario',
    archivo_adjunto JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (entregable_id) REFERENCES entregables(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Índices para optimizar consultas
CREATE INDEX idx_proyecto_comentarios_proyecto ON proyecto_comentarios(proyecto_id);
CREATE INDEX idx_proyecto_comentarios_usuario ON proyecto_comentarios(usuario_id);
CREATE INDEX idx_proyecto_comentarios_fecha ON proyecto_comentarios(created_at);

CREATE INDEX idx_entregable_comentarios_entregable ON entregable_comentarios(entregable_id);
CREATE INDEX idx_entregable_comentarios_usuario ON entregable_comentarios(usuario_id);
CREATE INDEX idx_entregable_comentarios_fecha ON entregable_comentarios(created_at);