import { useState, type ComponentType } from 'react'
import { FieldGuide } from '../views/FieldGuide'
import { MyView } from '../views/MyView'
import { PipelineView } from '../views/PipelineView'
import { TeamView } from '../views/TeamView'
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
  // useState keeps a value inside a component and re-draws it when the value changes.
  // The open view is screen state, not progress, so it lives here and is not saved.
  const [view, setView] = useState<ViewId>('my')
  const View = VIEW_COMPONENTS[view]

  return (
    <div className="flex min-h-screen flex-col">
      <Header view={view} onViewChange={setView} />
      <RoleBar />
      <main className="flex-1 p-6">
        <View />
      </main>
    </div>
  )
}
