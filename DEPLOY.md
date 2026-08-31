# Fase 7 — Guía de Despliegue en Railway

Stack: Node.js · Express · PostgreSQL (Railway) · Resend

---

## 0. Pre-requisitos

- Cuenta en [railway.app](https://railway.app)
- Cuenta en [resend.com](https://resend.com) con dominio verificado (o usa `onboarding@resend.dev` solo para pruebas)
- Repositorio en GitHub con el código

---

## 1. Preparar el repositorio

### 1.1 Verificar que `.env` NO está commiteado

```bash
git status          # .env NO debe aparecer
cat .gitignore      # debe listar .env
```

Si `.env` aparece en el historial, límpialo antes de hacer push público.

### 1.2 Hacer commit de todo lo nuevo y push

```bash
git add .gitignore railway.toml src/server.js public/app.js
git commit -m "Fase 7: railway.toml, gitignore, health check, navegacion de semanas"
git push origin main
```

---

## 2. Crear el proyecto en Railway

1. Ir a [railway.app/new](https://railway.app/new) → **Deploy from GitHub repo**
2. Autorizar Railway y seleccionar el repositorio `citas-pragma`
3. Railway detecta Node.js automáticamente y usa `railway.toml` como configuración

**No hacer deploy todavía** — primero añadir la base de datos.

---

## 3. Añadir PostgreSQL

1. Dentro del proyecto Railway → **+ New** → **Database** → **Add PostgreSQL**
2. Railway crea la base de datos y provee la variable `DATABASE_URL` automáticamente
3. Esa variable ya se inyecta al servicio — no hay que copiarla a mano

---

## 4. Configurar las variables de entorno

En el servicio Node.js → pestaña **Variables** → añadir:

| Variable | Valor | Obligatoria |
|---|---|---|
| `ADMIN_PASSWORD` | Contraseña segura para el panel admin | ✅ Sí |
| `RESEND_API_KEY` | Tu API key de Resend (`re_...`) | ✅ Sí (para correos) |
| `EMAIL_FROM` | `Pragma Citas <citas@tu-dominio.com>` | ✅ Sí (para correos) |
| `CLINICA_EMAIL` | Correo donde llegan las alertas de nuevas citas | ✅ Sí (para correos) |
| `PUBLIC_URL` | URL pública del servicio (ej. `https://citas-pragma.up.railway.app`) | ✅ Sí (links de cancelación) |
| `PORT` | No tocar — Railway lo inyecta automáticamente | — |
| `DATABASE_URL` | No tocar — Railway la inyecta desde la BD | — |

> `EMAIL_FROM` debe usar un dominio verificado en Resend. Para pruebas iniciales puedes
> dejar `Pragma Citas <onboarding@resend.dev>` (solo envía a tu propio correo de Resend).

---

## 5. Ejecutar el esquema SQL (una sola vez)

Railway no ejecuta migraciones automáticamente. Hay que correr `db/schema.sql` contra la BD una única vez.

**Opción A — Railway Shell (más fácil, no requiere instalar nada localmente):**

1. En Railway → servicio PostgreSQL → pestaña **Query**
2. Pegar y ejecutar el contenido completo de `db/schema.sql`

**Opción B — psql local:**

```bash
# Obtener la DATABASE_URL del panel de Railway → PostgreSQL → Variables
psql "postgresql://postgres:PASSWORD@HOST:PORT/railway" -f db/schema.sql
```

**Verificar que las tablas existen:**

```sql
\dt
-- Debe listar: citas, configuracion, dias_bloqueados, horario_atencion
```

---

## 6. Hacer el primer deploy

1. En Railway → servicio Node.js → **Deploy** (o el push de git lo dispara automáticamente)
2. Ver el log en tiempo real: el servidor debe imprimir `🚀 Servidor de Agendamiento corriendo en http://localhost:PORT`
3. Railway espera respuesta `200` en `/health` para marcar el deploy como exitoso

---

## 7. Checklist post-deploy

Reemplaza `<TU_URL>` por la URL que Railway asignó (o tu dominio personalizado).

### Backend

- [ ] `GET <TU_URL>/health` → `{ "status": "ok" }`
- [ ] `GET <TU_URL>/api/config-publica` → `{ "ventana_dias": 30 }`
- [ ] `GET <TU_URL>/api/cupos?fecha=YYYY-MM-DD` → array de 7 días con cupos

### Frontend público

- [ ] `<TU_URL>/` carga sin errores de consola
- [ ] El selector de días muestra la semana actual
- [ ] Los botones "Anterior" / "Siguiente" navegan entre semanas
- [ ] El botón "Anterior" está deshabilitado en la semana actual
- [ ] El botón "Siguiente" se deshabilita al llegar al límite de `ventana_dias`
- [ ] Agendar una cita completa: seleccionar día → hora → llenar formulario → confirmar
- [ ] El correo de confirmación llega al paciente con el enlace de cancelación correcto
- [ ] El enlace de cancelación apunta a `<TU_URL>/cancelar.html?token=...` (no a localhost)

### Panel admin

- [ ] `<TU_URL>/admin.html` pide contraseña y la acepta
- [ ] Se ven las citas agendadas
- [ ] Se pueden configurar parámetros (duración, anticipación, ventana)
- [ ] Se pueden bloquear y desbloquear días

### Correos

- [ ] Correo de confirmación al paciente llega correctamente
- [ ] Correo de aviso a la clínica (`CLINICA_EMAIL`) llega correctamente
- [ ] Cancelar por token (`<TU_URL>/cancelar.html`) funciona y libera el cupo

---

## 8. Dominio personalizado (opcional)

1. Railway → servicio Node.js → **Settings** → **Domains** → **+ Custom Domain**
2. Agregar `citas.pragma.ai` (o el subdominio que corresponda)
3. Railway provee el registro CNAME → añadirlo en el DNS de tu proveedor
4. Actualizar `PUBLIC_URL` en las variables de entorno con el nuevo dominio
5. Re-deploy para que los links de cancelación en los correos usen el dominio definitivo

---

## 9. Variables de entorno completas (referencia)

```env
# Railway las inyecta automáticamente — no tocar:
DATABASE_URL=...
PORT=...

# Configurar en Railway → Variables:
ADMIN_PASSWORD=contrasena_muy_segura_aqui
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=Pragma Citas <citas@tu-dominio.com>
CLINICA_EMAIL=equipo@pragma.ai
PUBLIC_URL=https://citas.pragma.ai
```

---

## Arquitectura final desplegada

```
Internet
    │
    ▼
Railway Service (Node.js / Express)
    │  src/server.js — puerto dinámico (PORT)
    │  public/       — archivos estáticos
    │
    ├── GET  /health              ← health check de Railway
    ├── GET  /api/config-publica  ← ventana de días para el frontend
    ├── GET  /api/cupos           ← disponibilidad por semana
    ├── POST /api/citas           ← crear cita
    ├── POST /api/citas/cancelar/token
    ├── GET|PUT /api/admin/*      ← panel admin (requiere ADMIN_PASSWORD)
    │
    ▼
Railway PostgreSQL
    ├── configuracion
    ├── horario_atencion
    ├── dias_bloqueados
    └── citas
```
