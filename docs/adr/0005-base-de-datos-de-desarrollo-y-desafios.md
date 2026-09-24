# ADR-0005: Base de datos de desarrollo y tabla de desafíos

- **Estado:** aceptada
- **Fecha:** 2026-09-24

## Contexto

1. `pnpm tauri dev` y la app instalada usaban el mismo `user.db` (mismo identificador de la app). Si en desarrollo se aplica una migración nueva, la app instalada (más vieja) ya no arranca: sqlx rechaza una base de datos con migraciones que no conoce (`VersionMissing`). Además, probar en desarrollo cambiaba el progreso real.
2. Los desafíos (§2.14) necesitan recordar cuándo se empezaron y si se abandonaron o vencieron. Eso no es una actividad del usuario, así que no encaja en `activity_log`.

## Decisión

- **En desarrollo se usa `user-dev.db`.** Rust elige el archivo con `cfg!(debug_assertions)` y el frontend lo pregunta con el comando `user_db_url`. La barra lateral muestra "Datos de prueba" cuando se está en esa base. Para probar con datos reales: exportar un respaldo desde la app instalada e importarlo en `tauri dev`.
- **Migración 4: `challenge_runs`** (un intento por fila: `active`, `completed`, `abandoned` o `expired`). La recompensa de XP de un desafío sigue siendo una fila `type = 'challenge'` en `activity_log` (como los logros, ADR-0004), así el XP sigue saliendo de una sola fuente.
- Las filas de recompensa (`achievement`, `challenge`) no cuentan para la racha (`REWARD_TYPES` en `src/domain/xp.ts`).
- Un desafío cuenta lo que se hace desde el **día** en que empieza (no desde la hora), para no obligar a empezarlo antes de leer.
- **Respaldo formato 2:** agrega `challenge_runs`. Los respaldos de formato 1 se siguen pudiendo importar (la tabla queda vacía).
- La misión sorpresa del día se registra como actividad `surprise_mission` (20 XP, una vez al día). Sí cuenta para la racha: es algo que el usuario hizo.

## Consecuencias

- Probar una versión nueva con `tauri dev` ya no puede romper la app instalada ni ensuciar el progreso real.
- La primera vez que se abre `tauri dev` con esta versión, la base de prueba empieza vacía.
