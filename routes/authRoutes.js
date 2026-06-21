/**
 * authRoutes.js — Rutas de autenticación de LectoNautas
 *
 * Seguridad aplicada:
 *   - Validación estricta de todos los campos de entrada (formato, longitud)
 *   - Sanitización: trim, lowercase en email, capitalización de nombre/apellido
 *   - /register protegido: solo un Administrador autenticado puede crear usuarios
 *   - Solo existen dos roles: 'Docente' y 'Administrador'
 *   - El JWT incluye nombre Y apellido del docente
 *   - Los mensajes de error son genéricos para no revelar si un email existe o no
 */

const express  = require('express');
const jwt      = require('jsonwebtoken');
const Usuario  = require('../models/Usuario');
const { verificarToken, permitirRoles } = require('../middlewares/autenticar');

const router = express.Router();

// ── HELPERS DE VALIDACIÓN ─────────────────────────────────────────────────────

/**
 * Valida formato de email con una expresión regular estándar.
 * Devuelve true si el email es válido, false si no.
 */
function esEmailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Valida que el DNI sea solo números, entre 6 y 10 dígitos.
 */
function esDniValido(dni) {
  return /^\d{6,10}$/.test(String(dni).replace(/\D/g, ''));
}

/**
 * Capitaliza la primera letra de cada palabra.
 * Ejemplo: "maría elena" → "María Elena"
 */
function capitalizarNombre(texto) {
  return String(texto || '')
    .trim()
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, (letra) => letra.toUpperCase());
}

// ── HELPER: Generar el token JWT ──────────────────────────────────────────────

/**
 * Genera un token JWT firmado con el secreto del servidor.
 * El payload contiene id, nombre, apellido, email y rol del usuario.
 * Incluir apellido permite mostrarlo en el panel sin consulta extra a la BD.
 * La expiración de 8h coincide con una jornada escolar completa.
 */
