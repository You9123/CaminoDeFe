# ✝️ Camino de Fe — Documento Maestro del Proyecto

> **Versión del documento:** 1.0 · 23/09/2026
> **Autor:** Youfrend
> **Tipo de proyecto:** Aplicación de escritorio (PC / Windows), con la versión móvil planeada para después.
> **Propósito de este documento:** reunir en un solo lugar la idea completa del programa, sus reglas, pantallas, datos, tecnologías y plan de trabajo. Es la referencia principal del proyecto.

---

## 0. Contexto del desarrollador

- Manejo con soltura **VS Code** y **GitHub**.
- Mi experiencia está en **páginas web con servidores y bases de datos**. Este es mi **primer proyecto de aplicación de escritorio**.
- No tengo problema en instalar herramientas nuevas (Rust, SDKs, etc.).
- El proyecto también es para **aprender**: arquitectura, pruebas, documentación y buenas prácticas.
- No me gusta mucho leer por largos ratos, así que la app debe funcionar bien en **sesiones cortas** y con **audio**.

---

## 1. Visión

**Camino de Fe** es una app de escritorio que convierte la lectura de la Biblia en un **hábito diario, ligero y motivador**, con mecánicas de videojuego: XP, niveles, rachas, misiones, mapa, mascota y logros.

El ciclo central de la app es:

```
LEER  →  REFLEXIONAR  →  ORAR  →  APLICAR
```

### Principios de diseño (no negociables)

1. **El progreso mide el hábito, no la fe.** El XP, los niveles y los rangos son títulos de juego. Nunca deben dar a entender que alguien vale más ante Dios.
2. **La Biblia nunca se bloquea.** Cualquier libro o capítulo se puede leer en cualquier momento. Lo que se desbloquea es lo **visual y cosmético** (zonas iluminadas, decoraciones, insignias, aspectos de la mascota).
3. **Nunca castigar.** Si se rompe la racha, se conserva el récord personal y no se pierde el XP ni el nivel. No hay mensajes culposos.
4. **Sesiones cortas primero.** Todo debe poder hacerse en 5 minutos.
5. **Privacidad total.** Todo se guarda localmente en la PC. No hay cuentas, rastreo ni internet obligatorio (hasta la V4, y solo si el usuario lo activa).
6. **Las reflexiones no se califican.** La app nunca juzga lo que el usuario escribe.

### Fuera del alcance (decisión tomada)

Estas ideas de la lluvia de ideas original **se descartaron** y no se implementarán:

- ❌ **Árbol de habilidades** (Amor, Fe, Perdón… como nodos que se desbloquean).
- ❌ **Modo historia** (aventura bíblica por capítulos narrativos).

El **Mapa** y la **Línea temporal** ya dan la sensación de "recorrido" sin necesidad de esas dos funciones.

---

## 2. Funcionalidades

La etiqueta **[V1]**, **[V2]**, etc. indica en qué versión entra cada una (ver la sección 8).

### 2.1 Pantalla de inicio / "Hoy" [V1]

Es lo primero que se ve al abrir la app:

```
Buenos días, Youfrend.

🌅 "Este es el día que hizo Jehová; nos gozaremos y alegraremos en él."
   — Salmos 118:24

🔥 Racha: 7 días   ⭐ Nivel 8 — Caminante   📖 Capítulos: 12

[ ▶ Continuar mi camino ]     [ ⏱ Tengo 5 minutos ]

☀️ Misiones de hoy  ▓▓▓░  3/4
```

- Saludo según la hora (buenos días, buenas tardes o buenas noches).
- **Versículo del día**: se elige de una lista curada (`content/daily_verses.json`) de forma determinista según la fecha, para que el mismo día siempre muestre el mismo versículo.
- **Continuar mi camino**: abre el siguiente capítulo según el plan de lectura activo o la última posición.
- Resumen de la racha, el nivel y las misiones del día.
- Desde la V2 también aparece la mascota.

### 2.2 Lector bíblico [V1]

- Navegación por **Libro → Capítulo → Versículo**.
- Tamaño de letra ajustable, tema claro u oscuro y modo "lectura enfocada" sin distracciones.
- Resaltar versículos y marcarlos como favoritos.
- Buscador de texto (búsqueda completa con SQLite FTS5).
- Botón **"Terminé este capítulo"**, que registra la lectura y da XP.
- Al terminar un capítulo se abre el **flujo post-lectura** (2.4).
- Se recuerda la última posición de lectura.

### 2.3 "Tengo 5 minutos" [V1]

Un botón principal que arma una sesión corta:

```
📖 1 versículo o pasaje corto
🧠 1 reflexión
🙏 1 minuto de oración
⏱ Tiempo estimado: 4 minutos       [ Comenzar ]
```

- Desde la V2 también habrá opciones de **5 / 10 / 15 / 30 minutos**, y la app recomienda una lectura que quepa en ese tiempo usando el tiempo estimado de cada capítulo (conteo de palabras ÷ 200 palabras por minuto, o la duración del audio).

