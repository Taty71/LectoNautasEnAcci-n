const mongoose = require('mongoose');

// Sub-documento que guarda los datos del estudiante al momento de la evaluación.
// Al guardarlo directamente en la lectura, el historial queda intacto aunque
// los datos del estudiante cambien en el futuro.
const estudianteSnapSchema = new mongoose.Schema({
    nombre:    { type: String, trim: true },
    apellido:  { type: String, trim: true },
    nivel:     { type: String },
    ciclo:     { type: String },
    año_grado: { type: Number },
    division:  { type: String, trim: true, uppercase: true }
}, { _id: false }); // _id: false → no genera un ID propio para el sub-documento

const lecturaSchema = new mongoose.Schema({
    docenteId:             { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    estudianteId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Estudiante' }, // Opcional por si a futuro hay un modelo separado
    estudiante: {
        nombre:     { type: String, required: true },
        apellido:   { type: String, required: true },
        nivel:      { type: String, required: true },
        ciclo:      { type: String, required: true },
        año_grado:  { type: Number, required: true },
        division:   { type: String, required: true }
    },
    textoTranscrito:       { type: String },
    palabrasContadas:      { type: Number },
    tiempoEmpleadoSegundos:{ type: Number },
    ppm:                   { type: Number },
    colorSemaforo:         { type: String, enum: ['rojo', 'amarillo', 'verde'] },
    prosodia:              { type: String },
    pausasDetectadas:      { type: Number },
    feedback:              { type: String },   // Guardamos el mensaje de devolución
    fecha:                 { type: Date, default: Date.now }
}, {
    timestamps: true
});

module.exports = mongoose.model('Lectura', lecturaSchema);
