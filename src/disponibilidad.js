/**
 * FASE 2: Generación de Cupos
 * 
 * Calcula los slots disponibles para una fecha específica, en un grid fijo.
 * No usamos librerías externas para fechas. Como Panamá no tiene horario 
 * de verano, forzamos el offset UTC-05:00 al construir los objetos Date.
 */

/**
 * @param {string} fecha YYYY-MM-DD
 * @param {object} configuracion { duracion_minutos, anticipacion_minima_horas }
 * @param {Array} horariosDia [{ hora_inicio: '08:00', hora_fin: '12:00' }, ...]
 * @param {boolean} esDiaBloqueado true si el día entero está en dias_bloqueados
 * @param {Array<Date|string>} citasTomadas Fechas ya ocupadas (ISO o Date)
 * @param {Date} [ahora] Opcional. Solo para inyectar una hora actual en los tests.
 * @returns {Array<{ hora_local: string, utc: string }>} Cupos libres
 */
function generarCuposLibres(fecha, configuracion, horariosDia, esDiaBloqueado, citasTomadas, ahora = new Date()) {
    if (esDiaBloqueado) {
        return []; // Si el día completo está bloqueado, devolvemos vacío inmediatamente
    }

    const { duracion_minutos, anticipacion_minima_horas } = configuracion;
    const cuposLibres = [];

    // Convertir citas tomadas a un Set de milisegundos para búsqueda ultrarrápida O(1)
    const citasSet = new Set(
        citasTomadas.map(cita => new Date(cita).getTime())
    );

    // Calcular el umbral mínimo para agendar (ahora + anticipacion mínima)
    const umbralAnticipacion = new Date(ahora.getTime() + (anticipacion_minima_horas * 60 * 60 * 1000));

    for (const bloque of horariosDia) {
        // Asegurar que las horas tengan formato HH:MM (PostgreSQL devuelve HH:MM:SS)
        const horaInicio = bloque.hora_inicio.substring(0, 5);
        const horaFin = bloque.hora_fin.substring(0, 5);

        // Magia anti-timezones: Al agregar '-05:00' al string, Node.js parsea la hora 
        // exactamente como la hora local de Panamá, sin importar dónde corra el servidor.
        const inicioBloqueStr = `${fecha}T${horaInicio}:00-05:00`;
        const finBloqueStr = `${fecha}T${horaFin}:00-05:00`;

        let currentSlot = new Date(inicioBloqueStr);
        const endBloque = new Date(finBloqueStr);

        if (isNaN(currentSlot.getTime()) || isNaN(endBloque.getTime())) {
            console.error('Fecha/hora inválida en bloque:', inicioBloqueStr, finBloqueStr);
            continue;
        }

        // Rejilla fija: mientras el cupo + la duración quepa dentro de este bloque del día
        while (true) {
            const slotFin = new Date(currentSlot.getTime() + (duracion_minutos * 60 * 1000));
            if (slotFin > endBloque || isNaN(slotFin.getTime())) {
                break; 
            }

            // Regla 1: Debe cumplir la anticipación mínima (para que no agenden para ya mismo)
            if (currentSlot >= umbralAnticipacion) {
                // Regla 2: No debe estar en el Set de citas ya tomadas (doble reserva en UI)
                if (!citasSet.has(currentSlot.getTime())) {
                    
                    // Extraer solo "HH:MM" en hora de Panamá para renderizar fácil en el Frontend
                    const horaLocal = currentSlot.toLocaleTimeString('en-US', {
                        timeZone: 'America/Panama',
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    cuposLibres.push({
                        hora_local: horaLocal,
                        utc: currentSlot.toISOString() // Formato UTC real para mandar y guardar en la BD
                    });
                }
            }

            // Avanzamos al siguiente slot en la rejilla
            currentSlot = slotFin;
        }
    }

    return cuposLibres;
}

module.exports = { generarCuposLibres };

// ============================================================================
// CASOS DE PRUEBA (Para ejecución manual)
// ============================================================================
if (require.main === module) {
    console.log("Corriendo pruebas de generación de cupos (Fase 2)...\n");

    const config = { duracion_minutos: 30, anticipacion_minima_horas: 2 };
    const horarioNormal = [
        { hora_inicio: '08:00', hora_fin: '12:00' }, // Mañana
        { hora_inicio: '13:00', hora_fin: '17:00' }  // Tarde (después de almorzar)
    ];
    const fechaTest = '2023-11-01'; // Miércoles cualquiera

    // PRUEBA 1: Día normal sin citas. Son las 05:00 AM. Todos los cupos deben salir.
    const ahoraTemprano = new Date('2023-11-01T05:00:00-05:00');
    console.log("1️⃣  Día normal vacío (Temprano en la mañana)");
    const cupos1 = generarCuposLibres(fechaTest, config, horarioNormal, false, [], ahoraTemprano);
    console.log(`  - Esperado: 16 cupos | Obtenido: ${cupos1.length}`);
    console.log(`  - Primer cupo: ${cupos1[0]?.hora_local} | Último: ${cupos1[cupos1.length-1]?.hora_local}\n`);

    // PRUEBA 2: Son las 07:00 AM. Anticipación mínima es 2 horas. 
    // Los de las 08:00 y 08:30 no se pueden tomar. El primero debe ser a las 09:00.
    const ahoraTarde = new Date('2023-11-01T07:00:00-05:00');
    console.log("2️⃣  Respeto de anticipación mínima (2 horas)");
    const cupos2 = generarCuposLibres(fechaTest, config, horarioNormal, false, [], ahoraTarde);
    const incluye8AM = cupos2.some(c => c.hora_local === '08:00');
    console.log(`  - ¿Incluye 08:00? (Esperado: false) | Obtenido: ${incluye8AM}`);
    console.log(`  - Primer cupo válido (Esperado: 09:00) | Obtenido: ${cupos2[0]?.hora_local}\n`);

    // PRUEBA 3: Alguien ya agendó a las 09:30 AM y a las 02:00 PM (14:00).
    const citasOcupadas = [
        '2023-11-01T09:30:00-05:00',
        '2023-11-01T14:00:00-05:00'
    ];
    console.log("3️⃣  Exclusión de citas ya tomadas");
    const cupos3 = generarCuposLibres(fechaTest, config, horarioNormal, false, citasOcupadas, ahoraTemprano);
    const libre930 = cupos3.some(c => c.hora_local === '09:30');
    const libre1400 = cupos3.some(c => c.hora_local === '14:00');
    console.log(`  - Esperado: 14 cupos | Obtenido: ${cupos3.length}`);
    console.log(`  - ¿Está libre 09:30? (Esperado: false) | Obtenido: ${libre930}`);
    console.log(`  - ¿Está libre 14:00? (Esperado: false) | Obtenido: ${libre1400}\n`);

    // PRUEBA 4: Día Bloqueado por feriado. No debe generar ningún cupo.
    console.log("4️⃣  Día bloqueado por feriado");
    const cupos4 = generarCuposLibres(fechaTest, config, horarioNormal, true, [], ahoraTemprano);
    console.log(`  - Esperado: 0 cupos | Obtenido: ${cupos4.length}\n`);
}
