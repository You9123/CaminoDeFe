/**
 * Actualizaciones automáticas (ADR-0010). Lo que se puede probar sin Tauri.
 *
 * - La app pregunta a GitHub Releases si hay una versión nueva al abrirse (como mucho cada 6 horas).
 * - Nunca se instala sola: aparece un aviso y tú decides. "Más tarde" lo esconde hasta mañana.
 * - Antes de instalar se guarda una copia automática de tus datos.
 */

export const AUTO_CHECK_EVERY_MS = 6 * 60 * 60_000;

/** ¿Toca revisar al abrir la app? */
export function shouldAutoCheck(enabled: boolean, lastCheck: number | null, now: number): boolean {
  if (!enabled) return false;
  return lastCheck === null || !Number.isFinite(lastCheck) || now - lastCheck >= AUTO_CHECK_EVERY_MS;
}

/** "Más tarde" se guarda como "2.4.0|2026-09-24": esa versión no se vuelve a ofrecer ese día. */
export const dismissKey = (version: string, day: string) => `${version}|${day}`;

export function isDismissed(stored: string | null, version: string, day: string): boolean {
  return stored === dismissKey(version, day);
}

/** Compara versiones "2.10.0" > "2.9.3". Lo que no es número cuenta como 0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, "").split(/[.-]/);
  const pb = b.replace(/^v/, "").split(/[.-]/);
  for (let i = 0; i < 3; i++) {
    const d = (parseInt(pa[i] ?? "0", 10) || 0) - (parseInt(pb[i] ?? "0", 10) || 0);
    if (d !== 0) return Math.sign(d);
  }
  return 0;
}

/** Porcentaje descargado (0–100), o null si no se sabe el tamaño. */
export function downloadPercent(downloaded: number, total: number | null): number | null {
  if (!total || total <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((downloaded / total) * 100)));
}

/** "12,4 MB" */
export function formatMegabytes(bytes: number): string {
  return `${(bytes / 1_000_000).toLocaleString("es", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} MB`;
}

/**
 * Notas de la versión para el aviso: sin títulos ni enlaces de Markdown, solo las primeras líneas.
 * El texto completo está en GitHub. Se omiten los comentarios HTML y la línea que explica
 * cómo descargar el instalador (es para quien entra a GitHub, no para quien ya tiene la app).
 */
export function shortNotes(body: string | undefined | null, maxLines = 4): string[] {
  if (!body) return [];
  return (
    body
      .replace(/<!--[\s\S]*?-->/g, "")
      .split(/\r?\n/)
      // Los títulos ("## Novedades") no dicen nada en un aviso tan chico.
      .filter((l) => !/^\s*#/.test(l))
      .map((l) =>
        l
          .replace(/^[-*]\s+/, "")
          .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
          .replace(/[*_`]/g, "")
          .trim(),
      )
      .filter((l) => l.length > 0 && !/^https?:\/\//.test(l) && !/setup\.exe/i.test(l))
      .slice(0, maxLines)
  );
}
