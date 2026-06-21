const TOKEN_KEY    = 'token_lectonautas';
const USUARIO_KEY  = 'usuario_lectonautas'; // Clave para guardar los datos del docente

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
  const loginForm = document.getElementById('loginForm');
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

function initLoginPage() {
  if (obtenerToken()) {
    window.location.href = 'index.html';
    return;
  }

  const loginForm = document.getElementById('loginForm');
  const mensajeLogin = document.getElementById('login-mensaje');
  const btnIngresar = document.getElementById('btn-ingresar');

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      mensajeLogin.textContent = 'Completá el correo y la contraseña.';
      return;
    }

    btnIngresar.disabled = true;
    btnIngresar.textContent = 'Ingresando...';
    mensajeLogin.textContent = '';

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.token) {
        mensajeLogin.textContent = result.error || 'No fue posible iniciar sesión.';
        btnIngresar.disabled = false;
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
      btnIngresar.disabled = false;
      btnIngresar.textContent = 'Ingresar';
    }
  });
}

function initRegisterPage() {
  // Se ha abierto el registro para que cualquier usuario pueda crearse una cuenta.

  const registerForm = document.getElementById('registerForm');
  const mensajeRegistro = document.getElementById('register-mensaje');
  const resultadoRegistro = document.getElementById('register-resultado');
  const btnRegistrar = document.getElementById('btn-registrar');

  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const nombre = document.getElementById('register-nombre').value.trim();
    const apellido = document.getElementById('register-apellido').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const dni = document.getElementById('register-dni').value.trim();
    const rol = document.getElementById('register-rol').value;

    if (!nombre || !apellido || !email || !dni || !rol) {
      mensajeRegistro.textContent = 'Completá todos los datos para crear el usuario.';
      return;
    }

    btnRegistrar.disabled = true;
    btnRegistrar.textContent = 'Creando usuario...';
    mensajeRegistro.textContent = '';
    resultadoRegistro.classList.add('oculto');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, apellido, email, dni, rol }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        mensajeRegistro.textContent = result.error || 'No fue posible crear el usuario.';
        btnRegistrar.disabled = false;
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
      btnRegistrar.disabled = false;
      btnRegistrar.textContent = 'Crear usuario';
    } catch (error) {
      mensajeRegistro.textContent = 'No se pudo conectar con el servidor.';
      btnRegistrar.disabled = false;
      btnRegistrar.textContent = 'Crear usuario';
    }
  });
}

