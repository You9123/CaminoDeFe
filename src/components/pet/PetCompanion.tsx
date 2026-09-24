import { usePet } from "../../hooks/usePet";
import { PetArt } from "./PetArt";

/** La mascota en la pantalla Hoy, con su burbuja. Tocarla la hace saltar y cambiar de frase. */
export function PetCompanion() {
  const pet = usePet();
  if (!pet) return null;
  return (
    <div className="flex min-w-0 items-end gap-2">
      <div
        className="animate-rise relative mb-10 max-w-48 min-w-0 rounded-2xl rounded-br-sm border border-border bg-surface px-3.5 py-2 text-sm leading-snug shadow-sm"
        aria-live="polite"
      >
        {pet.line}
        <span className="mt-0.5 block text-[11px] text-muted">
          {pet.name} · {pet.stage.title}
        </span>
      </div>
      <button
        onClick={pet.poke}
        className="-my-4 rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label={`${pet.name}, tu compañero de camino`}
      >
        <PetArt species={pet.species} stage={pet.stage.id} mood={pet.mood} accessory={pet.accessory} size={124} />
      </button>
    </div>
  );
}
