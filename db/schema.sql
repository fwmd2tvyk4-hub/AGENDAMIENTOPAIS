-- ==============================================================================
-- FASE 1: ESQUEMA DE BASE DE DATOS
-- ==============================================================================

-- 1. Tabla de configuración (Singleton real)
-- Usamos 'boolean PRIMARY KEY DEFAULT true CHECK (id)' para garantizar que 
-- NUNCA pueda existir más de una fila en esta tabla.
CREATE TABLE configuracion (
    id boolean PRIMARY KEY DEFAULT true CHECK (id),
    duracion_minutos integer NOT NULL DEFAULT 30,
    anticipacion_minima_horas integer NOT NULL DEFAULT 2,
    ventana_dias integer NOT NULL DEFAULT 30
);
COMMENT ON TABLE configuracion IS 'Configuración global del sistema. Solo permite 1 fila (Singleton real).';

INSERT INTO configuracion (id, duracion_minutos, anticipacion_minima_horas, ventana_dias) 
VALUES (true, 30, 2, 30);

-- 2. Tabla de horarios de atención
-- Permite múltiples bloques por día (ej. para el almuerzo).
-- dia_semana: 0=Domingo, 6=Sábado (convención estándar `extract(dow)` de Postgres y JS).
CREATE TABLE horario_atencion (
    id serial PRIMARY KEY,
    dia_semana integer NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6),
    hora_inicio time NOT NULL,
    hora_fin time NOT NULL CHECK (hora_fin > hora_inicio),
    activo boolean NOT NULL DEFAULT true
);
COMMENT ON TABLE horario_atencion IS 'Bloques de atención. Varias filas por día permiten intervalos como el almuerzo.';

-- Datos de ejemplo iniciales (Lunes a Viernes, 8:00 a 12:00 y 13:00 a 17:00)
INSERT INTO horario_atencion (dia_semana, hora_inicio, hora_fin) VALUES 
    (1, '08:00', '12:00'), (1, '13:00', '17:00'),
    (2, '08:00', '12:00'), (2, '13:00', '17:00'),
    (3, '08:00', '12:00'), (3, '13:00', '17:00'),
    (4, '08:00', '12:00'), (4, '13:00', '17:00'),
    (5, '08:00', '12:00'), (5, '13:00', '17:00');

-- 3. Tabla de días bloqueados (feriados o vacaciones)
CREATE TABLE dias_bloqueados (
    id serial PRIMARY KEY,
    fecha date NOT NULL UNIQUE,
    motivo varchar(255)
);
COMMENT ON TABLE dias_bloqueados IS 'Días completos sin atención. Tiene prioridad absoluta sobre el horario.';

-- 4. Tabla principal de Citas
CREATE TABLE citas (
    id serial PRIMARY KEY,
    fecha_hora_inicio timestamptz NOT NULL, -- UTC estricto
    nombre_paciente varchar(255) NOT NULL,
    telefono varchar(20) NOT NULL,
    correo varchar(255) NOT NULL,
    motivo text,
    estado varchar(50) NOT NULL DEFAULT 'programada' CHECK (estado IN ('programada', 'cancelada')),
    token_cancelacion varchar(100) NOT NULL UNIQUE,
    creada_en timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE citas IS 'Registro de las citas agendadas por los pacientes.';

-- ==============================================================================
-- RESTRICCIONES E ÍNDICES CRÍTICOS
-- ==============================================================================

-- ELIMINADOR DE RACE CONDITIONS (DOBLE RESERVA)
-- Un índice único parcial. Garantiza que en la base de datos NUNCA existan 
-- dos citas con el mismo 'fecha_hora_inicio' cuyo estado sea 'programada'.
-- Al cancelar una cita, su estado cambia a 'cancelada' y el cupo se libera 
-- instantáneamente para que otro lo tome.
CREATE UNIQUE INDEX idx_citas_activas_unica_hora 
ON citas (fecha_hora_inicio) 
WHERE estado = 'programada';
COMMENT ON INDEX idx_citas_activas_unica_hora IS 'Previene el overbooking. Solo una cita activa por slot de tiempo.';

-- Índices adicionales para rendimiento
CREATE INDEX idx_citas_rango_fechas ON citas (fecha_hora_inicio);
CREATE INDEX idx_citas_token ON citas (token_cancelacion);
