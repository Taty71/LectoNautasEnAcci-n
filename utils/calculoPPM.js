/**
 * Umbrales pedagógicos de PPM según nivel y ciclo educativo.
 * Sistema educativo argentino — valores de referencia para docentes.
 *
 * Estructura: { amarillo: N, verde: N }
 *   ppm >= verde        → 'verde'
 *   ppm >= amarillo     → 'amarillo'
 *   ppm <  amarillo     → 'rojo'
 */
const UMBRALES = {
    Primario: {
        Primario: { amarillo: 60, verde: 86 }
    },
    Secundario: {
        Básico:    { amarillo: 100, verde: 126 },
        Orientado: { amarillo: 120, verde: 146 },
        Técnico:   { amarillo: 120, verde: 146 }
    }
};

const FEEDBACK_POR_COLOR = {
    verde: {
        emoticon: '<img src="./recursos/cinco-estrellas.png" alt="5 estrellas" class="emoji-img">',
        mensaje:  '¡Lectura fluida e increíble!'
    },
    amarillo: {
        emoticon: '<img src="./recursos/como.png" alt="Pulgar arriba" class="emoji-img">',
        mensaje:  'Vas por buen camino, ¡sigue practicando!'
    },
    rojo: {
        emoticon: '<img src="./recursos/musculo.png" alt="Músculo" class="emoji-img">',
        mensaje:  '¡No te rindas! Mañana lo harás mejor.'
    }
};

/**
 * Calcula las Palabras Por Minuto a partir del tiempo real de lectura.
 * @param {number} palabrasContadas       - Total de palabras leídas.
 * @param {number} tiempoEmpleadoSegundos - Segundos efectivos de lectura.
 * @returns {number} PPM redondeadas a entero.
 */
function calcularPPM(palabrasContadas, tiempoEmpleadoSegundos) {
    if (!tiempoEmpleadoSegundos || tiempoEmpleadoSegundos <= 0) return 0;
    return Math.round((palabrasContadas / tiempoEmpleadoSegundos) * 60);
}

/**
 * Determina el color del semáforo pedagógico según nivel y ciclo educativo.
 *
 * Reglas:
 *   - Primario               → rojo < 60  | amarillo 60–85  | verde > 85
 *   - Secundario Básico      → rojo < 100 | amarillo 100–125 | verde > 125
 *   - Secundario Orientado/Técnico → rojo < 120 | amarillo 120–145 | verde > 145
 *
 * @param {number} ppm   - PPM calculadas.
 * @param {string} nivel - 'Primario' | 'Secundario'
 * @param {string} ciclo - 'Primario' | 'Básico' | 'Orientado' | 'Técnico'
 * @returns {'verde'|'amarillo'|'rojo'}
 */
function determinarSemaforo(ppm, nivel, ciclo) {
    const umbrales = obtenerUmbralesPorNivelYCiclo(nivel, ciclo);

    if (ppm >= umbrales.verde)    return 'verde';
    if (ppm >= umbrales.amarillo) return 'amarillo';
    return 'rojo';
}

/**
 * Obtiene los umbrales aplicados según nivel y ciclo.
 * @param {string} nivel
 * @param {string} ciclo
 * @returns {{ amarillo: number, verde: number, rojoMax: number, amarilloMax: number }}
 */
function obtenerUmbralesPorNivelYCiclo(nivel, ciclo) {
    const umbralesNivel = UMBRALES[nivel];
    const umbrales = umbralesNivel
        ? (umbralesNivel[ciclo] || Object.values(umbralesNivel)[0])
        : UMBRALES.Primario.Primario;

    return {
        amarillo: umbrales.amarillo,
        verde: umbrales.verde,
        rojoMax: umbrales.amarillo - 1,
        amarilloMax: umbrales.verde - 1
    };
}

/**
 * Devuelve el feedback visual (emoticon y mensaje) para un color de semáforo.
 * Si la prosodia es 'Plana / Apurada' y el color es 'verde', agrega una
 * observación pedagógica para orientar al docente.
 * @param {'verde'|'amarillo'|'rojo'} colorSemaforo
 * @param {string} [prosodia]
 * @returns {{ emoticon: string, mensaje: string, observacion?: string }}
 */
function obtenerFeedback(colorSemaforo, prosodia) {
    const feedback = { ...(FEEDBACK_POR_COLOR[colorSemaforo] || FEEDBACK_POR_COLOR.rojo) };
    if (colorSemaforo === 'verde' && prosodia === 'Plana / Apurada') {
        feedback.observacion = 'Velocidad adecuada, pero requiere trabajar entonación y pausas.';
    }
    return feedback;
}

module.exports = {
    calcularPPM,
    determinarSemaforo,
    obtenerFeedback,
    obtenerUmbralesPorNivelYCiclo
};
