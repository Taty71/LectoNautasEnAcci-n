const express = require('express');
const router  = express.Router();
const { verificarToken } = require('../middlewares/autenticar');

/**
 * GET /api/speech-token
 *
 * Emite un token temporal de Azure AI Speech (válido 10 minutos) para que
 * el navegador pueda usar el SDK de Azure directamente, sin que la clave
 * real quede expuesta en el frontend.
 *
 * Patrón "Backend como proxy de tokens":
 *   Navegador → pide token a NUESTRO servidor (con JWT)
 *   Nuestro servidor → pide token a Azure (con la clave secreta)
 *   Nuestro servidor → devuelve token temporal al navegador
 *   Navegador → usa ese token para hablar con Azure
 *
 * Requiere las variables de entorno:
 *   AZURE_SPEECH_KEY    — clave del recurso Azure AI Speech
 *   AZURE_SPEECH_REGION — región del recurso (ej: brazilsouth, eastus)
 */
router.get('/', verificarToken, async (req, res) => {
    const key    = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION;

    // Si las variables de entorno no están configuradas aún, avisamos con un mensaje claro
    if (!key || !region) {
        return res.status(503).json({
            success: false,
            error: 'El servicio de evaluación de voz no está configurado todavía. ' +
                   'Contactá al administrador.'
        });
    }

    try {
        // Llamamos al endpoint de Azure para obtener un token temporal de 10 minutos
        const tokenUrl = `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;

        const azureResp = await fetch(tokenUrl, {
            method:  'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': key,
                'Content-Length': '0'
            }
        });

        if (!azureResp.ok) {
            // Azure rechazó la petición (clave inválida, región incorrecta, etc.)
            const detalle = await azureResp.text().catch(() => '');
            console.error(`Error Azure Speech token: HTTP ${azureResp.status}`, detalle);
            throw new Error(`Azure respondió con estado ${azureResp.status}.`);
        }

        const token = await azureResp.text();

        // Devolvemos el token y la región al frontend.
        // El frontend usará ambos para inicializar el SDK de Azure.
        res.json({ success: true, token, region });

    } catch (error) {
        console.error('Error al obtener token de Azure Speech:', error.message);
        res.status(502).json({
            success: false,
            error: 'No se pudo conectar con el servicio de voz. Verificá la configuración de Azure.'
        });
    }
});

module.exports = router;
