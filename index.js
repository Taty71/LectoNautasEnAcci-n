/**
 * index.js — Punto de entrada del servidor de LectoNautas
 *
 * Orden de los middlewares (importante):
 *   1. helmet        → headers HTTP de seguridad
 *   2. cors          → política de orígenes permitidos
 *   3. express.json  → parseo del body con límite de tamaño
 *   4. rateLimit     → límite de peticiones por IP en las rutas de autenticación
 *   5. Rutas         → lógica de la aplicación
 *   6. Manejo global de errores → captura errores no controlados
 */

const express    = require('express');
const mongoose   = require('mongoose');
const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ── 1. HELMET ─────────────────────────────────────────────────────────────────
// Configura automáticamente ~15 cabeceras HTTP de seguridad:
// Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, etc.
// Nota: desactivamos contentSecurityPolicy porque el frontend carga CDNs externos
// (SweetAlert2, Google Fonts, canvas-confetti). En producción conviene configurarlo.
app.use(helmet({ contentSecurityPolicy: false }));

// ── 2. CORS ───────────────────────────────────────────────────────────────────
// Solo permite requests desde los orígenes autorizados.
// En desarrollo aceptamos localhost; en producción se reemplaza por el dominio real.
const ORIGENES_PERMITIDOS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://lectonautasenacci-n.onrender.com'
];

app.use(cors({
  origin: (origin, callback) => {
    // Permite requests sin "origin" (Postman, curl, misma página servida por Express)
    if (!origin || ORIGENES_PERMITIDOS.includes(origin)) {
      return callback(null, true);
    }
    // Bloquea cualquier otro origen
    return callback(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── 3. BODY PARSER ────────────────────────────────────────────────────────────
// Limita el tamaño del cuerpo JSON a 50 KB para prevenir ataques de DoS
// con payloads gigantes (por defecto Express no tiene límite).
app.use(express.json({ limit: '50kb' }));

// ── 4. RATE LIMITING ──────────────────────────────────────────────────────────
// Limita las peticiones a las rutas de autenticación: máximo 20 intentos
// por IP en una ventana de 15 minutos. Esto protege contra fuerza bruta en el login.
const limiteAuth = rateLimit({
  windowMs:        15 * 60 * 1000, // Ventana de 15 minutos
  max:             20,              // Máximo 20 peticiones por IP en ese período
  standardHeaders: true,           // Incluye info del límite en las cabeceras de respuesta
  legacyHeaders:   false,
  message: {
    success: false,
    error:   'Demasiados intentos desde esta IP. Esperá 15 minutos e intentá de nuevo.'
  }
});

// ── 5. ARCHIVOS ESTÁTICOS ─────────────────────────────────────────────────────
// Servimos la interfaz gráfica (HTML, CSS, JS del cliente).
// En desarrollo desactivamos el caché para que los cambios en CSS/JS
// se vean de inmediato sin hacer Ctrl+Shift+R cada vez.
const esModoDesarrollo = process.env.NODE_ENV !== 'production';
app.use(express.static('public', {
  setHeaders: (res, filePath) => {
    if (esModoDesarrollo) {
      // Instruye al navegador a NO guardar copias en caché durante el desarrollo
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
    }
  }
}));

// ── 6. CONEXIÓN A MONGODB ─────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅  Conectado a MongoDB'))
  .catch(err => console.error('❌  Error de conexión a MongoDB:', err));

// ── 7. RUTAS ──────────────────────────────────────────────────────────────────
// Aplicamos el rate limiting solo a las rutas de autenticación (login y registro),
// que son las que necesitan protección contra fuerza bruta.
app.use('/api/auth',         limiteAuth, require('./routes/authRoutes'));
app.use('/api/speech-token',             require('./routes/speechTokenRoute'));
app.use('/api/lecturas',                 require('./routes/lecturaRoutes'));

// ── RUTA TEMPORAL DE DESARROLLO (Recorte de Logos en Cliente) ─────────────────
const fs = require('fs');
const path = require('path');
app.post('/api/save-image', express.json({ limit: '3mb' }), (req, res) => {
  try {
    const { name, base64 } = req.body;
    if (!name || !base64) {
      return res.status(400).json({ success: false, error: 'Parámetros inválidos' });
    }
    const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, 'base64');
    const destPath = path.join(__dirname, 'public', 'recursos', name);
    fs.writeFileSync(destPath, buffer);
    console.log(`✅ [Desarrollo] Imagen recortada guardada: ${name}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error al guardar imagen:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── 8. MANEJO GLOBAL DE ERRORES ───────────────────────────────────────────────
// Captura cualquier error que no haya sido manejado en las rutas.
// En desarrollo muestra el stack trace; en producción solo el mensaje.
// Esto evita que datos internos del servidor (rutas, versiones, BD) queden expuestos.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const esDev = process.env.NODE_ENV === 'development';
  console.error('Error no controlado:', err);
  res.status(err.status || 500).json({
    success: false,
    error:   err.message || 'Error interno del servidor.',
    // Solo en desarrollo mostramos el stack completo para facilitar el debug
    ...(esDev && { stack: err.stack }),
  });
});

// ── 9. INICIO DEL SERVIDOR ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀  Servidor corriendo en http://localhost:${PORT}`));
