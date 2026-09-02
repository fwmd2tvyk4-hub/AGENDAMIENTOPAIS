require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { generarCuposLibres } = require('./disponibilidad');
const { enviarCorreoConfirmacionPaciente, enviarAvisoClinica } = require('./email');

const app = express();

// Railway pone la app detrás de un proxy/load balancer: sin esto, req.ip
// y el key generator de express-rate-limit ven la IP del proxy, no la del cliente.
app.set('trust proxy', 1);

app.use(helmet({
    // Google Fonts (usadas en index.html, admin.html y cancelar.html) requieren
    // permitir su origen explícitamente; el resto se queda en el default de helmet.
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            // 'unsafe-inline' se mantiene: el front usa style="..." inline y admin.html
            // tiene un bloque <style> propio; sin esto Helmet rompería el layout.
            'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            'font-src': ["'self'", "https://fonts.gstatic.com"],
            // script-src se queda en el default ('self') a propósito: no hay ningún
            // <script> inline (el de cancelar.html se movió a cancelar.js) ni scripts
            // de terceros, así que no hace falta abrir 'unsafe-inline' aquí.
        },
    },
    // Defensa explícita: cancelar.html lleva el token de cancelación en la URL
    // y carga fuentes de Google; no depender del default del navegador.
    referrerPolicy: { policy: 'no-referrer' },
}));

app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, '../public')));

app.use((req, res, next) => {
    // Solo el path, nunca el query string: el token de cancelación de
    // /cancelar.html?token=... viaja ahí y no debe quedar en los logs de Railway.
    console.log(`[${new Date().toLocaleTimeString('es-PA')}] ${req.method} ${req.path}`);
    next();
});

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
        ? { rejectUnauthorized: false }
        : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    keepAlive: true
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

// ==========================================
// MIDDLEWARES
// ==========================================

// Hash ficticio para comparación constante cuando el usuario no existe,
// evitando que un atacante distinga usuarios válidos por tiempo de respuesta.
const DUMMY_HASH = '$2b$12$iqFRpZxeH5bfEHCq.GKh5OmLdIFmJfHBXuvaqSwnrW7i3WFYhCyWi';

// Mensaje genérico: no revela el límite ni el tiempo restante para reintentar.
const mensajeLimiteExcedido = (req, res) => {
    res.status(429).json({ error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' });
};

// Crear cita: sin límite, un script llena la agenda y quema la cuota de Resend
// (cada cita exitosa dispara 2 correos: enviarCorreoConfirmacionPaciente + enviarAvisoClinica).
const limiteCrearCita = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: false,
    legacyHeaders: false,
    handler: mensajeLimiteExcedido,
});

// Cancelar por token: token de 256 bits, riesgo de fuerza bruta despreciable,
// pero igual se limita para no permitir spam de escritura en BD.
const limiteCancelarToken = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: false,
    legacyHeaders: false,
    handler: mensajeLimiteExcedido,
});

// Login admin: limita fuerza bruta de contraseña.
const limiteLoginAdmin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: false,
    legacyHeaders: false,
    handler: mensajeLimiteExcedido,
});

const verificarSesionAdmin = (req, res, next) => {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No autorizado. Sesión requerida.' });
    }
    const token = auth.slice(7);
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.adminUser = { id: payload.id, username: payload.username };
        next();
    } catch (_) {
        return res.status(401).json({ error: 'Sesión expirada o inválida. Inicia sesión nuevamente.' });
    }
};

// ==========================================
// UTILIDADES DB
// ==========================================
async function obtenerConfiguracion() {
    const res = await pool.query('SELECT * FROM configuracion WHERE id = true');
    return res.rows[0];
}

// ==========================================
// RUTAS PÚBLICAS
// ==========================================

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/config-publica', async (req, res) => {
    try {
        const config = await obtenerConfiguracion();
        if (!config) return res.status(500).json({ error: 'Configuración no encontrada' });
        res.json({ ventana_dias: config.ventana_dias });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo configuración' });
    }
});

