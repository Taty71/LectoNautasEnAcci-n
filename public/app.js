const TOKEN_KEY   = 'token_lectonautas';
const USUARIO_KEY = 'usuario_lectonautas'; // Clave para guardar los datos del docente

function obtenerToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function guardarToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

// Guarda los datos del usuario (nombre, apellido, rol, etc.) en localStorage
function guardarUsuario(usuario) {
  localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
}

// Recupera los datos del usuario guardados en localStorage
function obtenerUsuario() {
  const datos = localStorage.getItem(USUARIO_KEY);
  return datos ? JSON.parse(datos) : null;
}

function cerrarSesion() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USUARIO_KEY); // También borramos los datos del docente
  window.location.href = 'login.html';
}

function authHeaders(extraHeaders = {}) {
  const token = obtenerToken();
  return {
    ...extraHeaders,
    Authorization: `Bearer ${token}`,
  };
}

function requerirToken() {
  if (!obtenerToken()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

document.addEventListener('DOMContentLoaded', () => {
  const loginForm    = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (loginForm) {
    initLoginPage();
    return;
  }

  if (registerForm) {
    initRegisterPage();
    return;
  }

  if (!requerirToken()) {
    return;
  }

  initMainPage();
});

// ── LOGIN ────────────────────────────────────────────────────────────────────
function initLoginPage() {
  if (obtenerToken()) {
    window.location.href = 'index.html';
    return;
  }

  const loginForm    = document.getElementById('loginForm');
  const mensajeLogin = document.getElementById('login-mensaje');
  const btnIngresar  = document.getElementById('btn-ingresar');

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      mensajeLogin.textContent = 'Completá el correo y la contraseña.';
      return;
    }

    btnIngresar.disabled    = true;
    btnIngresar.textContent = 'Ingresando...';
    mensajeLogin.textContent = '';

    try {
      const response = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.token) {
        mensajeLogin.textContent = result.error || 'No fue posible iniciar sesión.';
        btnIngresar.disabled    = false;
        btnIngresar.textContent = 'Ingresar';
        return;
      }

      guardarToken(result.token);
      // Guardamos los datos del docente para mostrarlos en el panel.
      // No guardamos el 'rol' porque la autorización siempre la hace el servidor con el JWT;
      // tener el rol en localStorage no otorga ningún permiso real, pero evitamos guardar
      // datos innecesarios en el cliente.
      if (result.usuario) {
        guardarUsuario({
          id:       result.usuario.id,
          nombre:   result.usuario.nombre,
          apellido: result.usuario.apellido,
          email:    result.usuario.email,
          // rol no se guarda intencionalmente
        });
      }
      window.location.href = 'index.html';
    } catch (error) {
      mensajeLogin.textContent = 'No se pudo conectar con el servidor.';
      btnIngresar.disabled    = false;
      btnIngresar.textContent = 'Ingresar';
    }
  });
}

// ── REGISTRO ─────────────────────────────────────────────────────────────────
function initRegisterPage() {
  // Se ha abierto el registro para que cualquier usuario pueda crearse una cuenta.

  const registerForm      = document.getElementById('registerForm');
  const mensajeRegistro   = document.getElementById('register-mensaje');
  const resultadoRegistro = document.getElementById('register-resultado');
  const btnRegistrar      = document.getElementById('btn-registrar');

  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const nombre   = document.getElementById('register-nombre').value.trim();
    const apellido = document.getElementById('register-apellido').value.trim();
    const email    = document.getElementById('register-email').value.trim();
    const dni      = document.getElementById('register-dni').value.trim();
    const rol      = document.getElementById('register-rol').value;

    if (!nombre || !apellido || !email || !dni || !rol) {
      mensajeRegistro.textContent = 'Completá todos los datos para crear el usuario.';
      return;
    }

    btnRegistrar.disabled    = true;
    btnRegistrar.textContent = 'Creando usuario...';
    mensajeRegistro.textContent = '';
    resultadoRegistro.classList.add('oculto');

    try {
      const response = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ nombre, apellido, email, dni, rol }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        mensajeRegistro.textContent = result.error || 'No fue posible crear el usuario.';
        btnRegistrar.disabled    = false;
        btnRegistrar.textContent = 'Crear usuario';
        return;
      }

      const claveGenerada = result.passwordTemporal || 'No disponible';
      resultadoRegistro.innerHTML =
        `Usuario creado correctamente.<br />` +
        `Correo: <strong>${result.usuario.email}</strong><br />` +
        `Clave inicial: <strong>${claveGenerada}</strong><br />` +
        `Ahora el docente puede ir a <a href="login.html">Ingresar</a> con ese correo y esa clave.`;
      resultadoRegistro.classList.remove('oculto');
      registerForm.reset();
      btnRegistrar.disabled    = false;
      btnRegistrar.textContent = 'Crear usuario';
    } catch (error) {
      mensajeRegistro.textContent = 'No se pudo conectar con el servidor.';
      btnRegistrar.disabled    = false;
      btnRegistrar.textContent = 'Crear usuario';
    }
  });
}

