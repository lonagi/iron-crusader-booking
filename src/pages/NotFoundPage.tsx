import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6 py-12">
      <div className="w-full max-w-md">
        <p className="label mb-8">Iron Crusader</p>
        <p className="font-display text-8xl leading-none text-gold">404</p>
        <h1 className="mt-6 font-display text-3xl text-text">Page not found</h1>
        <p className="mt-3 text-sm leading-relaxed text-dim">This link may have moved. Head back to find a table for your next game.</p>
        <Link to="/book" className="btn btn-primary mt-7">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to bookings
        </Link>
      </div>
    </main>
  )
}
