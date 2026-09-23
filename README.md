# ✝️ Camino de Fe

App de escritorio para crear el hábito diario de leer la Biblia, con XP, niveles, rachas y misiones.
Hecha con **Tauri 2 + React + TypeScript + SQLite**.

> 📄 La idea completa, las reglas y el roadmap están en [`docs/Documento_Maestro.md`](docs/Documento_Maestro.md).

**Estado actual:** Sprint 0 ✅ (lector de la Biblia RV1909, XP y niveles, guardado local).

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

## Estructura

```
camino-de-fe/
├─ src/
│  ├─ app/          # App (rutas) y Layout (barra lateral)
│  ├─ screens/      # Hoy, Libros, Capítulos, Lector
│  ├─ components/   # piezas reutilizables (XpBar…)
│  ├─ domain/       # LÓGICA PURA: xp, niveles, día de juego, lectura, referencias
│  ├─ data/         # repositorios: única capa que habla con SQLite
│  ├─ stores/       # estado global (Zustand)
│  ├─ hooks/
│  └─ styles/       # Tailwind + colores (claro/oscuro)
├─ content/         # JSON editables: libros/zonas, versículos del día
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

## La Biblia (RV1909)

- Texto de **dominio público**. Fuente: [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases) (módulo _SpaRV_ de CrossWire), fijada a un commit concreto.
- El script moderniza detalles de ortografía (`á`→`a`, `fué`→`fue`…) y la "letra capital" de inicio de capítulo (`EN el principio` → `En el principio`). No cambia vocabulario.
- Si cambias el script, sube `BIBLE_DB_VERSION` en `scripts/import-bible.ts`: la app detecta la versión nueva y actualiza su copia.

## Publicar una versión

1. Sube la versión en `package.json`, `src-tauri/tauri.conf.json` y `src-tauri/Cargo.toml`.
2. `git tag v0.1.0 && git push origin v0.1.0`
3. GitHub Actions compila el instalador y crea un **borrador** en _Releases_.
