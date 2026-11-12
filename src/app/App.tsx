import { type ComponentType } from 'react'
import { FieldGuide } from '../views/FieldGuide'
import { MyView } from '../views/MyView'
import { PipelineView } from '../views/PipelineView'
import { TeamView } from '../views/TeamView'
import { useUiStore } from '../store/uiStore'
import { Header } from './Header'
import type { ViewId } from './nav'
import { RoleBar } from './RoleBar'
import { useApplyTheme } from './theme'

const VIEW_COMPONENTS: Record<ViewId, ComponentType> = {
  my: MyView,
  team: TeamView,
  pipeline: PipelineView,
  guide: FieldGuide,
}

export function App() {
  useApplyTheme()
  // The open view is screen state, not progress, so it lives in a small unsaved store.
  // That lets a highlighted term anywhere in the app open its Field Guide article.
  const view = useUiStore((s) => s.view)
  const setView = useUiStore((s) => s.setView)
  const View = VIEW_COMPONENTS[view]

  return (
    <div className="flex h-screen flex-col">
      <Header view={view} onViewChange={setView} />
      <RoleBar />
      {/* The window never scrolls; each zone scrolls inside itself. */}
      <main className="min-h-0 flex-1 overflow-auto p-4">
        <View />
      </main>
    </div>
  )
}
