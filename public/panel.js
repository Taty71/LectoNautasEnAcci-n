/**
 * panel.js — Lógica del Panel del Docente
 *
 * Este script se encarga de:
 * 1. Verificar que el docente esté autenticado (token válido).
 * 2. Consumir el endpoint GET /api/lecturas/historial para obtener los registros.
 * 3. Renderizar las tarjetas del historial en la lista.
 * 4. Actualizar las estadísticas rápidas (total, verde, amarillo, rojo).
 * 5. Permitir filtrar por color, nivel y búsqueda por nombre.
 * 6. Mostrar un modal con el detalle completo al hacer clic en una tarjeta.
 */

// ── CONSTANTES ──────────────────────────────────────────
// Etiquetas amigables para mostrar los colores del semáforo
const ETIQUETA_COLOR = {
  verde:    '🟢 Verde',
  amarillo: '🟡 Amarillo',
  rojo:     '🔴 Rojo'
};

// ── REFERENCIAS A ELEMENTOS DEL DOM ──────────────────────
const estadoCargaEl   = document.getElementById('estado-carga');
const estadoVacioEl   = document.getElementById('estado-vacio');
const listaEl         = document.getElementById('lista-lecturas');
const filtroColor     = document.getElementById('filtro-color');
const filtroNivel     = document.getElementById('filtro-nivel');
const filtroBusqueda  = document.getElementById('filtro-busqueda');
const modalOverlay    = document.getElementById('modal-overlay');
const modalCerrar     = document.getElementById('modal-cerrar');
const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');

// Referencias a los números de las estadísticas
const statTotalEl    = document.getElementById('stat-total-num');
const statVerdeEl    = document.getElementById('stat-verde-num');
const statAmarilloEl = document.getElementById('stat-amarillo-num');
const statRojoEl     = document.getElementById('stat-rojo-num');

// ── ESTADO LOCAL ─────────────────────────────────────────
let todasLasLecturas = []; // Guardamos todos los registros para filtrar sin volver al servidor

// ── INICIALIZACIÓN ───────────────────────────────────────
// Cuando el DOM está listo, inicializamos el panel
document.addEventListener('DOMContentLoaded', () => {
  // Redirigir al login si no hay sesión activa
  if (!requerirToken()) return;

  // ── Mostrar nombre del docente logueado ──────────────────
  // Leemos los datos del usuario que se guardaron en localStorage al hacer login
  const usuario = obtenerUsuario();
  const panelDocenteNombreEl = document.getElementById('panel-docente-nombre');
  if (panelDocenteNombreEl && usuario) {
    // Construimos el texto "Docente: Nombre Apellido"
    const nombreCompleto = [usuario.nombre, usuario.apellido].filter(Boolean).join(' ');
    panelDocenteNombreEl.textContent = `Docente: ${nombreCompleto}`;
  }

  // Manejar el botón de cerrar sesión
  if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', cerrarSesion);
  }

  // Cargar el historial desde la API
  cargarHistorial();

  // Conectar los filtros para que reaccionen en tiempo real
  filtroColor.addEventListener('change', renderizarLista);
  filtroNivel.addEventListener('change', renderizarLista);
  filtroBusqueda.addEventListener('input', renderizarLista);

  // Cerrar el modal al hacer clic en la "×" o fuera del modal
  modalCerrar.addEventListener('click', cerrarModal);
  modalOverlay.addEventListener('click', (e) => {
    // Solo cierra si el clic fue en el fondo oscuro, no en la tarjeta del modal
    if (e.target === modalOverlay) cerrarModal();
  });

  // También se puede cerrar el modal con la tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarModal();
  });
});

// ── FUNCIÓN: Cargar el historial desde la API ─────────────
async function cargarHistorial() {
  mostrarEstado('cargando');

  try {
    const response = await fetch('/api/lecturas/historial', {
      method: 'GET',
      headers: authHeaders() // Añade el token JWT en la cabecera Authorization
    });

    // Si el token expiró o es inválido, redirigimos al login
    if (response.status === 401) {
      cerrarSesion();
      return;
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Error al cargar el historial.');
    }

    todasLasLecturas = data.lecturas;

    // Mostrar estado vacío o la lista según si hay registros
    if (todasLasLecturas.length === 0) {
      mostrarEstado('vacio');
    } else {
      mostrarEstado('lista');
      actualizarEstadisticas(todasLasLecturas);
      renderizarLista();
    }
  } catch (error) {
    console.error('Error al cargar historial:', error);
    mostrarEstado('error', error.message);
  }
}