### 2.4 Flujo post-lectura: Reflexionar → Orar → Aplicar [V1]

Después de leer, se muestran tres pasos. Todos son **opcionales** y se pueden saltar:

1. **🧠 Reflexión**: "¿Qué fue lo que más te llamó la atención?" (texto libre, se guarda en el diario).
2. **🙏 Momento de oración**: un temporizador opcional de 1, 3 o 5 minutos y el botón "He terminado".
3. **❤️ Aplicación**: "¿Cómo puedes aplicar esto hoy?" con opciones como ser más paciente, perdonar a alguien, ayudar a alguien, evitar algo que sé que está mal, agradecer u otra (texto).

### 2.5 Sistema de XP y niveles [V1]

**Tabla de XP**

| Actividad                            |        XP | Límite diario de XP      |
| ------------------------------------ | --------: | ------------------------ |
| Leer el versículo del día            |        10 | 1 vez                    |
| Leer un capítulo                     |        20 | sin límite (ver la nota) |
| Bono: 5 capítulos en un día          |        50 | 1 vez                    |
| Escribir una reflexión               |        15 | 3 veces                  |
| Momento de oración                   |        10 | 2 veces                  |
| Marcar una aplicación práctica       |        10 | 2 veces                  |
| Completar todas las misiones diarias | 60 (bono) | 1 vez                    |
| Respuesta correcta en el quiz [V3]   |         5 | 20 veces                 |
| Desafío completado [V2]              |   100–500 | —                        |

> **Nota:** leer capítulos no tiene límite porque leer más siempre es bueno. Para que el botón no se use sin leer, un capítulo solo cuenta como leído si estuvo abierto un tiempo mínimo (≈ 40 % del tiempo estimado de lectura).
> Los límites diarios en oración, reflexión y aplicación evitan que se gane XP solo por hacer clic repetidamente.

**Curva de niveles**

XP necesario para pasar del nivel `n` al `n+1`: **`100 + 25·(n−1)`**

| Nivel | XP acumulado aproximado |
| ----: | ----------------------: |
|     2 |                     100 |
|     5 |                     550 |
|    10 |                   1 800 |
|    20 |                   6 175 |
|    30 |                  13 050 |
|    50 |                  34 300 |

Con un uso normal (≈ 80–120 XP por día), se llega al nivel 10 en unas 3 semanas y al nivel 30 en unos 4 meses. Estos valores se definen en `src/domain/xp.ts` como constantes fáciles de ajustar.

### 2.6 Rangos [V2]

Son títulos de juego que representan el avance en el **hábito**:

| Nivel | Rango                   |
| ----: | ----------------------- |
|     1 | 🌱 Comenzando el camino |
|     5 | 🌿 Caminante            |
|    10 | 📖 Buscador             |
|    20 | 🔥 Discípulo            |
|    30 | 🛡️ Perseverante         |
|    40 | 🕊️ Siervo               |
|    50 | 🌅 Peregrino            |

### 2.7 Rachas [V1]

- Un día cuenta para la racha si se completa **al menos una** actividad: leer un capítulo, leer el versículo del día o completar la sesión de 5 minutos.
- **Día de gracia**: 1 por semana (se recarga cada lunes). Si se falta un día y hay un día de gracia disponible, la racha se mantiene.
- Si la racha se rompe: `🔥 Racha actual: 0 días · 🏆 Récord personal: 53 días`, sin mensajes negativos.
- Calendario semanal visible (L M M J V S D).
- Hitos cosméticos [V2]: 3 días → decoración, 7 días → aspecto de la mascota, 14 días → fondo nuevo, 30 días → marco especial del mapa, 100 días → insignia dorada.
- **El "día" termina a las 3:00 a. m. locales**, para que leer a medianoche cuente para el día anterior.

### 2.8 Misiones diarias [V1]

Cada día se generan **4 misiones**:

1. 📖 Leer el versículo del día (+10)
2. 💭 Escribir una reflexión (+15)
3. 🙏 Momento de oración (+10)
4. ❤️ Ponerlo en práctica (+25)

Al completar las 4 se gana un **bono de +60 XP**.

**Misiones sorpresa** [V2]: una misión aleatoria extra al día, tomada de `content/random_missions.json`. Ejemplos:

- "Encuentra un versículo sobre el perdón" (se completa al marcar un versículo como favorito con esa etiqueta).
- "Lee un Salmo."
- "Encuentra una enseñanza de Jesús que puedas aplicar hoy."

La misión sorpresa del día se elige con una semilla basada en la fecha, igual que el versículo del día.

### 2.9 Diario personal [V1]

