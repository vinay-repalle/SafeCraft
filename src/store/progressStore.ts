import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DEFAULT_PROGRESS, parseProgress } from './progressSchema'
import type { JargonMode, Progress, Role, Theme } from './types'

// A Zustand "store" is one shared object of state plus the functions that change it.
// Any component can read from it with the hook below and re-renders only when the
// piece it read changes. No providers or prop passing needed.
type Actions = {
  setTheme: (theme: Theme) => void
  setJargonMode: (mode: JargonMode) => void
  setRole: (role: Role) => void
  // Swap in a whole Progress at once (used by import).
  replaceProgress: (progress: Progress) => void
}

export const STORAGE_KEY = 'synccraft-progress'

// Picks just the saved data out of the store, leaving the action functions behind.
export const selectProgress = (s: Progress): Progress => ({
  completed: s.completed,
  badges: s.badges,
  seenTerms: s.seenTerms,
  guidesRead: s.guidesRead,
  settings: s.settings,
})

export const useProgressStore = create<Progress & Actions>()(
  // "persist" is Zustand middleware: it copies the store to localStorage on every
  // change and reloads it when the app starts.
  persist(
    (set) => ({
      ...DEFAULT_PROGRESS,
      setTheme: (theme) => set((s) => ({ settings: { ...s.settings, theme } })),
      setJargonMode: (jargonMode) => set((s) => ({ settings: { ...s.settings, jargonMode } })),
      setRole: (role) => set((s) => ({ settings: { ...s.settings, role } })),
      replaceProgress: (progress) => set(progress),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Save only the data, never the action functions.
      partialize: (state) => selectProgress(state),
      // On load, run saved data through the same validator as imports.
      // If it is damaged or hand-edited into nonsense, fall back to defaults
      // instead of crashing the app.
      merge: (saved, current) => {
        const result = parseProgress(saved)
        return result.ok ? { ...current, ...result.progress } : current
      },
    },
  ),
)
