/**
 * Lógica de la página de cancelación por token.
 * Extraído a archivo externo para poder correr con CSP script-src 'self'
 * (sin 'unsafe-inline') en Helmet.
 */
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const alertBox = document.getElementById('alertBox');
    const btnConfirmar = document.getElementById('btnConfirmarCancelacion');
    const cancelInitialState = document.getElementById('cancelInitialState');
    const cancelSuccessState = document.getElementById('cancelSuccessState');

    if (!token) {
        cancelInitialState.style.display = 'none';
        alertBox.className = 'alert alert-danger';
        alertBox.textContent = 'Enlace de cancelación inválido o incompleto (falta el token).';
        alertBox.style.display = 'block';
        return;
    }

    btnConfirmar.addEventListener('click', async () => {
        btnConfirmar.disabled = true;
        btnConfirmar.textContent = 'Procesando cancelación...';
        alertBox.style.display = 'none';

        try {
            const response = await fetch('/api/citas/cancelar/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al cancelar la cita');
            }

            cancelInitialState.style.display = 'none';
            cancelSuccessState.style.display = 'block';

        } catch (err) {
            btnConfirmar.disabled = false;
            btnConfirmar.textContent = 'Sí, Cancelar mi Cita';
            alertBox.className = 'alert alert-danger';
            alertBox.textContent = err.message;
            alertBox.style.display = 'block';
        }
    });
});