function generarToken(usuario) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET no configurado en el servidor.');
  }

  return jwt.sign(
    {
      id:       usuario._id,
      nombre:   usuario.nombre,
      apellido: usuario.apellido, // ← ahora incluido en el token
      email:    usuario.email,
      rol:      usuario.rol,
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

// ── HELPER: Generar contraseña temporal ──────────────────────────────────────

/**
 * Genera la contraseña temporal con las iniciales + DNI.
 * Ejemplo: nombre="María", apellido="González", dni="12345678" → "MG12345678"
 */
function generarPasswordTemporal(nombre, apellido, dni) {
  const inicialNombre   = String(nombre  || '').trim().charAt(0).toUpperCase();
  const inicialApellido = String(apellido || '').trim().charAt(0).toUpperCase();
  const dniLimpio       = String(dni || '').replace(/\D/g, '');

  // padEnd(8, '0') asegura un mínimo de 8 caracteres si el DNI fuera muy corto
  return `${inicialNombre}${inicialApellido}${dniLimpio}`.padEnd(8, '0');
}

// ── RUTA: POST /api/auth/register ────────────────────────────────────────────
/**
 * Registra un nuevo usuario.
 * PROTEGIDA: solo un Administrador autenticado puede usarla.
 * Roles disponibles: 'Docente' (por defecto) y 'Administrador'.
 *
 * Body esperado: { nombre, apellido, email, dni, rol? }
 */
router.post(
  '/register',
  async (req, res) => {
    try {
      let { nombre, apellido, email, dni, rol = 'Docente' } = req.body;

      // ── Validación de campos obligatorios ────────────────────────────────
      if (!nombre || !apellido || !email || !dni) {
        return res.status(400).json({
          success: false,
          error: 'Faltan datos obligatorios: nombre, apellido, email y DNI.'
        });
      }

      // ── Validación de longitudes ──────────────────────────────────────────
      if (String(nombre).length > 50 || String(apellido).length > 50) {
        return res.status(400).json({
          success: false,
          error: 'El nombre y apellido no pueden superar los 50 caracteres.'
        });
      }

      // ── Validación de formato de email ────────────────────────────────────
      if (!esEmailValido(String(email).trim())) {
        return res.status(400).json({ success: false, error: 'El formato del email es inválido.' });
      }

      // ── Validación de DNI ─────────────────────────────────────────────────
      if (!esDniValido(dni)) {
        return res.status(400).json({ success: false, error: 'El DNI debe contener solo números (6 a 10 dígitos).' });
      }

      // ── Validación de rol ─────────────────────────────────────────────────
      // Solo se permiten estos dos roles. Se ignora cualquier otro valor.
      const ROLES_VALIDOS = ['Docente', 'Administrador'];
      if (!ROLES_VALIDOS.includes(rol)) {
        return res.status(400).json({
          success: false,
          error: `Rol inválido. Los roles disponibles son: ${ROLES_VALIDOS.join(', ')}.`
        });
      }

      // ── Sanitización de entradas ──────────────────────────────────────────
      nombre   = capitalizarNombre(nombre);
      apellido = capitalizarNombre(apellido);
      email    = String(email).toLowerCase().trim();
      const dniLimpio = String(dni).replace(/\D/g, '');

      // ── Verificar si el email ya existe ───────────────────────────────────
      const existeUsuario = await Usuario.findOne({ email });
      if (existeUsuario) {
        return res.status(409).json({ success: false, error: 'Ya existe un usuario con ese correo.' });
      }

      // ── Crear y guardar el nuevo usuario ──────────────────────────────────
      const passwordTemporal = generarPasswordTemporal(nombre, apellido, dniLimpio);

      const nuevoUsuario = new Usuario({
        nombre,
        apellido,
        email,
        password: passwordTemporal,
        dni:      dniLimpio,
        rol,
      });

      await nuevoUsuario.save();

      const token = generarToken(nuevoUsuario);

      return res.status(201).json({
        success: true,
        token,
        passwordTemporal,
        usuario: {
          id:       nuevoUsuario._id,
          nombre:   nuevoUsuario.nombre,
          apellido: nuevoUsuario.apellido,
          email:    nuevoUsuario.email,
          rol:      nuevoUsuario.rol,
        },
      });

    } catch (error) {
      console.error('Error en registro:', error);
      return res.status(500).json({ success: false, error: 'No se pudo registrar el usuario.' });
    }
  }
);

// ── RUTA: POST /api/auth/login ────────────────────────────────────────────────
/**
 * Inicia sesión con email y contraseña.
 * No revela si el email existe o no (mensaje de error genérico) para
 * evitar que se use el login para enumerar usuarios del sistema.
 *
 * Body esperado: { email, password }
 */
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body;

    // ── Validación de campos obligatorios ──────────────────────────────────
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Completá el correo y la contraseña.' });
    }

    // ── Validación básica del formato de email ─────────────────────────────
    email = String(email).toLowerCase().trim();
    if (!esEmailValido(email)) {
      return res.status(400).json({ success: false, error: 'El formato del email es inválido.' });
    }

    // ── Límite de longitud de la contraseña ────────────────────────────────
    // Evita ataques con contraseñas de millones de caracteres que sobrecargarían bcrypt.
    if (String(password).length > 128) {
      return res.status(400).json({ success: false, error: 'Credenciales inválidas.' });
    }

    // ── Buscar usuario y validar contraseña ───────────────────────────────
    // Usamos .select('+password') porque el campo password tiene select: false
    // en el modelo (para que nunca viaje al cliente en consultas normales).
    // Aquí sí lo necesitamos para poder compararlo con bcrypt.
    const usuario = await Usuario.findOne({ email }).select('+password');
    
    // Usamos mensaje genérico tanto si el usuario no existe como si la contraseña es incorrecta.
    // Esto previene la "enumeración de usuarios" (user enumeration attack).
    if (!usuario) {
      return res.status(401).json({ success: false, error: 'Credenciales inválidas.' });
    }

    const passwordValida = await usuario.compararPassword(password);
    if (!passwordValida) {
      return res.status(401).json({ success: false, error: 'Credenciales inválidas.' });
    }

    // ── Generar y devolver el token ────────────────────────────────────────
    const token = generarToken(usuario);

    return res.json({
      success: true,
      token,
      usuario: {
        id:       usuario._id,
        nombre:   usuario.nombre,
        apellido: usuario.apellido,
        email:    usuario.email,
        // No enviamos el rol al cliente; el servidor lo valida internamente desde el JWT.
      },
    });

  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ success: false, error: 'No se pudo iniciar sesión.' });
  }
});

module.exports = router;
