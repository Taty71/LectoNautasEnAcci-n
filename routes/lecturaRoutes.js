const express = require('express');
const router  = express.Router();
const Lectura = require('../models/lectura.js');
const { verificarToken, permitirRoles } = require('../middlewares/autenticar');
const {
    calcularPPM,
    determinarSemaforo,
    obtenerFeedback,
    obtenerUmbralesPorNivelYCiclo,
    ajustarMetricas,
} = require('../utils/calculoPPM');

/**
 * POST /api/lecturas
 * Registra una sesión de lectura, calcula las PPM con el tiempo real empleado
 * y determina el color del semáforo según el nivel y ciclo del estudiante.
 *
 * Body esperado:
 *   estudiante             {object}  - { nombre, apellido, nivel, ciclo, año_grado, division }
 *   textoTranscrito        {string}  - Texto capturado por Web Speech API
 *   palabrasContadas       {number}  - Palabras totales del texto transcrito
 *   tiempoEmpleadoSegundos {number}  - Tiempo real de lectura en segundos
 *   prosodia               {string}  - Evaluación de ritmo y prosodia del docente
 *   pausasDetectadas       {number}  - Cantidad de signos de puntuación detectados por la IA
 */
router.post('/', verificarToken, permitirRoles('Docente', 'Administrador'), async (req, res) => {
    try {
        const {
            estudiante,            // Objeto con los datos del alumno ingresados en el formulario
            textoTranscrito,
            palabrasContadas,
            tiempoEmpleadoSegundos,
            prosodia,
            pausasDetectadas,
            // Métricas de Azure AI Speech (opcionales: pueden ser null si Azure no estuvo disponible)
            fluencyScore,
            accuracyScore,
            prosodyScore
        } = req.body;

        // Extraemos nivel, ciclo y año_grado desde el sub-objeto "estudiante" del body
        const nivel     = estudiante?.nivel;
        const ciclo     = estudiante?.ciclo;
        const añoGrado  = estudiante?.año_grado;

        if (!palabrasContadas || !tiempoEmpleadoSegundos || !nivel || !ciclo) {
            return res.status(400).json({
                success: false,
                error: 'Faltan datos obligatorios: palabrasContadas, tiempoEmpleadoSegundos, nivel y ciclo.'
            });
        }

        // ── Validación de rangos realistas ────────────────────────────────────
        // El límite humano de lectura es ~250 PPM. En 2 minutos (el máximo permitido)
        // eso son 500 palabras. Usamos 600 como margen de seguridad.
        // Si se supera, es probable que haya un error de duplicación en el reconocedor.
        const palabras = Number(palabrasContadas);
        const tiempo   = Number(tiempoEmpleadoSegundos);

        if (!Number.isFinite(palabras) || palabras < 0 || palabras > 600) {
            return res.status(400).json({
                success: false,
                error: `Se registraron ${palabras} palabras, lo cual supera el límite esperado. ` +
                       'Intentá la lectura nuevamente. Si el problema persiste, recargá la página.'
            });
        }
        if (!Number.isFinite(tiempo) || tiempo < 1 || tiempo > 120) {
            return res.status(400).json({ success: false, error: 'Tiempo de lectura fuera de rango (1-120 segundos). Intentá nuevamente.' });
        }

        // ── Validar nivel y ciclo contra valores permitidos ───────────────────
        const NIVELES_VALIDOS = ['Primario', 'Secundario'];
        const CICLOS_VALIDOS  = ['Primario', 'Básico', 'Orientado', 'Técnico'];
        if (!NIVELES_VALIDOS.includes(nivel)) {
            return res.status(400).json({ success: false, error: 'Nivel educativo inválido.' });
        }
        if (!CICLOS_VALIDOS.includes(ciclo)) {
            return res.status(400).json({ success: false, error: 'Ciclo educativo inválido.' });
        }

        const ppm           = calcularPPM(palabras, tiempo);
        const colorSemaforo = determinarSemaforo(ppm, nivel, ciclo, añoGrado);
        const feedbackObj   = obtenerFeedback(colorSemaforo, prosodia);
        const umbrales      = obtenerUmbralesPorNivelYCiclo(nivel, ciclo, añoGrado);

        // Ajustar métricas de Azure para coherencia pedagógica con el semáforo
        const metricasAjustadas = ajustarMetricas(colorSemaforo, {
            fluencyScore:  (fluencyScore  != null && !isNaN(fluencyScore))  ? Number(fluencyScore)  : null,
            accuracyScore: (accuracyScore != null && !isNaN(accuracyScore)) ? Number(accuracyScore) : null,
            pronScore:     (prosodyScore  != null && !isNaN(prosodyScore))  ? Number(prosodyScore)  : null,
        });

        // Creamos el nuevo registro vinculando el id del docente autenticado (req.usuario.id)
        const nuevaLectura = new Lectura({
            docenteId:              req.usuario.id,
            estudiante:             estudiante || undefined,
            textoTranscrito,
            palabrasContadas:       palabras,
            tiempoEmpleadoSegundos: tiempo,
            ppm,
            colorSemaforo,
            prosodia:               prosodia || undefined,
            pausasDetectadas:       pausasDetectadas !== undefined ? Number(pausasDetectadas) : undefined,
            // Guardar métricas ya ajustadas pedagógicamente
            fluencyScore:  metricasAjustadas.fluencyScore  ?? undefined,
            accuracyScore: metricasAjustadas.accuracyScore ?? undefined,
            prosodyScore:  metricasAjustadas.pronScore     ?? undefined,
            feedback:      feedbackObj?.mensaje || undefined
        });
        await nuevaLectura.save();

        res.json({
            success: true, ppm, color: colorSemaforo, nivel, ciclo, umbrales, ...feedbackObj,
            fluencyScore:  nuevaLectura.fluencyScore  ?? null,
            accuracyScore: nuevaLectura.accuracyScore ?? null,
            prosodyScore:  nuevaLectura.prosodyScore  ?? null
        });
    } catch (error) {
        console.error('Error al procesar la lectura:', error);
        res.status(500).json({ success: false, error: 'Error interno al procesar la lectura.' });
    }
});

