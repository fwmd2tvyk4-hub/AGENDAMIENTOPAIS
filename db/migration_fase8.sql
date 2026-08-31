-- ==============================================================================
-- MIGRACIÓN FASE 8: Login con usuario + Auditoría de cancelaciones
-- Aplica sobre la BD existente sin tocar ninguna tabla anterior.
-- ==============================================================================

-- 1. Tabla de administradores
-- Cada fila es un usuario del panel. Las contraseñas se guardan hasheadas
-- con bcrypt — nunca en texto plano.
CREATE TABLE admin_users (
    id              serial          PRIMARY KEY,
    username        varchar(100)    NOT NULL UNIQUE,
    password_hash   varchar(255)    NOT NULL,
    activo          boolean         NOT NULL DEFAULT true,
    creado_en       timestamptz     NOT NULL DEFAULT now()
);
COMMENT ON TABLE admin_users IS 'Usuarios del panel de administración. Contraseñas en bcrypt.';
COMMENT ON COLUMN admin_users.activo IS 'Permite desactivar un admin sin borrar su historial de auditoría.';

-- 2. Tabla de auditoría
-- Registra acciones administrativas. Está diseñada para tipos de acción
-- múltiples (no solo cancelaciones) usando la columna "accion" como
-- discriminador de texto libre. El campo "metadata" (jsonb) permite adjuntar
-- datos extra específicos de cada tipo de acción sin alterar el esquema.
CREATE TABLE audit_log (
    id              serial          PRIMARY KEY,
    admin_user_id   integer         REFERENCES admin_users(id) ON DELETE SET NULL,
    admin_username  varchar(100)    NOT NULL,   -- copia desnormalizada; sobrevive si el admin se borra
    accion          varchar(100)    NOT NULL,   -- ej. 'cancelar_cita', 'bloquear_dia'
    cita_id         integer         REFERENCES citas(id) ON DELETE SET NULL,  -- null si la cita se borra
    motivo_admin    text,                       -- razón escrita por el admin; null si no la escribió
    metadata        jsonb,                      -- datos extra específicos del tipo de acción
    creado_en       timestamptz     NOT NULL DEFAULT now()
);
COMMENT ON TABLE audit_log IS 'Registro inmutable de acciones realizadas por administradores.';
COMMENT ON COLUMN audit_log.admin_username IS 'Nombre de usuario copiado en el momento de la acción. Persiste aunque el admin se elimine.';
COMMENT ON COLUMN audit_log.accion IS 'Tipo de acción: cancelar_cita, bloquear_dia, etc.';
COMMENT ON COLUMN audit_log.metadata IS 'Datos adicionales en JSON según el tipo de acción.';

-- Índices para las consultas más frecuentes del panel de historial
CREATE INDEX idx_audit_log_creado_en    ON audit_log (creado_en DESC);
CREATE INDEX idx_audit_log_admin        ON audit_log (admin_user_id);
CREATE INDEX idx_audit_log_cita         ON audit_log (cita_id);
CREATE INDEX idx_audit_log_accion       ON audit_log (accion);
