import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Exportar el diario (Documento Maestro §2.9): a Markdown para guardarlo o abrirlo en otro programa.
 * El PDF se hace imprimiendo la misma información con un diseño para papel.
 */
export type ExportEntry = {
  day: string;
  kind: string;
  content: string;
  created_at: string;
  /** "Juan 3", ya legible. */
  refLabel: string | null;
  /** "Bien", ya legible. */
  emotionLabel: string | null;
};

const KIND_LABEL: Record<string, string> = { reflection: "Reflexión", application: "Aplicación", free: "Nota" };

export function kindLabel(kind: string): string {
  return KIND_LABEL[kind] ?? "Nota";
}

/** "2026-09-23" → "Miércoles 23 de septiembre de 2026" (siempre con año: el archivo dura). */
export function exportDayTitle(day: string): string {
  const text = format(parseISO(day), "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Agrupa por día, del más antiguo al más reciente (se lee como un cuaderno). */
export function groupForExport(entries: readonly ExportEntry[]): { day: string; entries: ExportEntry[] }[] {
  const sorted = [...entries].sort((a, b) => a.day.localeCompare(b.day) || a.created_at.localeCompare(b.created_at));
  const groups: { day: string; entries: ExportEntry[] }[] = [];
  for (const e of sorted) {
    const last = groups[groups.length - 1];
    if (last?.day === e.day) last.entries.push(e);
    else groups.push({ day: e.day, entries: [e] });
  }
  return groups;
}

/** Escapa lo mínimo para que el texto del usuario no se convierta en títulos o listas por accidente. */
function safe(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => (/^\s*(#|>|[-*+] |\d+\. )/.test(line) ? `\\${line.trimStart()}` : line))
    .join("\n");
}

export function journalToMarkdown(entries: readonly ExportEntry[], opts: { name: string; exportedOn: string }): string {
  const title = opts.name ? `Diario de ${opts.name}` : "Mi diario";
  const lines = [
    `# ${title}`,
    "",
    `_Camino de Fe · exportado el ${opts.exportedOn} · ${entries.length} ${entries.length === 1 ? "entrada" : "entradas"}_`,
    "",
  ];
  for (const g of groupForExport(entries)) {
    lines.push(`## ${exportDayTitle(g.day)}`, "");
    for (const e of g.entries) {
      const heading = [kindLabel(e.kind), e.refLabel].filter(Boolean).join(" · ");
      lines.push(`### ${heading}`, "", safe(e.content.trim()), "");
      if (e.emotionLabel) lines.push(`_Ese día me sentía: ${e.emotionLabel.toLowerCase()}_`, "");
    }
  }
  return (
    lines
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd() + "\n"
  );
}

export function journalFileName(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `camino-de-fe-diario-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.md`;
}
