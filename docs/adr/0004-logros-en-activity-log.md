# ADR-0004: Los logros se guardan en activity_log

- **Estado:** aceptada
- **Fecha:** 2026-09-24

## Contexto

El documento maestro proponía una tabla `achievements_unlocked` y otra `cosmetics_unlocked`. Pero también dice que `activity_log` es la **fuente de verdad**: el XP, la racha y las estadísticas se recalculan desde ahí, y la futura sincronización (V4) solo tiene que sincronizar eventos.

Los logros dan XP. Si el XP de un logro viviera en otra tabla, el XP total dejaría de salir solo de `activity_log`.

## Decisión

- Un logro desbloqueado es una fila más de `activity_log`: `type = 'achievement'`, `ref = <id del logro>`, `xp = <recompensa>`. No hace falta migración y el respaldo `.json` no cambia.
- El `INSERT` usa `WHERE NOT EXISTS`, así que un logro nunca se guarda dos veces.
- Estas filas **no cuentan para la racha** ni como "día con actividad" en las estadísticas: el logro se desbloquea solo, no es algo que el usuario hizo.
- El catálogo es contenido (`content/achievements.json`), validado con Zod. Las reglas son de pocos tipos (`chapters_read_count`, `books_completed_count`, `books_completed`, `streak_reached`, `activity_count`, `level_reached`) y se evalúan con funciones puras en `src/domain/achievements.ts`.
- Los logros de nivel dan 0 XP, para no premiar con XP el hecho de subir de nivel.
- Las recompensas por racha (§2.7) **no se guardan**: se calculan con el récord de racha, que ya sale de `activity_log`. Solo se guarda qué adornos apagó el usuario (`settings.cosmetics_off`).
- Los logros se revisan después de cada actividad y al abrir la app (así, al actualizar a la V2, se desbloquean los que ya se cumplían).

## Consecuencias

- Sumar un logro nuevo = editar el JSON. Si un logro nuevo ya se cumple, se desbloquea la próxima vez que se abra la app.
- Si se cambia el `id` de un logro publicado, se "pierde" (queda una fila con un id desconocido que suma XP pero no se muestra). Regla: **no renombrar ids de logros publicados**, igual que con las migraciones.
