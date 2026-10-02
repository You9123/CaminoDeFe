# ADR-0013: Navegación de 6 entradas, Hoy con 4 bloques y bienvenida

- **Estado:** aceptada
- **Fecha:** 2026-10-02

## Contexto

La V3.5 ("Descubrir y simplificar", `Plan_V3.5.md`) busca que la app se sienta menos cargada. Con la V3, la barra lateral tenía 9 entradas (Hoy, Biblia, Mapa, Línea temporal, Misiones, Diario, Logros, Estadísticas y Ajustes) y la pantalla Hoy tenía 8 bloques, varios repetidos con la barra lateral (nivel, XP, rango). Además, no había bienvenida: el nombre y la mascota se pedían con tarjetas sueltas dentro de Hoy.

## Decisión

### Navegación

- **6 entradas:** Hoy · Biblia · **Explorar** · **Mi camino** · Diario · Ajustes (abajo).
  - **Explorar** (`/explorar`) agrupa lo que se recorre: **Libros** (el mapa, `/explorar`), **Historia** (la línea temporal, `/explorar/historia`) y **Colección** (`/explorar/coleccion`). Mapa y línea temporal se juntan porque para el usuario cumplen el mismo papel: ver por dónde va.
  - **Mi camino** (`/mi-camino`) agrupa el progreso: **Misiones** (`/mi-camino`), **Logros** (`/mi-camino/logros`) y **Estadísticas** (`/mi-camino/estadisticas`). La tarjeta de racha (con la semana y el día de gracia) se mudó de Hoy a Misiones.
- Todas las rutas viven en `src/app/paths.ts` (`PATHS`, `collectionPath`, `historyPath`). Un encabezado común con pestañas (`SectionHeader`) sirve para Biblia, Explorar y Mi camino.
- **Rutas viejas redirigidas** (`LEGACY_ROUTES`): `/mapa`, `/linea-temporal`, `/misiones`, `/logros`, `/logros/coleccionables` y `/estadisticas` llevan a su pantalla nueva **conservando la búsqueda** (`?etapa=`, `?tipo=`, `?ficha=`). Cualquier otra ruta desconocida vuelve a Hoy. Una prueba revisa que ningún archivo de `src/` ni de `content/` enlace a una ruta vieja.

### Hoy

Cuatro bloques, en este orden:

1. **Saludo**, con la racha en una línea ("7 días de racha · hoy ya cuenta") y la mascota a un lado, más chica (96 px). Sin mascota no reserva espacio.
2. **Acción principal:** "Continuar mi camino" dice a qué capítulo lleva (ej. "Génesis 4"): el último abierto si quedó sin terminar, o el siguiente si ya se leyó (`continueTarget`). "Tengo unos minutos" sigue siempre visible, más discreto.
3. **Versículo del día compacto**, con "Leer el contexto", "Escuchar" y "Marcar como leído".
4. **Misiones del día** (versión compacta, con la misión sorpresa debajo) y **Descubrimientos recientes**: las últimas 3 fichas descubiertas (`recentDiscoveries`, por la fecha de la primera lectura), con enlace a la colección.

- Se quitaron las 3 tarjetas de estadísticas (nivel, XP de hoy y capítulos): están en la barra lateral y en Estadísticas.
- **La emoción sigue siendo opcional y más discreta:** una fila con las 7 opciones. Después de elegir, una línea con el versículo plegado ("Ver un versículo para hoy"). El mensaje de cuidado se sigue mostrando siempre que corresponde.

### Bienvenida

- **Pasos:** bienvenida → nombre → mascota (o ninguna) → recordatorio opcional → "Lee tu primer capítulo" (Génesis 1, o "Ahora no"). Todo se puede saltar y cambiar después en Ajustes.
- **Tu primer descubrimiento:** al terminar el primer capítulo que descubre fichas (Génesis 1 descubre La creación), la pantalla "Capítulo completado" dice "Tu primer descubrimiento" y explica dónde queda la colección (`isFirstDiscovery`).
- **Solo para un perfil nuevo** (`needsOnboarding`): sin nombre, sin mascota elegida (ni "sin mascota"), sin actividad y sin capítulos leídos. A quien ya usaba la app se le guarda la marca `settings.onboarding_done = "1"` en silencio y no la ve nunca. Reemplaza las tarjetas sueltas `NamePrompt` y `PetChooser` de Hoy.

## Consecuencias

- Menos entradas y menos ruido en Hoy. Las mismas pantallas, ordenadas.
- Un usuario de la V3 que nunca eligió mascota ya no ve la tarjeta para elegirla en Hoy; puede hacerlo en Ajustes → Mascota.
- La única marca nueva es `onboarding_done` en `settings` (no se puede derivar: un perfil que salta todo no deja rastro). No hay migración.
- Pruebas en `tests/v35-today-navigation.test.ts`.
