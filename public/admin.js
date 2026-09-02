/**
 * Panel de Administración — Pragma AI Studio
 * Autenticación con usuario + contraseña / JWT (24h)
 */

// Escapa HTML para insertar de forma segura datos que vienen de la base de datos
// (pueden haber sido escritos por un paciente sin autenticar vía POST /api/citas).
const escapeHtml = (str) => {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

document.addEventListener('DOMContentLoaded', () => {
    const loginCard        = document.getElementById('loginCard');
    const dashboardCard    = document.getElementById('dashboardCard');
    const userInfoHeader   = document.getElementById('userInfoHeader');
    const headerUsername   = document.getElementById('headerUsername');
    const loginForm        = document.getElementById('loginForm');
    const usernameInput    = document.getElementById('username');
    const passwordInput    = document.getElementById('password');
    const loginAlert       = document.getElementById('loginAlert');
    const adminAlert       = document.getElementById('adminAlert');
    const btnLogout        = document.getElementById('btnLogout');

    const navBtns          = document.querySelectorAll('.nav-btn[data-tab]');
    const tabAgenda        = document.getElementById('tabAgenda');
    const tabConfig        = document.getElementById('tabConfig');
    const tabHistorial     = document.getElementById('tabHistorial');

    const filtroFecha      = document.getElementById('filtroFecha');
    const btnVerTodas      = document.getElementById('btnVerTodas');
    const citasTbody       = document.getElementById('citasTbody');

    const formConfigGlobal      = document.getElementById('formConfigGlobal');
    const duracionMinutosInput  = document.getElementById('duracionMinutos');
    const anticipacionMinimaInput = document.getElementById('anticipacionMinima');
    const ventanaDiasInput      = document.getElementById('ventanaDias');
    const formBloquearDia       = document.getElementById('formBloquearDia');
    const fechaBloquearInput    = document.getElementById('fechaBloquear');
    const motivoBloquearInput   = document.getElementById('motivoBloquear');
    const listaDiasBloqueados   = document.getElementById('listaDiasBloqueados');

    const confirmModal        = document.getElementById('confirmModal');
    const modalTitle          = document.getElementById('modalTitle');
    const modalMessage        = document.getElementById('modalMessage');
    const modalMotivoWrapper  = document.getElementById('modalMotivoWrapper');
    const modalMotivo         = document.getElementById('modalMotivo');
    const modalBtnCancel      = document.getElementById('modalBtnCancel');
    const modalBtnConfirm     = document.getElementById('modalBtnConfirm');

    // Token JWT guardado en sessionStorage
    let adminToken    = sessionStorage.getItem('admin_token') || '';
    let adminUsername = sessionStorage.getItem('admin_username') || '';

    // ==============================================================================
    // HELPER: cabecera de autenticación
    // ==============================================================================
    const authHeader = () => ({ 'Authorization': `Bearer ${adminToken}` });

    // ==============================================================================
    // HELPER: MODAL GLASSMORPHISM
    // ==============================================================================

    // Modal simple (confirmación sin texto libre) — para desbloquear días, etc.
    const mostrarConfirmacionGlass = (titulo, mensaje) => {
        return new Promise((resolve) => {
            modalTitle.textContent        = titulo;
            modalMessage.textContent      = mensaje;
            modalMotivoWrapper.style.display = 'none';
            modalMotivo.value             = '';
            modalBtnCancel.textContent    = 'No, volver';
            modalBtnConfirm.textContent   = 'Sí, Confirmar';
            confirmModal.style.display    = 'flex';

            const cerrar = (resultado) => {
                confirmModal.style.display = 'none';
                modalBtnCancel.onclick  = null;
                modalBtnConfirm.onclick = null;
                resolve(resultado);
            };

            modalBtnCancel.onclick  = () => cerrar(false);
            modalBtnConfirm.onclick = () => cerrar(true);
        });
    };

    // Modal de cancelación de cita — con campo opcional de motivo
    // Resuelve { confirmed: bool, motivo: string|null }
    const mostrarModalCancelacion = (nombrePaciente) => {
        return new Promise((resolve) => {
            modalTitle.textContent        = 'Cancelar Cita';
            modalMessage.textContent      = `¿Cancelar la cita de ${nombrePaciente}? Esta acción no se puede deshacer.`;
            modalMotivoWrapper.style.display = 'block';
            modalMotivo.value             = '';
            modalBtnCancel.textContent    = 'No, volver';
            modalBtnConfirm.textContent   = 'Sí, Cancelar Cita';
            confirmModal.style.display    = 'flex';

            // Foco en el textarea para facilitar escritura en desktop
            setTimeout(() => modalMotivo.focus(), 50);

            const cerrar = (confirmed) => {
                confirmModal.style.display    = 'none';
                modalMotivoWrapper.style.display = 'none';
                modalBtnCancel.onclick  = null;
                modalBtnConfirm.onclick = null;
                const motivo = modalMotivo.value.trim() || null;
                modalMotivo.value = '';
                resolve({ confirmed, motivo });
            };

            modalBtnCancel.onclick  = () => cerrar(false);
            modalBtnConfirm.onclick = () => cerrar(true);
        });
    };

    // ==============================================================================
    // 1. AUTENTICACIÓN
    // ==============================================================================
    const cerrarSesion = () => {
        sessionStorage.removeItem('admin_token');
        sessionStorage.removeItem('admin_username');
        adminToken = '';
        adminUsername = '';
        mostrarLogin();
    };

    const mostrarLogin = () => {
        loginCard.style.display    = 'block';
        dashboardCard.style.display = 'none';
        userInfoHeader.style.display = 'none';
    };

    const mostrarDashboard = () => {
        loginCard.style.display    = 'none';
        dashboardCard.style.display = 'block';
        userInfoHeader.style.display = 'flex';
        headerUsername.textContent = adminUsername;
    };

    const verificarSesion = async () => {
        if (!adminToken) {
            mostrarLogin();
            return;
        }
        try {
            await cargarCitas();
            mostrarDashboard();
        } catch (err) {
            cerrarSesion();
            mostrarAlertaLogin('Sesión expirada. Inicia sesión nuevamente.');
        }
    };

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        mostrarAlertaLogin(null);

        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!username || !password) return;

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (!res.ok) {
                mostrarAlertaLogin(data.error || 'Error al iniciar sesión.');
                return;
            }

            adminToken    = data.token;
            adminUsername = data.username;
            sessionStorage.setItem('admin_token',    adminToken);
            sessionStorage.setItem('admin_username', adminUsername);

            passwordInput.value = '';
            await cargarCitas();
            mostrarDashboard();
        } catch (_) {
            mostrarAlertaLogin('Error de conexión. Intenta de nuevo.');
        }
    });

    btnLogout.addEventListener('click', cerrarSesion);

    // ==============================================================================
    // 2. CAMBIO DE PESTAÑAS
    // ==============================================================================
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            tabAgenda.style.display    = 'none';
            tabConfig.style.display    = 'none';
            tabHistorial.style.display = 'none';

            const tab = btn.dataset.tab;
            if (tab === 'agenda') {
                tabAgenda.style.display = 'block';
                cargarCitas(filtroFecha.value);
            } else if (tab === 'config') {
                tabConfig.style.display = 'block';
                cargarConfiguracion();
            } else if (tab === 'historial') {
                tabHistorial.style.display = 'block';
                cargarHistorial();
            }
        });
    });

    // ==============================================================================
    // 3. GESTIÓN DE AGENDA Y CITAS
    // ==============================================================================
    const cargarCitas = async (fecha = null) => {
        mostrarAlerta(null);
        let url = '/api/admin/citas';
        if (fecha) url += `?fecha=${fecha}`;

        const res = await fetch(url, { headers: authHeader() });

        if (res.status === 401) {
            cerrarSesion();
            throw new Error('Sesión expirada');
        }
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Error al obtener la agenda');
        }

        const citas = await res.json();
        renderizarTablaCitas(citas);
    };

    const renderizarTablaCitas = (citas) => {
        citasTbody.innerHTML = '';

        if (!citas || citas.length === 0) {
            citasTbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: var(--color-text-muted); padding: 32px;">
                        No hay citas agendadas para el filtro seleccionado.
                    </td>
                </tr>`;
            return;
        }

        citas.forEach(cita => {
            const tr = document.createElement('tr');

            const dateObj  = new Date(cita.fecha_hora_inicio);
            const fechaStr = dateObj.toLocaleDateString('es-PA', { timeZone: 'America/Panama', weekday: 'short', day: 'numeric', month: 'short' });
            const horaStr  = dateObj.toLocaleTimeString('es-PA', { timeZone: 'America/Panama', hour: '2-digit', minute: '2-digit', hour12: true });

            const esProgramada = cita.estado === 'programada';

            tr.innerHTML = `
                <td>
                    <div style="font-family: var(--font-heading); font-weight: 700; color: var(--color-text-main);">${escapeHtml(horaStr)}</div>
                    <div style="font-size: 0.78rem; color: var(--color-text-muted);">${escapeHtml(fechaStr)}</div>
                </td>
                <td><strong style="color: var(--color-text-main);">${escapeHtml(cita.nombre_paciente)}</strong></td>
                <td>
                    <div>+507 ${escapeHtml(cita.telefono)}</div>
                    <div style="font-size: 0.78rem; color: var(--color-text-muted);">${escapeHtml(cita.correo)}</div>
                </td>
                <td style="max-width: 180px; font-size: 0.85rem; color: var(--color-text-muted);">
                    ${cita.motivo ? escapeHtml(cita.motivo) : '<em>Sin motivo</em>'}
                </td>
                <td>
                    <span class="badge ${esProgramada ? 'badge-programada' : 'badge-cancelada'}">
                        ${escapeHtml(cita.estado)}
                    </span>
                </td>
                <td>
                    ${esProgramada
                        ? '<button type="button" class="btn-sm-danger btn-cancelar-cita">Cancelar Cita</button>'
                        : '<span style="color: var(--color-text-muted); font-size: 0.8rem;">N/A</span>'
                    }
                </td>`;

            if (esProgramada) {
                tr.querySelector('.btn-cancelar-cita').addEventListener('click', () => {
                    cancelarCitaAdmin(cita.id, cita.nombre_paciente);
                });
            }

            citasTbody.appendChild(tr);
        });
    };

    window.cancelarCitaAdmin = async (id, nombre) => {
        const { confirmed, motivo } = await mostrarModalCancelacion(nombre);
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/admin/citas/${id}/cancelar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader() },
                body: JSON.stringify({ motivo })
            });

            const data = await res.json();
            if (res.status === 401) { cerrarSesion(); return; }
            if (!res.ok) throw new Error(data.error || 'Error cancelando cita');

            mostrarAlerta(data.mensaje, 'success');
            cargarCitas(filtroFecha.value);
        } catch (err) {
            mostrarAlerta(err.message, 'danger');
        }
    };

    filtroFecha.addEventListener('change', () => cargarCitas(filtroFecha.value));
    btnVerTodas.addEventListener('click', () => {
        filtroFecha.value = '';
        cargarCitas();
    });

    // ==============================================================================
    // 4. CONFIGURACIÓN GLOBAL Y DÍAS BLOQUEADOS
    // ==============================================================================
    const cargarConfiguracion = async () => {
        mostrarAlerta(null);
        try {
            const res = await fetch('/api/admin/config', { headers: authHeader() });
            if (res.status === 401) { cerrarSesion(); return; }

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al cargar configuración');

            duracionMinutosInput.value    = data.configuracion.duracion_minutos;
            anticipacionMinimaInput.value = data.configuracion.anticipacion_minima_horas;
            ventanaDiasInput.value        = data.configuracion.ventana_dias;

            renderizarDiasBloqueados(data.dias_bloqueados);
        } catch (err) {
            mostrarAlerta(err.message, 'danger');
        }
    };

    const renderizarDiasBloqueados = (dias) => {
        listaDiasBloqueados.innerHTML = '';
        if (!dias || dias.length === 0) {
            listaDiasBloqueados.innerHTML = `<div style="color: var(--color-text-muted); font-size: 0.85rem; padding: 12px 0;">No hay días bloqueados actualmente.</div>`;
            return;
        }

        dias.forEach(item => {
            const div = document.createElement('div');
            div.style.cssText = `display: flex; justify-content: space-between; align-items: center;
                background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border);
                padding: 10px 14px; border-radius: 8px; margin-bottom: 8px; font-size: 0.88rem;`;

            const [y, m, d] = item.fecha.split('T')[0].split('-');
            div.innerHTML = `
                <div>
                    <strong style="color: var(--color-text-main);">${escapeHtml(d)}/${escapeHtml(m)}/${escapeHtml(y)}</strong>
                    <span style="color: var(--color-text-muted); margin-left: 8px;">(${escapeHtml(item.motivo)})</span>
                </div>
                <button type="button" class="btn-sm-danger btn-eliminar-bloqueado" style="padding: 4px 8px; font-size: 0.75rem;">
                    Eliminar
                </button>`;

            div.querySelector('.btn-eliminar-bloqueado').addEventListener('click', () => {
                eliminarDiaBloqueado(item.id);
            });

            listaDiasBloqueados.appendChild(div);
        });
    };

    formConfigGlobal.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...authHeader() },
                body: JSON.stringify({
                    duracion_minutos:          duracionMinutosInput.value,
                    anticipacion_minima_horas: anticipacionMinimaInput.value,
                    ventana_dias:              ventanaDiasInput.value
                })
            });
            if (res.status === 401) { cerrarSesion(); return; }
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error guardando');
            mostrarAlerta(data.mensaje, 'success');
        } catch (err) {
            mostrarAlerta(err.message, 'danger');
        }
    });

    formBloquearDia.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fecha  = fechaBloquearInput.value;
        const motivo = motivoBloquearInput.value.trim();
        if (!fecha) return;

        try {
            const res = await fetch('/api/admin/dias-bloqueados', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader() },
                body: JSON.stringify({ fecha, motivo })
            });
            if (res.status === 401) { cerrarSesion(); return; }
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error bloqueando día');

            mostrarAlerta(data.mensaje, 'success');
            fechaBloquearInput.value  = '';
            motivoBloquearInput.value = '';
            cargarConfiguracion();
        } catch (err) {
            mostrarAlerta(err.message, 'danger');
        }
    });

    window.eliminarDiaBloqueado = async (id) => {
        const confirmado = await mostrarConfirmacionGlass('Desbloquear Día', '¿Estás seguro de que deseas desbloquear esta fecha?');
        if (!confirmado) return;

        try {
            const res = await fetch(`/api/admin/dias-bloqueados/${id}`, {
                method: 'DELETE',
                headers: authHeader()
            });
            if (res.status === 401) { cerrarSesion(); return; }
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error desbloqueando día');

            mostrarAlerta(data.mensaje, 'success');
            cargarConfiguracion();
        } catch (err) {
            mostrarAlerta(err.message, 'danger');
        }
    };

    // ==============================================================================
    // 5. HISTORIAL DE AUDITORÍA
    // ==============================================================================
    const historialDesde      = document.getElementById('historialDesde');
    const historialHasta      = document.getElementById('historialHasta');
    const btnFiltrarHistorial = document.getElementById('btnFiltrarHistorial');
    const btnLimpiarHistorial = document.getElementById('btnLimpiarHistorial');
    const historialTbody      = document.getElementById('historialTbody');

    const ETIQUETAS_ACCION = {
        cancelar_cita: 'Canceló cita',
    };

    const cargarHistorial = async (desde = null, hasta = null) => {
        mostrarAlerta(null);
        historialTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--color-text-muted); padding:32px;">Cargando...</td></tr>`;

        let url = '/api/admin/audit-log';
        const params = new URLSearchParams();
        if (desde) params.set('desde', desde);
        if (hasta) params.set('hasta', hasta);
        if ([...params].length) url += '?' + params.toString();

        try {
            const res = await fetch(url, { headers: authHeader() });
            if (res.status === 401) { cerrarSesion(); return; }
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Error al obtener historial');
            }
            const registros = await res.json();
            renderizarHistorial(registros);
        } catch (err) {
            mostrarAlerta(err.message, 'danger');
            historialTbody.innerHTML = '';
        }
    };

    const renderizarHistorial = (registros) => {
        historialTbody.innerHTML = '';

        if (!registros || registros.length === 0) {
            historialTbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center; color:var(--color-text-muted); padding:32px;">
                        No hay acciones registradas para el filtro seleccionado.
                    </td>
                </tr>`;
            return;
        }

        registros.forEach(r => {
            const tr = document.createElement('tr');

            // Fecha/hora de la acción en hora Panamá
            const accionDate = new Date(r.creado_en);
            const accionFecha = accionDate.toLocaleDateString('es-PA', { timeZone: 'America/Panama', day: 'numeric', month: 'short', year: 'numeric' });
            const accionHora  = accionDate.toLocaleTimeString('es-PA', { timeZone: 'America/Panama', hour: '2-digit', minute: '2-digit', hour12: true });

            // Fecha/hora de la cita afectada en hora Panamá
            let citaStr = '<span style="color:var(--color-text-muted)">—</span>';
            if (r.fecha_hora_inicio) {
                const citaDate = new Date(r.fecha_hora_inicio);
                const cf = citaDate.toLocaleDateString('es-PA', { timeZone: 'America/Panama', day: 'numeric', month: 'short' });
                const ch = citaDate.toLocaleTimeString('es-PA', { timeZone: 'America/Panama', hour: '2-digit', minute: '2-digit', hour12: true });
                citaStr = `<div style="font-size:0.85rem">${cf}</div><div style="font-size:0.78rem;color:var(--color-text-muted)">${ch}</div>`;
            }

            const pacienteStr = r.nombre_paciente
                ? `<strong style="color:var(--color-text-main)">${escapeHtml(r.nombre_paciente)}</strong>`
                : `<span style="color:var(--color-text-muted);font-style:italic">Cita eliminada</span>`;

            const motivoStr = r.motivo_admin
                ? `<span style="font-size:0.85rem">${escapeHtml(r.motivo_admin)}</span>`
                : `<span style="color:var(--color-text-muted)">—</span>`;

            const etiqueta = escapeHtml(ETIQUETAS_ACCION[r.accion] || r.accion);

            tr.innerHTML = `
                <td>
                    <div style="font-family:var(--font-heading);font-weight:700;color:var(--color-text-main);font-size:0.85rem">${escapeHtml(accionHora)}</div>
                    <div style="font-size:0.78rem;color:var(--color-text-muted)">${escapeHtml(accionFecha)}</div>
                </td>
                <td style="font-family:var(--font-heading);font-weight:700;color:var(--color-cyan);font-size:0.9rem">${escapeHtml(r.admin_username)}</td>
                <td><span class="badge badge-cancelada" style="font-size:0.72rem">${etiqueta}</span></td>
                <td>${pacienteStr}</td>
                <td>${citaStr}</td>
                <td>${motivoStr}</td>`;
            historialTbody.appendChild(tr);
        });
    };

    btnFiltrarHistorial.addEventListener('click', () => {
        cargarHistorial(historialDesde.value || null, historialHasta.value || null);
    });

    btnLimpiarHistorial.addEventListener('click', () => {
        historialDesde.value = '';
        historialHasta.value = '';
        cargarHistorial();
    });

    // ==============================================================================
    // AUXILIARES
    // ==============================================================================
    function mostrarAlerta(msg, tipo = 'danger') {
        if (!msg) { adminAlert.style.display = 'none'; return; }
        adminAlert.className   = `alert alert-${tipo}`;
        adminAlert.textContent = msg;
        adminAlert.style.display = 'block';
    }

    function mostrarAlertaLogin(msg) {
        if (!msg) { loginAlert.style.display = 'none'; return; }
        loginAlert.textContent   = msg;
        loginAlert.style.display = 'block';
    }

    verificarSesion();
});
