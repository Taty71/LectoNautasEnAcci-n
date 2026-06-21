# Integración de Reconocimiento de Voz (Web Speech API)

¡Este requerimiento es genial e integrarlo a Lectonautas lo hará mucho más interactivo! Modificaremos nuestro frontend actual para que, en lugar de que el maestro escriba el número "PPM" a mano, el niño pueda presionar un botón, leer al micrófono durante **60 segundos**, y la aplicación cuente todo de forma automática para arrojar el resultado.

## User Review Required

> [!IMPORTANT]
> - La Web Speech API en español a veces depende mucho de la calidad del micrófono y el navegador (Google Chrome es el que mejor soporte tiene).
> - ¿Estás de acuerdo con que modifique los archivos de "Lectonautas" (`index.html`, `styles.css` y `app.js`) para incorporar este micrófono mágico o prefieres que te dé un script suelto/independiente?

## Proposed Changes

Implementaremos lo siguiente en la vista del niño:

### [MODIFY] [index.html](file:///d:/PROYECTO_LECTURA/public/index.html)
- Añadiremos un botón grande llamado **"🎙️ Iniciar Lectura (60s)"** al lado del campo de PPM.
- Reemplazaremos el ingreso de texto "PPM" (o lo bloquearemos temporalmente) para evidenciar que el cálculo ahora es automático.
- Añadiremos un temporizador visual gigante para que el niño (o el profe) vea la cuenta regresiva desde *00:60* hasta *00:00*.

### [MODIFY] [styles.css](file:///d:/PROYECTO_LECTURA/public/styles.css)
- Agregaremos una clase `.pulsing` en color rojo para el botón del micrófono, indicando visualmente que "estamos grabando/escuchando".
- Estilos llamativos para el reloj del temporizador.

### [MODIFY] [app.js](file:///d:/PROYECTO_LECTURA/public/app.js)
- Verificaremos soporte para `window.SpeechRecognition` o `window.webkitSpeechRecognition`.
- Configuraremos el idioma de escucha de la IA base de Chrome al español (`es-AR` o `es-ES`).
- Crearemos el intervalo de `setInterval` que controle exactamente los **60.000 ms** (60s).
- Al cerrarse el temporizador:
  1. Detendremos el micrófono.
  2. Obtendremos el texto total escuchado.
  3. Contaremos el número de palabras (`texto.split(/\s+/).length`).
  4. Dispararemos automáticamente la función `fetch` que ya armamos antes, enviando todo el formulario por red hacia Node.js.

## Open Questions

> [!QUESTION]
> - El temporizador durará 60 segundos y se enviará la petición automáticamente, pero ¿qué pasa si el niño termina su texto antes de los 60 segundos? ¿Añadimos un botón de **"Terminar antes"** o lo forzamos a esperar a que pasen los 60s?


## Verification Plan

### Manual Verification
1. Ingresaremos a `localhost:3000`.
2. Completaremos el nombre del niño.
3. Presionaremos "🎙️ Iniciar Lectura". Otorgaremos el permiso emergente de micrófono en el navegador.
4. Leeremos un texto de prueba durante un rato (con un límite forzado de 60s).
5. Observaremos cómo al llegar a "00:00", el sistema procesa solo, frena, cuenta las palabras y muestra la tarjeta del semáforo con el resultado.