// 1. Listar cupos de una semana
app.get('/api/cupos', async (req, res) => {
    try {
        const { fecha } = req.query;
        if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            return res.status(400).json({ error: 'Fecha inválida. Usa formato YYYY-MM-DD' });
        }

        const config = await obtenerConfiguracion();
        if (!config) {
            return res.status(500).json({ error: 'La tabla configuracion no tiene datos' });
        }

        const inicioRangoStr = `${fecha} 00:00:00-05`;

        let fechaInicioObj = new Date(`${fecha}T00:00:00-05:00`);
        let fechaFinObj = new Date(fechaInicioObj);
        fechaFinObj.setDate(fechaFinObj.getDate() + 7);
        const fechaFinYMD = fechaFinObj.toISOString().split('T')[0];
        const finRangoStr = `${fechaFinYMD} 23:59:59-05`;

        const [horariosRes, bloqueadosRes, citasRes] = await Promise.all([
            pool.query('SELECT dia_semana, hora_inicio, hora_fin FROM horario_atencion WHERE activo = true ORDER BY hora_inicio'),
            pool.query('SELECT fecha FROM dias_bloqueados WHERE fecha >= $1 AND fecha <= $2', [fecha, fechaFinYMD]),
            pool.query("SELECT fecha_hora_inicio FROM citas WHERE estado = 'programada' AND fecha_hora_inicio >= $1 AND fecha_hora_inicio <= $2", [inicioRangoStr, finRangoStr])
        ]);

        const todosHorarios = horariosRes.rows;
        const diasBloqueadosSet = new Set(bloqueadosRes.rows.map(r => {
            const d = new Date(r.fecha);
            return d.toISOString().split('T')[0];
        }));
        const todasCitas = citasRes.rows.map(r => r.fecha_hora_inicio);

        const limiteVentana = new Date();
        limiteVentana.setDate(limiteVentana.getDate() + config.ventana_dias);

        const diasSemana = [];
        let fechaCursor = new Date(fechaInicioObj);

        for (let i = 0; i < 7; i++) {
            if (fechaCursor > limiteVentana) break;

            const offsetPanama = fechaCursor.getTime() - (5 * 60 * 60 * 1000);
            const datePanama = new Date(offsetPanama);
            const fechaYMD = datePanama.toISOString().split('T')[0];
            const diaSemana = datePanama.getUTCDay();

            const horariosDelDia = todosHorarios.filter(h => h.dia_semana === diaSemana);
            const esBloqueado = diasBloqueadosSet.has(fechaYMD);

            const cupos = generarCuposLibres(fechaYMD, config, horariosDelDia, esBloqueado, todasCitas);
            diasSemana.push({ fecha: fechaYMD, cupos });

            fechaCursor.setDate(fechaCursor.getDate() + 1);
        }

        res.json(diasSemana);
    } catch (err) {
        console.error('Error en GET /api/cupos:', err);
        res.status(500).json({ error: 'Error interno obteniendo cupos' });
    }
});

// 2. Crear una cita
app.post('/api/citas', limiteCrearCita, async (req, res) => {
    const client = await pool.connect();
    try {
        const { fecha_hora_inicio, nombre_paciente, telefono, correo, motivo } = req.body;

        if (!nombre_paciente || nombre_paciente.trim().length === 0) {
            return res.status(400).json({ error: 'El nombre es obligatorio' });
        }
        if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
            return res.status(400).json({ error: 'El formato de correo es inválido' });
        }

        const telLimpio = telefono.replace(/\s+/g, '').replace(/^\+507/, '');
        if (!/^[234689]\d{7}$/.test(telLimpio)) {
            return res.status(400).json({ error: 'Teléfono inválido. Debe ser un celular o fijo de Panamá válido.' });
        }

        const dateObj = new Date(fecha_hora_inicio);
        if (isNaN(dateObj.getTime())) return res.status(400).json({ error: 'Fecha de inicio inválida' });

        const offsetPanama = dateObj.getTime() - (5 * 60 * 60 * 1000);
        const datePanama = new Date(offsetPanama);
        const ymdPanama = datePanama.toISOString().split('T')[0];
        const diaSemanaPanama = datePanama.getUTCDay();

        const config = await obtenerConfiguracion();
        const horarioRes = await pool.query('SELECT hora_inicio, hora_fin FROM horario_atencion WHERE dia_semana = $1 AND activo = true ORDER BY hora_inicio', [diaSemanaPanama]);
        const bloqueadoRes = await pool.query('SELECT 1 FROM dias_bloqueados WHERE fecha = $1', [ymdPanama]);

        const inicioDiaStr = `${ymdPanama} 00:00:00-05`;
        const finDiaStr = `${ymdPanama} 23:59:59-05`;
        const citasRes = await pool.query("SELECT fecha_hora_inicio FROM citas WHERE estado = 'programada' AND fecha_hora_inicio >= $1 AND fecha_hora_inicio <= $2", [inicioDiaStr, finDiaStr]);

        const cuposLibres = generarCuposLibres(ymdPanama, config, horarioRes.rows, bloqueadoRes.rowCount > 0, citasRes.rows.map(r => r.fecha_hora_inicio));
        const existeCupo = cuposLibres.some(c => c.utc === fecha_hora_inicio);

        if (!existeCupo) {
            return res.status(400).json({ error: 'El cupo seleccionado no está disponible, no existe o es muy pronto para agendar.' });
        }

        const tokenCancelacion = crypto.randomBytes(32).toString('hex');

        await client.query('BEGIN');
        const insertQuery = `
            INSERT INTO citas (fecha_hora_inicio, nombre_paciente, telefono, correo, motivo, token_cancelacion)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, fecha_hora_inicio
        `;
        const result = await client.query(insertQuery, [fecha_hora_inicio, nombre_paciente, telLimpio, correo, motivo, tokenCancelacion]);
        await client.query('COMMIT');

        const citaId = result.rows[0].id;
        enviarCorreoConfirmacionPaciente({ citaId, correo, nombre: nombre_paciente, fechaHoraUtc: fecha_hora_inicio, tokenCancelacion });
        enviarAvisoClinica({ citaId, nombre: nombre_paciente, telefono: telLimpio, correo, motivo, fechaHoraUtc: fecha_hora_inicio });

        res.status(201).json({ mensaje: 'Cita creada exitosamente', cita: result.rows[0] });

    } catch (err) {
        await client.query('ROLLBACK');
        if (err.constraint === 'idx_citas_activas_unica_hora') {
            return res.status(409).json({ error: 'Lo sentimos, ese cupo acaba de ser tomado por otra persona hace unos segundos.' });
        }
        console.error(err);
        res.status(500).json({ error: 'Error interno al crear cita' });
    } finally {
        client.release();
    }
});

