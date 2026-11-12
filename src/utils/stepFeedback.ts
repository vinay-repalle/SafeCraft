// Phase 7e: which steps were just completed, so the step card can mark them with a short motion.

// Step numbers (1-based, in level order) that are in `next` but were not in `prev`.
// `prev` is null right after a level loads, which must never count as completing anything.
export function justCompleted(prev: readonly string[] | null, next: readonly string[], order: readonly string[]): number[] {
  if (prev === null) return []
  const before = new Set(prev)
  return order.flatMap((id, i) => (next.includes(id) && !before.has(id) ? [i + 1] : []))
}

// "Step 3 done", "Steps 3 and 4 done", "Steps 9 to 11 done".
export function doneLabel(numbers: readonly number[]): string {
  if (numbers.length === 0) return ''
  if (numbers.length === 1) return `Step ${numbers[0]} done`
  const consecutive = numbers.every((n, i) => i === 0 || n === numbers[i - 1] + 1)
  if (numbers.length === 2) return `Steps ${numbers[0]} and ${numbers[1]} done`
  if (consecutive) return `Steps ${numbers[0]} to ${numbers[numbers.length - 1]} done`
  return `Steps ${numbers.slice(0, -1).join(', ')} and ${numbers[numbers.length - 1]} done`
}