// ── PANTALLA PRINCIPAL ────────────────────────────────────────────────────────
function initMainPage() {
  // Referencias a los elementos del DOM
  const form              = document.getElementById('lecturaForm');
  const resultadoCard     = document.getElementById('resultado');
  const inputNivel        = document.getElementById('nivel');
  const selectCiclo       = document.getElementById('ciclo');
  const inputAñoGrado     = document.getElementById('año_grado');
  const temporizadorEl    = document.getElementById('temporizador');
  const palabrasContEl    = document.getElementById('palabrasContadas');
  const textoEscuchadoEl  = document.getElementById('texto-escuchado');
  const micStatusEl       = document.getElementById('mic-status');
  const micContainer      = document.getElementById('mic-container');
  const btnIniciar        = document.getElementById('btn-iniciar-mic');
  const btnDetener        = document.getElementById('btn-detener-mic');
  const btnProcesando     = document.getElementById('btn-procesando');
  const seccionEdicion    = document.getElementById('seccion-edicion');
  const textareaTransc    = document.getElementById('textoTranscrito');
  const palabrasFinalesEl = document.getElementById('palabrasFinales');
  const pausasDetectadasEl = document.getElementById('pausas-detectadas');
  const btnGuardar        = document.getElementById('btn-guardar');
  const btnCerrarSesion   = document.getElementById('btn-cerrar-sesion');
  const lectonautaGuiaEl  = document.getElementById('lectonauta-guia');
  const guiaMensajeEl     = document.getElementById('guia-mensaje');

  if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', cerrarSesion);
  }

  // ── Variables de estado de la sesión ────────────────────────────────────────
  let timerInterval;
  let tiempoRestante = 60;
  let tiempoInicio   = null;
  let tiempoEmpleado = 0;
  let leyendo        = false;
  let finalTranscript  = '';
  let pausasDetectadas = 0;
  let timeoutOcultarGuia  = null;
  let timeoutVolverInicio = null;

  // ── Variables de Azure AI Speech ────────────────────────────────────────────
  let azureRecognizer      = null;  // Instancia del reconocedor de Azure
  let metricasAzureFinales = null;  // Métricas consolidadas al finalizar la sesión
  let _fluencyScores  = [];         // Acumulador: puntaje de fluidez por segmento
  let _accuracyScores = [];         // Acumulador: puntaje de precisión por segmento
  let _prosodyScores  = [];         // Acumulador: puntaje de prosodia por segmento

  // ── Mensajes del asistente Cosmo ────────────────────────────────────────────
  const UMBRALES_GUIA = {
    Primario: { Primario: { amarillo: 60, verde: 86 } },
    Secundario: {
      Básico:    { amarillo: 100, verde: 126 },
      Orientado: { amarillo: 120, verde: 146 },
      Técnico:   { amarillo: 120, verde: 146 },
    },
  };

  function renderLineasGuia(lineas) {
    return lineas.map((linea) => `<span class="guia-linea">${linea}</span>`).join('');
  }

  function actualizarMensajeGuia(estado, datos = {}) {
    clearTimeout(timeoutOcultarGuia);
    clearTimeout(timeoutVolverInicio);
    lectonautaGuiaEl.classList.remove('guia-desaparecido');

    const mensajes = {
      inicio: renderLineasGuia([
        '¡Hola! Soy Cosmo 🚀',
        'Completá los datos del estudiante.',
        'Luego presioná 🎙️ <strong>Iniciar Lectura</strong> para comenzar.',
      ]),
      grabando: renderLineasGuia([
        '🎙️ ¡Estoy escuchando!',
        'Se está analizando la lectura.',
        'Cuando el estudiante termine, presioná 🛑 <strong>Terminar Antes</strong>.',
        'El tiempo máximo es de 60 segundos.',
      ]),
      revision: renderLineasGuia([
        '📄 Lectura registrada.',
        'Podés leer el texto transcrito para verificar la puntuación.',
        'Cuando estés listo, presioná <strong>💾 Guardar Registro</strong>.',
      ]),
    };

    if (estado === 'resultado') {
      const {
        ppm    = 0,
        nivel  = 'Primario',
        ciclo  = 'Primario',
        color  = 'rojo',
        umbrales,
      } = datos;

      const umbralesNivel    = UMBRALES_GUIA[nivel] || UMBRALES_GUIA.Primario;
      const umbralesFallback = umbralesNivel[ciclo] || Object.values(umbralesNivel)[0];
      const umbralAmarillo   = Number(umbrales?.amarillo) || umbralesFallback.amarillo;
      const umbralVerde      = Number(umbrales?.verde)    || umbralesFallback.verde;
      const maxAmarillo      = Number(umbrales?.amarilloMax) || umbralVerde - 1;

      const etiquetaColor = { verde: '🟢 Verde', amarillo: '🟡 Amarillo', rojo: '🔴 Rojo' };
      const descripcionColor = {
        verde:    '¡Excelente! El estudiante superó el umbral requerido.',
        amarillo: 'Va por buen camino, pero aún está por debajo del umbral Verde.',
        rojo:     'Necesita más práctica para alcanzar la fluidez esperada.',
      };

      const lineasResultado = [
        `El estudiante obtuvo <strong>${ppm} palabras por minuto</strong>.`,
        `Nivel: <strong>${nivel}</strong>.`,
        `Ciclo: <strong>${ciclo}</strong>.`,
        `Para estar en Verde, necesita más de <strong>${maxAmarillo} PPM</strong>.`,
        `Referencia: 🟢 Verde > ${maxAmarillo} · 🟡 Amarillo ${umbralAmarillo}-${maxAmarillo} · 🔴 Rojo < ${umbralAmarillo}.`,
        `Resultado final: <strong>${etiquetaColor[color] || color}</strong>.`,
      ];

      if (descripcionColor[color]) {
        lineasResultado.push(descripcionColor[color]);
      }

      guiaMensajeEl.innerHTML = renderLineasGuia(lineasResultado);

      timeoutOcultarGuia = setTimeout(() => {
        lectonautaGuiaEl.classList.add('guia-desaparecido');
      }, 15000);

      timeoutVolverInicio = setTimeout(() => {
        volverPantallaInicial();
      }, 25000);

      return;
    }

    guiaMensajeEl.innerHTML = mensajes[estado] || mensajes.inicio;
  }

  actualizarMensajeGuia('inicio');

  // ── Opciones dinámicas de Ciclo / Año ────────────────────────────────────────
  const CICLOS_POR_NIVEL = {
    Primario: [{ value: 'Primario', label: 'Nivel Primario' }],
    Secundario: [
      { value: 'Básico',    label: 'Ciclo Básico (1° a 3°)' },
      { value: 'Orientado', label: 'Ciclo Orientado (4° a 6°)' },
      { value: 'Técnico',   label: 'Especialidad Técnica (4° a 7°)' },
    ],
  };

  function actualizarOpcionesCiclo() {
    const nivel   = inputNivel.value;
    const opciones = CICLOS_POR_NIVEL[nivel] || [];
    selectCiclo.innerHTML = opciones
      .map((op) => `<option value="${op.value}">${op.label}</option>`)
      .join('');
    actualizarRangoAño();
  }

  function actualizarRangoAño() {
    const ciclo = selectCiclo.value;
    const maxPorCiclo = { Primario: 6, Básico: 3, Orientado: 6, Técnico: 7 };
    inputAñoGrado.max = maxPorCiclo[ciclo] || 7;
  }

  inputNivel.addEventListener('change', actualizarOpcionesCiclo);
  selectCiclo.addEventListener('change', actualizarRangoAño);
  actualizarOpcionesCiclo();

  textareaTransc.addEventListener('input', () => {
    palabrasFinalesEl.textContent = contarPalabras(textareaTransc.value);
  });

  // ── Azure AI Speech — funciones auxiliares ────────────────────────────────────

  /**
   * Pide al servidor un token temporal de Azure AI Speech (10 minutos).
   * La clave real de Azure nunca sale del servidor — el browser solo usa el token.
   */
  async function obtenerTokenAzure() {
    const resp = await fetch('/api/speech-token', { headers: authHeaders() });
    if (resp.status === 401) { cerrarSesion(); return; }
    if (!resp.ok) throw new Error('No se pudo comunicar con el servidor de voz.');
    const data = await resp.json();
    if (!data.success) throw new Error(data.error || 'Error al obtener el token de voz.');
    return { token: data.token, region: data.region };
  }

  /**
   * Crea un reconocedor de Azure Speech configurado para Modo A (lectura libre).
   * - Sin texto de referencia: Azure analiza fluidez y prosodia sin comparar con un texto esperado.
   * - enableProsodyAssessment(): activa la evaluación de entonación y ritmo (SDK >= 1.35).
   */
  async function crearReconocedorAzure(token, region) {
    const SDK = window.SpeechSDK;
    if (!SDK) throw new Error('El servicio de IA de voz no está disponible. Recargá la página.');

    const speechConfig = SDK.SpeechConfig.fromAuthorizationToken(token, region);
    // Cambiamos a es-ES porque la evaluación sin texto de referencia (Unscripted) 
    // actualmente está más soportada en es-ES que en es-AR.
    speechConfig.speechRecognitionLanguage = 'es-ES';

    // Configuración de evaluación de pronunciación — Modo A: lectura libre (sin texto de referencia).
    // Granularidad FullText: necesaria para que Azure calcule prosodyScore.
    const pronunciacionConfig = new SDK.PronunciationAssessmentConfig(
      '',
      SDK.PronunciationAssessmentGradingSystem.HundredMark,
      SDK.PronunciationAssessmentGranularity.FullText,
      false
    );

    // enableProsodyAssessment() es un método del SDK >= 1.35.
    // Lo llamamos directamente; si el SDK no lo soporta, el catch silencia el error.
    try {
      pronunciacionConfig.enableProsodyAssessment();
    } catch (_) {
      // SDK antiguo: prosodia no disponible, continuamos igual
    }

    const audioConfig = SDK.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer  = new SDK.SpeechRecognizer(speechConfig, audioConfig);
    pronunciacionConfig.applyTo(recognizer);

    return recognizer;
  }

  /**
   * Promedia un array de números. Devuelve null si el array está vacío.
   * Se usa para combinar los puntajes de todos los segmentos de la lectura.
   */
  function promediarScores(arr) {
    if (!arr || !arr.length) return null;
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  }

  /**
   * Resetea el estado visual de las barras de puntaje entre sesiones.
   */
  function resetearBarras() {
    const barrasEl = document.getElementById('barras-azure');
    if (!barrasEl) return;
    barrasEl.classList.add('oculto');
    ['barra-fluidez', 'barra-precision', 'barra-prosodia'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.style.width = '0%';
        el.className   = 'barra-relleno ' + id.replace('barra-', '');
      }
    });
    ['valor-fluidez', 'valor-precision', 'valor-prosodia'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '—';
    });
  }

  // ── INICIAR LECTURA ──────────────────────────────────────────────────────────
  // El handler es async porque usa await para obtener el token y crear el reconocedor.
  btnIniciar.addEventListener('click', async () => {

    // 1. Validar que todos los datos del estudiante estén completos
    const nombre   = document.getElementById('nombre').value.trim();
    const apellido = document.getElementById('apellido').value.trim();
    const añoGrado = inputAñoGrado.value;
    const division = document.getElementById('division').value.trim();

    if (!nombre || !apellido || !añoGrado || !division) {
      Swal.fire({
        title:              '¡Falta información!',
        text:               'Completá todos los datos del estudiante antes de iniciar la lectura.',
        icon:               'warning',
        confirmButtonColor: '#4e89ae',
        confirmButtonText:  '¡Entendido!',
      });
      return;
    }

    // 2. Resetear toda la sesión anterior
    finalTranscript      = '';
    _fluencyScores       = [];
    _accuracyScores      = [];
    _prosodyScores       = [];
    metricasAzureFinales = null;
    textoEscuchadoEl.textContent   = '...';
    palabrasContEl.textContent     = '0';
    tiempoRestante                 = 60;
    tiempoEmpleado                 = 0;
    actualizarReloj();
    seccionEdicion.classList.add('oculto');
    textareaTransc.value           = '';
    palabrasFinalesEl.textContent  = '0';
    pausasDetectadasEl.textContent = '0';
    pausasDetectadas               = 0;
    resetearBarras();

    // 3. Actualizar UI al estado "conectando"
    btnIniciar.classList.add('oculto');
    btnDetener.classList.remove('oculto');
    btnDetener.disabled = false;
    micContainer.classList.add('grabando');
    micStatusEl.textContent = '🔄 Conectando con el servicio de IA...';
    actualizarMensajeGuia('grabando');

    try {
      // 4. Pedir token al servidor (la clave de Azure queda guardada en el servidor)
      const { token, region } = await obtenerTokenAzure();

      // 5. Crear el reconocedor de Azure con configuración de pronunciación
      azureRecognizer = await crearReconocedorAzure(token, region);

      // 6. Configurar el evento "recognized": se dispara cada vez que Azure
      //    termina de procesar un segmento de habla (utterance).
      azureRecognizer.recognized = (s, e) => {
        const SDK = window.SpeechSDK;
        if (e.result.reason !== SDK.ResultReason.RecognizedSpeech) return;

        // Acumular el texto transcrito
        finalTranscript += e.result.text + ' ';
        textoEscuchadoEl.textContent = finalTranscript.trim() || '...';
        palabrasContEl.textContent   = contarPalabras(finalTranscript);
        textoEscuchadoEl.parentElement.scrollTop =
          textoEscuchadoEl.parentElement.scrollHeight;

        // Extraer y acumular las métricas de pronunciación del segmento
        try {
          const pr = SDK.PronunciationAssessmentResult.fromResult(e.result);
          if (pr) {
            if (pr.fluencyScore  > 0) _fluencyScores.push(pr.fluencyScore);
            if (pr.accuracyScore > 0) _accuracyScores.push(pr.accuracyScore);

            // Azure no devuelve prosodyScore en es-ES modo libre.
            // Usamos PronScore (puntaje general de pronunciación) del JSON crudo
            // como métrica de calidad global de la lectura.
            try {
              const rawJson = e.result.properties.getProperty(
                SDK.PropertyId.SpeechServiceResponse_JsonResult
              );
              if (rawJson) {
                const nbest    = JSON.parse(rawJson)?.NBest?.[0];
                const pronScore = nbest?.PronunciationAssessment?.PronScore;
                if (pronScore > 0) _prosodyScores.push(Math.round(pronScore));
              }
            } catch (_) { /* JSON no disponible, omitir */ }
          }
        } catch (_) {
          // No interrumpir la grabación si falla la extracción de una métrica
        }
      };

      // 7. Configurar el evento "canceled": se dispara si Azure interrumpe la sesión
      azureRecognizer.canceled = (s, e) => {
        const SDK = window.SpeechSDK;
        if (e.reason === SDK.CancellationReason.Error) {
          console.error('Azure canceló la sesión de voz:', e.errorDetails);
          if (leyendo) {
            micStatusEl.textContent = '⚠️ La sesión de voz fue interrumpida.';
          }
        }
      };

      // 8. Iniciar la grabación continua
      tiempoInicio            = Date.now();
      leyendo                 = true;
      micStatusEl.textContent = '¡Escuchando atentamente! 👂';

      azureRecognizer.startContinuousRecognitionAsync(
        () => {
          // Azure confirmó el inicio → recién ahora arrancamos el temporizador de 60s
          iniciarTemporizador();
        },
        (err) => {
          console.error('Error al iniciar Azure Speech:', err);
          Swal.fire({
            title:              'Error al iniciar el micrófono',
            text:               'No se pudo iniciar el reconocimiento de voz. Verificá los permisos del micrófono en tu navegador.',
            icon:               'error',
            confirmButtonColor: '#4e89ae',
          });
          leyendo = false;
          btnIniciar.classList.remove('oculto');
          btnDetener.classList.add('oculto');
          micContainer.classList.remove('grabando');
        }
      );

    } catch (err) {
      // Error al obtener el token o al crear el reconocedor
      console.error('Error al iniciar la sesión de lectura:', err);
      Swal.fire({
        title:              'Error de conexión',
        text:               err.message || 'No se pudo conectar con el servicio de evaluación de voz.',
        icon:               'error',
        confirmButtonColor: '#4e89ae',
      });
      btnIniciar.classList.remove('oculto');
      btnDetener.classList.add('oculto');
      micContainer.classList.remove('grabando');
    }
  });

  btnDetener.addEventListener('click', () => detenerLectura(true));

  // ── TEMPORIZADOR ─────────────────────────────────────────────────────────────
  function iniciarTemporizador() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      tiempoRestante--;
      actualizarReloj();
      if (tiempoRestante <= 0) {
        clearInterval(timerInterval);
        detenerLectura(true);
      }
    }, 1000);
  }

  function actualizarReloj() {
    const segs = tiempoRestante;
    temporizadorEl.textContent = `00:${segs < 10 ? `0${segs}` : segs}`;
  }

  // ── DETENER LECTURA ──────────────────────────────────────────────────────────
  function detenerLectura(debeProcesar) {
    leyendo = false;
    clearInterval(timerInterval);

    // Calcular el tiempo real que estuvo leyendo
    tiempoEmpleado = tiempoInicio
      ? Math.max(1, Math.round((Date.now() - tiempoInicio) / 1000))
      : Math.max(1, 60 - tiempoRestante);

    micContainer.classList.remove('grabando');
    btnDetener.classList.add('oculto');
    btnDetener.disabled = true;

    // Esta función se ejecuta DESPUÉS de que Azure confirme la detención.
    // Garantiza que el último segmento de habla fue procesado antes de mostrar el resultado.
    const finalizarUI = () => {
      if (debeProcesar) {
        // Consolidar métricas promediando todos los segmentos reconocidos
        metricasAzureFinales = {
          fluencyScore:  promediarScores(_fluencyScores),
          accuracyScore: promediarScores(_accuracyScores),
          prosodyScore:  promediarScores(_prosodyScores),
        };

        btnProcesando.classList.remove('oculto');
        micStatusEl.textContent = '📝 Revisá el texto antes de guardar el registro.';

        setTimeout(() => {
          btnProcesando.classList.add('oculto');
          btnIniciar.classList.remove('oculto');
          mostrarEdicion();
        }, 800);
      } else {
        btnIniciar.classList.remove('oculto');
        micStatusEl.textContent = 'Sesión cancelada. Podés intentarlo nuevamente.';
      }
    };

    // Detener Azure y esperar su confirmación antes de procesar el resultado
    if (azureRecognizer) {
      const rec = azureRecognizer;
      azureRecognizer = null;
      rec.stopContinuousRecognitionAsync(
        () => { rec.close(); finalizarUI(); },
        (err) => { console.error('Error al detener Azure:', err); rec.close(); finalizarUI(); }
      );
    } else {
      finalizarUI();
    }
  }

  // ── MOSTRAR SECCIÓN DE EDICIÓN ───────────────────────────────────────────────
  function mostrarEdicion() {
    textareaTransc.value = finalTranscript.trim();
    palabrasFinalesEl.textContent = contarPalabras(textareaTransc.value);
    pausasDetectadas = (finalTranscript.match(/[.,]/g) || []).length;
    pausasDetectadasEl.textContent = pausasDetectadas;

    seccionEdicion.classList.remove('oculto');
    seccionEdicion.scrollIntoView({ behavior: 'smooth', block: 'start' });
    actualizarMensajeGuia('revision');
  }

  // ── GUARDAR REGISTRO ─────────────────────────────────────────────────────────
  btnGuardar.addEventListener('click', async () => {
    const textoFinal       = textareaTransc.value.trim();
    const palabrasContadas = contarPalabras(textoFinal);

    if (palabrasContadas === 0) {
      Swal.fire({
        title:              'Sin texto registrado',
        text:               '¿El micrófono funcionó correctamente? No hay texto para guardar.',
        icon:               'warning',
        confirmButtonColor: '#4e89ae',
      });
      return;
    }

    // Eliminada la validación manual de prosodia. Ahora usamos métricas de IA.

    // Construimos el payload completo: datos del estudiante + resultado + métricas de Azure.
    const payload = {
      estudiante: {
        nombre:    document.getElementById('nombre').value.trim(),
        apellido:  document.getElementById('apellido').value.trim(),
        nivel:     inputNivel.value,
        ciclo:     selectCiclo.value,
        año_grado: Number(inputAñoGrado.value),
        division:  document.getElementById('division').value.trim().toUpperCase(),
      },
      textoTranscrito:        textoFinal,
      palabrasContadas,
      tiempoEmpleadoSegundos: tiempoEmpleado,
      pausasDetectadas,
      // Métricas de Azure AI Speech (null si Azure no pudo calcularlas)
      fluencyScore:  metricasAzureFinales?.fluencyScore  ?? null,
      accuracyScore: metricasAzureFinales?.accuracyScore ?? null,
      prosodyScore:  metricasAzureFinales?.prosodyScore  ?? null,
    };

    btnGuardar.disabled    = true;
    btnGuardar.textContent = '⏳ Guardando...';

    try {
      const response = await fetch('/api/lecturas', {
        method:  'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body:    JSON.stringify(payload),
      });

      if (response.status === 401) {
        cerrarSesion();
        return;
      }

      const result = await response.json();

      if (result.success) {
        mostrarResultado(result);
      } else {
        Swal.fire({
          title:              '¡Oops!',
          text:               result.error || 'Algo salió mal al guardar el registro.',
          icon:               'error',
          confirmButtonColor: '#4e89ae',
        });
        restaurarBtnGuardar();
      }
    } catch (error) {
      console.error("Error exacto capturado en btnGuardar:", error);
      Swal.fire({
        title:              'Error de Conexión 🔌',
        text:               `Hubo un problema: ${error.message}. Por favor, avisame qué dice este error.`,
        icon:               'error',
        confirmButtonColor: '#4e89ae',
      });
      restaurarBtnGuardar();
    }
  });

  function restaurarBtnGuardar() {
    btnGuardar.disabled    = false;
    btnGuardar.textContent = '💾 Guardar Registro';
  }

  // ── VOLVER A LA PANTALLA INICIAL ─────────────────────────────────────────────
  function volverPantallaInicial() {
    clearTimeout(timeoutOcultarGuia);
    clearTimeout(timeoutVolverInicio);
    form.reset();
    form.style.display = '';
    resultadoCard.classList.add('oculto');

    // Resetear estado de la sesión
    finalTranscript      = '';
    metricasAzureFinales = null;
    _fluencyScores       = [];
    _accuracyScores      = [];
    _prosodyScores       = [];

    textoEscuchadoEl.textContent   = '...';
    palabrasContEl.textContent     = '0';
    temporizadorEl.textContent     = '01:00';
    micStatusEl.textContent        = 'Completá los datos del estudiante y presioná Iniciar';
    seccionEdicion.classList.add('oculto');
    textareaTransc.value           = '';
    palabrasFinalesEl.textContent  = '0';
    pausasDetectadasEl.textContent = '0';
    pausasDetectadas = 0;
    btnIniciar.classList.remove('oculto');
    btnDetener.classList.add('oculto');
    btnDetener.disabled = true;
    resetearBarras();
    restaurarBtnGuardar();
    actualizarOpcionesCiclo();
    actualizarMensajeGuia('inicio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── MOSTRAR RESULTADO CON SEMÁFORO Y BARRAS ──────────────────────────────────
  function mostrarResultado(result) {
    form.style.display = 'none';
    resultadoCard.classList.remove('oculto');

    // Apagar todas las luces del semáforo y encender la correcta
    ['rojo', 'amarillo', 'verde'].forEach((c) => {
      document.getElementById(`luz-${c}`).classList.remove(`active-${c}`);
    });
    if (result.color) {
      document.getElementById(`luz-${result.color}`).classList.add(`active-${result.color}`);
    }

    document.getElementById('emoji-gigante').innerHTML      = result.emoticon || '';
    document.getElementById('mensaje-resultado').textContent = result.mensaje || '';
    document.getElementById('detalle-ppm').textContent =
      `${result.ppm} palabras por minuto en ${tiempoEmpleado} segundos`;

    const observacionEl = document.getElementById('observacion-prosodia');
    if (result.observacion) {
      observacionEl.textContent = `💡 ${result.observacion}`;
      observacionEl.classList.remove('oculto');
    } else {
      observacionEl.textContent = '';
      observacionEl.classList.add('oculto');
    }

    // ── Barras de puntaje de Azure AI ─────────────────────────────────────────
    // Usar los valores ajustados que devuelve el backend (coherentes con el semáforo).
    // Si el backend no los trajo (por error de red, etc.), caer a los locales.
    const barrasEl = document.getElementById('barras-azure');
    const metricas = (result.fluencyScore != null || result.accuracyScore != null)
      ? {
          fluencyScore:  result.fluencyScore  ?? null,
          accuracyScore: result.accuracyScore ?? null,
          prosodyScore:  result.prosodyScore  ?? null,
        }
      : metricasAzureFinales;

    if (barrasEl && metricas &&
       (metricas.fluencyScore !== null || metricas.accuracyScore !== null)) {

      barrasEl.classList.remove('oculto');

      /**
       * Anima una barra de puntaje:
       * 1. Muestra el valor numérico
       * 2. Asigna el color según el rango (verde/amarillo/rojo)
       * 3. Expande la barra con una transición CSS
       */
      const animarBarra = (barraId, valorId, valor) => {
        const barraEl = document.getElementById(barraId);
        const valorEl = document.getElementById(valorId);
        if (!barraEl || !valorEl || valor === null || valor === undefined) return;

        valorEl.textContent = `${valor}/100`;

        // Asignar color según el puntaje
        barraEl.classList.remove('score-rojo', 'score-amarillo', 'score-verde');
        if (valor >= 80)      barraEl.classList.add('score-verde');
        else if (valor >= 60) barraEl.classList.add('score-amarillo');
        else                  barraEl.classList.add('score-rojo');

        // Delay para que el navegador aplique el ancho inicial (0%) antes de animar
        setTimeout(() => { barraEl.style.width = `${valor}%`; }, 400);
      };

      animarBarra('barra-fluidez',   'valor-fluidez',   metricas.fluencyScore);
      animarBarra('barra-precision', 'valor-precision', metricas.accuracyScore);
      animarBarra('barra-prosodia',  'valor-prosodia',  metricas.prosodyScore);

    } else if (barrasEl) {
      barrasEl.classList.add('oculto');
    }

    if (result.color === 'verde') {
      triggerConfetti();
    }

    actualizarMensajeGuia('resultado', {
      ppm:     result.ppm,
      nivel:   result.nivel   || inputNivel.value,
      ciclo:   result.ciclo   || selectCiclo.value,
      color:   result.color,
      umbrales: result.umbrales,
    });
  }

  document.getElementById('btn-nuevo').addEventListener('click', () => {
    volverPantallaInicial();
  });

  // ── UTILIDADES ───────────────────────────────────────────────────────────────
  function contarPalabras(texto) {
    return texto.trim().split(/\s+/).filter(Boolean).length;
  }

  function triggerConfetti() {
    // Guard: el script CDN puede fallar al cargar en algunos entornos
    if (typeof confetti === 'undefined') return;

    const duracion = 3 * 1000;
    const fin = Date.now() + duracion;
    (function frame() {
      confetti({
        particleCount: 5,
        angle:  60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#2ECC71', '#F1C40F', '#3498DB'],
      });
      confetti({
        particleCount: 5,
        angle:  120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#2ECC71', '#F1C40F', '#3498DB'],
      });
      if (Date.now() < fin) requestAnimationFrame(frame);
    })();
  }
}