- Entradas con fecha: reflexiones automáticas (del flujo post-lectura) y entradas libres.
- Campos opcionales: "Hoy leí…", "Me llamó la atención…", "Estoy agradecido por…" y "Quiero pedirle a Dios…".
- Búsqueda y filtro por fecha, libro o emoción.
- **Exportar** el diario a Markdown o PDF [V2].
- Todo se guarda localmente. Más adelante se podría proteger con PIN [V3].

### 2.10 ¿Cómo me siento hoy? [V2]

Al abrir la app, la pregunta es opcional y se puede desactivar en Configuración:

🙂 Bien · 😐 Normal · 😔 Triste · 😡 Enojado · 😰 Ansioso · 😴 Cansado · ❤️ Agradecido

Según la emoción, se muestra un versículo relacionado (`content/emotions.json`) con tres opciones: **[Leer el contexto] [Escuchar] [Reflexionar]**. La emoción se guarda para las estadísticas personales.

> Cuidado de diseño: el tono debe ser siempre amable. Si el usuario marca "Triste" o "Ansioso" varios días seguidos, la app solo muestra un mensaje cálido y sugiere hablar con alguien de confianza. Nunca diagnostica.

### 2.11 Modo escuchar [V2]

- Lee el capítulo en voz alta con **texto a voz (TTS)**, resaltando el versículo que se está leyendo.
- Velocidad ajustable (0.75x a 1.5x), pausa y "siguiente capítulo".
- Tecnología: primero la **Web Speech API** (usa las voces instaladas en Windows, gratis y sin conexión). Como mejora opcional, voces neuronales offline con **Piper TTS**.
- Escuchar un capítulo completo cuenta igual que leerlo.

> Los audios bíblicos grabados profesionalmente suelen tener licencia. El texto a voz evita ese problema y funciona con cualquier capítulo.

### 2.12 Mascota espiritual [V2]

- Es **opcional**: se puede desactivar para una experiencia más sobria.
- Especies a elegir: 🐑 Oveja (predeterminada), 🦁 León, 🕊️ Paloma y 🐟 Pez.
- Evoluciona con el nivel: nivel 1 bebé → nivel 5 joven → nivel 10 aventurera → nivel 20 con túnica → nivel 30 guardiana del camino.
- Animaciones sencillas: respira, celebra al subir de nivel y "duerme" si no has entrado en un tiempo (nunca se enferma ni se muere).
- Accesorios y aspectos que se desbloquean con rachas y logros.

### 2.13 Mapa de la Biblia [V2]

Es la **vista principal de progreso**: un mapa ilustrado estilo videojuego con 8 zonas:

| Zona                      | Libros                                           |
| ------------------------- | ------------------------------------------------ |
| 🌱 1. Los comienzos       | Génesis – Deuteronomio (Pentateuco)              |
| 🏜️ 2. La Tierra Prometida | Josué, Jueces, Rut, 1-2 Samuel                   |
| 👑 3. Los reyes           | 1-2 Reyes, 1-2 Crónicas, Esdras, Nehemías, Ester |
| 🎵 4. Sabiduría y poesía  | Job, Salmos, Proverbios, Eclesiastés, Cantares   |
| 🕊️ 5. Los profetas        | Isaías – Malaquías                               |
| ✝️ 6. La vida de Jesús    | Mateo, Marcos, Lucas, Juan                       |
| 🔥 7. La Iglesia          | Hechos – Judas                                   |
| 🌅 8. Revelación          | Apocalipsis                                      |

- Cada libro es un punto del mapa con un anillo de progreso (capítulos leídos / capítulos totales).
- Las zonas se **iluminan** según avanzas, pero **todas se pueden abrir desde el principio**.
- Al hacer clic en un libro se ve una ficha con un resumen corto, el progreso y el botón "Leer".
- Se implementa como un **SVG interactivo** en React, sin necesidad de un motor de juego.

### 2.14 Desafíos [V2]

Son "misiones secundarias" de varios días. Se definen en `content/challenges.json`:

- 📜 **Los Salmos**: lee 5 Salmos → 100 XP + insignia _Amante de los Salmos_.
- ✝️ **Conocer a Jesús**: lee los 4 Evangelios → insignia _Conocedor de los Evangelios_.
- 🧠 **Semana reflexiva**: escribe 7 reflexiones en 7 días.

**Desafíos mayores** [V3], la versión adaptada de los "jefes finales": completar un libro o una zona con requisitos combinados. Por ejemplo, para el **Evangelio de Juan**: leer Juan 1–21, escribir 5 reflexiones, completar 3 oraciones, marcar 3 aplicaciones y responder 10 preguntas → +500 XP, una insignia y una animación de "Desafío completado".

### 2.15 Logros / insignias [V2]

Catálogo en `content/achievements.json`. Ejemplos: primera lectura, 10 capítulos, 100 capítulos, 7 días de racha, 30 días de racha, primer libro completado, Pentateuco completo, Nuevo Testamento completo, 50 reflexiones y otros. Se revisan con un **motor de reglas** (sección 5.4).

