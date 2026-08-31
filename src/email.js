/**
 * FASE 4: Módulo de Envíos de Correo con Resend
 * 
 * Envía correos de confirmación al paciente y notificaciones a la clínica.
 * Diseñado con manejo de errores try/catch silencioso para garantizar 
 * que NINGÚN fallo en el envío tumbe el guardado de la cita en la BD.
 */

const { Resend } = require('resend');

// Inicializar cliente Resend solo si existe la API Key
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Formatea un timestamp ISO UTC a formato amigable en español / hora Panamá
 */
function formatearFechaHoraPanama(isoString) {
    const dateObj = new Date(isoString);
    
    const fechaStr = dateObj.toLocaleDateString('es-PA', {
        timeZone: 'America/Panama',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const horaStr = dateObj.toLocaleTimeString('es-PA', {
        timeZone: 'America/Panama',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    return `${fechaStr} a las ${horaStr}`;
}

/**
 * Enviar correo de confirmación al paciente con enlace de cancelación
 */
async function enviarCorreoConfirmacionPaciente({ correo, nombre, fechaHoraUtc, tokenCancelacion }) {
    if (!resend) {
        console.warn('⚠️ RESEND_API_KEY no configurada en .env. Se omite envío de correo al paciente.');
        return;
    }

    const publicUrl = process.env.PUBLIC_URL || 'http://localhost:3000';
    const linkCancelacion = `${publicUrl}/cancelar.html?token=${tokenCancelacion}`;
    const fechaHoraFormateada = formatearFechaHoraPanama(fechaHoraUtc);
    const emailFrom = process.env.EMAIL_FROM || 'Pragma Citas <onboarding@resend.dev>';

    try {
        await resend.emails.send({
            from: emailFrom,
            to: [correo],
            subject: 'Confirmación de Cita - Pragma AI Studio',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #0A2231; border: 1px solid #E2E8F0; border-radius: 8px; padding: 24px; background-color: #ffffff;">
                    <h2 style="color: #00C3DE; margin-top: 0;">¡Tu cita está confirmada!</h2>
                    <p style="font-size: 16px;">Hola <strong>${nombre}</strong>,</p>
                    <p style="font-size: 15px; color: #4A5568;">Hemos agendado tu cita exitosamente. A continuación encuentras los detalles:</p>
                    
                    <div style="background-color: #F2F6F7; padding: 18px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #00C3DE;">
                        <p style="margin: 6px 0; font-size: 15px;"><strong>📅 Fecha y Hora:</strong> ${fechaHoraFormateada}</p>
                        <p style="margin: 6px 0; font-size: 15px;"><strong>📍 Ubicación:</strong> Pragma AI Studio — Plaza Costa del Este, Ciudad de Panamá</p>
                    </div>

                    <p style="font-size: 14px; color: #718096; margin-top: 24px;">Si no puedes asistir o necesitas cancelar tu cita, puedes hacerlo presionando el siguiente botón:</p>
                    <p style="text-align: center; margin: 24px 0;">
                        <a href="${linkCancelacion}" style="background-color: #0A2231; color: #00C3DE; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 14px;">
                            Cancelar mi Cita
                        </a>
                    </p>
                    <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 28px 0 16px 0;">
                    <p style="font-size: 12px; color: #A0AEC0; text-align: center;">Pragma AI Studio — Automatización Inteligente de Procesos</p>
                </div>
            `
        });
        console.log(`✉️ Correo de confirmación enviado a ${correo}`);
    } catch (err) {
        console.error('❌ Fallo al enviar correo al paciente (la cita sigue registrada):', err.message);
    }
}

/**
 * Enviar aviso a la clínica cuando entra una nueva cita
 */
async function enviarAvisoClinica({ nombre, telefono, correo, motivo, fechaHoraUtc }) {
    if (!resend) {
        console.warn('⚠️ RESEND_API_KEY no configurada en .env. Se omite aviso a la clínica.');
        return;
    }

    const clinicaEmail = process.env.CLINICA_EMAIL || 'clinica@pragma.ai';
    const fechaHoraFormateada = formatearFechaHoraPanama(fechaHoraUtc);
    const emailFrom = process.env.EMAIL_FROM || 'Pragma Citas <onboarding@resend.dev>';

    try {
        await resend.emails.send({
            from: emailFrom,
            to: [clinicaEmail],
            subject: `🚨 Nueva Cita: ${nombre}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #0A2231; padding: 20px; border: 1px solid #CBD5E0; border-radius: 8px;">
                    <h3 style="color: #0A2231; margin-top: 0;">Se ha registrado una nueva cita</h3>
                    <ul style="line-height: 1.8; font-size: 15px;">
                        <li><strong>Paciente:</strong> ${nombre}</li>
                        <li><strong>Teléfono:</strong> +507 ${telefono}</li>
                        <li><strong>Correo:</strong> ${correo}</li>
                        <li><strong>Fecha y Hora:</strong> ${fechaHoraFormateada}</li>
                        <li><strong>Motivo:</strong> ${motivo || 'No especificado'}</li>
                    </ul>
                </div>
            `
        });
        console.log(`✉️ Notificación enviada a la clínica (${clinicaEmail})`);
    } catch (err) {
        console.error('❌ Fallo al enviar notificación a la clínica:', err.message);
    }
}

module.exports = {
    enviarCorreoConfirmacionPaciente,
    enviarAvisoClinica,
    formatearFechaHoraPanama
};
