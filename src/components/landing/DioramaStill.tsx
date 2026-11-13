import { useMemo } from 'react'
import type { StationState } from '../../store/levelStore'
import type { SceneLayout } from '../pipeline/sceneLayout'
import { LABEL_FONT, LABEL_H, buildStill } from './isoStill'
import type { StoryFrame } from './story'

const SWATCH: Record<StationState, string> = {
  idle: 'color-mix(in srgb, var(--ink-3) 40%, transparent)',
  active: 'var(--accent)',
  done: 'var(--ink-2)',
  pass: 'var(--pass)',
  fail: 'var(--fail)',
}

// A still picture of the diorama at one stop of the story (see isoStill.ts). Decoration: the text
// beside it says the same in words, so it is hidden from screen readers.
//   few  name only the station that has the work (a narrow box, where every tag would crowd)
export function DioramaStill({ frames, index, layout, crop, aspect = 0, few = false, className = '' }: { frames: readonly StoryFrame[]; index: number; layout: SceneLayout; crop: boolean; aspect?: number; few?: boolean; className?: string }) {
  const still = useMemo(() => buildStill(frames, index, layout, crop, aspect), [frames, index, layout, crop, aspect])
  return (
    <svg aria-hidden viewBox={still.viewBox} preserveAspectRatio="xMidYMid meet" className={className}>
      {still.faces.map((f, i) => (
        // A hairline of the face's own colour hides the seams between neighbouring faces.
        <polygon key={i} points={f.points} style={{ fill: f.fill, stroke: f.stroke ?? f.fill }} strokeWidth={f.stroke ? 3 : 0.6} strokeLinejoin="round" />
      ))}
      {still.labels.filter((l) => !few || l.state === 'active').map((l) => (
        <g key={l.id} transform={`translate(${l.x.toFixed(1)} ${l.y.toFixed(1)}) scale(${l.scale}) translate(${-l.width / 2} ${-LABEL_H / 2})`}>
          <rect width={l.width} height={LABEL_H} rx={6} style={{ fill: 'var(--card)', stroke: l.state === 'active' ? 'var(--accent)' : 'var(--line)' }} strokeWidth={1} />
          <rect x={9} y={LABEL_H / 2 - 4} width={8} height={8} style={{ fill: SWATCH[l.state] }} />
          <text x={23} y={LABEL_H / 2} dy="0.35em" fontSize={LABEL_FONT} className="fill-ink">
            {l.text}
          </text>
        </g>
      ))}
    </svg>
  )
}
