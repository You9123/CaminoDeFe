# ADR-0012: Fichas bloqueadas con niebla y sin spoilers

- **Estado:** aceptada
- **Fecha:** 2026-09-27
- **Reemplaza:** la parte de visibilidad del ADR-0008 ("todas las fichas se ven desde el principio" y la imagen en gris de la ficha bloqueada).

## Contexto

La V3.5 ("Descubrir y simplificar", `Plan_V3.5.md`) pasa de "todo visible desde el principio" a **progreso por descubrimiento**. Con el ADR-0008, una ficha bloqueada ya mostraba su nombre, su frase, su resumen, su versículo y hasta la imagen nítida en el visor: no quedaba nada por descubrir. Además, el lector ("Aparecen en este capítulo") y la línea temporal ("Qué pasó", "Quiénes estaban", "Dónde") decían los nombres antes de leer.

No hay arte nuevo (115 imágenes es demasiado trabajo por ahora; ver `Imagenes_coleccionables.md`), así que la solución tiene que usar las pinturas que ya están.

## Decisión

- **Bloqueada = ningún capítulo clave leído.** La regla no cambia (`passagesProgress`); lo que cambia es qué se muestra. Nueva función pura `collectibleState()` → `locked | unlocked | complete`.
- **Niebla en vez de imagen nueva.** La ficha bloqueada usa la misma pintura con un filtro CSS fuerte (`.ficha-fog`: desenfoque de 22 px, oscurecida, sepia y un poco ampliada para que el borde no se aclare), con un candado encima. Sin crédito, sin visor de imagen grande (el visor solo existe en la ficha descubierta).
- **Qué se ve de una ficha bloqueada:** candado, "???", el tipo ("Personaje por descubrir") y una pista **"Aparece en Génesis"**: el libro de su primer capítulo clave, nunca el capítulo exacto. Nada de nombre, frase, resumen, versículo, capítulos, etapas ni fichas relacionadas. El botón abre el libro (la lista de capítulos), no un capítulo.
- **Cuando el libro delata la ficha** (Rut, Samuel, Jonás, Isaías, Jeremías, Daniel, Esdras, Nehemías, Ester, Job, Roma → Romanos, y los eventos que empiezan con esos nombres), la pista dice solo la zona del mapa ("Aparece en la zona «Los profetas» del mapa") y el botón abre el mapa. Se detecta con `bookRevealsName()` (palabras del nombre contra el nombre del libro, sin tildes). Una prueba revisa que ninguna pista de las 115 fichas contenga el nombre.
- **Accesible:** el estado bloqueado se entiende sin color (candado, "???", borde punteado y "por descubrir" en el texto y en `aria-label`).
- **Sin spoilers en ninguna pantalla:**
  - **Coleccionables:** tarjetas bloqueadas con candado, "???", tipo y pista. Arriba, el contador "43 de 115 descubiertos" (además del conteo por tipo en las pestañas).
  - **Lector:** si el capítulo no está leído, solo "En este capítulo hay N descubrimientos"; si ya está leído, los nombres como antes (`chapterDiscoveries()`).
  - **Línea temporal:** los títulos y resúmenes de las etapas se ven; los eventos no descubiertos son "???" / "Evento por descubrir", y los personajes y lugares, "???". Todos abren la ficha con niebla.
  - **Relacionadas** dentro de una ficha descubierta: las bloqueadas también como "???".
  - Mientras se carga lo leído, no se muestra ningún nombre (la ficha espera a tener los datos).
  - **Excepción:** Ajustes → Acerca de → Ver los créditos sigue listando todas las imágenes con su título, porque las licencias CC BY y CC BY-SA piden el crédito completo. Está plegado y hay que abrirlo a propósito.
- **"Capítulo completado":** al terminar un capítulo en el lector, el flujo post-lectura empieza con una pantalla nueva (paso `result`): el capítulo, los XP (y el nivel, si subió) y, si hubo, "Nuevos descubrimientos" con nombre e imagen nítida. La niebla se despeja con una animación corta (`.ficha-reveal`, 1,6 s, escalonada; se apaga con "reducir movimiento"). Cada ficha abre su página en la colección, y hay un enlace "Ver colección". Después siguen reflexión, oración y aplicación como antes. No hay pantalla final: el lector ya tiene "Siguiente".
  - Solo aparece al terminar un capítulo en el lector (también el último de una sesión de 5/10/15/30 min). El flujo reutilizado en misiones y sesiones no cambia; abrirlo luego con "Reflexionar, orar, aplicar" tampoco lo muestra.
  - **Sin avisos duplicados:** si esa pantalla muestra los descubrimientos, `announceCollectibles(…, { quiet: true })` no lanza los toasts (la mascota sí celebra). En los capítulos intermedios de una sesión, que no abren el flujo, los toasts siguen como antes.
- **Sin tablas nuevas ni migración.** Todo se deriva de `chapter_progress`, así que una base de la V3 ve descubierto lo que ya leyó y las fechas salen de la primera lectura.

## Consecuencias

- Descubrir es otra vez una pequeña sorpresa, y ninguna pantalla adelanta nombres.
- Si algún día hay arte propio o siluetas, se cambia la imagen y (en personajes) la niebla por la silueta, sin tocar la lógica.
- Los textos nuevos (pistas, "Esta ficha se descubre leyendo…", "En este capítulo hay N descubrimientos") los revisa Youfrend.
- Pruebas en `tests/v35-discovery.test.ts`.
