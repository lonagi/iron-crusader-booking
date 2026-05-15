import React from 'react'
import { AlertTriangle } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export function MixedContentGuard({ children }: { children: React.ReactNode }) {
  const isHttps  = window.location.protocol === 'https:'
  const apiIsHttp = API_BASE.startsWith('http:')

  if (isHttps && apiIsHttp) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0a0a0a' }}>
        <div className="card max-w-md w-full p-8 text-center" style={{ borderColor: 'rgba(232,160,32,0.3)' }}>
          <AlertTriangle className="w-10 h-10 mx-auto mb-4" style={{ color: '#e8a020' }} />
          <h1 className="text-lg font-semibold text-text mb-2">Mixed Content Blocked</h1>
          <p className="text-sm text-muted mb-4">
            This app is served over HTTPS but the API URL is HTTP. Browsers block these requests.
          </p>
          <div className="text-left rounded-lg p-3 mb-4 text-xs font-mono" style={{ background: '#161616', border: '1px solid #2a2a2a' }}>
            <div className="text-muted mb-1">API URL:</div>
            <div style={{ color: '#f04040' }}>{API_BASE || 'http://…'}</div>
          </div>
          <p className="text-sm text-muted">
            Fix: expose the backend over HTTPS via{' '}
            <a
              href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/"
              target="_blank"
              rel="noreferrer"
              className="underline text-dim hover:text-text transition-colors"
            >
              Cloudflare Tunnel
            </a>
            , then set <code className="text-gold bg-raised px-1 rounded">VITE_API_BASE_URL</code> to the HTTPS URL.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
