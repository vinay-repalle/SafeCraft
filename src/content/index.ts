import type { Level } from '../engine/types'
import type { Role } from '../store/types'
import jargonJson from './jargon.json'
import level1Json from './levels/level1.json'
import level1Backend from './levels/level1-backend.json'
import level2Json from './levels/level2.json'
import level2Backend from './levels/level2-backend.json'
import level3Json from './levels/level3.json'
import level3Backend from './levels/level3-backend.json'
import level4Json from './levels/level4.json'
import level4Backend from './levels/level4-backend.json'
import level5Json from './levels/level5.json'
import level5Backend from './levels/level5-backend.json'

export type JargonTerm = {
  id: string
  term: string
  meaning: string // one line
  analogy: string // an everyday comparison
  example: string
  command?: string // the real command, if there is one
  shortcut?: string
  guide?: string // Field Guide article slug (articles arrive in Phase 6)
}

// The two roles a learner can play in v1. Each level is written twice, once from each seat:
// levelN.json (frontend) and levelN-backend.json. They share a story and a lesson, but the
// files, tickets and teammates differ, because a backend developer's day is not a frontend
// developer's day.
export type PlayableRole = Extract<Role, 'frontend' | 'backend'>

// JSON files are typed loosely by TypeScript, so each level is cast to Level here.
// src/engine/levelValidation.ts (run by the tests) proves the data really matches.
const asLevels = (files: unknown[]) => files as Level[]

const byRole: Record<PlayableRole, Level[]> = {
  frontend: asLevels([level1Json, level2Json, level3Json, level4Json, level5Json]),
  backend: asLevels([level1Backend, level2Backend, level3Backend, level4Backend, level5Backend]),
}

// Every level of both roles, for the validator and the tests.
export const levels: Level[] = [...byRole.frontend, ...byRole.backend]

export const LEVEL_IDS = byRole.frontend.map((l) => l.id)

// The level's id, title and one-line reason, for the level map. Titles are the same in both roles.
export const levelSummaries: { id: number; title: string; whyItExists: string }[] = byRole.frontend.map((l) => ({ id: l.id, title: l.title, whyItExists: l.whyItExists }))

export const jargon: JargonTerm[] = jargonJson.terms

export function getLevel(id: number, role: PlayableRole = 'frontend'): Level | undefined {
  return byRole[role].find((l) => l.id === id)
}
