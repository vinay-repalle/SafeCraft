import { JARGON_MODES, ROLES, THEMES, type Progress } from './types'

export const DEFAULT_PROGRESS: Progress = {
  completed: {},
  badges: [],
  seenTerms: [],
  guidesRead: [],
  settings: {
    jargonMode: 'first',
    theme: 'system',
    proMode: false,
    role: 'frontend',
  },
}

export type ParseResult = { ok: true; progress: Progress } | { ok: false; error: string }

const fail = (error: string): ParseResult => ({ ok: false, error })

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((item) => typeof item === 'string')

function oneOf<T extends readonly string[]>(list: T, v: unknown): v is T[number] {
  return typeof v === 'string' && (list as readonly string[]).includes(v)
}

// Checks that unknown data (a file the user picked, or whatever localStorage holds)
// really is a Progress. Returns a clean copy with unknown keys dropped, or an
// error message in plain English. Nothing from the input is trusted.
export function parseProgress(value: unknown): ParseResult {
  if (!isRecord(value)) return fail('The progress data is not an object.')

  const { completed, badges, seenTerms, guidesRead, settings } = value

  if (!isRecord(completed)) return fail('"completed" is missing or not an object.')
  const cleanCompleted: Progress['completed'] = {}
  for (const [key, entry] of Object.entries(completed)) {
    if (!/^[1-9]\d*$/.test(key)) return fail(`"completed" has an invalid level number: ${key}.`)
    if (!isRecord(entry)) return fail(`Level ${key} in "completed" is not an object.`)
    const level: { frontend?: boolean; backend?: boolean } = {}
    for (const role of ['frontend', 'backend'] as const) {
      if (entry[role] === undefined) continue
      if (typeof entry[role] !== 'boolean') return fail(`Level ${key} ${role} must be true or false.`)
      level[role] = entry[role]
    }
    cleanCompleted[Number(key)] = level
  }

  if (!isStringArray(badges)) return fail('"badges" must be a list of text.')
  if (!isStringArray(seenTerms)) return fail('"seenTerms" must be a list of text.')
  if (!isStringArray(guidesRead)) return fail('"guidesRead" must be a list of text.')

  if (!isRecord(settings)) return fail('"settings" is missing or not an object.')
  if (!oneOf(THEMES, settings.theme)) return fail('"settings.theme" must be light, dark or system.')
  if (!oneOf(JARGON_MODES, settings.jargonMode))
    return fail('"settings.jargonMode" must be off, first or always.')
  if (!oneOf(ROLES, settings.role)) return fail('"settings.role" is not a known role.')
  if (typeof settings.proMode !== 'boolean') return fail('"settings.proMode" must be true or false.')

  return {
    ok: true,
    progress: {
      completed: cleanCompleted,
      badges: [...badges],
      seenTerms: [...seenTerms],
      guidesRead: [...guidesRead],
      settings: {
        jargonMode: settings.jargonMode,
        theme: settings.theme,
        proMode: settings.proMode,
        role: settings.role,
      },
    },
  }
}
