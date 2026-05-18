import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0a0a0a' }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="card max-w-sm w-full p-10 text-center"
      >
        <div className="text-4xl mb-5">404</div>
        <h2 className="text-lg font-semibold text-text mb-2">Page not found</h2>
        <p className="text-sm text-muted mb-6">The page you're looking for doesn't exist.</p>
        <Link to="/" className="btn btn-primary inline-flex">
          Go home
        </Link>
      </motion.div>
    </div>
  )
}
