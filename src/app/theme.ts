import { useEffect } from 'react'
import { useProgressStore } from '../store/progressStore'
import type { Theme } from '../store/types'

export function resolveTheme(setting: Theme, systemPrefersDark: boolean): 'light' | 'dark' {
  if (setting === 'system') return systemPrefersDark ? 'dark' : 'light'
  return setting
}

// A hook is a function whose name starts with "use" that lets a component plug into
// React features. This one uses two:
// - useProgressStore: read the theme setting from the store
// - useEffect: run code that touches the outside world (here, the <html> element)
//   after React has drawn, and again whenever the listed dependencies change
export function useApplyTheme(): void {
  const theme = useProgressStore((s) => s.settings.theme)

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      document.documentElement.dataset.theme = resolveTheme(theme, query.matches)
    }
    apply()

    // Only "system" follows the OS live. Light and dark ignore OS changes.
    if (theme !== 'system') return
    query.addEventListener('change', apply)
    // Cleanup: runs before the effect re-runs, so listeners never pile up.
    return () => query.removeEventListener('change', apply)
  }, [theme])
}
