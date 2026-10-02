# ADR-0015: Reacciones de la mascota y un solo catálogo de cosméticos

- **Estado:** aceptada
- **Fecha:** 2026-10-02

## Contexto

Último sprint de la V3.5 (`Plan_V3.5.md`, 3.5D). La mascota (ADR-0007) solo celebraba con un contador genérico, sus frases no hablaban de lo que hiciste, y los cosméticos estaban en dos listas sueltas: las recompensas por racha (`cosmetics.ts`) y los accesorios de la mascota (`PET_ACCESSORIES` en `pet.ts`), con la bufanda repetida en ambas. Los desafíos mayores y los niveles no daban nada nuevo para mostrar.

## Decisión

### Reacciones

- **Nuevo ánimo `curious`:** ojos bien abiertos, la cabeza se ladea un par de veces y aparece una chispa. Es la reacción al descubrir una ficha.
- **Cuándo reacciona (`petReaction`):** curiosa al descubrir (lo más específico gana); celebra al terminar un capítulo, completar las misiones del día o la sorpresa, un desafío, un logro o subir de nivel. **No reacciona a todo:** una reflexión, una oración o una misión suelta no cambian nada (ya está contenta por el día).
- La reacción vive en `progressStore.petReaction` (`react(kind)`, con hora) y dura unos segundos (`REACTION_MS`), aunque la mascota aparezca después. Reemplaza al antiguo `celebrationKey`.
- **Dónde se ve:** en Hoy y, nuevo, en la pantalla **"Capítulo completado"** (pequeña, con su burbuja), que es donde pasan las reacciones. Sin mascota, ahí no aparece nada.
- **Estados "leyendo" y "orando": no se agregan.** Para verlos habría que poner la mascota en el lector o en la oración, y la V3.5 busca lo contrario (menos cosas en pantalla). Su papel lo cumplen las frases con datos del día.

### Frases con datos del día

- `petLine` recibe `chaptersToday` (capítulos de hoy) y `discoveredToday` (lo último descubierto hoy): "Hoy llevas 2 capítulos.", "Hoy descubriste a Eva.", "Descubriste la caída.". Con personajes dice "a Eva"; con lugares y eventos, el nombre tal cual (en minúscula si empieza con artículo).
- Mismo tono de siempre: cálido, sin culpa, sin frases religiosas genéricas, sin signos de exclamación, 48 caracteres como máximo (lo revisa una prueba).

### Un solo catálogo de cosméticos

- `COSMETICS` en `src/domain/cosmetics.ts`: cada cosmético tiene `id`, tipo (`pet_accessory`, `decoration`, `background`, `map_frame`, `badge`), título, descripción, cómo se gana (`streak`, `achievement`, `level`, `major_challenge`) y si se puede prender o apagar. **Sin tienda: todo se gana.**
- `PET_ACCESSORIES` ahora sale del catálogo (los de tipo `pet_accessory`). La bufanda queda una sola vez (`bufanda`, racha de 7 días). Los ids guardados (`settings.pet_accessory`, `settings.cosmetics_off`) no cambian.
- Lo ganado se calcula con `CosmeticFacts` (récord de racha, nivel, logros y desafíos mayores completados, contados por sus insignias). No se guarda nada nuevo.
- Mi camino → Logros → **Recompensas** muestra el catálogo entero en tres grupos: por constancia, por logros y desafíos, y por nivel. Cada una dice cómo se gana y, si falta, "Faltan 3 días" o "Faltan 2 niveles".

### Recompensas nuevas

- **Pañuelo de viaje** (nivel 15): accesorio azul para la mascota.
- **Lámpara del camino** (nivel 25): una lamparita junto al nivel en la barra lateral (se puede apagar).
- **Corona de laurel** (cualquier desafío mayor): accesorio para la mascota.
- **Ramita de laurel** (cualquier desafío mayor): junto al rango en la barra lateral (se puede apagar). Así quien no usa mascota también gana algo.

### Avisos

- **La subida de nivel menciona los desbloqueos solo si hay:** "Llegaste al nivel 15 · Desbloqueaste: Pañuelo de viaje"; si no, solo "Llegaste al nivel 16" (`levelUpMessage`).
- Lo demás que se gane (por racha, logro o desafío mayor) avisa con "Nuevo desbloqueo: …" (`newUnlocks`, comparando antes y después de cada actividad). Al actualizar, lo que ya se tenía no se anuncia.
- Si no hay mascota, sus accesorios no se anuncian.

### Se mantiene

La mascota es opcional; apagada no ocupa espacio ni pierde progreso; nunca se enferma ni se muere; no pide mantenimiento. Sin sonidos.

## Consecuencias

- Una sola lista para agregar adornos en el futuro (y para la V4).
- Los textos nuevos (frases, nombres y descripciones de las recompensas) los revisa Youfrend.
- Pruebas en `tests/v35-pet-cosmetics.test.ts`.
