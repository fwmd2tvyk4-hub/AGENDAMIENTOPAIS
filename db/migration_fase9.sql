-- ==============================================================================
-- MIGRACIÓN FASE 9: Consentimiento de Términos y Privacidad
-- Aplica sobre la BD existente sin tocar ninguna tabla anterior.
-- ==============================================================================

-- Registra si el paciente aceptó los Términos y Condiciones y el Aviso de
-- Privacidad al momento de agendar. El backend rechaza la creación de la
-- cita si no se envía en true (ver POST /api/citas), así que en la práctica
-- toda cita nueva queda en true; el default false solo cubre filas históricas.
ALTER TABLE citas ADD COLUMN consentimiento_aceptado boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN citas.consentimiento_aceptado IS 'true si el paciente aceptó los Términos y el Aviso de Privacidad al agendar.';
