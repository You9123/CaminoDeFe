import { useState } from "react";
import { useNavigate } from "react-router";
import { planSession, SESSION_MINUTES, type SessionMinutes, type SessionPlan } from "../domain/sessions";
import { formatMinutes } from "../domain/reading";
import { getSessionCandidates } from "../data/sessionRepo";
import { useAsync } from "../hooks/useAsync";
import { useSession } from "../stores/sessionStore";
import { Modal } from "./Modal";
import { BookIcon, CandleIcon, HourglassIcon, QuillIcon, SproutIcon } from "./icons";

/**
 * "Tengo unos minutos": elige cuánto tiempo tienes y la app arma la sesión (§2.3).
 * 5 minutos = un versículo (la sesión corta de siempre); 10, 15 y 30 = capítulos que caben.
 */
export function SessionPicker({ onQuick, onClose }: { onQuick: () => void; onClose: () => void }) {
  const navigate = useNavigate();
  const start = useSession((s) => s.start);
  const [chosen, setChosen] = useState<SessionMinutes>(10);

  const plans = useAsync(async () => {
    const { sequence, shortOptions } = await getSessionCandidates();
    return {
      10: planSession(10, sequence, shortOptions),
      15: planSession(15, sequence, shortOptions),
      30: planSession(30, sequence, shortOptions),
    } as Record<Exclude<SessionMinutes, 5>, SessionPlan>;
  }, "session-plans").data;

  const plan = chosen === 5 ? null : plans?.[chosen];

  const begin = () => {
    if (chosen === 5) {
      onClose();
      onQuick();
      return;
    }
    if (!plan || plan.chapters.length === 0) return;
    start(plan);
    onClose();
    const first = plan.chapters[0];
    navigate(`/biblia/${first.code}/${first.chapter}`);
  };

  return (
    <Modal onClose={onClose} label="¿Cuánto tiempo tienes?">
      <p className="flex items-center gap-2 pr-10 text-sm font-semibold text-accent">
        <HourglassIcon size={20} /> Una sesión a tu medida
      </p>
      <h2 className="mt-2 font-display text-2xl font-semibold">¿Cuánto tiempo tienes?</h2>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {SESSION_MINUTES.map((m) => (
          <button
            key={m}
            onClick={() => setChosen(m)}
            className={`rounded-2xl border px-2 py-3 text-center transition ${
              chosen === m
                ? "border-accent bg-accent-soft text-accent"
                : "border-border hover:border-accent hover:bg-accent-soft/40"
            }`}
          >
            <span className="block font-display text-2xl font-semibold tabular-nums">{m}</span>
            <span className="text-xs">minutos</span>
          </button>
        ))}
      </div>

      <div className="mt-5 min-h-40 rounded-2xl bg-surface-2/60 px-5 py-4">
        {chosen === 5 ? (
          <Steps
            items={[
              { icon: BookIcon, text: "Un versículo, para leerlo con calma" },
              { icon: QuillIcon, text: "Una reflexión corta" },
              { icon: CandleIcon, text: "Un minuto de oración" },
            ]}
            total="Unos 4 minutos"
          />
        ) : !plan ? (
          <p className="text-sm text-muted">Preparando…</p>
        ) : plan.chapters.length === 0 ? (
          <p className="text-sm text-muted">Ya leíste toda la Biblia. Elige cualquier capítulo desde el mapa.</p>
        ) : (
          <>
            <Steps
              items={[
                ...plan.chapters.map((c) => ({ icon: BookIcon, text: `${c.label} · ${formatMinutes(c.seconds)}` })),
                { icon: QuillIcon, text: "Una reflexión" },
                { icon: CandleIcon, text: `${plan.prayerMinutes} minutos de oración` },
                ...(plan.steps.includes("application")
                  ? [{ icon: SproutIcon, text: "Elegir cómo ponerlo en práctica" }]
                  : []),
              ]}
              total={`Unos ${plan.totalMinutes} minutos`}
            />
            {plan.detour && (
              <p className="mt-2 text-xs text-muted">
                El siguiente capítulo de tu camino es más largo, así que te propongo uno que cabe en este tiempo.
              </p>
            )}
          </>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-muted hover:bg-surface-2 hover:text-ink">
          Ahora no
        </button>
        <button
          onClick={begin}
          disabled={chosen !== 5 && (!plan || plan.chapters.length === 0)}
          className="rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-ink disabled:opacity-50"
        >
          Comenzar
        </button>
      </div>
    </Modal>
  );
}

function Steps({ items, total }: { items: { icon: typeof BookIcon; text: string }[]; total: string }) {
  return (
    <>
      <ul className="flex flex-col gap-2">
        {items.map(({ icon: Icon, text }, i) => (
          <li key={i} className="flex items-center gap-2.5 text-[15px]">
            <Icon size={19} className="shrink-0 text-accent" />
            {text}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm font-semibold text-muted">{total}</p>
    </>
  );
}