### 2.16 Estadísticas [V2]

```
📊 MI CAMINO
🔥 Racha actual 7 · 🏆 Récord 23
📖 Capítulos 47 · 📜 Versículos 312
🙏 Oraciones 38 · 🧠 Reflexiones 31
⏱ Tiempo total 14 h 32 min · ⭐ XP 4 820
```

Gráficos: lecturas por semana, tiempo dedicado, libros completados, un calendario tipo "heatmap" como el de GitHub y la distribución de emociones.

### 2.17 Línea temporal bíblica [V3]

Una línea horizontal interactiva: Creación → Diluvio → Abraham → Isaac → Jacob → José → Éxodo → Jueces → David → Salomón → División del reino → Exilio → Regreso → Jesús → Iglesia. Cada evento tiene una ficha con un resumen, los pasajes relacionados (con enlace directo al lector) y los personajes involucrados. Datos en `content/timeline.json`.

### 2.18 Quiz [V3]

- Preguntas de opción múltiple por capítulo o por libro (`content/quiz/*.json`).
- Aparece de forma opcional después de leer.
- También hay preguntas reflexivas sin respuesta correcta, que se guardan en el diario.

### 2.19 Coleccionables [V3]

Fichas de **Personajes**, **Lugares** y **Eventos**. Cada ficha tiene una lista de pasajes clave, y el porcentaje de la ficha es la parte de esos pasajes que has leído. Al leer un pasaje de la lista aparece "🔓 Personaje desbloqueado". Datos en `content/characters.json`, `places.json` y `events.json`.

### 2.20 Configuración [V1]

Nombre, tema (claro / oscuro / sistema), tamaño de letra, versión de la Biblia, mascota encendida o apagada, pregunta de emoción encendida o apagada, recordatorio diario (notificación de Windows a una hora elegida), hora de fin del día, y **exportar / importar un respaldo** (archivo `.json` o una copia de la base de datos).

---

## 3. Pantallas y navegación

Barra lateral fija a la izquierda (en móvil será una barra inferior):

| Ícono | Pantalla                   | Versión |
| ----- | -------------------------- | ------- |
| 🏠    | Hoy (inicio)               | V1      |
| 📖    | Biblia (lector + buscador) | V1      |
| 🗺️    | Mapa                       | V2      |
| 🎯    | Misiones y desafíos        | V1 / V2 |
| 📔    | Diario                     | V1      |
| 🏆    | Logros y coleccionables    | V2 / V3 |
| 📊    | Estadísticas               | V2      |
| ⏳    | Línea temporal             | V3      |
| ⚙️    | Configuración              | V1      |

**Primer uso (onboarding):** bienvenida → nombre → elegir mascota (o ninguna) [V2] → hora del recordatorio → primer versículo.

**Estilo visual propuesto:** cálido e ilustrado, tipo "cozy game": colores tierra y pastel, esquinas redondeadas, animaciones suaves y buena tipografía para leer. Hay que evitar que parezca infantil, porque la lectura debe verse seria y cómoda.

---

## 4. Contenido bíblico y licencias

| Versión                | Estado                                             | Uso en la app                                                                                                                                                         |
| ---------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Reina-Valera 1909**  | Dominio público                                    | ✅ **Versión incluida por defecto**. Se puede distribuir libremente.                                                                                                  |
| Reina-Valera 1960      | Con derechos de autor (Sociedades Bíblicas Unidas) | Solo si se obtiene una licencia. Para uso estrictamente personal se podría importar localmente, pero **no se incluye en el repositorio público ni en el instalador**. |
| Otras (NVI, NTV, DHH…) | Con derechos de autor                              | No se incluyen.                                                                                                                                                       |

- Fuente del texto RV1909: **eBible.org** (formatos USFM / VPL).
- Un script (`scripts/import-bible.ts`) convierte el texto a la base de datos SQLite `bible.db`, que se incluye en el instalador como recurso de solo lectura.
- El código se prepara para **varias versiones** (`translation_id`), así que agregar otra más adelante no implica rediseñar nada.

### Decisión: usar RV1909 desde el día 1

- Las diferencias con la RVR1960 son sobre todo de ortografía y vocabulario (la 1909 suena un poco más antigua). La numeración de libros, capítulos y versículos es prácticamente la misma.
- Empezar con la RV1909 evita tener que migrar después y permite publicar el repositorio y el instalador sin problemas legales.
- Si alguna edición digital trae ortografía antigua (`á`, `ó`, `fué`), el script de importación puede normalizarla. Modificar un texto de dominio público no tiene restricciones.

### Regla: el contenido guarda referencias, nunca texto

Ni los archivos de `/content` ni `user.db` guardan el texto de los versículos, solo **referencias** (`"PSA.23.1"`, `"JHN.3.16"`). El texto siempre se obtiene de `bible.db` según la versión activa. Así, cambiar de versión (o agregar la RVR1960 con licencia, por ejemplo si una empresa cristiana la aporta) consiste solo en importar otra traducción: favoritos, progreso, misiones y logros siguen funcionando igual.

