/**
 * Motor de traducción ES/EN (client-side) para las páginas públicas.
 * Pragma AI Studio
 */
(function () {
    const TRANSLATIONS = {
        es: {
            'brand.subtitle.booking': 'Demo de Agendamiento',
            'brand.subtitle.cancel': 'Cancelación de Cita',

            'booking.title': 'Reserva tu cita',
            'booking.desc': 'Selecciona el día y la hora de tu preferencia para agendar con nuestro equipo.',
            'booking.prevWeek': '← Anterior',
            'booking.nextWeek': 'Siguiente →',
            'booking.weekLoading': 'Cargando disponibilidad de la semana...',
            'booking.slotsLabel': 'Horarios libres para el día seleccionado:',
            'booking.formTitle': 'Completa tus datos',
            'booking.nombreLabel': 'Nombre y Apellido *',
            'booking.nombrePlaceholder': 'Ej. Carlos Pérez',
            'booking.telefonoLabel': 'Teléfono de Panamá *',
            'booking.telefonoPlaceholder': 'Ej. 66112233',
            'booking.telefonoHint': 'Número móvil o fijo de Panamá (8 dígitos).',
            'booking.correoLabel': 'Correo Electrónico *',
            'booking.correoPlaceholder': 'ejemplo@correo.com',
            'booking.correoHint': 'Te enviaremos la confirmación y el enlace directo de cancelación a este correo.',
            'booking.motivoLabel': 'Motivo de la cita (Opcional)',
            'booking.motivoPlaceholder': 'Cuéntanos brevemente sobre tu consulta...',
            'booking.submit': 'Confirmar y Agendar Cita',

            'confirmation.title': '¡Cita Agendada con Éxito!',
            'confirmation.desc': 'Hemos enviado el correo de confirmación con los detalles y el link de cancelación.',
            'confirmation.paciente': 'Paciente',
            'confirmation.fechaHora': 'Fecha y Hora',
            'confirmation.ubicacion': 'Ubicación',
            'confirmation.ubicacionValor': 'Plaza Costa del Este, Panamá',
            'confirmation.otraCita': 'Agendar otra cita',

            'cancel.title': '¿Deseas cancelar tu cita?',
            'cancel.desc': 'Al confirmar, la cita quedará anulada y el cupo se liberará inmediatamente para otros pacientes.',
            'cancel.confirmBtn': 'Sí, Cancelar mi Cita',
            'cancel.backLink': 'Volver a la página principal',
            'cancel.successTitle': 'Cita Cancelada',
            'cancel.successDesc': 'Tu cita ha sido liberada correctamente. Gracias por avisarnos.',
            'cancel.newAppointment': 'Agendar una nueva cita',

            'footer.text': '© 2026 Pragma AI Studio. Automatización Inteligente de Procesos.',
            'footer.terms': 'Términos y Condiciones',
            'footer.privacy': 'Aviso de Privacidad',
            'footer.contact': 'Contacto: pragma.pa@gmail.com',

            'consent.prefix': 'He leído y acepto los',
            'consent.and': 'y el',

            'legal.backLink': '← Volver a la página principal',

            'terms.pageTitle': 'Términos y Condiciones | Pragma AI Studio',
            'terms.title': 'Términos y Condiciones',
            'terms.updated': 'Última actualización: enero de 2026',
            'terms.s1.h': '1. Aceptación de los Términos',
            'terms.s1.p': 'Al acceder y utilizar este sitio para agendar o cancelar una cita, aceptas quedar sujeto a estos Términos y Condiciones. Si no estás de acuerdo con alguno de ellos, te pedimos no utilizar el sitio.',
            'terms.s2.h': '2. Descripción del Servicio',
            'terms.s2.p': 'Este sitio es una plataforma de agendamiento de citas operada por Pragma AI Studio. Permite seleccionar un horario disponible, registrar tus datos de contacto y recibir confirmación por correo electrónico, así como cancelar una cita mediante un enlace personal.',
            'terms.s3.h': '3. Uso Apropiado del Sitio',
            'terms.s3.p': 'Te comprometes a usar el sitio de forma lícita, proporcionando información veraz y exacta al agendar una cita. Está prohibido usar el sitio para fines fraudulentos, para saturar el sistema con reservas falsas, o para intentar vulnerar su seguridad.',
            'terms.s4.h': '4. Citas y Cancelaciones',
            'terms.s4.p': 'La disponibilidad de horarios se muestra en tiempo real y puede cambiar sin previo aviso. Puedes cancelar tu cita en cualquier momento usando el enlace enviado a tu correo; al cancelar, el cupo se libera de inmediato para otros pacientes. Nos reservamos el derecho de reprogramar o cancelar citas por causas operativas, notificándote por los medios de contacto proporcionados.',
            'terms.s5.h': '5. Responsabilidad Limitada',
            'terms.s5.p': 'El servicio se ofrece "tal cual" y "según disponibilidad". No garantizamos que el sitio esté libre de interrupciones o errores. En la máxima medida permitida por la ley, Pragma AI Studio no será responsable por daños indirectos derivados del uso o la imposibilidad de uso del sitio.',
            'terms.s6.h': '6. Propiedad Intelectual',
            'terms.s6.p': 'El contenido, diseño, logotipos y marca de este sitio son propiedad de Pragma AI Studio y no pueden reproducirse ni utilizarse sin autorización previa por escrito.',
            'terms.s7.h': '7. Ley Aplicable y Jurisdicción',
            'terms.s7.p': 'Este sitio está dirigido principalmente a usuarios ubicados en Panamá. Independientemente del país desde el cual accedas o utilices el sitio, estos Términos se rigen e interpretan conforme a las leyes de la República de Panamá, y cualquier controversia relacionada con su uso será sometida a los tribunales competentes de Panamá, sin perjuicio de los derechos de protección al consumidor que puedan corresponderte de forma imperativa en tu país de residencia.',
            'terms.s8.h': '8. Modificaciones a estos Términos',
            'terms.s8.p': 'Podemos actualizar estos Términos en cualquier momento. Los cambios entran en vigor al publicarse en esta página, indicando la fecha de última actualización.',
            'terms.s9.h': '9. Contacto',
            'terms.s9.p': 'Si tienes preguntas sobre estos Términos, escríbenos a pragma.pa@gmail.com.',

            'privacy.pageTitle': 'Aviso de Privacidad | Pragma AI Studio',
            'privacy.title': 'Aviso de Privacidad',
            'privacy.updated': 'Última actualización: enero de 2026',
            'privacy.s1.h': '1. Responsable del Tratamiento',
            'privacy.s1.p': 'Pragma AI Studio es responsable del tratamiento de los datos personales que recopilamos a través de este sitio, utilizados exclusivamente para el agendamiento de citas.',
            'privacy.s2.h': '2. Datos que Recopilamos',
            'privacy.s2.p': 'Al agendar una cita recopilamos: nombre completo, número de teléfono, correo electrónico y, opcionalmente, el motivo de tu consulta. No recopilamos datos financieros ni de salud a través de este formulario.',
            'privacy.s3.h': '3. Finalidad del Tratamiento',
            'privacy.s3.p': 'Usamos tus datos únicamente para: confirmar y gestionar tu cita, enviarte notificaciones relacionadas (confirmación, enlace de cancelación) y permitir a nuestro equipo prepararse para tu visita. No usamos tus datos con fines publicitarios ni los vendemos a terceros.',
            'privacy.s4.h': '4. Base Legal y Consentimiento',
            'privacy.s4.p': 'Al completar el formulario de agendamiento y marcar la casilla de aceptación, otorgas tu consentimiento expreso para el tratamiento de tus datos personales conforme a este Aviso.',
            'privacy.s5.h': '5. Conservación de los Datos',
            'privacy.s5.p': 'Conservamos tus datos de contacto y el historial de citas durante el tiempo necesario para cumplir con la finalidad indicada y con nuestras obligaciones administrativas, y los eliminamos o anonimizamos cuando ya no son necesarios.',
            'privacy.s6.h': '6. Tus Derechos',
            'privacy.s6.p': 'De acuerdo con la Ley 81 de 2019 sobre Protección de Datos Personales de Panamá, tienes derecho a acceder, rectificar, cancelar o oponerte al tratamiento de tus datos personales (derechos ARCO). Para ejercerlos, escríbenos a pragma.pa@gmail.com.',
            'privacy.s7.h': '7. Visitantes Fuera de Panamá',
            'privacy.s7.p': 'Este sitio está dirigido principalmente a usuarios ubicados en Panamá y sus datos se almacenan y procesan conforme a la legislación panameña. Si accedes desde otro país (por ejemplo, Estados Unidos o la Unión Europea) y deseas ejercer derechos adicionales que te correspondan bajo tu legislación local (como GDPR o CCPA), puedes contactarnos a pragma.pa@gmail.com y atenderemos tu solicitud en la medida en que sea razonablemente aplicable.',
            'privacy.s8.h': '8. Terceros que Procesan tus Datos',
            'privacy.s8.p': 'Usamos proveedores externos para operar el servicio: Resend para el envío de correos de confirmación, y un proveedor de hospedaje (Railway) para la base de datos y el alojamiento del sitio. Estos proveedores procesan tus datos únicamente en la medida necesaria para prestar dichos servicios.',
            'privacy.s9.h': '9. Cookies y Almacenamiento Local',
            'privacy.s9.p': 'Este sitio no utiliza cookies de rastreo ni analítica de terceros. Solo guardamos tu preferencia de idioma (español/inglés) en el almacenamiento local de tu navegador (localStorage), que permanece únicamente en tu dispositivo.',
            'privacy.s10.h': '10. Seguridad de la Información',
            'privacy.s10.p': 'Aplicamos medidas técnicas razonables (conexión cifrada, encabezados de seguridad y control de acceso) para proteger tus datos frente a accesos no autorizados.',
            'privacy.s11.h': '11. Cambios a este Aviso',
            'privacy.s11.p': 'Podemos actualizar este Aviso de Privacidad periódicamente. Cualquier cambio se publicará en esta página junto con su fecha de actualización.',
            'privacy.s12.h': '12. Contacto',
            'privacy.s12.p': 'Para consultas sobre este Aviso o sobre tus datos personales, escríbenos a pragma.pa@gmail.com.',

            'js.weekLoadingShort': 'Cargando disponibilidad...',
            'js.weekLoadError': 'No se pudieron cargar los horarios. Intenta recargar la página.',
            'js.noDaysAvailable': 'Sin días disponibles',
            'js.noSlotsAvailable': 'No hay horarios disponibles para el día seleccionado.',
            'js.selectSlotFirst': 'Por favor selecciona una hora disponible.',
            'js.invalidPhone': 'El teléfono debe ser un número válido de Panamá (8 dígitos).',
            'js.booking': 'Agendando tu cita...',
            'js.bookingFailed': 'No se pudo agendar la cita.',
            'js.dateTimeJoiner': ' a las ',
            'js.invalidCancelLink': 'Enlace de cancelación inválido o incompleto (falta el token).',
            'js.cancelling': 'Procesando cancelación...',
            'js.cancelFailed': 'Error al cancelar la cita',
            'js.consentRequired': 'Debes aceptar los Términos y Condiciones y el Aviso de Privacidad para continuar.'
        },
        en: {
            'brand.subtitle.booking': 'Booking Demo',
            'brand.subtitle.cancel': 'Cancel Appointment',

            'booking.title': 'Book your appointment',
            'booking.desc': 'Pick the day and time that work best for you to schedule with our team.',
            'booking.prevWeek': '← Previous',
            'booking.nextWeek': 'Next →',
            'booking.weekLoading': 'Loading weekly availability...',
            'booking.slotsLabel': 'Available times for the selected day:',
            'booking.formTitle': 'Complete your details',
            'booking.nombreLabel': 'Full Name *',
            'booking.nombrePlaceholder': 'E.g. Carlos Pérez',
            'booking.telefonoLabel': 'Panama Phone Number *',
            'booking.telefonoPlaceholder': 'E.g. 66112233',
            'booking.telefonoHint': 'Panama mobile or landline number (8 digits).',
            'booking.correoLabel': 'Email Address *',
            'booking.correoPlaceholder': 'example@email.com',
            'booking.correoHint': "We'll send the confirmation and the direct cancellation link to this email.",
            'booking.motivoLabel': 'Reason for the appointment (Optional)',
            'booking.motivoPlaceholder': 'Briefly tell us about your inquiry...',
            'booking.submit': 'Confirm and Book Appointment',

            'confirmation.title': 'Appointment Booked Successfully!',
            'confirmation.desc': "We've sent a confirmation email with the details and cancellation link.",
            'confirmation.paciente': 'Patient',
            'confirmation.fechaHora': 'Date and Time',
            'confirmation.ubicacion': 'Location',
            'confirmation.ubicacionValor': 'Plaza Costa del Este, Panama',
            'confirmation.otraCita': 'Book another appointment',

            'cancel.title': 'Do you want to cancel your appointment?',
            'cancel.desc': 'Once confirmed, the appointment will be cancelled and the slot will be immediately released for other patients.',
            'cancel.confirmBtn': 'Yes, Cancel My Appointment',
            'cancel.backLink': 'Back to the main page',
            'cancel.successTitle': 'Appointment Cancelled',
            'cancel.successDesc': 'Your appointment has been successfully released. Thanks for letting us know.',
            'cancel.newAppointment': 'Book a new appointment',

            'footer.text': '© 2026 Pragma AI Studio. Smart Process Automation.',
            'footer.terms': 'Terms and Conditions',
            'footer.privacy': 'Privacy Notice',
            'footer.contact': 'Contact: pragma.pa@gmail.com',

            'consent.prefix': 'I have read and accept the',
            'consent.and': 'and the',

            'legal.backLink': '← Back to the main page',

            'terms.pageTitle': 'Terms and Conditions | Pragma AI Studio',
            'terms.title': 'Terms and Conditions',
            'terms.updated': 'Last updated: January 2026',
            'terms.s1.h': '1. Acceptance of Terms',
            'terms.s1.p': 'By accessing and using this site to book or cancel an appointment, you agree to be bound by these Terms and Conditions. If you do not agree with any part of them, please do not use the site.',
            'terms.s2.h': '2. Service Description',
            'terms.s2.p': 'This site is an appointment booking platform operated by Pragma AI Studio. It lets you select an available time slot, register your contact details, and receive an email confirmation, as well as cancel an appointment through a personal link.',
            'terms.s3.h': '3. Appropriate Use of the Site',
            'terms.s3.p': 'You agree to use the site lawfully, providing truthful and accurate information when booking an appointment. Using the site for fraudulent purposes, to flood the system with fake bookings, or to attempt to compromise its security is prohibited.',
            'terms.s4.h': '4. Appointments and Cancellations',
            'terms.s4.p': 'Time slot availability is shown in real time and may change without notice. You may cancel your appointment at any time using the link sent to your email; upon cancellation, the slot is immediately released for other patients. We reserve the right to reschedule or cancel appointments for operational reasons, notifying you through the contact details provided.',
            'terms.s5.h': '5. Limited Liability',
            'terms.s5.p': 'The service is provided "as is" and "as available". We do not guarantee that the site will be free of interruptions or errors. To the maximum extent permitted by law, Pragma AI Studio will not be liable for indirect damages arising from the use or inability to use the site.',
            'terms.s6.h': '6. Intellectual Property',
            'terms.s6.p': 'The content, design, logos, and brand of this site are the property of Pragma AI Studio and may not be reproduced or used without prior written authorization.',
            'terms.s7.h': '7. Governing Law and Jurisdiction',
            'terms.s7.p': 'This site is primarily aimed at users located in Panama. Regardless of the country from which you access or use the site, these Terms are governed by and interpreted in accordance with the laws of the Republic of Panama, and any dispute related to their use will be submitted to the competent courts of Panama, without prejudice to any consumer-protection rights that may mandatorily apply to you under your country of residence.',
            'terms.s8.h': '8. Changes to these Terms',
            'terms.s8.p': 'We may update these Terms at any time. Changes take effect upon publication on this page, indicating the last-updated date.',
            'terms.s9.h': '9. Contact',
            'terms.s9.p': 'If you have questions about these Terms, write to us at pragma.pa@gmail.com.',

            'privacy.pageTitle': 'Privacy Notice | Pragma AI Studio',
            'privacy.title': 'Privacy Notice',
            'privacy.updated': 'Last updated: January 2026',
            'privacy.s1.h': '1. Data Controller',
            'privacy.s1.p': 'Pragma AI Studio is the controller responsible for the personal data we collect through this site, used exclusively for appointment booking.',
            'privacy.s2.h': '2. Data We Collect',
            'privacy.s2.p': 'When you book an appointment we collect: full name, phone number, email address, and, optionally, the reason for your inquiry. We do not collect financial or health data through this form.',
            'privacy.s3.h': '3. Purpose of Processing',
            'privacy.s3.p': "We use your data solely to: confirm and manage your appointment, send you related notifications (confirmation, cancellation link), and allow our team to prepare for your visit. We do not use your data for advertising purposes nor sell it to third parties.",
            'privacy.s4.h': '4. Legal Basis and Consent',
            'privacy.s4.p': 'By completing the booking form and checking the acceptance box, you give your express consent for the processing of your personal data in accordance with this Notice.',
            'privacy.s5.h': '5. Data Retention',
            'privacy.s5.p': 'We retain your contact details and appointment history for as long as necessary to fulfill the stated purpose and our administrative obligations, and delete or anonymize it when no longer needed.',
            'privacy.s6.h': '6. Your Rights',
            'privacy.s6.p': "Under Panama's Law 81 of 2019 on Personal Data Protection, you have the right to access, rectify, cancel, or object to the processing of your personal data. To exercise these rights, write to us at pragma.pa@gmail.com.",
            'privacy.s7.h': '7. Visitors Outside Panama',
            'privacy.s7.p': 'This site is primarily aimed at users located in Panama, and your data is stored and processed in accordance with Panamanian law. If you access it from another country (for example, the United States or the European Union) and wish to exercise additional rights available under your local law (such as GDPR or CCPA), you may contact us at pragma.pa@gmail.com and we will address your request to the extent reasonably applicable.',
            'privacy.s8.h': '8. Third Parties That Process Your Data',
            'privacy.s8.p': 'We use external providers to operate the service: Resend for sending confirmation emails, and a hosting provider (Railway) for the database and site hosting. These providers process your data only to the extent necessary to provide those services.',
            'privacy.s9.h': '9. Cookies and Local Storage',
            'privacy.s9.p': "This site does not use tracking cookies or third-party analytics. We only store your language preference (Spanish/English) in your browser's local storage (localStorage), which stays solely on your device.",
            'privacy.s10.h': '10. Information Security',
            'privacy.s10.p': 'We apply reasonable technical measures (encrypted connection, security headers, and access control) to protect your data from unauthorized access.',
            'privacy.s11.h': '11. Changes to this Notice',
            'privacy.s11.p': 'We may update this Privacy Notice periodically. Any changes will be published on this page along with the update date.',
            'privacy.s12.h': '12. Contact',
            'privacy.s12.p': 'For questions about this Notice or your personal data, write to us at pragma.pa@gmail.com.',

            'js.weekLoadingShort': 'Loading availability...',
            'js.weekLoadError': 'We could not load the time slots. Try reloading the page.',
            'js.noDaysAvailable': 'No days available',
            'js.noSlotsAvailable': 'No time slots available for the selected day.',
            'js.selectSlotFirst': 'Please select an available time.',
            'js.invalidPhone': 'The phone number must be a valid Panama number (8 digits).',
            'js.booking': 'Booking your appointment...',
            'js.bookingFailed': 'We could not book the appointment.',
            'js.dateTimeJoiner': ' at ',
            'js.invalidCancelLink': 'Invalid or incomplete cancellation link (missing token).',
            'js.cancelling': 'Processing cancellation...',
            'js.cancelFailed': 'Error cancelling the appointment',
            'js.consentRequired': 'You must accept the Terms and Conditions and the Privacy Notice to continue.'
        }
    };

    const LOCALE_TAGS = { es: 'es-PA', en: 'en-US' };
    const STORAGE_KEY = 'pragma_lang';

    const getLang = () => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored === 'es' || stored === 'en') return stored;
        } catch (_) { /* localStorage no disponible */ }
        return 'en';
    };

    const t = (key) => {
        const lang = getLang();
        return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS.es[key] || key;
    };

    const applyStaticTranslations = () => {
        const lang = getLang();
        document.documentElement.lang = lang;

        document.querySelectorAll('[data-i18n]').forEach((el) => {
            el.textContent = t(el.getAttribute('data-i18n'));
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
            el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
        });

        document.querySelectorAll('[data-lang-opt]').forEach((el) => {
            el.classList.toggle('active', el.getAttribute('data-lang-opt') === lang);
        });

        const toggleBtn = document.getElementById('langToggle');
        if (toggleBtn) {
            toggleBtn.classList.toggle('lang-toggle-en', lang === 'en');
        }
    };

    const setLang = (lang) => {
        if (lang !== 'es' && lang !== 'en') return;
        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch (_) { /* localStorage no disponible */ }
        applyStaticTranslations();
        document.dispatchEvent(new CustomEvent('pragma:langchange', { detail: { lang } }));
    };

    window.PragmaI18n = {
        t,
        getLang,
        setLang,
        applyStaticTranslations,
        get LOCALE_TAG() { return LOCALE_TAGS[getLang()]; }
    };

    document.addEventListener('DOMContentLoaded', () => {
        applyStaticTranslations();
        const toggleBtn = document.getElementById('langToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                setLang(getLang() === 'es' ? 'en' : 'es');
            });
        }
    });
})();
