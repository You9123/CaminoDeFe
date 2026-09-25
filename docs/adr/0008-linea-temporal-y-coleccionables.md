# ADR-0008: Línea temporal y coleccionables

- **Estado:** aceptada
- **Fecha:** 2026-09-24

## Contexto

El Sprint 3A abre la V3 con la línea temporal (Documento Maestro §2.17) y los coleccionables de personajes, lugares y eventos (§2.19). Casi todo es contenido, y el contenido solo puede guardar referencias, nunca texto bíblico (§4).

## Decisión

- **Contenido en cuatro archivos** (`content/`):
  - `timeline.json`: las **15 etapas** en orden (de la creación a la Iglesia), con fecha aproximada, resumen, pasajes, personajes y lugares.
  - `events.json`: **44 eventos**. Cada uno pertenece a una etapa (`era`), así que la línea temporal y los coleccionables comparten los datos, sin repetirlos.
  - `characters.json` (**45 personajes**) y `places.json` (**26 lugares**).
  - Los pasajes son **capítulos** (`"GEN.12"`) o **rangos** (`"GEN.6-9"`). Cada ficha puede tener un versículo (`"verse"`) que se lee de `bible.db`.
  - Todo se valida con Zod al cargar (`buildCatalog`), incluidos los ids repetidos y las referencias a personajes, lugares o etapas que no existen. La prueba `tests/v3-history.test.ts` también revisa cada capítulo y versículo contra `bible.db`.
- **Sin tablas nuevas ni migración.** El avance de cada ficha es la parte de sus capítulos clave que ya leíste, y se calcula con `chapter_progress`. La fecha de desbloqueo es la primera lectura de cualquiera de esos capítulos. Por eso el respaldo no cambia y, al actualizar, las fichas de lo que ya leíste aparecen desbloqueadas.
- **Desbloquear no bloquea nada.** Todas las fichas se ven desde el principio (nombre y frase). Al leer uno de sus capítulos toman color; con todos, se vuelven doradas. No dan XP: el XP sigue viniendo de leer.
- **Aviso al leer:** al terminar un capítulo por primera vez aparece "Personaje desbloqueado: Moisés" (o lugar, o evento), y la mascota celebra. Si son más de dos a la vez, un solo aviso.
- **Jesús no es una ficha.** Es el centro de la línea temporal (la etapa "Jesús" y sus eventos), pero no un "personaje desbloqueado". Se puede revisar si Youfrend lo prefiere de otra forma.
- **Job** es el único personaje sin etapa: el libro no da una fecha.
- **Pantallas:**
  - **Línea temporal** (nueva en la barra lateral): una franja horizontal con las 15 etapas y un tramo punteado de "unos 400 años" entre los testamentos. Cada etapa se ilumina con sus capítulos y los de sus eventos. Debajo, la etapa elegida: resumen, "Para leer", "Qué pasó", "Quiénes estaban" y "Dónde". La etapa elegida queda en la URL (`?etapa=`), y por defecto es la última en la que leíste algo.
  - **Logros → Coleccionables:** pestañas Insignias / Coleccionables; tres grupos (personajes, lugares, eventos) con su conteo.
  - **Ficha** (modal, compartida por las tres pantallas): resumen, versículo, avance, "Dónde leerlo" y "Relacionado".
  - **Lector:** "Aparecen en este capítulo" con las fichas que tienen ese capítulo como pasaje clave.
- **Imágenes reales en las fichas:** las 115 fichas tienen una imagen arriba (22 rem de alto): pinturas clásicas y grabados de dominio público para personajes y eventos (Rembrandt, Caravaggio, Tissot, Doré, Poussin…) y fotos o fotocromos antiguos para los lugares. Todas vienen de Wikimedia Commons, con licencia de dominio público, CC0, CC BY o CC BY-SA.
  - Van dentro de la app (`src/assets/fichas/`, WebP de 960x540, de 40 a 150 KB; unos 9 MB en total), así que funcionan sin internet.
  - El crédito (título, autor, año, licencia y enlace) está en `content/collectible_images.json`, se muestra bajo cada imagen y en Ajustes → Acerca de → Ver los créditos. Las licencias CC BY y CC BY-SA piden nombrar al autor; por eso la lista.
  - Un tono cálido suave para que combinen con el papel y un zoom muy lento (se apaga con "reducir movimiento"). Si la ficha está bloqueada, la imagen se ve en gris.
  - Las pruebas revisan que cada imagen tenga crédito, que corresponda a una ficha y que pese menos de 160 KB.
- **Íconos nuevos** con el trazo propio: arca, tienda, tablas, cayado, pozo, ciudad, olas, pez, tumba, estrella, honda, escalera, persona, marca de lugar y línea temporal.

## Consecuencias

- Para agregar una ficha basta con editar el JSON; la prueba de contenido avisa si una referencia no existe.
- Los resúmenes son un **borrador**: Youfrend debe revisarlos (referencias y tono) antes de publicar, como pide el Documento Maestro.
- Las fechas son aproximadas y la pantalla lo dice. El éxodo se muestra como "Siglo XV o XIII a. C." porque hay dos fechas defendidas.
