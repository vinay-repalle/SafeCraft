import { RotateCcw } from 'lucide-react'
import { useId, useState, type CSSProperties, type ReactNode } from 'react'
import { DOT_R, FONT, TAG_H, tagWidth, type Sketch as SketchSpec, type SketchItem, type Tone } from '../../content/sketch'

// Draws a sketch (see src/content/sketch.ts) as inline SVG, using the theme's colour tokens so it
// follows light and dark mode. With `animate`, timed items appear and slide in once.

const STROKE: Record<Tone, string> = {
  ink: 'stroke-ink',
  muted: 'stroke-ink-3',
  accent: 'stroke-accent',
  pass: 'stroke-pass',
  fail: 'stroke-fail',
}
const FILL: Record<Tone, string> = {
  ink: 'fill-ink',
  muted: 'fill-ink-3',
  accent: 'fill-accent',
  pass: 'fill-pass',
  fail: 'fill-fail',
}
// Text on the card colour. Muted text uses the secondary ink, which keeps enough contrast.
const TEXT: Record<Tone, string> = {
  ink: 'fill-ink',
  muted: 'fill-ink-2',
  accent: 'fill-accent',
  pass: 'fill-pass',
  fail: 'fill-fail',
}

function arrowHead(points: [number, number][]): string {
  const [x2, y2] = points[points.length - 1]
  const [x1, y1] = points[points.length - 2]
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const size = 6
  const a = (d: number) => `${x2 - size * Math.cos(angle + d)},${y2 - size * Math.sin(angle + d)}`
  return `${x2},${y2} ${a(0.45)} ${a(-0.45)}`
}

function Shape({ item }: { item: SketchItem }): ReactNode {
  const tone = item.tone ?? 'ink'
  switch (item.kind) {
    case 'box':
      return (
        <g>
          <rect x={item.x} y={item.y} width={item.w} height={item.h} rx={6} strokeWidth={1.5} strokeDasharray={item.dashed ? '4 3' : undefined} className={`fill-card ${STROKE[tone]}`} />
          <text
            x={item.x + item.w / 2}
            y={item.labelAt === 'top' ? item.y + 16 : item.y + item.h / 2}
            dy={item.labelAt === 'top' ? undefined : '0.35em'}
            textAnchor="middle"
            fontSize={FONT}
            className={item.labelAt === 'top' ? 'fill-ink font-medium' : TEXT[tone === 'muted' ? 'muted' : 'ink']}
          >
            {item.label}
          </text>
        </g>
      )
    case 'dot': {
      const at = item.labelAt ?? 'below'
      const lx = at === 'right' ? item.x + DOT_R + 4 : item.x
      const ly = at === 'above' ? item.y - DOT_R - 5 : at === 'below' ? item.y + DOT_R + 4 + FONT * 0.8 : item.y
      return (
        <g>
          <circle cx={item.x} cy={item.y} r={DOT_R} strokeWidth={1.5} className={item.hollow ? `fill-card ${STROKE[tone]}` : `${FILL[tone]} ${STROKE[tone]}`} />
          <text x={lx} y={ly} dy={at === 'right' ? '0.35em' : undefined} textAnchor={at === 'right' ? 'start' : 'middle'} fontSize={FONT} className={TEXT[tone === 'ink' ? 'muted' : tone]}>
            {item.label}
          </text>
        </g>
      )
    }
    case 'line':
      return (
        <g>
          <polyline points={item.points.map((p) => p.join(',')).join(' ')} fill="none" strokeWidth={1.5} strokeDasharray={item.dashed ? '4 3' : undefined} className={STROKE[tone]} />
          {item.arrow && <polygon points={arrowHead(item.points)} className={FILL[tone]} />}
        </g>
      )
    case 'text':
      return (
        <text x={item.x} y={item.y} textAnchor={item.anchor ?? 'start'} fontSize={FONT} className={TEXT[tone]}>
          {item.text}
        </text>
      )
    case 'tag': {
      const w = tagWidth(item.label)
      return (
        <g>
          <rect x={item.x} y={item.y - TAG_H / 2} width={w} height={TAG_H} rx={4} strokeWidth={1} className={`fill-card ${STROKE[tone]}`} />
          <text x={item.x + w / 2} y={item.y} dy="0.35em" textAnchor="middle" fontSize={FONT - 1} className={`font-mono ${TEXT[tone]}`}>
            {item.label}
          </text>
        </g>
      )
    }
  }
}

// Wraps an item in the motion it needs: a fade or pop at its start time, and a slide if it has `from`.
function Timed({ item, animate, children }: { item: SketchItem; animate: boolean; children: ReactNode }) {
  if (!animate || (!item.at && !item.from)) return <>{children}</>
  const delay = { '--delay': `${Math.round((item.at ?? 0) * 1000)}ms` } as CSSProperties
  const appear = item.kind === 'line' || item.kind === 'text' ? 'motion-fade' : 'motion-pop'
  if (!item.from) {
    return (
      <g className={appear} style={delay}>
        {children}
      </g>
    )
  }
  const slide = { ...delay, '--from-x': `${item.from[0]}px`, '--from-y': `${item.from[1]}px` } as CSSProperties
  return (
    <g className="motion-fade" style={delay}>
      <g className="motion-slide" style={slide}>
        {children}
      </g>
    </g>
  )
}

export function Sketch({ sketch, animate = false, className = '' }: { sketch: SketchSpec; animate?: boolean; className?: string }) {
  const id = useId()
  return (
    <svg viewBox={`0 0 ${sketch.width} ${sketch.height}`} role="img" aria-labelledby={`${id}-t ${id}-d`} className={`h-auto w-full ${className}`}>
      <title id={`${id}-t`}>{sketch.title}</title>
      <desc id={`${id}-d`}>{sketch.caption}</desc>
      {sketch.items.map((item, i) => (
        <Timed key={i} item={item} animate={animate}>
          <Shape item={item} />
        </Timed>
      ))}
    </svg>
  )
}

// A jargon mini-animation: plays once when it first shows, with a Replay button. Replaying
// remounts the drawing with a new key; nothing ever loops by itself.
export function AnimatedSketch({ sketch }: { sketch: SketchSpec }) {
  const [plays, setPlays] = useState(0)
  return (
    <figure className="rounded-tag border border-line bg-card p-2">
      <Sketch key={plays} sketch={sketch} animate className="max-w-[360px]" />
      <figcaption className="mt-1 flex items-start justify-between gap-2">
        <span className="text-meta text-ink-2">{sketch.caption}</span>
        <button
          type="button"
          onClick={() => setPlays((n) => n + 1)}
          className="flex h-6 shrink-0 items-center gap-1 rounded-tag px-2 text-meta text-ink-2 transition-colors hover:bg-raised hover:text-ink"
        >
          <RotateCcw size={16} strokeWidth={1.5} aria-hidden />
          Replay
        </button>
      </figcaption>
    </figure>
  )
}
