import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import type { ViewId } from '../app/nav'
import type { Zone } from './nextAction'

// Screen state that is not progress: which view is open, which Field Guide article is showing,
// whether the Git graph panel is open, the first-visit tour (Phase 9) and, on narrow screens,
// which zone of My view is showing (Phase 9).
// Keeping it in a store (instead of inside App) lets any highlighted term open its article from anywhere.
//
// Only `gitGraphOpen` (Phase 7a) and `tourDone` (Phase 9) are saved, under their own localStorage
// key, so they are remembered across reloads but are not part of the progress file. The view and
// article are not saved, so a reload starts on My view.
type UiState = {
  view: ViewId
  guideSlug: string | null
  gitGraphOpen: boolean
  // The three-card tour of My view. `tourStep` is the card showing (0 to TOUR_LENGTH - 1), or null.
  tourDone: boolean
  tourStep: number | null
  // Below the wide layout, My view shows one zone at a time.
  playZone: Zone
  setView: (view: ViewId) => void
  openGuide: (slug: string) => void
  closeGuide: () => void
  toggleGitGraph: () => void
  startTour: () => void
  nextTourStep: () => void
  endTour: () => void
  setPlayZone: (zone: Zone) => void
}

export const TOUR_LENGTH = 3

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
      tourDone: false,
      tourStep: null,
      playZone: 'code',
      setView: (view) => set({ view }),
      openGuide: (guideSlug) => set({ view: 'guide', guideSlug }),
      closeGuide: () => set({ guideSlug: null }),
      toggleGitGraph: () => set((s) => ({ gitGraphOpen: !s.gitGraphOpen })),
      startTour: () => set({ view: 'my', tourStep: 0 }),
      // The last card's "Start playing" ends the tour, the same as skipping it.
      nextTourStep: () =>
        set((s) => (s.tourStep === null || s.tourStep + 1 >= TOUR_LENGTH ? { tourStep: null, tourDone: true } : { tourStep: s.tourStep + 1 })),
      endTour: () => set({ tourStep: null, tourDone: true }),
      setPlayZone: (playZone) => set({ playZone }),
    }),
    {
      name: UI_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (s) => ({ gitGraphOpen: s.gitGraphOpen, tourDone: s.tourDone }),
      // Accept only real booleans from storage; anything else keeps the default.
      merge: (saved, current) => {
        const { gitGraphOpen, tourDone } = (saved ?? {}) as { gitGraphOpen?: unknown; tourDone?: unknown }
        return {
          ...current,
          ...(typeof gitGraphOpen === 'boolean' ? { gitGraphOpen } : {}),
          ...(typeof tourDone === 'boolean' ? { tourDone } : {}),
        }
      },
    },
  ),
)
