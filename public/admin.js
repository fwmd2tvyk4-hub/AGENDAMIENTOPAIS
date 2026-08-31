/**
 * FASE 6: Lógica del Panel Interno de Administración (Con Modal Glassmorphism)
 * Pragma AI Studio
 */

document.addEventListener('DOMContentLoaded', () => {
    // Referencias al DOM
    const loginCard = document.getElementById('loginCard');
    const dashboardCard = document.getElementById('dashboardCard');
    const userInfoHeader = document.getElementById('userInfoHeader');
    const loginForm = document.getElementById('loginForm');
    const passwordInput = document.getElementById('password');
    const loginAlert = document.getElementById('loginAlert');
    const adminAlert = document.getElementById('adminAlert');
    const btnLogout = document.getElementById('btnLogout');

    // Pestañas
    const navBtns = document.querySelectorAll('.nav-btn[data-tab]');
    const tabAgenda = document.getElementById('tabAgenda');
    const tabConfig = document.getElementById('tabConfig');

    // Filtros Agenda
    const filtroFecha = document.getElementById('filtroFecha');
    const btnVerTodas = document.getElementById('btnVerTodas');
    const citasTbody = document.getElementById('citasTbody');

    // Configuración Global & Días Bloqueados
    const formConfigGlobal = document.getElementById('formConfigGlobal');
    const duracionMinutosInput = document.getElementById('duracionMinutos');
    const anticipacionMinimaInput = document.getElementById('anticipacionMinima');
    const ventanaDiasInput = document.getElementById('ventanaDias');
    const formBloquearDia = document.getElementById('formBloquearDia');
    const fechaBloquearInput = document.getElementById('fechaBloquear');
    const motivoBloquearInput = document.getElementById('motivoBloquear');
    const listaDiasBloqueados = document.getElementById('listaDiasBloqueados');

    // Modal Personalizado
    const confirmModal = document.getElementById('confirmModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalBtnCancel = document.getElementById('modalBtnCancel');
    const modalBtnConfirm = document.getElementById('modalBtnConfirm');

    let adminPassword = sessionStorage.getItem('admin_password') || '';

    // ==============================================================================
    // HELPER: MODAL GLASSMORISM DE CONFIRMACIÓN (Remplaza confirm nativo del browser)
    // ==============================================================================
    const mostrarConfirmacionGlass = (titulo, mensaje) => {
        return new Promise((resolve) => {
            modalTitle.textContent = titulo;
            modalMessage.textContent = mensaje;
            confirmModal.style.display = 'flex';

            const cerrar = (resultado) => {
                confirmModal.style.display = 'none';
                modalBtnCancel.onclick = null;
                modalBtnConfirm.onclick = null;
                resolve(resultado);
            };

            modalBtnCancel.onclick = () => cerrar(false);
            modalBtnConfirm.onclick = () => cerrar(true);
        });
    };

    // ==============================================================================
    // 1. AUTENTICACIÓN
    // ==============================================================================
    const verificarSesion = async () => {
        if (!adminPassword) {
            mostrarLogin();
            return;
        }

        try {
            await cargarCitas();
            mostrarDashboard();
        } catch (err) {
            sessionStorage.removeItem('admin_password');
            adminPassword = '';
            mostrarLogin();
            mostrarAlertaLogin('Sesión expirada o contraseña incorrecta');
        }
    };

    const mostrarLogin = () => {
        loginCard.style.display = 'block';
        dashboardCard.style.display = 'none';
        userInfoHeader.style.display = 'none';
    };

    const mostrarDashboard = () => {
        loginCard.style.display = 'none';
        dashboardCard.style.display = 'block';
        userInfoHeader.style.display = 'block';
    };

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pass = passwordInput.value.trim();
        if (!pass) return;

        adminPassword = pass;
        try {
            await cargarCitas();
            sessionStorage.setItem('admin_password', pass);
            mostrarDashboard();
        } catch (err) {
            adminPassword = '';
            mostrarAlertaLogin(err.message || 'Contraseña incorrecta');
        }
    });

    btnLogout.addEventListener('click', () => {
        sessionStorage.removeItem('admin_password');
        window.location.reload();
    });

    // ==============================================================================
    // 2. CAMBIO DE PESTAÑAS
    // ==============================================================================
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const tab = btn.dataset.tab;
            if (tab === 'agenda') {
                tabAgenda.style.display = 'block';
                tabConfig.style.display = 'none';
                cargarCitas(filtroFecha.value);
            } else if (tab === 'config') {
                tabAgenda.style.display = 'none';
                tabConfig.style.display = 'block';
                cargarConfiguracion();
            }
        });
    });

    // ==============================================================================
    // 3. GESTIÓN DE AGENDA Y CITAS
    // ==============================================================================
    const cargarCitas = async (fecha = null) => {
        mostrarAlerta(null);
        let url = '/api/admin/citas';
        if (fecha) {
            url += `?fecha=${fecha}`;
        }

        const res = await fetch(url, {
            headers: { 'x-admin-password': adminPassword }
        });

        if (res.status === 401) {
            throw new Error('Contraseña no autorizada');
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
                </tr>
            `;
            return;
        }

        citas.forEach(cita => {
            const tr = document.createElement('tr');
            
            const dateObj = new Date(cita.fecha_hora_inicio);
            const fechaStr = dateObj.toLocaleDateString('es-PA', { 
                timeZone: 'America/Panama', 
                weekday: 'short', 
                day: 'numeric', 
                month: 'short' 
            });
            const horaStr = dateObj.toLocaleTimeString('es-PA', { 
                timeZone: 'America/Panama', 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: true 
            });

            const esProgramada = cita.estado === 'programada';

            tr.innerHTML = `
                <td>
                    <div style="font-family: var(--font-heading); font-weight: 700; color: var(--color-text-main);">${horaStr}</div>
                    <div style="font-size: 0.78rem; color: var(--color-text-muted);">${fechaStr}</div>
                </td>
                <td>
                    <strong style="color: var(--color-text-main);">${cita.nombre_paciente}</strong>
                </td>
                <td>
                    <div>+507 ${cita.telefono}</div>
                    <div style="font-size: 0.78rem; color: var(--color-text-muted);">${cita.correo}</div>
                </td>
                <td style="max-width: 180px; font-size: 0.85rem; color: var(--color-text-muted);">
                    ${cita.motivo || '<em>Sin motivo</em>'}
                </td>
                <td>
                    <span class="badge ${esProgramada ? 'badge-programada' : 'badge-cancelada'}">
                        ${cita.estado}
                    </span>
                </td>
                <td>
                    ${esProgramada ? `
                        <button class="btn-sm-danger" onclick="cancelarCitaAdmin(${cita.id}, '${cita.nombre_paciente}')">
                            Cancelar Cita
                        </button>
                    ` : '<span style="color: var(--color-text-muted); font-size: 0.8rem;">N/A</span>'}
                </td>
            `;
            citasTbody.appendChild(tr);
        });
    };

    // Función global con Modal Glassmorphism
    window.cancelarCitaAdmin = async (id, nombre) => {
        const confirmado = await mostrarConfirmacionGlass(
            'Cancelar Cita', 
            `¿Estás seguro de que deseas cancelar la cita de ${nombre}?`
        );
        
        if (!confirmado) return;

        try {
            const res = await fetch(`/api/admin/citas/${id}/cancelar`, {
                method: 'POST',
                headers: { 'x-admin-password': adminPassword }
            });

            const data = await res.json();
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
            const res = await fetch('/api/admin/config', {
                headers: { 'x-admin-password': adminPassword }
            });
            
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Error al cargar configuración');
            }

            // Llenar campos globales
            duracionMinutosInput.value = data.configuracion.duracion_minutos;
            anticipacionMinimaInput.value = data.configuracion.anticipacion_minima_horas;
            ventanaDiasInput.value = data.configuracion.ventana_dias;

            // Renderizar lista de días bloqueados
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
            div.style.cssText = `
                display: flex; justify-content: space-between; align-items: center;
                background: rgba(255, 255, 255, 0.03); border: 1px solid var(--glass-border);
                padding: 10px 14px; border-radius: 8px; margin-bottom: 8px; font-size: 0.88rem;
            `;

            const [y, m, d] = item.fecha.split('T')[0].split('-');

            div.innerHTML = `
                <div>
                    <strong style="color: var(--color-text-main);">${d}/${m}/${y}</strong>
                    <span style="color: var(--color-text-muted); margin-left: 8px;">(${item.motivo})</span>
                </div>
                <button class="btn-sm-danger" style="padding: 4px 8px; font-size: 0.75rem;" onclick="eliminarDiaBloqueado(${item.id})">
                    Eliminar
                </button>
            `;
            listaDiasBloqueados.appendChild(div);
        });
    };

    formConfigGlobal.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/config', {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-admin-password': adminPassword 
                },
                body: JSON.stringify({
                    duracion_minutos: duracionMinutosInput.value,
                    anticipacion_minima_horas: anticipacionMinimaInput.value,
                    ventana_dias: ventanaDiasInput.value
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error guardando');

            mostrarAlerta(data.mensaje, 'success');
        } catch (err) {
            mostrarAlerta(err.message, 'danger');
        }
    });

    formBloquearDia.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fecha = fechaBloquearInput.value;
        const motivo = motivoBloquearInput.value.trim();

        if (!fecha) return;

        try {
            const res = await fetch('/api/admin/dias-bloqueados', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-admin-password': adminPassword 
                },
                body: JSON.stringify({ fecha, motivo })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error bloqueando día');

            mostrarAlerta(data.mensaje, 'success');
            fechaBloquearInput.value = '';
            motivoBloquearInput.value = '';
            cargarConfiguracion();
        } catch (err) {
            mostrarAlerta(err.message, 'danger');
        }
    });

    window.eliminarDiaBloqueado = async (id) => {
        const confirmado = await mostrarConfirmacionGlass(
            'Desbloquear Día',
            '¿Estás seguro de que deseas desbloquear esta fecha?'
        );
        if (!confirmado) return;

        try {
            const res = await fetch(`/api/admin/dias-bloqueados/${id}`, {
                method: 'DELETE',
                headers: { 'x-admin-password': adminPassword }
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error desbloqueando día');

            mostrarAlerta(data.mensaje, 'success');
            cargarConfiguracion();
        } catch (err) {
            mostrarAlerta(err.message, 'danger');
        }
    };

    // Auxiliares
    function mostrarAlerta(msg, tipo = 'danger') {
        if (!msg) {
            adminAlert.style.display = 'none';
            return;
        }
        adminAlert.className = `alert alert-${tipo}`;
        adminAlert.textContent = msg;
        adminAlert.style.display = 'block';
    }

    function mostrarAlertaLogin(msg) {
        if (!msg) {
            loginAlert.style.display = 'none';
            return;
        }
        loginAlert.textContent = msg;
        loginAlert.style.display = 'block';
    }

    verificarSesion();
});
