import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import type { ViewId } from '../app/nav'

// Screen state that is not progress: which view is open, which Field Guide article is showing,
// and whether the Git graph panel is open.
// Keeping it in a store (instead of inside App) lets any highlighted term open its article from anywhere.
//
// Only `gitGraphOpen` is saved (Phase 7a), under its own localStorage key, so it is remembered
// across reloads but is not part of the progress file. The view and article are not saved,
// so a reload starts on My view.
type UiState = {
  view: ViewId
  guideSlug: string | null
  gitGraphOpen: boolean
  setView: (view: ViewId) => void
  openGuide: (slug: string) => void
  closeGuide: () => void
  toggleGitGraph: () => void
}

export const UI_STORAGE_KEY = 'synccraft-ui'

// localStorage can be missing (tests, some private windows) or throw (storage blocked or full).
// Every call is wrapped, so the worst case is "not remembered", never a crash.
export const safeLocalStorage: StateStorage = {
  getItem: (key) => {
    try {
      return globalThis.localStorage?.getItem(key) ?? null
    } catch {
      return null
    }
  },
  setItem: (key, value) => {
    try {
      globalThis.localStorage?.setItem(key, value)
    } catch {
      // Not remembered this time. The panel still works.
    }
  },
  removeItem: (key) => {
    try {
      globalThis.localStorage?.removeItem(key)
    } catch {
      // Nothing to do.
    }
  },
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      view: 'my',
      guideSlug: null,
      gitGraphOpen: true,
      setView: (view) => set({ view }),
      openGuide: (guideSlug) => set({ view: 'guide', guideSlug }),
      closeGuide: () => set({ guideSlug: null }),
      toggleGitGraph: () => set((s) => ({ gitGraphOpen: !s.gitGraphOpen })),
    }),
    {
      name: UI_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (s) => ({ gitGraphOpen: s.gitGraphOpen }),
      // Accept only a real boolean from storage; anything else keeps the default.
      merge: (saved, current) => {
        const open = (saved as { gitGraphOpen?: unknown } | undefined)?.gitGraphOpen
        return typeof open === 'boolean' ? { ...current, gitGraphOpen: open } : current
      },
    },
  ),
)
