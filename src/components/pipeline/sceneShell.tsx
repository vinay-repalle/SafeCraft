// Shared plumbing for every lazy 3D view (the pipeline diorama and the ticket journey). Nothing
// here imports three.js, so it is safe in the main bundle.
import { Component, useEffect, useState, type ReactNode } from 'react'

// An error boundary catches a crash in the components below it and shows a fallback
// instead of a blank page. React only supports these as classes. Here it catches a failed
// download of a 3D chunk or a WebGL error, and the view drops back to its 2D version.
export class SceneBoundary extends Component<{ onError: () => void; fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

// True from the first moment after the page has painted. Starting a 3D download here,
// not during the first render, means the board, chat and editor appear first.
export function useAfterFirstPaint(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 0)
    return () => window.clearTimeout(id)
  }, [])
  return ready
}

// What shows inside a scene's box while its 3D code downloads.
export const LOADING = <div className="flex h-full items-center justify-center text-meta text-ink-3">Loading the 3D scene</div>
