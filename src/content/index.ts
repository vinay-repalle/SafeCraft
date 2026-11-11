import type { Level } from '../engine/types'
import jargonJson from './jargon.json'
import level1Json from './levels/level1.json'

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

// JSON files are typed loosely by TypeScript, so each level is cast to Level here.
// src/engine/levelValidation.ts (run by the tests) proves the data really matches.
export const levels: Level[] = [level1Json as unknown as Level]

export const jargon: JargonTerm[] = jargonJson.terms

export function getLevel(id: number): Level | undefined {
  return levels.find((l) => l.id === id)
}