// ── FUNCIÓN: Controlar qué estado visual se muestra ──────
// estado: 'cargando' | 'vacio' | 'lista' | 'error'
function mostrarEstado(estado, mensaje = '') {
  estadoCargaEl.classList.toggle('oculto', estado !== 'cargando');
  estadoVacioEl.classList.toggle('oculto', estado !== 'vacio');
  listaEl.classList.toggle('oculto', estado !== 'lista');

  if (estado === 'error') {
    estadoVacioEl.classList.remove('oculto');
    estadoVacioEl.querySelector('.vacio-titulo').textContent = '⚠️ Error al cargar el historial';
    estadoVacioEl.querySelector('.vacio-desc').textContent = mensaje;
  }
}

// ── FUNCIÓN: Actualizar los números de estadísticas rápidas ──
function actualizarEstadisticas(lecturas) {
  // Contamos cuántas hay de cada color usando reduce
  const conteos = lecturas.reduce((acc, l) => {
    const color = l.colorSemaforo || 'sin_color';
    acc[color] = (acc[color] || 0) + 1;
    return acc;
  }, {});

  statTotalEl.textContent    = lecturas.length;
  statVerdeEl.textContent    = conteos.verde    || 0;
  statAmarilloEl.textContent = conteos.amarillo || 0;
  statRojoEl.textContent     = conteos.rojo     || 0;
}

// ── FUNCIÓN: Renderizar la lista con los filtros activos ──
function renderizarLista() {
  const colorFiltro    = filtroColor.value.toLowerCase();
  const nivelFiltro    = filtroNivel.value.toLowerCase();
  const textoBusqueda  = filtroBusqueda.value.trim().toLowerCase();

  // Filtramos el array completo según los criterios activos
  const lecturasFiltradas = todasLasLecturas.filter((lectura) => {
    const color  = (lectura.colorSemaforo || '').toLowerCase();
    const nivel  = (lectura.estudiante?.nivel || '').toLowerCase();
    const nombre = `${lectura.estudiante?.nombre || ''} ${lectura.estudiante?.apellido || ''}`.toLowerCase();

    // Si hay un filtro activo, verificamos que coincida
    if (colorFiltro   && color  !== colorFiltro)     return false;
    if (nivelFiltro   && nivel  !== nivelFiltro)     return false;
    if (textoBusqueda && !nombre.includes(textoBusqueda)) return false;

    return true;
  });

  // Limpiamos el contenedor y re-renderizamos las tarjetas
  listaEl.innerHTML = '';

  if (lecturasFiltradas.length === 0) {
    listaEl.innerHTML = `
      <p style="text-align:center; color: var(--muted); padding: 2rem;">
        No se encontraron registros con los filtros actuales.
      </p>`;
    return;
  }

  // Creamos una tarjeta por cada lectura filtrada
  lecturasFiltradas.forEach((lectura) => {
    listaEl.appendChild(crearTarjetaLectura(lectura));
  });
}

// ── FUNCIÓN: Crear el elemento HTML de una tarjeta ───────
function crearTarjetaLectura(lectura) {
  const card = document.createElement('article');
  card.className = 'lectura-card';
  card.setAttribute('tabindex', '0'); // Permite navegar con teclado
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `Ver detalle de ${lectura.estudiante?.nombre || 'estudiante'} ${lectura.estudiante?.apellido || ''}`);

  const color     = lectura.colorSemaforo || 'sin_color';
  const nombre    = lectura.estudiante?.nombre    || '—';
  const apellido  = lectura.estudiante?.apellido  || '';
  const nivel     = lectura.estudiante?.nivel     || '—';
  const ciclo     = lectura.estudiante?.ciclo     || '—';
  const añoGrado  = lectura.estudiante?.año_grado || '?';
  const division  = lectura.estudiante?.division  || '—';
  const ppm       = lectura.ppm ?? '—';
  const fecha     = formatearFecha(lectura.createdAt || lectura.fecha);

  card.innerHTML = `
    <div class="card-semaforo ${color}" aria-hidden="true"></div>
    <div class="card-info">
      <span class="card-nombre">${nombre} ${apellido}</span>
      <div class="card-meta">
        <span>${nivel} — ${ciclo}</span>
        <span>${añoGrado}° Div. ${division}</span>
        <span>${fecha}</span>
      </div>
    </div>
    <div class="card-ppm">
      <div class="ppm-valor">${ppm}</div>
      <div class="ppm-label">PPM</div>
    </div>
  `;

  // Al hacer clic (o presionar Enter/Space), abrimos el detalle
  card.addEventListener('click', () => abrirModal(lectura));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      abrirModal(lectura);
    }
  });

  return card;
}