### Contenido propio (JSON en `/content`)

La mayor parte del trabajo del proyecto es **escribir contenido**, no programar. Por eso el contenido va separado del código, en archivos JSON con un esquema validado con **Zod**:

| Archivo                                           | Contenido                                                          | Versión |
| ------------------------------------------------- | ------------------------------------------------------------------ | ------- |
| `daily_verses.json`                               | 366 referencias de versículos del día                              | V1      |
| `books_meta.json`                                 | Nombre, zona, capítulos, resumen corto y tiempo estimado por libro | V1      |
| `emotions.json`                                   | Emoción → lista de versículos                                      | V2      |
| `random_missions.json`                            | Misiones sorpresa                                                  | V2      |
| `challenges.json`                                 | Desafíos y requisitos                                              | V2      |
| `achievements.json`                               | Logros y reglas                                                    | V2      |
| `timeline.json`                                   | Eventos de la línea temporal                                       | V3      |
| `characters.json` / `places.json` / `events.json` | Coleccionables                                                     | V3      |
| `quiz/<libro>.json`                               | Preguntas por libro                                                | V3      |

> Se puede usar IA para generar borradores de estos archivos, pero **todo contenido debe ser revisado por mí** antes de subirlo (referencias correctas y tono adecuado).

---

## 5. Arquitectura técnica

### 5.1 Stack elegido

| Capa                     | Tecnología                                            | Por qué                                                                                                                                                                 |
| ------------------------ | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contenedor de escritorio | **Tauri 2**                                           | Instalador de pocos MB, bajo consumo de RAM y compila para Windows/macOS/Linux y **también para Android e iOS**, así que el mismo proyecto sirve para la versión móvil. |
| Lenguaje de la interfaz  | **TypeScript**                                        | Tipado y el mismo ecosistema web que ya conozco.                                                                                                                        |
| Framework de UI          | **React** + **Vite**                                  | Lo más usado, rápido y con mucha documentación.                                                                                                                         |
| Estilos                  | **Tailwind CSS**                                      | Diseño rápido y consistente, con temas claro y oscuro.                                                                                                                  |
| Componentes              | **shadcn/ui** (sobre Radix)                           | Componentes accesibles que se copian al proyecto y se pueden modificar.                                                                                                 |
| Animaciones              | **Motion** (antes Framer Motion)                      | Mascota, subidas de nivel y transiciones.                                                                                                                               |
| Íconos                   | **Lucide**                                            | Consistentes y ligeros.                                                                                                                                                 |
| Estado global            | **Zustand**                                           | Más simple que Redux.                                                                                                                                                   |
| Rutas                    | **React Router**                                      | Navegación entre pantallas.                                                                                                                                             |
| Base de datos            | **SQLite** vía `tauri-plugin-sql`                     | Local, un solo archivo, SQL como el que ya conozco y búsqueda FTS5.                                                                                                     |
| Validación               | **Zod**                                               | Valida los JSON de contenido y los datos.                                                                                                                               |
| Gráficos                 | **Recharts**                                          | Estadísticas.                                                                                                                                                           |
| Fechas                   | **date-fns**                                          | Rachas, días y zonas horarias.                                                                                                                                          |
| Texto a voz              | Web Speech API → (opcional) Piper                     | Modo escuchar.                                                                                                                                                          |
| Notificaciones           | `tauri-plugin-notification`                           | Recordatorio diario.                                                                                                                                                    |
| Ajustes                  | `tauri-plugin-store`                                  | Configuración simple (clave-valor).                                                                                                                                     |
| Pruebas                  | **Vitest** + Testing Library; **Playwright** para E2E | Lógica de XP y rachas bien probada.                                                                                                                                     |
| Calidad                  | ESLint + Prettier                                     | Estilo uniforme.                                                                                                                                                        |
| CI/CD                    | **GitHub Actions** + `tauri-action`                   | Compila el instalador automáticamente al crear un tag.                                                                                                                  |
| Actualizaciones          | `tauri-plugin-updater` [V3+]                          | Actualizaciones automáticas desde GitHub Releases.                                                                                                                      |

> **Sobre Rust:** Tauri está hecho en Rust, pero casi toda la app se programa en TypeScript. Solo hay que instalar Rust. Si en algún momento hace falta algo nativo, se escribe un "comando" pequeño en Rust (`src-tauri/src/`).

**Alternativas que se descartaron:**

- _Electron_: más simple, pero pesa más de 100 MB y no tiene versión móvil.
- _Flutter_: excelente para móvil, pero obliga a aprender Dart y no aprovecha mi experiencia web.
- _.NET MAUI / WPF_: C#, un ecosistema distinto al que ya manejo.

### 5.2 Arquitectura por capas