function initMainPage() {
  const form = document.getElementById('lecturaForm');
  const resultadoCard = document.getElementById('resultado');
  const inputNivel = document.getElementById('nivel');
  const selectCiclo = document.getElementById('ciclo');
  const inputAñoGrado = document.getElementById('año_grado');
  const temporizadorEl = document.getElementById('temporizador');
  const palabrasContEl = document.getElementById('palabrasContadas');
  const textoEscuchadoEl = document.getElementById('texto-escuchado');
  const micStatusEl = document.getElementById('mic-status');
  const micContainer = document.getElementById('mic-container');
  const btnIniciar = document.getElementById('btn-iniciar-mic');
  const btnDetener = document.getElementById('btn-detener-mic');
  const btnProcesando = document.getElementById('btn-procesando');
  const seccionEdicion = document.getElementById('seccion-edicion');
  const textareaTransc = document.getElementById('textoTranscrito');
  const palabrasFinalesEl = document.getElementById('palabrasFinales');
  const pausasDetectadasEl = document.getElementById('pausas-detectadas');
  const btnGuardar = document.getElementById('btn-guardar');
  const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
  const lectonautaGuiaEl = document.getElementById('lectonauta-guia');
  const guiaMensajeEl = document.getElementById('guia-mensaje');

  if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', cerrarSesion);
  }

  let recognition;
  let timerInterval;
  let tiempoRestante = 60;
  let tiempoInicio = null;
  let tiempoEmpleado = 0;
  let leyendo = false;
  let finalTranscript = '';
  let pausasDetectadas = 0;
  let timeoutOcultarGuia = null;
  let timeoutVolverInicio = null;

  const UMBRALES_GUIA = {
    Primario: { Primario: { amarillo: 60, verde: 86 } },
    Secundario: {
      Básico: { amarillo: 100, verde: 126 },
      Orientado: { amarillo: 120, verde: 146 },
      Técnico: { amarillo: 120, verde: 146 },
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
        'El micrófono está activo.',
        'Cuando el estudiante termine, presioná 🛑 <strong>Terminar Antes</strong>.',
        'El tiempo máximo es de 60 segundos.',
      ]),
      revision: renderLineasGuia([
        '✏️ Revisá el texto transcrito.',
        'Si la IA cometió errores, podés corregirlos.',
        'Después seleccioná la evaluación de prosodia.',
        'Por último, presioná <strong>💾 Guardar Registro</strong>.',
      ]),
    };

    if (estado === 'resultado') {
      const {
        ppm = 0,
        nivel = 'Primario',
        ciclo = 'Primario',
        color = 'rojo',
        umbrales,
      } = datos;

      const umbralesNivel = UMBRALES_GUIA[nivel] || UMBRALES_GUIA.Primario;
      const umbralesFallback = umbralesNivel[ciclo] || Object.values(umbralesNivel)[0];
      const umbralAmarillo = Number(umbrales?.amarillo) || umbralesFallback.amarillo;
      const umbralVerde = Number(umbrales?.verde) || umbralesFallback.verde;
      const maxAmarillo = Number(umbrales?.amarilloMax) || umbralVerde - 1;

      const etiquetaColor = { verde: '🟢 Verde', amarillo: '🟡 Amarillo', rojo: '🔴 Rojo' };
      const descripcionColor = {
        verde: '¡Excelente! El estudiante superó el umbral requerido.',
        amarillo: 'Va por buen camino, pero aún está por debajo del umbral Verde.',
        rojo: 'Necesita más práctica para alcanzar la fluidez esperada.',
      };

      const lineasResultado = [
        `El estudiante obtuvo <strong>${ppm} palabras por minuto</strong>.`,
        `Nivel: <strong>${nivel}</strong>.`,
        `Ciclo: <strong>${ciclo}</strong>.`,
        `Para estar en Verde, necesita más de <strong>${maxAmarillo} PPM</strong>.`,
        `Referencia: 🟢 Verde &gt; ${maxAmarillo} · 🟡 Amarillo ${umbralAmarillo}-${maxAmarillo} · 🔴 Rojo &lt; ${umbralAmarillo}.`,
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

  const CICLOS_POR_NIVEL = {
    Primario: [{ value: 'Primario', label: 'Nivel Primario' }],
    Secundario: [
      { value: 'Básico', label: 'Ciclo Básico (1° a 3°)' },
      { value: 'Orientado', label: 'Ciclo Orientado (4° a 6°)' },
      { value: 'Técnico', label: 'Especialidad Técnica (4° a 7°)' },
    ],
  };

  function actualizarOpcionesCiclo() {
    const nivel = inputNivel.value;
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

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'es-AR';
  } else {
    micStatusEl.textContent = '⚠️ Tu navegador no soporta lectura por voz. Usá Google Chrome.';
    btnIniciar.disabled = true;
  }

  if (recognition) {
    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const fragmento = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += fragmento + ' ';
        } else {
          interimTranscript += fragmento;
        }
      }

      const textoCompleto = finalTranscript + interimTranscript;
      textoEscuchadoEl.textContent = textoCompleto || '...';
      palabrasContEl.textContent = contarPalabras(textoCompleto);

      textoEscuchadoEl.parentElement.scrollTop =
        textoEscuchadoEl.parentElement.scrollHeight;
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        micStatusEl.textContent = '🚫 Necesitamos permiso para usar el micrófono.';
        detenerLectura(false);
      }
    };

    recognition.onend = () => {
      if (!leyendo) return;
      if (tiempoRestante > 0) {
        try {
          recognition.start();
        } catch (error) {}
      }
    };
  }

  btnIniciar.addEventListener('click', () => {
    const nombre = document.getElementById('nombre').value.trim();
    const apellido = document.getElementById('apellido').value.trim();
    const añoGrado = inputAñoGrado.value;
    const division = document.getElementById('division').value.trim(); // Antes era 'seccion'

    if (!nombre || !apellido || !añoGrado || !division) {
      Swal.fire({
        title: '¡Falta información!',
        text: 'Completá todos los datos del estudiante antes de iniciar la lectura.',
        icon: 'warning',
        confirmButtonColor: '#4e89ae',
        confirmButtonText: '¡Entendido!',
      });
      return;
    }

    finalTranscript = '';
    textoEscuchadoEl.textContent = '...';
    palabrasContEl.textContent = '0';
    tiempoRestante = 60;
    tiempoEmpleado = 0;
    actualizarReloj();
    seccionEdicion.classList.add('oculto');
    textareaTransc.value = '';
    palabrasFinalesEl.textContent = '0';
    pausasDetectadasEl.textContent = '0';
    pausasDetectadas = 0;

    tiempoInicio = Date.now();
    leyendo = true;

    btnIniciar.classList.add('oculto');
    btnDetener.classList.remove('oculto');
    btnDetener.disabled = false;
    micContainer.classList.add('grabando');
    micStatusEl.textContent = '¡Escuchando atentamente! 👂';
    actualizarMensajeGuia('grabando');

    try {
      recognition.start();
    } catch (error) {}
    iniciarTemporizador();
  });

  btnDetener.addEventListener('click', () => detenerLectura(true));

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

  function detenerLectura(debeProcesar) {
    leyendo = false;
    clearInterval(timerInterval);

    tiempoEmpleado = tiempoInicio
      ? Math.max(1, Math.round((Date.now() - tiempoInicio) / 1000))
      : Math.max(1, 60 - tiempoRestante);

    micContainer.classList.remove('grabando');

    try {
      recognition.stop();
    } catch (error) {}

    btnDetener.classList.add('oculto');
    btnDetener.disabled = true;

    if (debeProcesar) {
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
  }

  function mostrarEdicion() {
    textareaTransc.value = finalTranscript.trim();
    palabrasFinalesEl.textContent = contarPalabras(textareaTransc.value);
    pausasDetectadas = (finalTranscript.match(/[.,]/g) || []).length;
    pausasDetectadasEl.textContent = pausasDetectadas;

    seccionEdicion.classList.remove('oculto');
    seccionEdicion.scrollIntoView({ behavior: 'smooth', block: 'start' });
    actualizarMensajeGuia('revision');
  }

  btnGuardar.addEventListener('click', async () => {
    const textoFinal = textareaTransc.value.trim();
    const palabrasContadas = contarPalabras(textoFinal);

    if (palabrasContadas === 0) {
      Swal.fire({
        title: 'Sin texto registrado',
        text: '¿El micrófono funcionó correctamente? No hay texto para guardar.',
        icon: 'warning',
        confirmButtonColor: '#4e89ae',
      });
      return;
    }

    const prosodiaSeleccionada = document.querySelector('input[name="prosodia"]:checked');
    if (!prosodiaSeleccionada) {
      Swal.fire({
        title: 'Falta la evaluación de prosodia',
        text: 'Por favor seleccioná una opción de Ritmo y Prosodia antes de guardar.',
        icon: 'warning',
        confirmButtonColor: '#4e89ae',
      });
      return;
    }

    // Construimos el objeto "estudiante" con todos sus datos del formulario.
    // El servidor lo guardará como sub-documento dentro del registro de la lectura.
    const payload = {
      estudiante: {
        nombre:    document.getElementById('nombre').value.trim(),
        apellido:  document.getElementById('apellido').value.trim(),
        nivel:     inputNivel.value,
        ciclo:     selectCiclo.value,
        año_grado: Number(inputAñoGrado.value),
        division:  document.getElementById('division').value.trim().toUpperCase(),
      },
      textoTranscrito: textoFinal,
      palabrasContadas,
      tiempoEmpleadoSegundos: tiempoEmpleado,
      prosodia: prosodiaSeleccionada.value,
      pausasDetectadas,
    };

    btnGuardar.disabled = true;
    btnGuardar.textContent = '⏳ Guardando...';

    try {
      const response = await fetch('/api/lecturas', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
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
          title: '¡Oops!',
          text: result.error || 'Algo salió mal al guardar el registro.',
          icon: 'error',
          confirmButtonColor: '#4e89ae',
        });
        restaurarBtnGuardar();
      }
    } catch (error) {
      Swal.fire({
        title: 'Sin conexión 🔌',
        text: 'No se pudo conectar con el servidor. Verificá la conexión.',
        icon: 'error',
        confirmButtonColor: '#4e89ae',
      });
      restaurarBtnGuardar();
    }
  });

  function restaurarBtnGuardar() {
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar Registro';
  }

  function volverPantallaInicial() {
    clearTimeout(timeoutOcultarGuia);
    clearTimeout(timeoutVolverInicio);
    form.reset();
    form.style.display = '';
    resultadoCard.classList.add('oculto');
    finalTranscript = '';
    textoEscuchadoEl.textContent = '...';
    palabrasContEl.textContent = '0';
    temporizadorEl.textContent = '01:00';
    micStatusEl.textContent = 'Completá los datos del estudiante y presioná Iniciar';
    seccionEdicion.classList.add('oculto');
    textareaTransc.value = '';
    palabrasFinalesEl.textContent = '0';
    pausasDetectadasEl.textContent = '0';
    pausasDetectadas = 0;
    btnIniciar.classList.remove('oculto');
    btnDetener.classList.add('oculto');
    btnDetener.disabled = true;
    restaurarBtnGuardar();
    actualizarOpcionesCiclo();
    actualizarMensajeGuia('inicio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function mostrarResultado(result) {
    form.style.display = 'none';
    resultadoCard.classList.remove('oculto');

    ['rojo', 'amarillo', 'verde'].forEach((c) => {
      document.getElementById(`luz-${c}`).classList.remove(`active-${c}`);
    });

    if (result.color) {
      document.getElementById(`luz-${result.color}`).classList.add(`active-${result.color}`);
    }

    document.getElementById('emoji-gigante').innerHTML = result.emoticon || '';
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

    if (result.color === 'verde') {
      triggerConfetti();
    }

    actualizarMensajeGuia('resultado', {
      ppm: result.ppm,
      nivel: result.nivel || inputNivel.value,
      ciclo: result.ciclo || selectCiclo.value,
      color: result.color,
      umbrales: result.umbrales,
    });
  }

  document.getElementById('btn-nuevo').addEventListener('click', () => {
    volverPantallaInicial();
  });

  function contarPalabras(texto) {
    return texto.trim().split(/\s+/).filter(Boolean).length;
  }

  function triggerConfetti() {
    const duracion = 3 * 1000;
    const fin = Date.now() + duracion;
    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#2ECC71', '#F1C40F', '#3498DB'],
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#2ECC71', '#F1C40F', '#3498DB'],
      });
      if (Date.now() < fin) requestAnimationFrame(frame);
    })();
  }
}
