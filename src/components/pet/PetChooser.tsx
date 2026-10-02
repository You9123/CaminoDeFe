import { useState } from "react";
import { PET_SPECIES, SPECIES_INFO, type PetSpecies } from "../../domain/pet";
import { useSettings } from "../../stores/settingsStore";
import { PetArt } from "./PetArt";

/**
 * "Conoce a tu compañero de camino": es un paso de la bienvenida (V3.5). Elegir una mascota
 * o decir que prefieres no tener; se puede cambiar después en Ajustes.
 */
export function PetChooser({ onChosen }: { onChosen?: () => void }) {
  const setPet = useSettings((s) => s.setPet);
  const [picked, setPicked] = useState<PetSpecies>("oveja");
  const [name, setName] = useState("");

  return (
    <section>
      <h2 className="font-display text-3xl font-semibold">Conoce a tu compañero de camino</h2>
      <p className="mt-1 text-muted">
        Te acompaña, crece contigo a medida que avanzas y nunca se enferma. Es opcional.
      </p>

      <div className="mt-5 grid grid-cols-4 gap-3">
        {PET_SPECIES.map((sp) => (
          <button
            key={sp}
            onClick={() => setPicked(sp)}
            className={`flex flex-col items-center rounded-2xl border px-2 pt-2 pb-3 transition ${
              picked === sp ? "border-accent bg-accent-soft/60" : "border-border hover:border-accent"
            }`}
            aria-pressed={picked === sp}
          >
            <PetArt species={sp} stage="joven" mood={picked === sp ? "happy" : "idle"} accessory={null} size={112} />
            <span className={`font-semibold ${picked === sp ? "text-accent" : ""}`}>{SPECIES_INFO[sp].name}</span>
            <span className="mt-0.5 text-center text-xs leading-snug text-muted">{SPECIES_INFO[sp].description}</span>
          </button>
        ))}
      </div>

      <form
        className="mt-5"
        onSubmit={(e) => {
          e.preventDefault();
          void setPet({ species: picked, name: name || SPECIES_INFO[picked].defaultName }).then(onChosen);
        }}
      >
        <label className="block">
          <span className="mb-1 block text-sm font-medium">¿Cómo se va a llamar?</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            placeholder={SPECIES_INFO[picked].defaultName}
            className="w-full rounded-xl border border-border bg-bg px-3 py-2 outline-none focus:border-accent"
          />
        </label>
        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => void setPet({ species: "none" }).then(onChosen)}
            className="rounded-xl px-4 py-2.5 text-muted hover:bg-surface-2 hover:text-ink"
          >
            Prefiero sin mascota
          </button>
          <button type="submit" className="rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-ink">
            Elegir a {name.trim() || SPECIES_INFO[picked].defaultName}
          </button>
        </div>
      </form>
    </section>
  );
}