// 3. Cancelar con token (Paciente)
app.post('/api/citas/cancelar/token', limiteCancelarToken, async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'Token requerido' });

        const query = "UPDATE citas SET estado = 'cancelada' WHERE token_cancelacion = $1 AND estado = 'programada' RETURNING id";
        const result = await pool.query(query, [token]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Cita no encontrada, token inválido o la cita ya fue cancelada previamente.' });
        }

        res.json({ mensaje: 'Su cita ha sido cancelada correctamente. El cupo vuelve a estar libre.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno cancelando cita' });
    }
});

// ==========================================
// RUTAS DE ADMIN — Login
// ==========================================

// Login con usuario y contraseña → emite JWT de 24h
app.post('/api/admin/login', limiteLoginAdmin, async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
    }

    try {
        const result = await pool.query(
            'SELECT id, username, password_hash, activo FROM admin_users WHERE username = $1',
            [username.trim().toLowerCase()]
        );

        const admin = result.rows[0];

        // Siempre comparar contra un hash para no filtrar si el usuario existe
        const hash = admin ? admin.password_hash : DUMMY_HASH;
        const passwordOk = await bcrypt.compare(password, hash);

        if (!admin || !passwordOk || !admin.activo) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
        }

        const token = jwt.sign(
            { id: admin.id, username: admin.username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, username: admin.username });
    } catch (err) {
        console.error('Error en POST /api/admin/login:', err);
        res.status(500).json({ error: 'Error interno al iniciar sesión.' });
    }
});

// ==========================================
// RUTAS DE ADMIN — Protegidas con JWT
// ==========================================

// 4. Listar citas
app.get('/api/admin/citas', verificarSesionAdmin, async (req, res) => {
    try {
        const { fecha } = req.query;
        let query = "SELECT id, fecha_hora_inicio, nombre_paciente, telefono, correo, motivo, estado FROM citas ";
        let params = [];

        if (fecha) {
            const inicioDiaStr = `${fecha} 00:00:00-05`;
            const finDiaStr = `${fecha} 23:59:59-05`;
            query += "WHERE fecha_hora_inicio >= $1 AND fecha_hora_inicio <= $2 ORDER BY fecha_hora_inicio ASC";
            params = [inicioDiaStr, finDiaStr];
        } else {
            query += "ORDER BY fecha_hora_inicio DESC LIMIT 100";
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo historial de citas' });
    }
});

// 5. Cancelar por ID — con motivo opcional y registro de auditoría
app.post('/api/admin/citas/:id/cancelar', verificarSesionAdmin, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const motivo_admin = typeof req.body.motivo === 'string' ? req.body.motivo.trim() || null : null;

    try {
        const result = await pool.query(
            "UPDATE citas SET estado = 'cancelada' WHERE id = $1 AND estado = 'programada' RETURNING id",
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Cita no encontrada o ya cancelada' });
        }

        // Registrar en auditoría — si falla, la cancelación ya ocurrió y no se revierte
        try {
            await pool.query(
                `INSERT INTO audit_log (admin_user_id, admin_username, accion, cita_id, motivo_admin)
                 VALUES ($1, $2, 'cancelar_cita', $3, $4)`,
                [req.adminUser.id, req.adminUser.username, id, motivo_admin]
            );
        } catch (auditErr) {
            console.error(`[AUDIT ERROR] Falló el registro de auditoría para cancelación de cita ${id} por ${req.adminUser.username}:`, auditErr.message);
        }

        res.json({ mensaje: 'Cita cancelada exitosamente desde el panel.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error cancelando cita' });
    }
});