// ── FUNCIÓN: Abrir el modal de detalle ───────────────────
function abrirModal(lectura) {
  const color    = lectura.colorSemaforo || '';
  const nombre   = lectura.estudiante?.nombre    || '—';
  const apellido = lectura.estudiante?.apellido  || '—';

  // Encabezado del modal
  document.getElementById('modal-semaforo').className = `modal-semaforo ${color}`;
  document.getElementById('modal-titulo').textContent = `${nombre} ${apellido}`;
  document.getElementById('modal-fecha').textContent  = formatearFechaLarga(lectura.createdAt || lectura.fecha);

  // Datos del estudiante
  document.getElementById('m-nombre').textContent    = nombre;
  document.getElementById('m-apellido').textContent  = apellido;
  document.getElementById('m-nivel').textContent     = lectura.estudiante?.nivel     || '—';
  document.getElementById('m-ciclo').textContent     = lectura.estudiante?.ciclo     || '—';
  document.getElementById('m-año').textContent       = lectura.estudiante?.año_grado ? `${lectura.estudiante.año_grado}°` : '—';
  document.getElementById('m-division').textContent  = lectura.estudiante?.division  || '—';

  // Resultado de la lectura
  document.getElementById('m-ppm').textContent       = lectura.ppm !== undefined ? `${lectura.ppm} PPM` : '—';
  document.getElementById('m-color').textContent     = ETIQUETA_COLOR[color] || color || '—';
  document.getElementById('m-tiempo').textContent    = lectura.tiempoEmpleadoSegundos ? `${lectura.tiempoEmpleadoSegundos} segundos` : '—';
  document.getElementById('m-palabras').textContent  = lectura.palabrasContadas !== undefined ? `${lectura.palabrasContadas} palabras` : '—';
  document.getElementById('m-pausas').textContent    = lectura.pausasDetectadas !== undefined ? lectura.pausasDetectadas : '—';
  document.getElementById('m-prosodia').textContent  = lectura.prosodia || '—';

  // Texto transcrito
  const textoBox = document.getElementById('m-texto');
  textoBox.textContent = lectura.textoTranscrito?.trim() || 'Sin transcripción registrada.';

  // Devolución / feedback
  const feedbackSeccion = document.getElementById('modal-feedback-seccion');
  const feedbackTexto   = document.getElementById('m-feedback');
  if (lectura.feedback) {
    feedbackTexto.textContent = lectura.feedback;
    feedbackSeccion.classList.remove('oculto');
  } else {
    feedbackSeccion.classList.add('oculto');
  }

  // Mostrar el modal
  modalOverlay.classList.remove('oculto');
  document.body.style.overflow = 'hidden'; // Evitar scroll del fondo
  modalCerrar.focus(); // Para accesibilidad: el foco va al botón cerrar
}

// ── FUNCIÓN: Cerrar el modal ──────────────────────────────
function cerrarModal() {
  modalOverlay.classList.add('oculto');
  document.body.style.overflow = ''; // Restaurar scroll
}

// ── FUNCIONES: Formatear fechas ───────────────────────────
// Formato corto: "20/06/2026"
function formatearFecha(fechaStr) {
  if (!fechaStr) return '—';
  const d = new Date(fechaStr);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Formato largo: "sábado, 20 de junio de 2026 a las 18:30"
function formatearFechaLarga(fechaStr) {
  if (!fechaStr) return '—';
  const d = new Date(fechaStr);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
