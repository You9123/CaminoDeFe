import { useEffect, useState } from "react";

type Settled<T> = { key: string; data: T | undefined; error: unknown };

/**
 * Ejecuta una función async y vuelve a ejecutarla cuando cambia `key`.
 * Mientras carga una key nueva, `data` es undefined (no se muestran datos viejos).
 */
export function useAsync<T>(fn: () => Promise<T>, key: string) {
  const [settled, setSettled] = useState<Settled<T> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fn().then(
      (data) => !cancelled && setSettled({ key, data, error: null }),
      (error) => {
        console.error(error);
        if (!cancelled) setSettled({ key, data: undefined, error });
      },
    );
    return () => {
      cancelled = true;
    };
    // `fn` cambia en cada render; solo nos interesa volver a cargar cuando cambia la key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = settled?.key === key ? settled : null;
  return { data: current?.data, error: current?.error ?? null, loading: current === null };
}
