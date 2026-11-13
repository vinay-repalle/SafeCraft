import { useRef } from 'react'

// Phase 9: tells which lines of a growing list arrived after the component appeared, so only
// those animate in. Switching away from My view and back shows the old lines still, not a replay.
// Ids only ever go up (the level store counts them), so "newer than the last id at mount" works.
export function useNewSince(lines: { id: number }[]): (id: number) => boolean {
  const firstSeen = useRef<number | null>(null)
  if (firstSeen.current === null) firstSeen.current = lines.at(-1)?.id ?? 0
  const since = firstSeen.current
  return (id) => id > since
}
