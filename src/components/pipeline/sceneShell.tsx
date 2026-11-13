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
//
// The browser reports "first contentful paint" (the moment the first text or picture reaches
// the screen) as a performance entry, and a PerformanceObserver is how a page listens for those
// entries. Waiting for that entry keeps the rule exact even on a slow machine, where the screen
// can lag well behind the page's own code. A view opened later (the page has long since painted)
// is ready at once.
const FCP = 'first-contentful-paint'
const hasPainted = () => typeof performance !== 'undefined' && performance.getEntriesByName?.(FCP).length > 0
const canObservePaint = () => typeof PerformanceObserver !== 'undefined' && (PerformanceObserver.supportedEntryTypes ?? []).includes('paint')

export function useAfterFirstPaint(): boolean {
  const [ready, setReady] = useState(hasPainted)
  useEffect(() => {
    if (ready) return
    if (canObservePaint()) {
      const observer = new PerformanceObserver((list) => {
        if (list.getEntriesByName(FCP).length > 0) setReady(true)
      })
      // `buffered` also delivers an entry recorded before this observer started.
      observer.observe({ type: 'paint', buffered: true })
      return () => observer.disconnect()
    }
    // Browsers without paint timing: requestAnimationFrame runs just before the next frame is
    // drawn, and a timeout set inside it runs just after.
    let timeout = 0
    const frame = window.requestAnimationFrame(() => {
      timeout = window.setTimeout(() => setReady(true), 0)
    })
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timeout)
    }
  }, [ready])
  return ready
}

// What shows inside a scene's box while its 3D code downloads.
export const LOADING = <div className="flex h-full items-center justify-center text-meta text-ink-3">Loading the 3D scene</div>
