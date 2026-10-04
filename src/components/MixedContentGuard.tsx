import type { ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export function MixedContentGuard({ children }: { children: ReactNode }) {
  const isHttps = window.location.protocol === 'https:'
  const apiIsHttp = API_BASE.startsWith('http:')

  if (isHttps && apiIsHttp) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg px-6 py-12">
        <div className="card w-full max-w-lg p-7 sm:p-10">
          <AlertTriangle className="mb-5 h-8 w-8 text-gold" aria-hidden="true" strokeWidth={1.5} />
          <h1 className="font-display text-3xl text-text">Bookings are temporarily unavailable</h1>
          <p className="mt-3 text-sm leading-relaxed text-dim">The booking service needs a secure connection. Please let the club know if this keeps happening.</p>
          <button className="btn btn-primary mt-6" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
          </button>
          <details className="mt-8 border-t border-border pt-5 text-sm text-dim">
            <summary className="cursor-pointer font-medium text-text">Details for the site administrator</summary>
            <p className="mt-3 leading-relaxed">This site uses HTTPS, but its API uses HTTP. The browser cannot connect.</p>
            <code className="mt-3 block break-all rounded-md border border-border bg-raised p-3 text-xs">{API_BASE}</code>
            <p className="mt-3 leading-relaxed">Serve the API over HTTPS, then update <code className="text-xs text-text">VITE_API_BASE_URL</code> and rebuild the site.</p>
          </details>
        </div>
      </main>
    )
  }

  return <>{children}</>
}
