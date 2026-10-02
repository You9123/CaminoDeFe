# ADR-0014: Conexiones entre mapa, historia y colección; logros de descubrimiento

- **Estado:** aceptada
- **Fecha:** 2026-10-02

## Contexto

Con la V3.5A (ADR-0012) las fichas se descubren al leer, y con la V3.5B (ADR-0013) el mapa, la línea temporal y la colección quedaron juntos en Explorar. Pero cada pantalla seguía sola: el mapa no decía qué había por descubrir en un libro, la línea temporal no decía cuánto llevabas de cada etapa con palabras, una ficha solo enlazaba a sus eventos, y no había logros por descubrir. El plan V3.5C pide conectarlo todo, como una pequeña enciclopedia, sin agregar funciones grandes.

## Decisión

- **Todo se sigue derivando de `chapter_progress`.** No hay tablas nuevas ni migración, y una base de la V3 ve sus descubrimientos y recibe los logros que ya cumplía la primera vez que abre la 2.7.0.
- **Explorar → Libros (mapa):**
  - La ficha de cada libro dice "Descubrimientos: 3 de 8 personajes · 1 de 5 lugares · 4 de 11 eventos" (`bookDiscoveries`). Solo cantidades, nunca nombres de lo que falta. Una ficha "aparece en un libro" si alguno de sus capítulos clave es de ese libro (`booksOf`, `collectiblesInBook`). Los tipos sin fichas en el libro no se muestran, y un libro sin fichas no muestra el bloque.
  - "Ver en la colección" abre Colección filtrada a ese libro (`/explorar/coleccion?libro=GEN`, con un chip "Solo Génesis" para quitar el filtro).
  - **Zonas:** apagada / empezada (menos de la mitad) / iluminada (la mitad o más) / completa (`zoneState`). El nombre de la zona lo dice con palabras ("Los comienzos · Empezada"); la completa se ve dorada. El brillo bajo el camino sigue siendo gradual, como antes.
- **Explorar → Historia:** cada etapa dice "Sin explorar", "55 %" o "Completa" (`exploreStatus`), bajo su medallón y junto a su título. El porcentaje nunca redondea a 0 % si ya leíste algo ni a 100 % si falta algo.
- **Enlaces entre todo (`connectionsOf`):** la ficha muestra "Conexiones" agrupadas en Etapa, Eventos, Personajes y Lugares.
  - Un personaje enlaza a sus etapas, los eventos donde aparece y los personajes y lugares de esos eventos.
  - Un lugar enlaza a los eventos que pasan ahí y a sus personajes y lugares.
  - Un evento enlaza a su etapa, sus personajes y sus lugares.
  - Los capítulos siguen en "Dónde leerlo", y una etapa ya enlazaba a sus fichas. Lo bloqueado se ve como "???" y abre la ficha con niebla (ADR-0012).
- **Logros de descubrimiento:** una regla nueva `collectibles_unlocked` en el motor (`{ count?, kind?, book? }`; sin `count`, hay que descubrir todas las fichas que cumplan el filtro). La foto del progreso (`ProgressSnapshot.collectibles`) lleva el tipo, los libros y si cada ficha está descubierta. Cinco logros nuevos:
  - Diez descubrimientos (10 fichas, +30 XP).
  - Veinticinco descubrimientos (25, +60 XP).
  - Cincuenta descubrimientos (50, +120 XP).
  - La colección completa (las 115, +300 XP).
  - La familia de los comienzos (todos los personajes que aparecen en Génesis, +80 XP).
- **Logros en 5 categorías:** Lectura (capítulos, libros y quiz), Constancia (rachas, días completos y niveles), Reflexión y oración, Descubrimiento y Desafíos (desafíos, sorpresas y desafíos mayores). Cada categoría dice cuántos llevas ("3 de 12"). Las insignias de los desafíos mayores siguen doradas (ahora por su regla, `challenge_completed`, y no por su grupo). Los ids de los logros no cambian, así que nada guardado se pierde.
- Íconos nuevos para insignias: `person` y `map` (ya existían como íconos de la app).

## Consecuencias

- Al actualizar, quien ya leyó bastante recibe de una vez los logros de descubrimiento que cumple, con su XP, igual que pasó con los logros de la V2.
- Los nombres y descripciones de los logros nuevos son un borrador: Youfrend los revisa.
- Pruebas en `tests/v35-connections.test.ts`.
