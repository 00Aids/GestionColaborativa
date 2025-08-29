-- =============================================
-- SISTEMA DE GESTIÓN ACADÉMICA - ESQUEMA DE BD
-- =============================================
-- Nota: Este archivo asume que la base de datos ya existe

-- =============================================
-- TABLA: roles
-- =============================================
CREATE TABLE IF NOT EXISTS roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    permisos JSON,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================
-- TABLA: usuarios
-- =============================================
CREATE TABLE IF NOT EXISTS usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    codigo_usuario VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    foto_perfil VARCHAR(255),
    rol_id INT NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    ultimo_acceso TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE RESTRICT
);

-- =============================================
-- TABLA: lineas_investigacion
-- =============================================
CREATE TABLE IF NOT EXISTS lineas_investigacion (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    coordinador_id INT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (coordinador_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- =============================================
-- TABLA: ciclos_academicos
-- =============================================
CREATE TABLE IF NOT EXISTS ciclos_academicos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================
-- TABLA: fases_proyecto
-- =============================================
CREATE TABLE IF NOT EXISTS fases_proyecto (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    orden INT NOT NULL,
    duracion_dias INT DEFAULT 30,
    requiere_evaluacion BOOLEAN DEFAULT TRUE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLA: proyectos
-- =============================================
CREATE TABLE IF NOT EXISTS proyectos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    objetivos TEXT,
    metodologia TEXT,
    estudiante_id INT NOT NULL,
    director_id INT,
    evaluador_id INT,
    linea_investigacion_id INT,
    ciclo_academico_id INT NOT NULL,
    fase_actual_id INT DEFAULT 1,
    estado ENUM('borrador', 'enviado', 'en_revision', 'aprobado', 'rechazado', 'en_desarrollo', 'finalizado') DEFAULT 'borrador',
    fecha_propuesta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_aprobacion TIMESTAMP NULL,
    fecha_finalizacion TIMESTAMP NULL,
    calificacion_final DECIMAL(4,2),
    observaciones_generales TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (estudiante_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    FOREIGN KEY (director_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (evaluador_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (linea_investigacion_id) REFERENCES lineas_investigacion(id) ON DELETE SET NULL,
    FOREIGN KEY (ciclo_academico_id) REFERENCES ciclos_academicos(id) ON DELETE RESTRICT,
    FOREIGN KEY (fase_actual_id) REFERENCES fases_proyecto(id) ON DELETE RESTRICT
);

-- =============================================
-- TABLA: entregables
-- =============================================
CREATE TABLE IF NOT EXISTS entregables (
    id INT PRIMARY KEY AUTO_INCREMENT,
    proyecto_id INT NOT NULL,
    fase_id INT NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    archivo_url VARCHAR(500),
    fecha_entrega TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_limite TIMESTAMP,
    estado ENUM('pendiente', 'entregado', 'revisado', 'aprobado', 'rechazado') DEFAULT 'pendiente',
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
    FOREIGN KEY (fase_id) REFERENCES fases_proyecto(id) ON DELETE RESTRICT
);

-- =============================================
-- TABLA: rubricas_evaluacion
-- =============================================
CREATE TABLE IF NOT EXISTS rubricas_evaluacion (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    criterios JSON NOT NULL,
    puntaje_maximo DECIMAL(5,2) NOT NULL,
    tipo ENUM('propuesta', 'entregable', 'final') NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================
-- TABLA: evaluaciones
-- =============================================
CREATE TABLE IF NOT EXISTS evaluaciones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    proyecto_id INT NOT NULL,
    entregable_id INT,
    evaluador_id INT NOT NULL,
    rubrica_id INT NOT NULL,
    puntajes JSON NOT NULL,
    puntaje_total DECIMAL(5,2) NOT NULL,
    observaciones TEXT,
    fecha_evaluacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('borrador', 'finalizada') DEFAULT 'borrador',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
    FOREIGN KEY (entregable_id) REFERENCES entregables(id) ON DELETE CASCADE,
    FOREIGN KEY (evaluador_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    FOREIGN KEY (rubrica_id) REFERENCES rubricas_evaluacion(id) ON DELETE RESTRICT
);

-- =============================================
-- TABLA: notificaciones
-- =============================================
CREATE TABLE IF NOT EXISTS notificaciones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    tipo ENUM('info', 'warning', 'success', 'error') DEFAULT 'info',
    leida BOOLEAN DEFAULT FALSE,
    url_accion VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- =============================================
-- TABLA: historial_proyecto
-- =============================================
CREATE TABLE IF NOT EXISTS historial_proyecto (
    id INT PRIMARY KEY AUTO_INCREMENT,
    proyecto_id INT NOT NULL,
    usuario_id INT NOT NULL,
    accion VARCHAR(100) NOT NULL,
    descripcion TEXT,
    datos_anteriores JSON,
    datos_nuevos JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

-- =============================================
-- TABLA: project_invitations
-- =============================================
CREATE TABLE IF NOT EXISTS project_invitations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    proyecto_id INT NOT NULL,
    codigo_invitacion VARCHAR(20) UNIQUE NOT NULL,
    creado_por_id INT NOT NULL,
    max_usos INT DEFAULT 1,
    usos_actuales INT DEFAULT 0,
    fecha_expiracion DATETIME NULL,
    activo BOOLEAN DEFAULT TRUE,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
    FOREIGN KEY (creado_por_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

-- =============================================
-- TABLA: project_members
-- =============================================
CREATE TABLE IF NOT EXISTS project_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    proyecto_id INT NOT NULL,
    usuario_id INT NOT NULL,
    rol_en_proyecto VARCHAR(50) DEFAULT 'miembro',
    invitacion_id INT NULL,
    fecha_union TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (invitacion_id) REFERENCES project_invitations(id) ON DELETE SET NULL,
    UNIQUE KEY unique_project_member (proyecto_id, usuario_id)
);

-- =============================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =============================================
CREATE INDEX IF NOT EXISTS idx_project_invitations_codigo ON project_invitations(codigo_invitacion);
CREATE INDEX IF NOT EXISTS idx_project_invitations_proyecto ON project_invitations(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_activo ON project_invitations(activo);
CREATE INDEX IF NOT EXISTS idx_project_members_proyecto ON project_members(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_project_members_usuario ON project_members(usuario_id);
CREATE INDEX IF NOT EXISTS idx_project_members_activo ON project_members(activo);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_codigo ON usuarios(codigo_usuario);
CREATE INDEX IF NOT EXISTS idx_proyectos_estudiante ON proyectos(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_director ON proyectos(director_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_evaluador ON proyectos(evaluador_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_estado ON proyectos(estado);
CREATE INDEX IF NOT EXISTS idx_entregables_proyecto ON entregables(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_proyecto ON evaluaciones(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON notificaciones(leida);