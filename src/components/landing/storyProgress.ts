// How far the reader has scrolled through "Follow one order", shared between the page (which
// measures it) and the 3D scene (which draws it). A store, not React state, so the scene can read
// it inside its frame loop without re-rendering the page on every scroll event.
import { create } from 'zustand'

export const useStoryProgress = create<{ progress: number; set: (progress: number) => void }>()((set) => ({
  progress: 0,
  set: (progress) => set({ progress }),
}))
