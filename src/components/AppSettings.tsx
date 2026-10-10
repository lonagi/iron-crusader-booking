import * as Popover from '@radix-ui/react-popover'
import { LogOut, SlidersHorizontal, X } from 'lucide-react'
import { useSession } from '@/auth/SessionContext'
import { usePreferences } from '@/preferences/PreferencesContext'
import { PreferencesControls } from './PreferencesControls'

export function AppSettings() {
  const { session, logout } = useSession()
  const { t } = usePreferences()
  return (
    <Popover.Root>
      <Popover.Trigger asChild><button type="button" className="btn-icon border-transparent" aria-label={t('Settings')} title={t('Settings')}><SlidersHorizontal className="h-5 w-5" /></button></Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={12} collisionPadding={16} className="z-50 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface p-5 shadow-modal" aria-label={t('Settings')}>
          <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{t('Settings')}</h2><Popover.Close asChild><button className="btn-icon border-transparent" aria-label={t('Close settings')}><X className="h-5 w-5" /></button></Popover.Close></div>
          <PreferencesControls />
          <div className="mt-5 border-t border-border pt-4">
            <p className="mb-3 truncate text-base font-medium">{session?.user_name}</p>
            <button onClick={logout} className="btn-ghost w-full justify-start px-0"><LogOut className="h-[18px] w-[18px]" />{t('Sign out')}</button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
