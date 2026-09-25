# ✝️ Camino de Fe

App de escritorio para crear el hábito diario de leer la Biblia, con XP, niveles, rachas y misiones.
Hecha con **Tauri 2 + React + TypeScript + SQLite**.

> 📄 La idea completa, las reglas y el roadmap están en [`docs/Documento_Maestro.md`](docs/Documento_Maestro.md).

**Estado actual:** V1 completa ✅ (v1.0.1). Lector RV1909 con buscador, resaltados y favoritos; XP, niveles, rachas y misiones; reflexión, oración y aplicación; "Tengo 5 minutos"; diario; ajustes con recordatorio diario y respaldo.

**V2 completa** ✅ (v2.0.0)

- Sprint 2A (v1.1.0): rangos, logros e insignias (motor de reglas en `content/achievements.json`), recompensas por racha y la pantalla Mi camino con estadísticas y heatmap.
- Sprint 2B (v1.2.0): mapa de la Biblia interactivo, desafíos de varios días (`content/challenges.json`) y misión sorpresa diaria (`content/random_missions.json`).
- Sprint 2C (v1.3.0): ¿Cómo me siento hoy? (`content/emotions.json`), modo escuchar (texto a voz), sesiones de 5/10/15/30 minutos y exportar el diario a Markdown o PDF.
- Sprint 2D (v2.0.0): mascota opcional (oveja, león, paloma o pez) que crece con tu nivel, con accesorios y animaciones.

**V3 en curso**

- Sprint 3A (v2.1.0): línea temporal interactiva (15 etapas, `content/timeline.json`) y coleccionables de personajes, lugares y eventos (`content/characters.json`, `places.json`, `events.json`), que se desbloquean al leer.
- Sprint 3B (v2.2.0): quiz por libro (`content/quiz/*.json`, 20 libros y 230 preguntas) después de leer y desde el mapa, y cinco desafíos mayores con insignia y animación.

---

## Requisitos (Windows)

| Herramienta           | Instalación                                                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C++ Build Tools       | `winget install --id Microsoft.VisualStudio.2022.BuildTools --override "--passive --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"` |
| Rust                  | `winget install --id Rustlang.Rustup` y luego `rustup default stable-msvc`                                                                                    |
| Node.js LTS (≥ 22.13) | `winget install --id OpenJS.NodeJS.LTS`                                                                                                                       |
| pnpm                  | `npm install -g pnpm`                                                                                                                                         |
| WebView2              | Ya viene con Windows 10/11                                                                                                                                    |

## Comandos

```bash
pnpm install          # instalar dependencias (la primera vez)
pnpm tauri dev        # abrir la app en modo desarrollo (la 1.ª vez compila Rust: tarda unos minutos)
pnpm tauri build      # generar el instalador (.exe) en src-tauri/target/release/bundle/nsis/

pnpm test             # pruebas (Vitest)
pnpm lint             # ESLint
pnpm typecheck        # TypeScript
pnpm format           # Prettier
pnpm import-bible     # regenerar src-tauri/resources/bible.db (solo si cambias el script)
```

> `pnpm dev` a secas abre solo la interfaz en el navegador, sin base de datos. Para usar la app, siempre `pnpm tauri dev`.
>
> `pnpm tauri dev` usa su propia base de datos (`user-dev.db`, "Datos de prueba" en la barra lateral), separada del progreso real de la app instalada (`user.db`). Para probar con tus datos: exporta un respaldo en la app instalada e impórtalo en `tauri dev` (ADR-0005).

## Estructura

```
camino-de-fe/
├─ src/
│  ├─ app/          # App (rutas) y Layout (barra lateral)
│  ├─ screens/      # Hoy, Biblia, Lector, Mapa, Línea temporal, Misiones, Diario, Logros, Coleccionables, Mi camino, Ajustes
│  ├─ components/   # piezas reutilizables (XpBar…)
│  ├─ domain/       # LÓGICA PURA: xp, niveles, rangos, rachas, misiones, logros, desafíos, mapa, estadísticas, coleccionables
│  ├─ content/      # carga y valida con Zod los JSON de /content
│  ├─ data/         # repositorios: única capa que habla con SQLite
│  ├─ stores/       # estado global (Zustand)
│  ├─ hooks/
│  └─ styles/       # Tailwind + colores (claro/oscuro)
├─ content/         # JSON editables: libros/zonas, resúmenes, versículos del día, logros, desafíos, misiones sorpresa, emociones, línea temporal, coleccionables y quiz/
├─ scripts/         # import-bible.ts (+ normalize.ts)
├─ tests/           # Vitest
├─ src-tauri/
│  ├─ src/lib.rs    # arranque: plugin SQL, migraciones, instalación de bible.db
│  ├─ migrations/   # SQL de user.db (nunca editar una ya publicada: agregar otra)
│  └─ resources/    # bible.db + bible.version
├─ docs/            # documento maestro y decisiones (ADR)
└─ .github/workflows/  # CI y Release
```

### Reglas de arquitectura

1. **Las pantallas no usan SQL.** Siempre pasan por `src/data/*Repo.ts`.
2. **Las reglas del juego viven en `src/domain/`** como funciones puras y con pruebas.
3. **`activity_log` es la fuente de verdad.** El XP total se calcula sumando ese registro.
4. **El contenido guarda referencias (`JHN.3.16`), nunca texto bíblico.** Así se puede cambiar de traducción.

## Bases de datos

| Archivo    | Qué guarda                                      | Dónde vive                                                                  |
| ---------- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| `bible.db` | Texto de la RV1909 (solo lectura) + índice FTS5 | Viene en `src-tauri/resources/`; al iniciar se copia a la carpeta de la app |
| `user.db`  | Progreso, XP, ajustes                           | `%APPDATA%\com.youfrend.caminodefe\`                                        |

Puedes abrir `user.db` con la extensión **SQLite Viewer** de VS Code para ver tu progreso.
Para "empezar de cero" en desarrollo, cierra la app y borra `user.db` de esa carpeta.

## Respaldo y recordatorio

- **Ajustes → Respaldo** exporta un `.json` con todo el progreso (XP, diario, favoritos, ajustes). Al importar, la app guarda antes una copia automática en `%APPDATA%\com.youfrend.caminodefe\respaldos\`.
- **Ajustes → Recordatorio** muestra una notificación de Windows a la hora elegida si ese día todavía no hiciste nada. Funciona mientras la app esté abierta (aunque esté minimizada). La opción "Abrir al iniciar Windows" la abre minimizada al encender la PC.

## La Biblia (RV1909)

- Texto de **dominio público**. Fuente: [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases) (módulo _SpaRV_ de CrossWire), fijada a un commit concreto.
- El script moderniza detalles de ortografía (`á`→`a`, `fué`→`fue`…) y la "letra capital" de inicio de capítulo (`EN el principio` → `En el principio`). No cambia vocabulario.
- Si cambias el script, sube `BIBLE_DB_VERSION` en `scripts/import-bible.ts`: la app detecta la versión nueva y actualiza su copia.

## Publicar una versión

1. Sube la versión en `package.json`, `src-tauri/tauri.conf.json` y `src-tauri/Cargo.toml`.
2. `git tag v1.0.0 && git push origin v1.0.0`
3. GitHub Actions compila el instalador y crea un **borrador** en _Releases_.
