# ADR-0007: La mascota

- **Estado:** aceptada
- **Fecha:** 2026-09-24

## Contexto

El Documento Maestro (§2.12) pide una mascota opcional que evolucione con el nivel, tenga animaciones sencillas y accesorios, y que nunca se enferme ni se muera. La recomendación inicial era pixel art, pero la identidad visual (ADR-0003) es de trazo a mano sobre papel.

## Decisión

- **Estilo:** SVG vectorial con el mismo trazo de los íconos (`src/components/pet/PetArt.tsx`). Cuatro especies: oveja (predeterminada), león, paloma y pez.
- **Evolución por nivel** (`src/domain/pet.ts`): bebé (1) → joven (5) → aventurera, con morral (10) → con túnica (20) → guardiana del camino (30). La guardiana lleva un cayado; la paloma, una ramita de olivo, y el pez, un farol. Cada especie define puntos de anclaje (cuello, cabeza, cuerpo, costado) y la ropa se dibuja una sola vez para todas.
- **Accesorios:** bufanda (racha de 7 días, la recompensa que estaba pendiente desde el 2A), corona de flores (logro "Libro completo") y campanita (logro "Diez reflexiones"). Se lleva uno a la vez y solo si está ganado.
- **Ánimo:** respira (el pez flota) y parpadea. Está contenta si hoy hiciste algo. Salta y brilla al subir de nivel o al ganar un logro o un desafío (`celebrationKey` en el store), y también al tocarla. "Duerme" si pasaron 2 días o más sin actividad, y se despierta en cuanto haces algo. Sus frases son cortas, amables y sin culpa.
- **Animaciones con CSS** (`@keyframes` en `index.css`) en lugar de la librería Motion: son pocas y simples, así la app no pesa más, y se apagan con "reducir movimiento".
- **Datos:** sin migración. Se guardan en `settings` (`pet_species` = especie, `"none"` o sin valor si todavía no eligió; `pet_name`; `pet_accessory`), así que el respaldo ya los incluye.
- **Elección:** una tarjeta en Hoy ("Conoce a tu compañero de camino") hasta que elijas una especie o "Prefiero sin mascota". Todo se cambia en Ajustes → Mi compañero, donde también se ve cómo crece.

## Consecuencias

- Para agregar una especie hay que dibujar su cuerpo (`back`/`front`) y sus anclajes; la ropa, los accesorios y las animaciones funcionan solos.
- La mascota no cambia nada del progreso: apagarla no afecta el XP, la racha ni los logros.
