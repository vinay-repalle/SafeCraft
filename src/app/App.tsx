import { type ComponentType, useEffect } from 'react'
import { FieldGuide } from '../views/FieldGuide'
import { Landing } from '../views/Landing'
import { MyView } from '../views/MyView'
import { PipelineView } from '../views/PipelineView'
import { TeamView } from '../views/TeamView'
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

  return (
    // Desktop only (PRD): below 1280px the game scrolls sideways rather than squeezing the three zones.
    <div className="flex h-screen min-w-[1280px] flex-col">
      <Header view={view} onViewChange={setView} />
      <RoleBar />
      {/* The window never scrolls; each zone scrolls inside itself. */}
      <main className="min-h-0 flex-1 overflow-auto p-4">
        <View />
      </main>
    </div>
  )
}
