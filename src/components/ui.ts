// Shared class strings, so every button and panel in the app looks the same.
// Radii: panels 16, and anything inside a panel uses rounded-tag (6), because the
// nesting rule is inner = outer minus padding and never below 4.

// Secondary button on the page background.
export const BUTTON =
  'flex h-8 items-center gap-2 whitespace-nowrap rounded-control border border-line bg-card px-3 text-body text-ink transition-colors hover:bg-raised disabled:cursor-not-allowed disabled:text-ink-3 disabled:hover:bg-card'

// Secondary button inside a panel (raised surface, so it shows against the card).
export const PANEL_BUTTON =
  'flex h-8 items-center gap-2 whitespace-nowrap rounded-control border border-line bg-raised px-3 text-body text-ink transition-colors hover:border-ink-3 disabled:cursor-not-allowed disabled:text-ink-3 disabled:hover:border-line'

// The one primary action in view. Uses the accent.
export const BUTTON_PRIMARY =
  'flex h-8 items-center gap-2 whitespace-nowrap rounded-control bg-accent px-3 text-body font-medium text-on-accent transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50'

export const PANEL = 'flex min-h-0 flex-col rounded-panel border border-line bg-card'

export const INPUT =
  'h-8 min-w-0 flex-1 rounded-tag border border-line bg-card px-2 font-mono text-caption text-ink placeholder:text-ink-3'
