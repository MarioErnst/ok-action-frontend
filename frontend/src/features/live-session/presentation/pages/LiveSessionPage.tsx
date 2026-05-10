import { Link } from 'react-router-dom'

// The live module moved from a WebSocket multi-dimensional Gemini
// orchestrator to an HTTP composition lifecycle. This page is awaiting
// a UI rewrite around the new flow (start live -> sequentially run
// component modules with parent_id -> finalize). Until then the page
// shows a clear "in migration" notice instead of half-broken UI.
export default function LiveSessionPage() {
  return (
    <main className="min-h-[100dvh] w-full bg-background flex flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <div className="max-w-md flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-text">Sesión libre en migración</h1>
        <p className="text-text-muted leading-relaxed">
          Estamos migrando la sesión libre al nuevo modelo de composición de
          módulos. Mientras tanto, ejecutá cada módulo individualmente desde el
          tablero.
        </p>
        <Link
          to="/dashboard"
          className="mt-2 inline-block w-full py-3 rounded-2xl bg-accent text-text-on-accent font-semibold active:scale-95 transition-transform"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  )
}
