/**
 * Umbrales pedagógicos de PPM calibrados a la realidad escolar argentina.
 *
 * Primario: clave = año/grado (1–6).
 * Secundario: clave = ciclo (Básico | Orientado | Técnico).
 *
 * Lógica de semáforo con los valores almacenados:
 *   ppm >= verde        → 'verde'
 *   ppm >= amarillo     → 'amarillo'
 *   ppm <  amarillo     → 'rojo'
 */
const UMBRALES = {
    Primario: {
        1: { amarillo: 25,  verde: 41  },  // Verde: > 40 PPM
        2: { amarillo: 40,  verde: 61  },  // Verde: > 60 PPM
        3: { amarillo: 60,  verde: 76  },  // Verde: > 75 PPM
        4: { amarillo: 70,  verde: 86  },  // Verde: > 85 PPM
        5: { amarillo: 80,  verde: 96  },  // Verde: > 95 PPM
        6: { amarillo: 90,  verde: 106 },  // Verde: > 105 PPM
    },
    Secundario: {
        Básico:    { amarillo: 100, verde: 126 },  // CBU 1°–3°: Verde > 125 PPM
        Orientado: { amarillo: 115, verde: 141 },  // Orientado/Técnico 4°–7°: Verde > 140 PPM
        Técnico:   { amarillo: 115, verde: 141 },
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
 * Determina el color del semáforo pedagógico según nivel, ciclo y año/grado.
 *
 * @param {number} ppm
 * @param {string} nivel     - 'Primario' | 'Secundario'
 * @param {string} ciclo     - 'Primario' | 'Básico' | 'Orientado' | 'Técnico'
 * @param {number} añoGrado  - Año o grado del estudiante (1–7)
 * @returns {'verde'|'amarillo'|'rojo'}
 */
function determinarSemaforo(ppm, nivel, ciclo, añoGrado) {
    const umbrales = obtenerUmbralesPorNivelYCiclo(nivel, ciclo, añoGrado);

    if (ppm >= umbrales.verde)    return 'verde';
    if (ppm >= umbrales.amarillo) return 'amarillo';
    return 'rojo';
}

/**
 * Obtiene los umbrales aplicados según nivel, ciclo y año/grado.
 * - Primario: umbrales distintos por cada grado (1° a 6°).
 * - Secundario: umbrales por ciclo (Básico, Orientado, Técnico).
 *
 * @param {string} nivel
 * @param {string} ciclo
 * @param {number} añoGrado
 * @returns {{ amarillo: number, verde: number, rojoMax: number, amarilloMax: number }}
 */
function obtenerUmbralesPorNivelYCiclo(nivel, ciclo, añoGrado) {
    let base;
    if (nivel === 'Primario') {
        // Clampear grado entre 1 y 6 para evitar accesos fuera de rango
        const grado = Math.min(Math.max(Number(añoGrado) || 1, 1), 6);
        base = UMBRALES.Primario[grado] || UMBRALES.Primario[1];
    } else {
        const umbralesSecundario = UMBRALES.Secundario;
        base = umbralesSecundario[ciclo] || umbralesSecundario.Básico;
    }

    return {
        amarillo:    base.amarillo,
        verde:       base.verde,
        rojoMax:     base.amarillo - 1,
        amarilloMax: base.verde - 1,
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
