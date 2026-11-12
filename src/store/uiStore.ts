import { create } from 'zustand'
import type { ViewId } from '../app/nav'

// Screen state that is not progress: which view is open and which Field Guide article is showing.
// It is not saved, so a reload starts on My view. Keeping it in a store (instead of inside App)
// lets any highlighted term open its article from anywhere in the app.
type UiState = {
  view: ViewId
  guideSlug: string | null
  setView: (view: ViewId) => void
  openGuide: (slug: string) => void
  closeGuide: () => void
}

export const useUiStore = create<UiState>()((set) => ({
  view: 'my',
  guideSlug: null,
  setView: (view) => set({ view }),
  openGuide: (guideSlug) => set({ view: 'guide', guideSlug }),
  closeGuide: () => set({ guideSlug: null }),
}))
