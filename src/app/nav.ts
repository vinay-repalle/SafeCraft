import type { Role } from '../store/types'

export type ViewId = 'my' | 'team' | 'pipeline' | 'guide'

// Sentence case per docs/DESIGN.md ("My view", not "My View").
export const VIEWS: { id: ViewId; label: string }[] = [
  { id: 'my', label: 'My view' },
  { id: 'team', label: 'Team view' },
  { id: 'pipeline', label: 'Pipeline view' },
  { id: 'guide', label: 'Field guide' },
]

// Frontend and Backend are playable in v1; the other three are observe-only (PRD section 4).
export const ROLE_INFO: { id: Role; label: string; playable: boolean }[] = [
  { id: 'frontend', label: 'Frontend developer', playable: true },
  { id: 'backend', label: 'Backend developer', playable: true },
  { id: 'qa', label: 'QA tester', playable: false },
  { id: 'pm', label: 'Project manager', playable: false },
  { id: 'reviewer', label: 'Code reviewer', playable: false },
]