```
┌─────────────────────────────────────────────┐
│  UI (React)  — pantallas y componentes      │
├─────────────────────────────────────────────┤
│  Estado (Zustand stores)                    │
├─────────────────────────────────────────────┤
│  DOMINIO (TypeScript puro, sin React)       │
│  xp.ts · levels.ts · streaks.ts · missions.ts│
│  achievements.ts · readingPlan.ts           │
├─────────────────────────────────────────────┤
│  REPOSITORIOS (acceso a datos)              │
│  bibleRepo · progressRepo · journalRepo ... │
├─────────────────────────────────────────────┤
│  Tauri plugins → SQLite (user.db, bible.db) │
└─────────────────────────────────────────────┘
```

- La **lógica de juego** (XP, rachas, misiones, logros) vive en `src/domain/` como **funciones puras**: reciben datos y devuelven resultados, sin tocar la base de datos ni React. Así se prueban fácilmente con Vitest y se reutilizan sin cambios en móvil.
- La UI nunca llama a SQL directamente; siempre pasa por los **repositorios**.

### 5.3 Bases de datos

Se usan **dos archivos SQLite**:

- `bible.db` (solo lectura, viene con la app): el texto bíblico.
- `user.db` (en la carpeta de datos del usuario, `%APPDATA%\CaminoDeFe\`): todo el progreso.

**`bible.db`**

```sql
translations(id TEXT PK, name TEXT, language TEXT, license TEXT)
books(id INTEGER PK, code TEXT, name TEXT, testament TEXT, zone INTEGER, chapters INTEGER)
verses(translation_id TEXT, book_id INTEGER, chapter INTEGER, verse INTEGER, text TEXT,
       PRIMARY KEY(translation_id, book_id, chapter, verse))
verses_fts  -- tabla virtual FTS5 para búsqueda
```

**`user.db`**

```sql
profile(id INTEGER PK CHECK(id=1), name TEXT, created_at TEXT, pet_species TEXT NULL,
        total_xp INTEGER DEFAULT 0, grace_days_left INTEGER DEFAULT 1)

activity_log(id INTEGER PK, type TEXT,          -- 'chapter_read','reflection','prayer','application','daily_verse','quiz','listen'
             ref TEXT NULL,                      -- ej. 'JHN.3'
             xp INTEGER, day TEXT,               -- 'YYYY-MM-DD' según la hora de fin de día
             duration_sec INTEGER NULL, created_at TEXT)

chapter_progress(book_id INTEGER, chapter INTEGER, times_read INTEGER, first_read_at TEXT,
                 last_read_at TEXT, PRIMARY KEY(book_id, chapter))

journal_entries(id INTEGER PK, day TEXT, ref TEXT NULL, kind TEXT,  -- 'reflection','free','application'
                content TEXT, emotion TEXT NULL, created_at TEXT, updated_at TEXT)

daily_missions(day TEXT, mission_id TEXT, completed_at TEXT NULL, PRIMARY KEY(day, mission_id))

streak_days(day TEXT PK, source TEXT)            -- 'activity' | 'grace'

favorites(id INTEGER PK, ref TEXT, color TEXT NULL, tag TEXT NULL, note TEXT NULL, created_at TEXT)

achievements_unlocked(achievement_id TEXT PK, unlocked_at TEXT)
challenges_progress(challenge_id TEXT PK, started_at TEXT, completed_at TEXT NULL, data TEXT)  -- JSON
cosmetics_unlocked(item_id TEXT PK, unlocked_at TEXT)
emotions_log(day TEXT PK, emotion TEXT)
schema_migrations(version INTEGER PK, applied_at TEXT)
```

**Decisión clave:** `activity_log` es la **fuente de verdad**. El XP total, la racha y las estadísticas se pueden **recalcular** a partir de ese registro. Esto evita inconsistencias y hace que la futura sincronización en la nube (V4) sea mucho más sencilla, porque solo hay que sincronizar eventos.

### 5.4 Motor de logros y desafíos

Los logros se definen como datos, no como código:

```json
{
  "id": "gospels_complete",
  "title": "Conocedor de los Evangelios",
  "icon": "cross",
  "rule": { "type": "books_completed", "books": ["MAT", "MRK", "LUK", "JHN"] },
  "reward": { "xp": 300, "cosmetic": "badge_gospels" }
}
```

Hay unos pocos tipos de regla (`chapters_read_count`, `books_completed`, `streak_reached`, `activity_count`, `level_reached`) que se evalúan después de cada actividad. Para agregar un logro nuevo solo se edita el JSON.

### 5.5 Estructura de carpetas

```
camino-de-fe/
├─ src/                    # Frontend (React + TS)
│  ├─ app/                 # rutas, layout, providers
│  ├─ screens/             # Hoy, Biblia, Mapa, Diario, ...
│  ├─ components/          # UI reutilizable (Button, Card, XPBar, Pet...)
│  ├─ domain/              # lógica pura: xp, levels, streaks, missions, achievements
│  ├─ data/                # repositorios + migraciones SQL
│  ├─ stores/              # Zustand
│  ├─ content/             # loaders + esquemas Zod del contenido
│  ├─ hooks/
│  └─ styles/
├─ content/                # JSON de contenido (versículos del día, desafíos, logros...)
├─ src-tauri/              # Proyecto Rust de Tauri (config, íconos, comandos nativos)
│  ├─ resources/bible.db
│  └─ tauri.conf.json
├─ scripts/                # import-bible.ts, validate-content.ts
├─ tests/                  # unit + e2e
├─ docs/                   # este documento, decisiones (ADR), capturas
└─ .github/workflows/      # CI: lint, tests, build del instalador
```

---

## 6. Herramientas y entorno de desarrollo (Windows)

### Instalar una sola vez

1. **Node.js LTS** (y opcionalmente **pnpm**: `npm i -g pnpm`).
2. **Rust** con `rustup` (https://rustup.rs), usando la toolchain MSVC.
3. **Microsoft C++ Build Tools** (Visual Studio Build Tools → "Desktop development with C++").
4. **WebView2**: ya viene en Windows 10 y 11.
5. **Git** + **GitHub** (ya los manejo).
6. _(Más adelante, para móvil)_ **Android Studio** + el SDK/NDK de Android.

> La guía oficial de requisitos previos está en https://v2.tauri.app/start/prerequisites/

### Extensiones de VS Code

- **Tauri** (tauri-apps.tauri-vscode)
- **rust-analyzer**
- **ESLint** y **Prettier**
- **Tailwind CSS IntelliSense**
- **SQLite Viewer** (para inspeccionar `user.db`)
- **Error Lens** (opcional)
- **Vitest** (opcional)

### Crear el proyecto

```bash
npm create tauri-app@latest camino-de-fe
# Elegir: TypeScript / JavaScript → pnpm (o npm) → React → TypeScript
cd camino-de-fe
pnpm install
pnpm tauri dev          # abre la app en modo desarrollo
pnpm tauri build        # genera el instalador (.msi / .exe)
```

Plugins de Tauri que se van a necesitar:

```bash
pnpm tauri add sql
pnpm tauri add store
pnpm tauri add notification
pnpm tauri add dialog     # exportar / importar respaldos
pnpm tauri add fs
```

### Otras herramientas útiles

- **DB Browser for SQLite**: para ver y editar bases de datos fuera de VS Code.
- **Figma** (gratis) o **Excalidraw**: para bocetos de pantallas.
- **Aseprite**, **Piskel** (gratis) o **Inkscape**: para la mascota y el mapa (pixel art o vectores).
- **Rive** o **LottieFiles** _(opcional)_: para animaciones más elaboradas de la mascota.

---

## 7. Flujo de trabajo con Git y GitHub

- Repositorio: `camino-de-fe`. Puede ser público porque solo incluye la RV1909 (dominio público). La licencia del código queda por decidir (ver la sección 10).
- Ramas: `main` (siempre estable) + `feat/<nombre>` y `fix/<nombre>`, integradas con Pull Requests (aunque trabaje solo, es buena práctica).
- Commits con **Conventional Commits**: `feat: lector de capítulos`, `fix: cálculo de racha en cambio de día`, `docs: ...`, `test: ...`.
- **GitHub Projects** (tablero Kanban) con un _milestone_ por versión (V1, V2, V3, V4).
- **GitHub Actions**:
  - En cada PR: `lint` + `test` + `validate-content`.
  - Al crear un tag `v*`: `tauri-action` compila el instalador de Windows y lo publica en **GitHub Releases**.
- Versionado **SemVer**: `0.1.0` (primer prototipo) → `1.0.0` (V1 completa).
- Carpeta `docs/adr/` para registrar decisiones importantes ("Architecture Decision Records"), por ejemplo "ADR-001: Tauri en lugar de Electron".

---

## 8. Plan por versiones (roadmap)

### 🟢 V1 — MVP: "El hábito" (objetivo: usarla yo todos los días)

- [ ] Proyecto Tauri + React + TS + Tailwind funcionando
- [ ] Importar RV1909 a `bible.db` con un script
- [ ] Lector: libro → capítulo, tamaño de letra, tema claro/oscuro, recordar posición
- [ ] Buscador (FTS5)
- [ ] Favoritos y resaltados
- [ ] Versículo del día
- [ ] Botón "Terminé este capítulo" con tiempo mínimo
- [ ] Flujo post-lectura: reflexión → oración → aplicación
- [ ] "Tengo 5 minutos"
- [ ] XP, niveles y barra de progreso
- [ ] Rachas con día de gracia y récord
- [ ] 4 misiones diarias + bono
- [ ] Diario (crear, editar, listar, buscar)
- [ ] Configuración + recordatorio diario
- [ ] Respaldo: exportar / importar
- [ ] Pruebas unitarias del dominio (XP, rachas, misiones)
- [ ] Instalador de Windows generado por GitHub Actions

### 🟡 V2 — Gamificación

- [ ] Mascota (opcional), con evolución y animaciones
- [ ] Rangos
- [ ] Mapa de la Biblia interactivo (SVG)
- [ ] Logros / insignias (motor de reglas)
- [ ] Desafíos
- [ ] Misiones sorpresa
- [ ] Recompensas cosméticas por rachas
- [ ] Estadísticas y gráficos + heatmap
- [ ] ¿Cómo me siento hoy?
- [ ] Modo escuchar (TTS)
- [ ] Sesiones de 5 / 10 / 15 / 30 minutos
- [ ] Exportar el diario a Markdown o PDF

### 🟠 V3 — Experiencia bíblica

- [ ] Línea temporal interactiva
- [ ] Quiz por libro
- [ ] Coleccionables: personajes, lugares, eventos
- [ ] Desafíos mayores (los "jefes finales")
- [ ] PIN para el diario
- [ ] Actualizaciones automáticas
- [ ] Voces neuronales offline (Piper), opcional

### 🔴 V4 — Nube y móvil

- [ ] Versión **Android** (y luego iOS) con Tauri 2, reutilizando la UI (diseño adaptable + barra inferior)
- [ ] Cuentas de usuario (opcionales)
- [ ] Sincronización del `activity_log` entre dispositivos
- [ ] Backend: API REST (Node/TypeScript) + PostgreSQL, o un servicio como **Supabase** para ahorrar trabajo
- [ ] Respaldo en la nube
- [ ] Notificaciones push en móvil

> **Regla del proyecto:** no empezar una versión hasta que la anterior se use de verdad todos los días durante al menos una semana.

---

## 9. Primeros pasos concretos (Sprint 0)

1. Instalar los requisitos (sección 6) y comprobar que `pnpm tauri dev` abre la ventana.
2. Crear el repositorio en GitHub, el tablero de GitHub Projects y los milestones V1–V4.
3. Configurar ESLint, Prettier, Tailwind y Vitest.
4. Descargar la RV1909 de eBible.org y escribir `scripts/import-bible.ts` → `bible.db`.
5. Pantalla mínima: lista de libros → capítulo → versículos.
6. Crear `user.db` con las migraciones iniciales (`profile`, `activity_log`, `chapter_progress`).
7. Botón "Terminé este capítulo" → guardar en `activity_log` → mostrar el XP total.
8. Configurar GitHub Actions para que compile el instalador.

Con esto ya existe una app "fea pero funcional" sobre la que se construye todo lo demás.

---

## 10. Decisiones pendientes

| #   | Tema                                      | Opciones                                                    | Recomendación actual                                                                                  |
| --- | ----------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | ¿La app será solo para mí o se publicará? | Personal / publicarla gratis                                | Diseñarla como si se fuera a publicar (usar la RV1909).                                               |
| 2   | Estilo visual                             | Cozy ilustrado / pixel art / minimalista moderno            | Cozy ilustrado.                                                                                       |
| 3   | Estilo de la mascota                      | Pixel art (más fácil de dibujar) / vectorial / Rive animado | Pixel art para la V2.                                                                                 |
| 4   | Licencia del código                       | MIT / GPL / privado                                         | MIT si el repositorio es público.                                                                     |
| 5   | Idiomas                                   | Solo español / español + inglés                             | Solo español en V1, pero con los textos de la interfaz en un archivo `i18n` para no cerrar la puerta. |
| 6   | Backend de la V4                          | API propia / Supabase / Firebase                            | Se decide al llegar a la V4.                                                                          |

---

## 11. Glosario rápido

- **Tauri**: framework para crear apps de escritorio y móviles con una interfaz web y un núcleo en Rust.
- **WebView2**: el motor de Edge que usa Tauri en Windows para mostrar la interfaz.
- **SQLite**: base de datos en un solo archivo, sin servidor.
- **FTS5**: el módulo de búsqueda de texto completo de SQLite.
- **Dominio (capa)**: la lógica de negocio pura (reglas de XP, rachas…), independiente de la interfaz.
- **Repositorio (patrón)**: la capa que habla con la base de datos.
- **ADR**: documento corto que registra una decisión técnica y su porqué.
- **TTS**: texto a voz.

---

## Referencias

- Tauri 2 (anuncio de la versión estable, con soporte para escritorio y móvil): https://v2.tauri.app/blog/tauri-20/
- Requisitos previos de Tauri: https://v2.tauri.app/start/prerequisites/
- Reina-Valera 1909 (dominio público) en eBible.org: https://ebible.org/spaRV1909/copyright.htm
- Historia y versiones de la Reina-Valera: https://en.wikipedia.org/wiki/Reina_Valera
