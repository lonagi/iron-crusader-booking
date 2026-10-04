import React, { createContext, useCallback, useContext, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react'
import { usePreferences } from '@/preferences/PreferencesContext'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast { id: number; message: string; type: ToastType }
interface ToastContextValue { toast: (message: string, type?: ToastType) => void }

const ToastContext = createContext<ToastContextValue | null>(null)
let _id = 0

const config: Record<ToastType, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  success: { icon: <CheckCircle className="w-4 h-4" />, color: 'rgb(var(--success))', bg: 'rgb(var(--surface))', border: 'rgb(var(--success-border))' },
  error: { icon: <AlertCircle className="w-4 h-4" />, color: 'rgb(var(--danger))', bg: 'rgb(var(--surface))', border: 'rgb(var(--danger-border))' },
  warning: { icon: <AlertTriangle className="w-4 h-4" />, color: 'rgb(var(--accent))', bg: 'rgb(var(--surface))', border: 'rgb(var(--accent-border))' },
  info: { icon: <Info className="w-4 h-4" />, color: 'rgb(var(--muted))', bg: 'rgb(var(--surface))', border: 'rgb(var(--border))' },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { t: translate } = usePreferences()
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++_id
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const remove = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2 w-[min(22rem,calc(100vw-2rem))] pointer-events-none" aria-live="polite" aria-atomic="false">
        <AnimatePresence mode="popLayout">
          {toasts.map(t => {
            const c = config[t.type]
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg"
                role={t.type === 'error' ? 'alert' : 'status'}
                style={{ background: c.bg, border: `1px solid ${c.border}`, boxShadow: '0 4px 24px rgba(36,44,40,0.1)' }}
              >
                <span style={{ color: c.color }} className="shrink-0 mt-0.5">{c.icon}</span>
                <p className="text-sm text-text flex-1">{t.message}</p>
                <button onClick={() => remove(t.id)} aria-label={translate('Dismiss notification')} className="shrink-0 text-muted hover:text-text transition-colors p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx.toast
}
