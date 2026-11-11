// The saved-progress shape from the PRD (section 9).
// Two deliberate differences from the PRD text:
// - theme also allows 'system' (follow the OS), which is the default
// - role is narrowed from string to the five known role ids

// "as const" freezes these lists so TypeScript can derive the union types below
// from the same source the validator uses at runtime.
export const THEMES = ['light', 'dark', 'system'] as const
export const JARGON_MODES = ['off', 'first', 'always'] as const
export const ROLES = ['frontend', 'backend', 'qa', 'pm', 'reviewer'] as const

export type Theme = (typeof THEMES)[number]
export type JargonMode = (typeof JARGON_MODES)[number]
export type Role = (typeof ROLES)[number]

export type Progress = {
  completed: Record<number, { frontend?: boolean; backend?: boolean }>
  badges: string[]
  seenTerms: string[]
  guidesRead: string[]
  settings: {
    jargonMode: JargonMode
    theme: Theme
    proMode: boolean
    role: Role
  }
}
