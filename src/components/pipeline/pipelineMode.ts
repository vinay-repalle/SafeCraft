// Whether the pipeline shows the 3D scene or the plain 2D list.
//   auto  decide from the device (WebGL available, not a weak device)
//   3d    the learner asked for the scene, even on a device we would have skipped
//   list  the learner asked for the list
// Kept in memory only: it is a display choice, not progress, so it is not saved or exported.
import { create } from 'zustand'
import { isWeakDevice } from './sceneLayout'

export type PipelineMode = 'auto' | '3d' | 'list'

export const usePipelineMode = create<{ mode: PipelineMode; set: (mode: PipelineMode) => void }>()((set) => ({
  mode: 'auto',
  set: (mode) => set({ mode }),
}))

export type Support = { webgl: boolean; weak: boolean }

// Asks the browser for a WebGL context (the thing that draws 3D) and for hints about
// the machine. Runs once; the answer cannot change while the page is open.
let cached: Support | null = null
export function detectSupport(): Support {
  if (cached) return cached
  let webgl = false
  let renderer: string | undefined
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (gl) {
      webgl = true
      const info = gl.getExtension('WEBGL_debug_renderer_info')
      if (info) renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  } catch {
    webgl = false
  }
  const nav = navigator as Navigator & { deviceMemory?: number }
  cached = { webgl, weak: isWeakDevice({ deviceMemory: nav.deviceMemory, hardwareConcurrency: nav.hardwareConcurrency, renderer }) }
  return cached
}

// What to draw right now, given the learner's choice and the device.
export function shouldUse3d(mode: PipelineMode, support: Support): boolean {
  if (!support.webgl) return false
  if (mode === 'list') return false
  if (mode === '3d') return true
  return !support.weak
}
