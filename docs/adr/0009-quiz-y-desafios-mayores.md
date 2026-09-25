# ADR-0009: Quiz por libro y desafíos mayores

- **Estado:** aceptada
- **Fecha:** 2026-09-24

## Contexto

El Sprint 3B agrega el quiz (Documento Maestro §2.18) y los desafíos mayores, los "jefes finales" adaptados (§2.14). Las reglas de siempre siguen valiendo: nunca castigar, las reflexiones no se califican y el contenido guarda referencias, no texto.

## Decisión

- **Contenido:** un archivo por libro en `content/quiz/<LIBRO>.json`. Este sprint cubre **20 libros clave** (Génesis, Éxodo, Josué, Jueces, Rut, 1 Samuel, 1 Reyes, Ester, Job, Salmos, Proverbios, Daniel, Jonás, Mateo, Marcos, Lucas, Juan, Hechos, Filipenses y Santiago): **208 preguntas de opción múltiple y 22 para pensar**.
  - La **primera opción es la correcta**. La app mezcla las opciones con una semilla (la pregunta y el día), así que no siempre queda en el mismo lugar.
  - Cada pregunta dice en qué versículo está la respuesta (`verse`) y una palabra que tiene que aparecer en él (`check`). La prueba `tests/v3-quiz.test.ts` lo revisa contra `bible.db`, así que una pregunta con una referencia equivocada no pasa.
  - El `id` es el capítulo y una letra (`"3a"`); la referencia completa es `"GEN.3a"`. Los ids de preguntas ya publicadas no se cambian, porque quedan guardados en el progreso.
- **XP:** 5 XP por respuesta correcta, **solo la primera vez que aciertas esa pregunta**, y hasta 20 al día (§2.5). Las correctas se guardan en `activity_log` (`type = 'quiz'`, `ref = "GEN.3a"`); **las incorrectas no se guardan**. Al responder se muestra el versículo con la respuesta; si te equivocas, dice "Casi. La respuesta está aquí".
- **Preguntas para pensar:** no tienen respuesta correcta. Lo que escribes va al diario como reflexión (con la pregunta arriba) y cuenta como la reflexión del día (+15 XP, hasta 3).
- **Dónde aparece:**
  - Al final de cada capítulo que tiene preguntas: "Pon a prueba lo que leíste", con hasta 3 preguntas (primero las que no acertaste) y la de pensar al final. Se habilita al marcar el capítulo como leído, o si ya lo habías leído.
  - "Quiz del libro" en la ficha del libro del mapa y en la lista de capítulos: hasta 10 preguntas de los capítulos que ya leíste (o de todo el libro si todavía no leíste ninguno).
- **Desafíos mayores:** son desafíos normales (`content/challenges.json`) con `tier: "mayor"`, sin plazo. Hay 5: Jonás (200 XP), Daniel (300), Juan (500), Hechos (400) y Génesis (500). El de Juan es exactamente el del Documento Maestro: los 21 capítulos, 5 reflexiones, 3 oraciones, 3 aplicaciones y 10 preguntas.
  - Tipos de requisito nuevos: `quiz_correct` (preguntas distintas acertadas, opcionalmente de ciertos libros) y un filtro `books` en `activity_count` (por ejemplo, reflexiones escritas después de leer Juan).
  - Como los demás desafíos, **cuenta lo que hagas desde el día en que lo empiezas** (también lo de ese mismo día).
  - Se pueden tener **2 mayores a la vez**, aparte de los 3 normales.
  - Al completarlo aparece la animación "Desafío completado" (medallón dorado, rayos que giran y chispas; se apaga con "reducir movimiento") y se gana una **insignia** en Logros → Desafíos mayores. La insignia es un logro con la regla nueva `challenge_completed` y 0 XP, porque el XP ya lo da el desafío.
- **Logros nuevos:** "Buena memoria" (10 respuestas correctas) y "Conocedor de la Palabra" (100).
- **Sin migración.** Todo usa `activity_log` y `challenge_runs`.

## Consecuencias

- Para agregar un libro basta con crear su `content/quiz/<LIBRO>.json`; la prueba revisa ids, capítulos y versículos.
- Las preguntas son un **borrador** que Youfrend debe revisar.
- Responder el quiz cuenta como actividad del día para la racha, igual que escribir una reflexión.
