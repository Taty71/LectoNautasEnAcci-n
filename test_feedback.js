const mongoose = require('mongoose');
const { determinarSemaforo, obtenerFeedback, obtenerUmbralesPorNivelYCiclo } = require('./utils/calculoPPM');

async function test() {
    const prosodia = undefined;
    const colorSemaforo = 'verde';
    try {
        const feedbackObj = obtenerFeedback(colorSemaforo, prosodia);
        console.log("FeedbackObj:", feedbackObj);
    } catch(err) {
        console.error("Crash on obtenerFeedback:", err);
    }
}
test();