// 6. Historial de auditoría
app.get('/api/admin/audit-log', verificarSesionAdmin, async (req, res) => {
    try {
        const { desde, hasta } = req.query;

        // Convertir fechas YYYY-MM-DD a límites en hora Panamá
        const params = [];
        let where = '';

        if (desde && /^\d{4}-\d{2}-\d{2}$/.test(desde)) {
            params.push(`${desde} 00:00:00-05`);
            where += ` AND al.creado_en >= $${params.length}`;
        }
        if (hasta && /^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
            params.push(`${hasta} 23:59:59-05`);
            where += ` AND al.creado_en <= $${params.length}`;
        }

        const query = `
            SELECT
                al.id,
                al.admin_username,
                al.accion,
                al.motivo_admin,
                al.creado_en,
                al.cita_id,
                c.nombre_paciente,
                c.fecha_hora_inicio
            FROM audit_log al
            LEFT JOIN citas c ON c.id = al.cita_id
            WHERE 1=1 ${where}
            ORDER BY al.creado_en DESC
            LIMIT 500
        `;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error en GET /api/admin/audit-log:', err);
        res.status(500).json({ error: 'Error al obtener historial de auditoría' });
    }
});

// 7. Obtener configuración y días bloqueados
app.get('/api/admin/config', verificarSesionAdmin, async (req, res) => {
    try {
        const [configRes, horariosRes, bloqueadosRes] = await Promise.all([
            pool.query('SELECT * FROM configuracion LIMIT 1'),
            pool.query('SELECT * FROM horario_atencion ORDER BY dia_semana, hora_inicio'),
            pool.query('SELECT * FROM dias_bloqueados ORDER BY fecha DESC')
        ]);

        if (configRes.rows.length === 0) {
            return res.status(404).json({ error: 'Configuración no encontrada en la base de datos' });
        }

        res.json({
            configuracion: configRes.rows[0],
            horarios: horariosRes.rows,
            dias_bloqueados: bloqueadosRes.rows
        });
    } catch (err) {
        console.error('Error en GET /api/admin/config:', err);
        res.status(500).json({ error: 'Error al obtener configuración' });
    }
});

// 7. Actualizar parámetros globales
app.put('/api/admin/config', verificarSesionAdmin, async (req, res) => {
    try {
        const { duracion_minutos, anticipacion_minima_horas, ventana_dias } = req.body;

        const dur = parseInt(duracion_minutos, 10);
        const ant = parseInt(anticipacion_minima_horas, 10);
        const ven = parseInt(ventana_dias, 10);

        if (isNaN(dur) || dur <= 0) return res.status(400).json({ error: 'Duración inválida' });
        if (isNaN(ant) || ant < 0) return res.status(400).json({ error: 'Anticipación inválida' });
        if (isNaN(ven) || ven <= 0) return res.status(400).json({ error: 'Ventana de días inválida' });

        await pool.query(
            'UPDATE configuracion SET duracion_minutos = $1, anticipacion_minima_horas = $2, ventana_dias = $3 WHERE id = true',
            [dur, ant, ven]
        );

        res.json({ mensaje: 'Configuración actualizada correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al guardar configuración' });
    }
});

// 8. Agregar día bloqueado
app.post('/api/admin/dias-bloqueados', verificarSesionAdmin, async (req, res) => {
    try {
        const { fecha, motivo } = req.body;
        if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            return res.status(400).json({ error: 'Fecha inválida. Usa YYYY-MM-DD' });
        }

        const result = await pool.query(
            'INSERT INTO dias_bloqueados (fecha, motivo) VALUES ($1, $2) RETURNING id, fecha, motivo',
            [fecha, motivo || 'Feriado / Bloqueado']
        );

        res.status(201).json({ mensaje: 'Día bloqueado agregado', bloqueado: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Esa fecha ya está registrada como día bloqueado.' });
        }
        console.error(err);
        res.status(500).json({ error: 'Error al agregar día bloqueado' });
    }
});

// 9. Eliminar día bloqueado
app.delete('/api/admin/dias-bloqueados/:id', verificarSesionAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        await pool.query('DELETE FROM dias_bloqueados WHERE id = $1', [id]);
        res.json({ mensaje: 'Día desbloqueado correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar día bloqueado' });
    }
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Servidor de Agendamiento corriendo en http://localhost:${PORT}`);
    });
}

module.exports = app;
