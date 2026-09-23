export function NotInTauriScreen() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
        <p className="mb-3 text-3xl">✝️</p>
        <h1 className="mb-2 text-xl font-semibold">Camino de Fe</h1>
        <p className="text-muted">
          Esta vista necesita la base de datos local, que solo existe dentro de la app de escritorio. Ábrela con:
        </p>
        <code className="mt-4 inline-block rounded-lg bg-surface-2 px-3 py-2 text-sm">pnpm tauri dev</code>
      </div>
    </div>
  );
}
