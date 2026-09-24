import { useState, type ReactNode } from "react";
import {
  accessoryUnlocked,
  isPetSpecies,
  PET_ACCESSORIES,
  PET_SPECIES,
  PET_STAGES,
  petStage,
  SPECIES_INFO,
} from "../../domain/pet";
import { getUnlockedAchievements } from "../../data/achievementsRepo";
import { useAsync } from "../../hooks/useAsync";
import { useProgress } from "../../stores/progressStore";
import { useSettings } from "../../stores/settingsStore";
import { toast } from "../../stores/toastStore";
import { PetArt } from "../../components/pet/PetArt";
import { Field, Toggle } from "./ui";

/** Ajustes → Mi compañero: especie, nombre, accesorio, cómo evoluciona, o apagarla. */
export function PetFields() {
  const { petSpecies, petName, petAccessory, setPet } = useSettings();
  const level = useProgress((s) => s.level.level);
  const best = useProgress((s) => s.streak.best);
  const totalXp = useProgress((s) => s.totalXp);
  const achievements = useAsync(getUnlockedAchievements, `pet-settings-${totalXp}`).data;
  const unlocked = new Set(achievements?.keys() ?? []);
  const [name, setName] = useState<string | null>(null);

  const on = isPetSpecies(petSpecies);
  const species = on ? petSpecies : "oveja";
  const stage = petStage(level);
  const currentName = name ?? (petName || SPECIES_INFO[species].defaultName);

  return (
    <>
      <Field
        label="Mascota"
        hint="Es opcional. Si la apagas, nada de tu progreso cambia; puedes volver a encenderla cuando quieras."
      >
        <Toggle
          checked={on}
          onChange={(v) => void setPet({ species: v ? species : "none" })}
          label={on ? "Te acompaña en la pantalla Hoy" : "Sin mascota"}
        />
      </Field>

      {on && (
        <>
          <Field label="Especie">
            <div className="grid grid-cols-4 gap-2">
              {PET_SPECIES.map((sp) => (
                <button
                  key={sp}
                  onClick={() => void setPet({ species: sp })}
                  className={`flex flex-col items-center rounded-2xl border pb-2 text-sm transition ${
                    sp === species
                      ? "border-accent bg-accent-soft/60 font-semibold text-accent"
                      : "border-border hover:border-accent"
                  }`}
                  aria-pressed={sp === species}
                >
                  <PetArt species={sp} stage={stage.id} mood="idle" accessory={null} size={80} />
                  {SPECIES_INFO[sp].name}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Nombre">
            <form
              className="flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                await setPet({ name: currentName });
                setName(null);
                toast("Nombre guardado", "info");
              }}
            >
              <input
                value={currentName}
                onChange={(e) => setName(e.target.value)}
                maxLength={24}
                className="flex-1 rounded-xl border border-border bg-bg px-3 py-2 outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={name === null || !name.trim()}
                className="rounded-xl bg-accent px-4 py-2 font-semibold text-accent-ink disabled:opacity-40"
              >
                Guardar
              </button>
            </form>
          </Field>

          <Field label="Accesorio" hint="Se ganan con tu racha y con algunos logros.">
            <div className="flex flex-wrap gap-2">
              <Chip selected={!petAccessory} onClick={() => void setPet({ accessory: null })}>
                Ninguno
              </Chip>
              {PET_ACCESSORIES.map((a) => {
                const ok = accessoryUnlocked(a, best, unlocked);
                return (
                  <Chip
                    key={a.id}
                    selected={petAccessory === a.id && ok}
                    disabled={!ok}
                    onClick={() => void setPet({ accessory: a.id })}
                    title={ok ? undefined : `Se gana con: ${a.how}`}
                  >
                    {a.title}
                    {!ok && <span className="ml-1 text-xs font-normal">· {a.how}</span>}
                  </Chip>
                );
              })}
            </div>
          </Field>

          <Field label="Cómo crece" hint="Cambia con tu nivel. Nunca retrocede.">
            <ol className="flex items-end justify-between gap-1 rounded-2xl bg-bg px-3 pt-1 pb-3">
              {PET_STAGES.map((s, i) => (
                <li
                  key={s.id}
                  className={`flex flex-col items-center text-center text-[11px] leading-tight ${
                    i === stage.index
                      ? "font-semibold text-accent"
                      : i > stage.index
                        ? "text-muted opacity-60"
                        : "text-muted"
                  }`}
                >
                  <PetArt species={species} stage={s.id} mood="idle" accessory={null} size={72} />
                  {s.title}
                  <span className="text-[10px] font-normal">Nivel {s.level}</span>
                </li>
              ))}
            </ol>
          </Field>
        </>
      )}
    </>
  );
}

function Chip(props: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
        props.selected
          ? "border-accent bg-accent-soft font-semibold text-accent"
          : "border-border hover:border-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border"
      }`}
    >
      {props.children}
    </button>
  );
}