/**
 * POST /api/lecturas/evaluar  (compatibilidad con el frontend actual)
 * Recibe las palabras ya contadas en el frontend (sesión de 60 s fijos).
 * Usa nivel y ciclo si se envían; si no, aplica umbrales de Primario.
 */
router.post('/evaluar', verificarToken, permitirRoles('Docente', 'Administrador'), async (req, res) => {
    try {
        const {
            ppm: ppmFrontend,
            nivel     = 'Primario',
            ciclo     = 'Primario',
            año_grado = 1
        } = req.body;

        const colorSemaforo = determinarSemaforo(Number(ppmFrontend), nivel, ciclo, año_grado);
        const feedback      = obtenerFeedback(colorSemaforo);
        const umbrales      = obtenerUmbralesPorNivelYCiclo(nivel, ciclo, año_grado);

        const nuevaLectura = new Lectura({
            docenteId:              req.usuario.id,
            palabrasContadas:       Number(ppmFrontend),
            tiempoEmpleadoSegundos: 60,
            ppm:                    Number(ppmFrontend),
            colorSemaforo
        });
        await nuevaLectura.save();

        res.json({
            success: true,
            ppm: Number(ppmFrontend),
            color: colorSemaforo,
            nivel,
            ciclo,
            umbrales,
            ...feedback
        });
    } catch (error) {
        console.error('Error al evaluar la lectura:', error);
        res.status(500).json({ success: false, error: 'Error al procesar la lectura.' });
    }
});

/**
 * GET /api/lecturas/historial
 * Devuelve todas las lecturas del docente autenticado, ordenadas de la más
 * reciente a la más antigua. Requiere token válido de Docente o Administrador.
 */
router.get('/historial', verificarToken, permitirRoles('Docente', 'Administrador'), async (req, res) => {
    try {
        // Buscamos solo los registros que pertenezcan al docente logueado
        const lecturas = await Lectura
            .find({ docenteId: req.usuario.id })
            .sort({ createdAt: -1 });  // -1 = descendente → la más nueva primero

        res.json({ success: true, total: lecturas.length, lecturas });
    } catch (error) {
        console.error('Error al obtener el historial:', error);
        res.status(500).json({ success: false, error: 'No se pudo obtener el historial.' });
    }
});

router.get('/estadisticas', verificarToken, permitirRoles('Docente', 'Administrador'), async (req, res) => {
    try {
        // Filtramos por el docente autenticado para no exponer datos globales.
        // Un Administrador podría ver todo, pero por simplicidad se aplica el mismo filtro.
        const filtro = { docenteId: req.usuario.id };

        const totalLecturas = await Lectura.countDocuments(filtro);
        const porColor = await Lectura.aggregate([
            { $match: filtro },
            {
                $group: {
                    _id: '$colorSemaforo',
                    total: { $sum: 1 },
                },
            },
        ]);

        const promedioPPM = await Lectura.aggregate([
            { $match: filtro },
            {
                $group: {
                    _id: null,
                    promedio: { $avg: '$ppm' },
                },
            },
        ]);

        const estadisticasColor = porColor.reduce((acumulado, item) => {
            acumulado[item._id || 'sin_color'] = item.total;
            return acumulado;
        }, {});

        return res.json({
            success: true,
            totalLecturas,
            porColor: estadisticasColor,
            promedioPPM: promedioPPM[0]?.promedio ? Math.round(promedioPPM[0].promedio) : 0,
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        return res.status(500).json({ success: false, error: 'No se pudieron obtener las estadísticas.' });
    }
});

module.exports = router;
