import { parseProgress, type ParseResult } from '../store/progressSchema'
import type { Progress } from '../store/types'

// The exported file wraps progress in a small envelope so we can recognise our own
// files and change the format later without breaking old exports.
const FILE_APP = 'synccraft'
const FILE_VERSION = 1
const MAX_BYTES = 1_000_000

export function progressFileName(now: Date = new Date()): string {
  return `synccraft-progress-${now.toISOString().slice(0, 10)}.json`
}

export function serializeProgressFile(progress: Progress, now: Date = new Date()): string {
  return JSON.stringify(
    { app: FILE_APP, fileVersion: FILE_VERSION, exportedAt: now.toISOString(), progress },
    null,
    2,
  )
}

export function parseProgressFile(text: string): ParseResult {
  if (text.length > MAX_BYTES) return { ok: false, error: 'That file is too large to be a SyncCraft export.' }

  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' }
  }

  if (typeof data !== 'object' || data === null || (data as { app?: unknown }).app !== FILE_APP) {
    return { ok: false, error: 'That file is not a SyncCraft progress export.' }
  }
  const { fileVersion, progress } = data as { fileVersion?: unknown; progress?: unknown }
  if (fileVersion !== FILE_VERSION) {
    return { ok: false, error: 'That file was made by a different version of SyncCraft.' }
  }
  return parseProgress(progress)
}

// Browser-only: turns the text into a file and starts a download.
export function downloadProgressFile(progress: Progress): void {
  const blob = new Blob([serializeProgressFile(progress)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = progressFileName()
  link.click()
  URL.revokeObjectURL(url)
}
