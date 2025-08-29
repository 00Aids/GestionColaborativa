-- Crear tabla de invitaciones
CREATE TABLE IF NOT EXISTS invitaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proyecto_id INT NOT NULL,
    usuario_id INT NULL, -- NULL si es invitación por email
    email VARCHAR(255) NULL, -- Para invitaciones por email
    codigo_invitacion VARCHAR(32) UNIQUE NOT NULL,
    invitado_por INT NOT NULL,
    estado ENUM('pendiente', 'aceptada', 'rechazada', 'expirada') DEFAULT 'pendiente',
    fecha_expiracion DATETIME NOT NULL,
    fecha_aceptacion DATETIME NULL,
    fecha_rechazo DATETIME NULL,
    mensaje TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (invitado_por) REFERENCES usuarios(id) ON DELETE CASCADE,
    
    INDEX idx_proyecto_id (proyecto_id),
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_codigo_invitacion (codigo_invitacion),
    INDEX idx_estado (estado),
    INDEX idx_fecha_expiracion (fecha_expiracion)
);