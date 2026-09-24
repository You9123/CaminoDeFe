# ADR-0003: Identidad visual propia (sin emojis)

- **Estado:** aceptada
- **Fecha:** 2026-09-24

## Contexto

La primera versión usaba emojis como íconos (🔥, 🙏, ⭐…). Se ven genéricos y hacen que la app parezca "hecha por IA". Se busca un aspecto más natural, cálido y auténtico.

## Decisión

- **Sin emojis en la interfaz.** Todos los íconos son SVG propios (`src/components/icons.tsx`) con trazo redondeado, un poco irregular (como a mano), y un relleno suave (`.duo`) en color de acento.
- **Logotipo:** un camino que sube y termina en una cruz (`LogoMark`).
- **Metáforas del camino:** el nivel es un monte con bandera, la racha una llama, el día de gracia un escudo, la oración una vela, la reflexión una pluma, la aplicación un brote y el versículo del día un amanecer.
- **Tipografías incluidas en la app** (funcionan sin internet, vía Fontsource):
  - _Fraunces_ (eje "SOFT") para títulos.
  - _Literata_ para el texto bíblico y el diario (diseñada para leer mucho rato).
  - Segoe UI (la del sistema en Windows) para la interfaz.
- **Textura de papel** muy sutil sobre el fondo y paleta pergamino + terracota, con modo oscuro.
- **Tono de los textos:** frases cortas y humanas, sin exceso de signos de exclamación.
- Para flechas y controles pequeños (atrás, cerrar, reloj) se mantiene Lucide.

## Consecuencias

- Hay que dibujar los íconos nuevos en el mismo estilo (24×24, trazo 1.6, extremos redondeados).
- Los archivos de contenido (`content/*.json`) no llevan íconos ni emojis.
