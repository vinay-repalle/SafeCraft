// Two pages from one HTML file: the landing page at "/" and the game at "/play".
//
// A "router" library would be overkill for two pages, so this is a small path check. It uses
// the browser's History API: history.pushState(...) changes the address bar without loading a
// new page, and the browser fires a "popstate" event when the learner presses Back or Forward.
// We keep the current address in a tiny Zustand store, so any component can read it and
// re-render when it changes.
//
// A direct visit to /play (a bookmark, a shared link, a reload) asks the host for a file called
// /play, which does not exist. public/_redirects tells Cloudflare Pages (and Netlify) to answer
// with index.html instead; Vite's dev server does the same on its own.
import { create } from 'zustand'
import { LEVEL_IDS } from '../content'
import type { Progress } from '../store/types'

export type Page = 'landing' | 'play'
export type Route = { page: Page; level: number | null }

export const PLAY_PATH = '/play'

// Which page an address shows, and which level it asks for (`/play?level=3`). Anything that is
// not /play is the landing page, so a mistyped address never shows a blank screen.
export function parseRoute(pathname: string, search: string, levelIds: readonly number[] = LEVEL_IDS): Route {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path !== PLAY_PATH) return { page: 'landing', level: null }
  const raw = new URLSearchParams(search).get('level')
  const level = raw !== null && /^\d+$/.test(raw) ? Number(raw) : null
  return { page: 'play', level: level !== null && levelIds.includes(level) ? level : null }
}

export const playHref = (level?: number | null) => (level ? `${PLAY_PATH}?level=${level}` : PLAY_PATH)

// Only a plain left click is handled in the page. A middle click, or a click with Ctrl, Cmd,
// Shift or Alt, means "open in a new tab or window", which the browser should do as usual.
export function isPlainLeftClick(e: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; defaultPrevented: boolean }): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.defaultPrevented
}

// The main button on the landing page. A first visit starts Level 1. A returning visitor goes
// on from the first level they have not finished in their seat. Someone who has finished every
// level opens the game with the level map, to pick one.
export type StartTarget = { label: string; href: string; level: number | null }

type StartInput = Pick<Progress, 'completed' | 'seenTerms' | 'guidesRead' | 'settings'>

export function startTarget(p: StartInput, levelIds: readonly number[] = LEVEL_IDS): StartTarget {
  const seat = p.settings.role === 'backend' ? 'backend' : 'frontend'
  const anyDone = Object.values(p.completed).some((c) => c?.frontend === true || c?.backend === true)
  const started = anyDone || p.seenTerms.length > 0 || p.guidesRead.length > 0
  if (!started) return { label: 'Start level 1', href: playHref(1), level: 1 }
  const next = levelIds.find((id) => p.completed[id]?.[seat] !== true)
  if (next === undefined) return { label: 'Open the levels', href: playHref(), level: null }
  return { label: `Continue: Level ${next}`, href: playHref(next), level: next }
}

type RouteState = Route & {
  // Go to another address in this site without reloading the page.
  navigate: (href: string) => void
  // The game has loaded the level the address asked for, so drop `?level=` from the address.
  // A reload then keeps the level the learner has moved on to, not the one they arrived with.
  consumeLevel: () => void
}

const read = (): Route => (typeof window === 'undefined' ? { page: 'landing', level: null } : parseRoute(window.location.pathname, window.location.search))

export const useRoute = create<RouteState>()((set) => ({
  ...read(),
  navigate: (href) => {
    const url = new URL(href, window.location.href)
    const samePage = url.pathname === window.location.pathname
    window.history.pushState(null, '', url.pathname + url.search + url.hash)
    set(read())
    // A new page starts at the top, as a normal link would. A link to a section (#how-to-play)
    // scrolls there once the page has drawn.
    if (url.hash) {
      requestAnimationFrame(() => document.getElementById(url.hash.slice(1))?.scrollIntoView())
    } else if (!samePage) {
      window.scrollTo(0, 0)
    }
  },
  consumeLevel: () => {
    if (typeof window === 'undefined') return
    window.history.replaceState(null, '', window.location.pathname + window.location.hash)
    set({ level: null })
  },
}))

// Back and Forward change the address; read it again.
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => useRoute.setState(read()))
}
