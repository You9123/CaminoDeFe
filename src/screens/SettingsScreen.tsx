import { useState, type ReactNode } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { DAY_END_HOUR_OPTIONS } from "../domain/day";
import { useAsync } from "../hooks/useAsync";
import { useProgress } from "../stores/progressStore";
import { READING_SIZES, useSettings, type ReadingSize, type Theme } from "../stores/settingsStore";
import { toast } from "../stores/toastStore";
import { ReminderFields, AutostartField, BackupFields } from "./settings/SystemFields";
import { Field } from "./settings/ui";
import { EmotionPromptField, SpeechFields } from "./settings/SpeechFields";
import { PetFields } from "./settings/PetFields";
import { PrivacyFields } from "./settings/PrivacyFields";
import { UpdateFields } from "./settings/UpdateFields";
import { VOICES } from "../content/voices";
import { allCollectibleImages } from "../content/collectibleImages";
import { CATALOG } from "../content/collectibles";
import { creditLine } from "../domain/collectibles";

const THEMES: { value: Theme; label: string }[] = [
  { value: "system", label: "Como el sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

const hourLabel = (h: number) => (h === 0 ? "Medianoche (12:00 a. m.)" : `${h}:00 a. m.`);

export function SettingsScreen() {
  const settings = useSettings();
  const refresh = useProgress((s) => s.refresh);
  const version = useAsync(() => getVersion(), "version").data;

  return (
    <div className="mx-auto max-w-2xl px-10 py-12">
      <h1 className="mb-8 font-display text-4xl font-semibold">Ajustes</h1>

      <Section title="Perfil">
        <NameField />
      </Section>

      <Section title="Apariencia">
        <Field label="Tema">
          <Segmented options={THEMES} value={settings.theme} onChange={(t) => void settings.setTheme(t)} />
        </Field>
        <Field label="Tamaño de letra al leer">
          <Segmented
            options={(Object.keys(READING_SIZES) as ReadingSize[]).map((k) => ({
              value: k,
              label: READING_SIZES[k].label,
            }))}
            value={settings.readingSize}
            onChange={(s) => void settings.setReadingSize(s)}
          />
          <p
            className="mt-4 rounded-xl border border-border bg-bg px-5 py-4 font-reading leading-relaxed"
            style={{ fontSize: "var(--reading-size)" }}
          >
            <sup className="mr-1 font-ui text-[0.6em] font-semibold text-accent">1</sup>
            Jehová es mi pastor; nada me faltará.
          </p>
        </Field>
      </Section>

      <Section title="Tu día">
        <Field
          label="El día termina a las"
          hint="Lo que hagas antes de esa hora cuenta para el día anterior. Útil si lees de noche, después de medianoche."
        >
          <select
            value={settings.dayEndHour}
            onChange={async (e) => {
              await settings.setDayEndHour(Number(e.target.value));
              await refresh();
            }}
            className="rounded-xl border border-border bg-surface px-3 py-2 outline-none focus:border-accent"
          >
            {DAY_END_HOUR_OPTIONS.map((h) => (
              <option key={h} value={h}>
                {hourLabel(h)}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Mi compañero">
        <PetFields />
      </Section>

      <Section title="Escuchar">
        <SpeechFields />
      </Section>

      <Section title="Cómo te sientes">
        <EmotionPromptField />
      </Section>

      <Section title="Recordatorio">
        <ReminderFields />
        <AutostartField />
      </Section>

      <Section title="Privacidad">
        <PrivacyFields />
      </Section>

      <Section title="Respaldo">
        <BackupFields />
      </Section>

      <Section title="Acerca de">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted">Versión</dt>
          <dd>{version ?? "—"}</dd>
          <dt className="text-muted">Biblia</dt>
          <dd>Reina-Valera 1909 (dominio público)</dd>
          <dt className="text-muted">Tus datos</dt>
          <dd>Se guardan solo en esta computadora. Nada de tus datos se envía a internet.</dd>
          <dt className="text-muted">Voces naturales</dt>
          <dd>
            Piper (licencia MIT), de Rhasspy / Open Home Foundation. Voces:{" "}
            {VOICES.voices.map((v) => `${v.name} (${v.license})`).join(", ")}.
          </dd>
          <dt className="text-muted">Imágenes</dt>
          <dd>
            Obras de dominio público y fotos con licencia libre de Wikimedia Commons.
            <ImageCredits />
          </dd>
        </dl>
        <UpdateFields />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6 rounded-2xl border border-border bg-surface p-6">
      <h2 className="mb-4 font-display text-xl font-semibold">{title}</h2>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}

function Segmented<T extends string>(props: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap rounded-xl border border-border bg-bg p-1">
      {props.options.map((o) => (
        <button
          key={o.value}
          onClick={() => props.onChange(o.value)}
          className={`rounded-lg px-3.5 py-1.5 text-sm transition ${
            props.value === o.value ? "bg-surface font-semibold text-accent shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function NameField() {
  const name = useProgress((s) => s.name);
  const setName = useProgress((s) => s.setName);
  const [value, setValue] = useState<string | null>(null);
  const current = value ?? name;
  const changed = value !== null && value.trim() !== name;

  return (
    <Field label="Tu nombre" hint="Aparece en el saludo de la pantalla Hoy.">
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!current.trim()) return;
          await setName(current);
          setValue(null);
          toast("Nombre guardado", "info");
        }}
      >
        <input
          value={current}
          onChange={(e) => setValue(e.target.value)}
          maxLength={40}
          className="flex-1 rounded-xl border border-border bg-bg px-3 py-2 outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!changed}
          className="rounded-xl bg-accent px-4 py-2 font-semibold text-accent-ink disabled:opacity-40"
        >
          Guardar
        </button>
      </form>
    </Field>
  );
}

/** Créditos de las imágenes de los coleccionables (las licencias CC BY y CC BY-SA piden nombrar al autor). */
function ImageCredits() {
  const list = allCollectibleImages();
  return (
    <details className="mt-1.5">
      <summary className="cursor-pointer text-accent hover:underline">Ver los créditos ({list.length})</summary>
      <ul className="mt-2 flex max-h-72 flex-col gap-1.5 overflow-y-auto pr-2 text-[13px] leading-snug">
        {list.map(({ key, image }) => (
          <li key={key}>
            <span className="font-semibold">{CATALOG.byKey.get(key)?.name}</span>
            <span className="text-muted">
              {" "}
              · {image.title}. {creditLine(image)}.
            </span>
            <span className="block truncate text-[11px] text-muted/80 select-text" title={image.source}>
              {decodeURI(image.source)}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
