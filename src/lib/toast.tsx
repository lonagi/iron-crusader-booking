import React, { createContext, useCallback, useContext, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast { id: number; message: string; type: ToastType }
interface ToastContextValue { toast: (message: string, type?: ToastType) => void }

const ToastContext = createContext<ToastContextValue | null>(null)
let _id = 0

const config: Record<ToastType, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  success: { icon: <CheckCircle className="w-4 h-4" />, color: '#4caf72', bg: '#111',       border: 'rgba(76,175,114,0.25)' },
  error:   { icon: <AlertCircle  className="w-4 h-4" />, color: '#f04040', bg: '#111',       border: 'rgba(240,64,64,0.3)'  },
  warning: { icon: <AlertTriangle className="w-4 h-4" />, color: '#e8a020', bg: '#111',      border: 'rgba(232,160,32,0.3)' },
  info:    { icon: <Info          className="w-4 h-4" />, color: '#999',    bg: '#111',       border: '#2a2a2a'              },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
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
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 pointer-events-none">
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
                style={{ background: c.bg, border: `1px solid ${c.border}`, boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}
              >
                <span style={{ color: c.color }} className="shrink-0 mt-0.5">{c.icon}</span>
                <p className="text-sm text-text flex-1">{t.message}</p>
                <button onClick={() => remove(t.id)} className="shrink-0 text-muted hover:text-text transition-colors">
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
