const mongoose = require('mongoose');

const NIVELES  = ['Primario', 'Secundario'];
const CICLOS   = ['Primario', 'Básico', 'Orientado', 'Técnico'];

const estudianteSchema = new mongoose.Schema({
    nombre:     { type: String, required: true, trim: true },
    apellido:   { type: String, required: true, trim: true },
    nivel:      { type: String, required: true, enum: NIVELES },
    ciclo:      { type: String, required: true, enum: CICLOS  },
    año_grado:  { type: Number, required: true, min: 1, max: 7 },
    division:   { type: String, required: true, trim: true, uppercase: true }
}, {
    timestamps: true
});

module.exports = mongoose.model('Estudiante', estudianteSchema);
