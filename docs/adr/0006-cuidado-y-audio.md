# ADR-0006: Emociones, modo escuchar, sesiones por tiempo y exportar el diario

- **Estado:** aceptada
- **Fecha:** 2026-09-24

## Contexto

El Sprint 2C agrega funciones que tocan temas delicados (cómo se siente el usuario) y dependen del sistema (voz, impresión).

## Decisión

- **¿Cómo me siento hoy?**
  - Migración 5: `emotions_log(day PK, emotion, created_at, updated_at)`. Una emoción por día; se puede cambiar o borrar.
  - Las emociones se dibujan como **clima** (sol, nube, lluvia, tormenta, viento, luna, corazón), no como caras, para no parecer emojis (ADR-0003).
  - Si en **3 días seguidos** (hasta hoy) se eligió "Triste" o "Ansioso" (`cuidado: true` en `content/emotions.json`), se muestra un mensaje amable que sugiere hablar con alguien de confianza o con un profesional. Nunca diagnostica ni usa lenguaje clínico.
  - Las entradas nuevas del diario guardan la emoción del día.
  - Se puede apagar en Ajustes.
- **Modo escuchar:** Web Speech API con las voces instaladas en Windows (sin internet ni licencias). Se lee versículo por versículo (los largos se parten en frases, porque algunos motores se cortan) y se resalta el que suena. Pausar = detener y recordar el versículo (en Chromium `pause()` no es confiable). **Escuchar el capítulo completo habilita "Terminé"** sin esperar el tiempo mínimo. La voz y la velocidad se eligen en Ajustes. Piper (voces neuronales) queda para la V3.
- **Sesiones de 5/10/15/30 minutos:** 5 es la sesión corta de siempre. Las demás toman los capítulos sin leer desde la última posición mientras quepan en el tiempo (lectura a 200 palabras por minuto, con un 20 % de margen para el primero). Si el siguiente no cabe, proponen un Salmo corto sin leer. La reflexión y la oración (con el temporizador sugerido) van al final de la sesión. La sesión vive solo en memoria.
- **Exportar el diario:** Markdown con un comando de Rust que solo escribe archivos `.md`. El **PDF se hace con el diálogo de impresión** ("Guardar como PDF"), usando una hoja de estilos de impresión propia. Así no se agrega una librería de PDF y se conservan las tipografías de la app.
- **Respaldo formato 3:** agrega `emotions_log`. Se siguen importando los formatos 1 y 2.

## Consecuencias

- La calidad de la voz depende de las voces instaladas. Si no hay voces en español, Ajustes explica cómo agregarlas en Windows.
- Probado en Linux (WebKitGTK), que no tiene `speechSynthesis`: la lógica tiene pruebas con un motor simulado, pero la voz real hay que probarla en Windows (WebView2).
