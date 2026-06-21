/**
 * models/Usuario.js — Modelo de usuario para LectoNautas
 *
 * Seguridad aplicada:
 *   - Solo existen dos roles: 'Docente' y 'Administrador'
 *   - Validación de formato de email en el esquema de Mongoose
 *   - Validación de que el DNI sea solo numérico
 *   - Hash de contraseña con bcrypt (factor de costo 10) antes de guardar
 *   - El campo `password` se excluye por defecto de las consultas (select: false)
 *     para que nunca viaje al cliente accidentalmente
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// Los únicos roles disponibles en el sistema
const ROLES = ['Docente', 'Administrador'];

const usuarioSchema = new mongoose.Schema({
  nombre: {
    type:     String,
    required: [true, 'El nombre es obligatorio.'],
    trim:     true,
    maxlength: [50, 'El nombre no puede superar los 50 caracteres.'],
  },
  apellido: {
    type:     String,
    required: [true, 'El apellido es obligatorio.'],
    trim:     true,
    maxlength: [50, 'El apellido no puede superar los 50 caracteres.'],
  },
  email: {
    type:     String,
    required: [true, 'El email es obligatorio.'],
    unique:   true,
    trim:     true,
    lowercase: true,
    // Validación de formato de email directamente en el esquema
    validate: {
      validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      message:   'El formato del email es inválido.'
    }
  },
  password: {
    type:     String,
    required: [true, 'La contraseña es obligatoria.'],
    minlength: [8, 'La contraseña debe tener al menos 8 caracteres.'],
    // select: false hace que la contraseña NUNCA se devuelva en consultas normales.
    // Para poder compararla hay que pedirla explícitamente: Usuario.findOne().select('+password')
    select:   false,
  },
  dni: {
    type:     String,
    required: [true, 'El DNI es obligatorio.'],
    trim:     true,
    // Validación: solo números entre 6 y 10 dígitos
    validate: {
      validator: (v) => /^\d{6,10}$/.test(v),
      message:   'El DNI debe contener solo números (6 a 10 dígitos).'
    }
  },
  rol: {
    type:     String,
    required: [true, 'El rol es obligatorio.'],
    enum:     { values: ROLES, message: 'Rol inválido. Los roles disponibles son: Docente, Administrador.' },
    default:  'Docente',
  },
}, {
  timestamps: true, // Agrega createdAt y updatedAt automáticamente
});

// ── HOOK: Hash de contraseña antes de guardar ─────────────────────────────────
// Este hook se ejecuta SOLO cuando la contraseña fue modificada (nueva o cambio).
// bcrypt.genSalt(10) genera un "salt" aleatorio para que dos contraseñas iguales
// tengan hashes distintos. El costo 10 es el estándar recomendado.
usuarioSchema.pre('save', async function () {
  // Si la contraseña no fue modificada, salimos sin hacer nada
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ── MÉTODO: Comparar contraseña ───────────────────────────────────────────────
// Compara la contraseña ingresada por el usuario con el hash guardado en la BD.
// bcrypt.compare es resistente a ataques de timing porque siempre tarda lo mismo.
usuarioSchema.methods.compararPassword = function (passwordPlano) {
  return bcrypt.compare(passwordPlano, this.password);
};

const Usuario = mongoose.model('Usuario', usuarioSchema);

module.exports = Usuario;
module.exports.ROLES_USUARIO = ROLES;
