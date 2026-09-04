/**
 * FASE 5 + Bug Fix: Lógica del Frontend de Agendamiento Público
 * Pragma AI Studio
 */

document.addEventListener('DOMContentLoaded', () => {
    const weekSelector = document.getElementById('weekSelector');
    const slotsGrid = document.getElementById('slotsGrid');
    const appointmentForm = document.getElementById('appointmentForm');
    const selectedUtcInput = document.getElementById('selectedUtcSlot');
    const alertBox = document.getElementById('alertBox');
    const bookingView = document.getElementById('bookingView');
    const confirmationScreen = document.getElementById('confirmationScreen');
    const submitBtn = document.getElementById('submitBtn');
    const btnPrevWeek = document.getElementById('btnPrevWeek');
    const btnNextWeek = document.getElementById('btnNextWeek');
    const weekRangeLabel = document.getElementById('weekRangeLabel');

    const confNombre = document.getElementById('confNombre');
    const confFechaHora = document.getElementById('confFechaHora');
    const btnAgendarOtraCita = document.getElementById('btnAgendarOtraCita');

    // Movido de onclick inline en el HTML: el CSP de Helmet (script-src 'self',
    // sin 'unsafe-inline') bloquea los handlers inline.
    btnAgendarOtraCita.addEventListener('click', () => window.location.reload());

    let datosSemana = [];
    let diaSeleccionadoYMD = null;
    let slotSeleccionadoUtc = null;
    let offsetSemana = 0;   // días desde hoy que empieza la semana visible
    let ventanaDias = 30;   // se sobreescribe al cargar config

    // Fecha de hoy en Panamá YYYY-MM-DD
    const obtenerFechaHoyPanama = () => {
        const ahora = new Date();
        const offsetPanama = ahora.getTime() - (5 * 60 * 60 * 1000);
        return new Date(offsetPanama).toISOString().split('T')[0];
    };

    // Sumar n días a un string YYYY-MM-DD
    const sumarDias = (ymd, n) => {
        const [y, m, d] = ymd.split('-').map(Number);
        const date = new Date(Date.UTC(y, m - 1, d));
        date.setUTCDate(date.getUTCDate() + n);
        return date.toISOString().split('T')[0];
    };

    const actualizarBotones = () => {
        btnPrevWeek.disabled = offsetSemana <= 0;
        // Deshabilitar "siguiente" si la próxima semana empezaría en o después del límite
        btnNextWeek.disabled = (offsetSemana + 7) >= ventanaDias;
    };

    const actualizarLabel = () => {
        if (datosSemana.length === 0) {
            weekRangeLabel.textContent = 'Sin días disponibles';
            return;
        }
        const primera = datosSemana[0].fecha;
        const ultima = datosSemana[datosSemana.length - 1].fecha;
        const [y1, m1, d1] = primera.split('-').map(Number);
        const [y2, m2, d2] = ultima.split('-').map(Number);
        const opts = { day: 'numeric', month: 'short', timeZone: 'UTC' };
        const f1 = new Date(Date.UTC(y1, m1 - 1, d1, 12)).toLocaleDateString('es-PA', opts);
        const f2 = new Date(Date.UTC(y2, m2 - 1, d2, 12)).toLocaleDateString('es-PA', opts);
        weekRangeLabel.textContent = `${f1} — ${f2}`;
    };

    // Cargar ventana_dias desde el backend
    const cargarConfig = async () => {
        try {
            const res = await fetch('/api/config-publica');
            if (res.ok) {
                const data = await res.json();
                ventanaDias = data.ventana_dias || 30;
            }
        } catch (_) {
            // Silencioso: usamos el default de 30
        }
    };

    // Cargar cupos para la semana en el offset actual
    const cargarCuposSemana = async () => {
        const hoy = obtenerFechaHoyPanama();
        const fechaInicio = sumarDias(hoy, offsetSemana);
        mostrarAlerta(null);
        weekSelector.innerHTML = `<div style="padding: 16px; color: var(--color-text-muted); font-size: 0.9rem;">Cargando disponibilidad...</div>`;

        try {
            const res = await fetch(`/api/cupos?fecha=${fechaInicio}`);
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Error cargando disponibilidad');
            }

            datosSemana = await res.json();
            actualizarLabel();
            actualizarBotones();
            renderizarSelectorDias();

            if (datosSemana.length > 0) {
                seleccionarDia(datosSemana[0].fecha);
            } else {
                slotsGrid.innerHTML = '';
                appointmentForm.style.display = 'none';
            }
        } catch (err) {
            console.error(err);
            mostrarAlerta(err.message, 'danger');
            weekSelector.innerHTML = `<div style="color: var(--color-error); padding: 16px;">No se pudieron cargar los horarios. Intenta recargar la página.</div>`;
        }
    };

    // Renderizar pestañas de días
    const renderizarSelectorDias = () => {
        weekSelector.innerHTML = '';

        datosSemana.forEach((item) => {
            const [year, month, day] = item.fecha.split('-').map(Number);
            const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

            const nombreDia = dateObj.toLocaleDateString('es-PA', { weekday: 'short', timeZone: 'UTC' }).replace('.', '');
            const nombreMes = dateObj.toLocaleDateString('es-PA', { month: 'short', timeZone: 'UTC' }).replace('.', '');

            const tab = document.createElement('div');
            tab.className = `day-tab ${item.fecha === diaSeleccionadoYMD ? 'active' : ''}`;
            tab.dataset.fecha = item.fecha;

            tab.innerHTML = `
                <div class="day-name">${nombreDia}</div>
                <div class="day-number">${day}</div>
                <div class="day-month">${nombreMes}</div>
            `;

            tab.addEventListener('click', () => seleccionarDia(item.fecha));
            weekSelector.appendChild(tab);
        });
    };

    // Seleccionar un día
    const seleccionarDia = (fechaYMD) => {
        diaSeleccionadoYMD = fechaYMD;
        slotSeleccionadoUtc = null;
        appointmentForm.style.display = 'none';

        document.querySelectorAll('.day-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.fecha === fechaYMD);
        });

        const diaData = datosSemana.find(d => d.fecha === fechaYMD);
        renderizarCupos(diaData ? diaData.cupos : []);
    };

    // Renderizar botones de cupos
    const renderizarCupos = (cupos) => {
        slotsGrid.innerHTML = '';

        if (!cupos || cupos.length === 0) {
            slotsGrid.innerHTML = `
                <div class="empty-slots">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>No hay horarios disponibles para el día seleccionado.</span>
                </div>
            `;
            return;
        }

        cupos.forEach(cupo => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `slot-btn ${cupo.utc === slotSeleccionadoUtc ? 'selected' : ''}`;
            btn.textContent = cupo.hora_local;

            btn.addEventListener('click', () => seleccionarSlot(cupo, btn));
            slotsGrid.appendChild(btn);
        });
    };

    // Seleccionar un slot de hora
    const seleccionarSlot = (cupo, btnElement) => {
        slotSeleccionadoUtc = cupo.utc;
        selectedUtcInput.value = cupo.utc;

        document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
        btnElement.classList.add('selected');

        appointmentForm.style.display = 'block';
        appointmentForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    // Navegación de semanas
    btnPrevWeek.addEventListener('click', () => {
        if (offsetSemana > 0) {
            offsetSemana = Math.max(0, offsetSemana - 7);
            diaSeleccionadoYMD = null;
            cargarCuposSemana();
        }
    });

    btnNextWeek.addEventListener('click', () => {
        if ((offsetSemana + 7) < ventanaDias) {
            offsetSemana += 7;
            diaSeleccionadoYMD = null;
            cargarCuposSemana();
        }
    });

    // Enviar formulario
    appointmentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        mostrarAlerta(null);

        if (!slotSeleccionadoUtc) {
            mostrarAlerta('Por favor selecciona una hora disponible.', 'danger');
            return;
        }

        const nombre = document.getElementById('nombre').value.trim();
        const telefono = document.getElementById('telefono').value.trim();
        const correo = document.getElementById('correo').value.trim();
        const motivo = document.getElementById('motivo').value.trim();

        const telLimpio = telefono.replace(/\s+/g, '').replace(/^\+507/, '');
        if (!/^[234689]\d{7}$/.test(telLimpio)) {
            mostrarAlerta('El teléfono debe ser un número válido de Panamá (8 dígitos).', 'danger');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.querySelector('span').textContent = 'Agendando tu cita...';

        try {
            const response = await fetch('/api/citas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fecha_hora_inicio: slotSeleccionadoUtc,
                    nombre_paciente: nombre,
                    telefono: telLimpio,
                    correo: correo,
                    motivo: motivo
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'No se pudo agendar la cita.');
            }

            confNombre.textContent = nombre;

            const dateObj = new Date(slotSeleccionadoUtc);
            const fechaFormateada = dateObj.toLocaleDateString('es-PA', {
                timeZone: 'America/Panama',
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            const horaFormateada = dateObj.toLocaleTimeString('es-PA', {
                timeZone: 'America/Panama',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });

            confFechaHora.textContent = `${fechaFormateada} a las ${horaFormateada}`;

            bookingView.style.display = 'none';
            confirmationScreen.style.display = 'block';

        } catch (err) {
            mostrarAlerta(err.message, 'danger');
            if (err.message.includes('tomado por otra persona')) {
                cargarCuposSemana();
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.querySelector('span').textContent = 'Confirmar y Agendar Cita';
        }
    });

    function mostrarAlerta(mensaje, tipo = 'danger') {
        if (!mensaje) {
            alertBox.style.display = 'none';
            return;
        }
        alertBox.className = `alert alert-${tipo}`;
        alertBox.textContent = mensaje;
        alertBox.style.display = 'block';
        alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Inicializar: primero config, luego cupos
    cargarConfig().then(() => cargarCuposSemana());
});
