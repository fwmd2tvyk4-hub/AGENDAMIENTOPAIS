/**
 * Script CLI para crear un administrador del panel.
 * Uso: node scripts/crear-admin.js <username> <password>
 *
 * Es la única forma de crear admins — no hay ruta ni botón en el panel.
 * La contraseña se hashea con bcrypt antes de guardar; nunca se almacena en plano.
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const BCRYPT_ROUNDS = 12;

async function crearAdmin(username, password) {
    if (!username || !password) {
        console.error('Uso: node scripts/crear-admin.js <username> <password>');
        process.exit(1);
    }

    if (username.length < 3 || username.length > 100) {
        console.error('Error: el username debe tener entre 3 y 100 caracteres.');
        process.exit(1);
    }

    if (password.length < 8) {
        console.error('Error: la contraseña debe tener al menos 8 caracteres.');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
            ? { rejectUnauthorized: false }
            : false,
    });

    try {
        console.log(`Hasheando contraseña (bcrypt, ${BCRYPT_ROUNDS} rondas)...`);
        const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

        const result = await pool.query(
            'INSERT INTO admin_users (username, password_hash) VALUES ($1, $2) RETURNING id, username, creado_en',
            [username, hash]
        );

        const admin = result.rows[0];
        console.log(`\n✅ Administrador creado exitosamente:`);
        console.log(`   ID       : ${admin.id}`);
        console.log(`   Usuario  : ${admin.username}`);
        console.log(`   Creado   : ${new Date(admin.creado_en).toLocaleString('es-PA', { timeZone: 'America/Panama' })}`);
        console.log(`\nGuarda la contraseña en un lugar seguro — no se puede recuperar.`);

    } catch (err) {
        if (err.code === '23505') {
            console.error(`Error: el usuario "${username}" ya existe.`);
            process.exit(1);
        }
        console.error('Error al crear administrador:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

const [,, username, password] = process.argv;
crearAdmin(username, password);
