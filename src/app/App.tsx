import { type ComponentType, useEffect } from 'react'
import { FieldGuide } from '../views/FieldGuide'
import { Landing } from '../views/Landing'
import { MyView } from '../views/MyView'
import { PipelineView } from '../views/PipelineView'
import { TeamView } from '../views/TeamView'
import { HOW_TO_PLAY_SLUG } from '../content/guides'
import { useUiStore } from '../store/uiStore'
import { Header } from './Header'
import type { ViewId } from './nav'
import { RoleBar } from './RoleBar'
import { useRoute } from './route'
import { useApplyTheme } from './theme'

const VIEW_COMPONENTS: Record<ViewId, ComponentType> = {
  my: MyView,
  team: TeamView,
  pipeline: PipelineView,
  guide: FieldGuide,
}

// Phase 8: the site has two pages, the landing page at "/" and the game at "/play" (see route.ts).
export function App() {
  useApplyTheme()
  const page = useRoute((s) => s.page)
  return page === 'play' ? <Game /> : <Landing />
}

// The game: header, role bar and the four views.
function Game() {
  // The open view is screen state, not progress, so it lives in a small unsaved store.
  // That lets a highlighted term anywhere in the app open its Field Guide article.
  const view = useUiStore((s) => s.view)
  const setView = useUiStore((s) => s.setView)
  const View = VIEW_COMPONENTS[view]

  useEffect(() => {
    document.title = 'Play · SyncCraft'
  }, [])

  // Phase 9: "?" opens How to play from anywhere in the game, except while typing (a text box or
  // the code editor) or while a popup is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '?' || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return
      const el = e.target as HTMLElement | null
      if (el?.closest('input, textarea, select, [contenteditable="true"]') || document.querySelector('dialog[open]')) return
      e.preventDefault()
      useUiStore.getState().openGuide(HOW_TO_PLAY_SLUG)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    // Phase 9: no minimum width. From 1200px up (the same line as My view's three columns) the
    // window never scrolls and each zone scrolls inside itself. Below it, the whole page scrolls,
    // so the header and role bar move out of the way, and Team view scrolls sideways in <main>.
    <div className="flex min-h-dvh flex-col min-[1200px]:h-dvh">
      <Header view={view} onViewChange={setView} />
      <RoleBar />
      <main className="flex-1 overflow-x-auto p-4 min-[1200px]:min-h-0 min-[1200px]:overflow-auto">
        <View />
      </main>
    </div>
  )
}
