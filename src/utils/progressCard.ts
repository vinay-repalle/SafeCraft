import type { CardData } from './badges'

// The Progress Card is drawn on a <canvas>: a blank rectangle of pixels that code paints on with
// commands like fillRect and fillText. Nothing is sent anywhere; the browser turns the finished
// picture into a PNG file on the learner's own machine.

export const CARD_SIZE = { width: 1200, height: 540 }

export type CardColors = { page: string; card: string; raised: string; line: string; ink: string; ink2: string; ink3: string; accent: string; pass: string }

const FALLBACK: CardColors = {
  page: '#f7f4ee', card: '#fdfbf7', raised: '#efe9df', line: '#e3ddd3', ink: '#1f1b16', ink2: '#5e554a', ink3: '#6f665a', accent: '#b8431a', pass: '#3f7d58',
}

// Reads the live theme tokens so the card matches light or dark. In a place with no styles
// (tests), the light palette is used.
export function readCardColors(): CardColors {
  if (typeof document === 'undefined') return FALLBACK
  const style = getComputedStyle(document.documentElement)
  const get = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  const ink = get('--ink', FALLBACK.ink)
  return {
    page: get('--page', FALLBACK.page),
    card: get('--card', FALLBACK.card),
    raised: get('--raised', FALLBACK.raised),
    // --line is a color-mix() of the ink; canvas cannot always read that, so mix by hand.
    line: ink + '1f',
    ink,
    ink2: get('--ink-2', FALLBACK.ink2),
    ink3: get('--ink-3', FALLBACK.ink3),
    accent: get('--accent', FALLBACK.accent),
    pass: get('--pass', FALLBACK.pass),
  }
}

const SANS = '"Figtree Variable", ui-sans-serif, system-ui, sans-serif'

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// Shortens text with "..." until it fits the width.
function fit(ctx: CanvasRenderingContext2D, text: string, width: number): string {
  if (ctx.measureText(text).width <= width) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '...').width > width) t = t.slice(0, -1)
  return t.trimEnd() + '...'
}

export function drawProgressCard(ctx: CanvasRenderingContext2D, data: CardData, c: CardColors): void {
  const { width, height } = CARD_SIZE
  const pad = 48
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = c.page
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = c.card
  roundRect(ctx, 24, 24, width - 48, height - 48, 16)
  ctx.fill()
  ctx.strokeStyle = c.line
  ctx.lineWidth = 1
  ctx.stroke()

  // Heading
  ctx.fillStyle = c.ink
  ctx.font = `500 32px ${SANS}`
  ctx.fillText('SyncCraft progress', pad + 24, 96)
  ctx.fillStyle = c.ink3
  ctx.font = `400 16px ${SANS}`
  const done = data.levels.filter((l) => l.frontend || l.backend).length
  ctx.fillText(`${done} of ${data.levels.length} levels finished  ·  ${data.stamp}`, pad + 24, 124)

  // Levels: one card per level with the two seats.
  const gap = 16
  const innerW = width - (pad + 24) * 2
  const cardW = (innerW - gap * (data.levels.length - 1)) / data.levels.length
  const top = 156
  const cardH = 150
  data.levels.forEach((l, i) => {
    const x = pad + 24 + i * (cardW + gap)
    const finished = l.frontend || l.backend
    ctx.fillStyle = c.raised
    roundRect(ctx, x, top, cardW, cardH, 12)
    ctx.fill()
    ctx.strokeStyle = finished ? c.pass : c.line
    ctx.lineWidth = finished ? 2 : 1
    ctx.stroke()

    ctx.fillStyle = finished ? c.pass : c.ink3
    ctx.font = `500 14px ${SANS}`
    ctx.fillText(`Level ${l.id}`, x + 16, top + 30)
    ctx.fillStyle = c.ink
    ctx.font = `500 17px ${SANS}`
    // Titles wrap onto two lines at most.
    const words = l.title.split(' ')
    let line = ''
    let row = 0
    for (const w of words) {
      const next = line ? `${line} ${w}` : w
      if (ctx.measureText(next).width > cardW - 32 && line) {
        ctx.fillText(line, x + 16, top + 58 + row * 22)
        row++
        line = w
      } else line = next
    }
    ctx.fillText(fit(ctx, line, cardW - 32), x + 16, top + 58 + row * 22)

    ctx.font = `400 14px ${SANS}`
    ;([['Frontend', l.frontend], ['Backend', l.backend]] as const).forEach(([name, ok], j) => {
      ctx.fillStyle = ok ? c.pass : c.ink3
      ctx.fillText(`${ok ? '✓' : '–'} ${name}`, x + 16, top + 112 + j * 22 - 8)
    })
  })

  // Badges
  const earned = data.badges.filter((b) => b.earned)
  ctx.fillStyle = c.ink
  ctx.font = `500 18px ${SANS}`
  ctx.fillText('Badges', pad + 24, 358)
  ctx.font = `400 15px ${SANS}`
  if (earned.length === 0) {
    ctx.fillStyle = c.ink3
    ctx.fillText('None yet. Finish a level to earn the first.', pad + 24, 388)
  } else {
    let x = pad + 24
    let y = 380
    for (const b of earned) {
      const w = ctx.measureText(b.label).width + 32
      if (x + w > width - pad - 24) {
        x = pad + 24
        y += 44
      }
      ctx.fillStyle = c.raised
      roundRect(ctx, x, y, w, 32, 10)
      ctx.fill()
      ctx.strokeStyle = c.accent
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.fillStyle = c.ink
      ctx.fillText(b.label, x + 16, y + 21)
      x += w + 12
    }
  }

  // Totals
  ctx.fillStyle = c.ink2
  ctx.font = `400 16px ${SANS}`
  ctx.fillText(`${data.termsMet} of ${data.termsTotal} terms met  ·  ${data.guidesRead} of ${data.guidesTotal} guides read`, pad + 24, height - 52)
  ctx.textAlign = 'right'
  ctx.fillStyle = c.accent
  ctx.fillText('SyncCraft', width - pad - 24, height - 52)
  ctx.textAlign = 'left'
}

// Browser-only: draws the card on a new canvas and returns a PNG file.
export async function renderProgressCardPng(data: CardData): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_SIZE.width
  canvas.height = CARD_SIZE.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser cannot draw the card.')
  drawProgressCard(ctx, data, readCardColors())
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The card could not be saved.'))), 'image/png'),
  )
}
