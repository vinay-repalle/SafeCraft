// Phase 7f: the ticket journey in 3D. Five desks in a row, one per role, and the order ticket
// hopping from desk to desk as the work changes hands. Loaded lazily (see TicketJourney.tsx),
// in its own small chunk; three.js itself is shared with the pipeline scene, so it is only
// downloaded once.
//
// Same rules as the pipeline diorama: orthographic camera, render on demand, pixel ratio
// capped at 1.5, no real-time shadows, low-poly parts built in code, flat colours only.
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useRef, type MutableRefObject } from 'react'
import { Vector3, type Camera, type Group, type OrthographicCamera } from 'three'
import type { RoleState, RoleStatus } from '../../store/teamFeed'
import { hopsToPlay } from '../../store/ticketJourney'
import type { Role } from '../../store/types'
import { usePrefersReducedMotion } from '../../utils/reducedMotion'
import { travel } from '../pipeline/pipelineMotion'
import { mix, useSceneColors, type SceneColors } from '../pipeline/sceneColors'
import { PACKAGE_SECONDS } from '../pipeline/sceneLayout'
import { Blob, Cylinder, Desk, PAD_HEIGHT, Part, Person, Shadow, useShadowTexture } from '../pipeline/stations'
import { DESK_ORDER, deskX, rowFit } from './ticketLayout'

// Labels laid over the canvas: one per desk and one that follows the ticket.
export type TicketLabelKey = Role | 'ticket'
export type TicketLabelRefs = MutableRefObject<Partial<Record<TicketLabelKey, HTMLElement | null>>>

const PAD_W = 2.8
const PAD_D = 1.8
const DESK_TOP = PAD_HEIGHT + 0.76
// Each person sits beside their screen, not behind it, so the camera sees them.
const SEAT: [number, number] = [0.5, -0.72]
// Desk labels float over the back edge of the pad, clear of the tallest prop (the project
// manager's board).
const LABEL_POINT: [number, number] = [2.45, -PAD_D / 2]
const LABEL_ROOM = 0.3 // half a label's height, in scene units, kept inside the band
const TICKET_LABEL_LIFT = 0.5
const HOP_ARC = 1.1
const REST_SECONDS = 0.2 // a short stop at each desk when the ticket passes several at once
const PADDING_PX = 8
// From the front and a little above (about 37 degrees), so the row runs straight across.
const VIEW_DIRECTION = new Vector3(0, 0.75, 1).normalize()
// The camera's "up" on screen for that direction (at right angles to it, in the same upright plane).
const SCREEN_UP = new Vector3(0, VIEW_DIRECTION.z, -VIEW_DIRECTION.y)
const screenY = (y: number, z: number) => SCREEN_UP.y * y + SCREEN_UP.z * z
// The scene's extent on screen, in scene units: from the front bottom edge of the pads to the
// top of the desk labels. It does not depend on the band's size.
const SCENE_BOTTOM = screenY(0, PAD_D / 2)
const SCENE_TOP = screenY(LABEL_POINT[0], LABEL_POINT[1]) + LABEL_ROOM

// Where the ticket lies on a role's desk, for desks this far apart.
const ticketSpot = (role: Role, spacing: number) => new Vector3(deskX(role, spacing) + 0.15, DESK_TOP + 0.02, 0.18)

// Moves an HTML label to sit over a 3D point. `anchor` is the CSS that sets which part of the
// label touches the point.
function placeLabel(el: HTMLElement | null | undefined, point: Vector3, camera: Camera, size: { width: number; height: number }, anchor: string) {
  if (!el) return
  point.project(camera)
  const x = (point.x * 0.5 + 0.5) * size.width
  const y = (-point.y * 0.5 + 0.5) * size.height
  el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) ${anchor}`
  el.style.opacity = '1'
}

// Points the camera at the row and centres the scene vertically, at the given zoom.
function aimCamera(camera: OrthographicCamera, zoom: number) {
  camera.position.copy(VIEW_DIRECTION).multiplyScalar(40)
  camera.lookAt(0, 0, 0)
  camera.position.addScaledVector(SCREEN_UP, (SCENE_BOTTOM + SCENE_TOP) / 2)
  camera.zoom = zoom
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld(true)
}

// The order ticket: a paper slip with a coloured band, like the ticket tag on the board.
function TicketModel({ c }: { c: SceneColors }) {
  return (
    <group rotation={[0, 0.35, 0]}>
      <Part size={[0.44, 0.03, 0.58]} pos={[0, 0.015, 0]} color={c.card} />
      <Part size={[0.44, 0.032, 0.12]} pos={[0, 0.016, -0.23]} color={c.accent} />
      <Part size={[0.3, 0.034, 0.03]} pos={[-0.04, 0.017, -0.06]} color={c.ink3} />
      <Part size={[0.22, 0.034, 0.03]} pos={[-0.08, 0.017, 0.06]} color={c.ink3} />
      {/* The torn edge, as on the tag. */}
      <Part size={[0.44, 0.034, 0.015]} pos={[0, 0.017, 0.17]} color={c.ink2} />
    </group>
  )
}

// The ticket follows the journey one stop at a time. New stops are queued, so when the engine
// passes the ticket through QA and the reviewer in one moment, it still visits each desk.
// Timing comes from the clock, not from frame deltas (see Parcel in the pipeline scene).
function Ticket({ stops, spacing, colors, labels }: { stops: Role[]; spacing: number; colors: SceneColors; labels: TicketLabelRefs }) {
  const group = useRef<Group>(null)
  const anim = useRef({ shown: [] as Role[], spacing: 0, queue: [] as Role[], from: new Vector3(), to: new Vector3(), t: 1, start: 0, restUntil: 0 })
  const invalidate = useThree((s) => s.invalidate)
  const reduceMotion = usePrefersReducedMotion()
  const key = stops.join('>')

  useLayoutEffect(() => {
    const a = anim.current
    const g = group.current
    if (!g) return
    const { snap, hops } = hopsToPlay(a.shown, stops)
    // A resize moves the desks, so the ticket jumps to its new place rather than gliding there.
    if (snap || reduceMotion || a.spacing !== spacing) {
      g.position.copy(ticketSpot(stops[stops.length - 1], spacing))
      a.queue = []
      a.t = 1
      a.restUntil = 0
    } else {
      a.queue.push(...hops)
    }
    a.shown = stops
    a.spacing = spacing
    invalidate()
  }, [key, spacing, reduceMotion, invalidate]) // eslint-disable-line react-hooks/exhaustive-deps

  const point = useRef(new Vector3())
  useFrame((state) => {
    const a = anim.current
    const g = group.current
    if (!g) return
    const now = performance.now()
    // Between hops, wait out the short rest at the desk, then set off for the next stop.
    if (a.t >= 1 && a.queue.length > 0 && now >= a.restUntil) {
      a.from.copy(g.position)
      a.to.copy(ticketSpot(a.queue.shift()!, a.spacing))
      a.t = 0
      a.start = now
    }
    if (a.t < 1) {
      a.t = Math.min(1, (now - a.start) / 1000 / PACKAGE_SECONDS)
      const { k, lift } = travel('hop', a.t)
      g.position.lerpVectors(a.from, a.to, k)
      g.position.y += lift * HOP_ARC
      if (a.t >= 1) a.restUntil = now + REST_SECONDS * 1000
    }
    if (a.t < 1 || a.queue.length > 0) state.invalidate()
    point.current.set(g.position.x, g.position.y + TICKET_LABEL_LIFT, g.position.z)
    placeLabel(labels.current.ticket, point.current, state.camera, state.size, 'translate(-50%, -100%)')
  })

  return (
    <group ref={group}>
      <TicketModel c={colors} />
    </group>
  )
}

// The pad under a desk says what the role is doing, in flat colour (the label says it in words).
function deskPad(state: RoleState, c: SceneColors): string {
  switch (state) {
    case 'done':
      return mix(c.card, c.pass, 0.4)
    case 'uninvolved':
      return mix(c.raised, c.ink3, 0.12)
    default:
      return c.card
  }
}

// A screen seen from behind (the person faces it from the other side of the desk).
function Monitor({ x, c, width = 0.7, turn = 0 }: { x: number; c: SceneColors; width?: number; turn?: number }) {
  return (
    <group position={[x, DESK_TOP, -0.2]} rotation={[0, turn, 0]}>
      <Part size={[0.14, 0.16, 0.08]} pos={[0, 0.08, 0]} color={c.ink3} />
      <Part size={[width, 0.44, 0.05]} pos={[0, 0.38, 0]} color={mix(c.ink2, c.ink3, 0.3)} />
    </group>
  )
}

// One small prop per role, so the desks are told apart at a glance.
function RoleProp({ role, c }: { role: Role; c: SceneColors }) {
  switch (role) {
    case 'frontend':
      return <Monitor x={-0.25} c={c} />
    case 'backend':
      // A server tower beside the desk, its drive bays facing the camera.
      return (
        <>
          <Monitor x={-0.25} c={c} />
          <group position={[-1.05, PAD_HEIGHT, 0.1]}>
            <Part size={[0.4, 0.95, 0.5]} pos={[0, 0.475, 0]} color={c.ink2} />
            {[0.3, 0.5, 0.7].map((y) => (
              <Part key={y} size={[0.28, 0.05, 0.02]} pos={[0, y, 0.26]} color={c.ink} />
            ))}
          </group>
        </>
      )
    case 'qa':
      // A clipboard with a checklist on the desk.
      return (
        <>
          <Monitor x={-0.3} c={c} />
          <group position={[-0.4, DESK_TOP, 0.18]} rotation={[0, 0.3, 0]}>
            <Part size={[0.34, 0.02, 0.3]} pos={[0, 0.01, 0]} color={c.raised} />
            {[-0.08, 0, 0.08].map((z) => (
              <Part key={z} size={[0.22, 0.025, 0.03]} pos={[0.03, 0.012, z]} color={c.ink3} />
            ))}
          </group>
        </>
      )
    case 'pm':
      // A board of sticky notes behind the desk, low enough to stay clear of the label.
      return (
        <group position={[-0.2, PAD_HEIGHT, -1.0]}>
          <Part size={[1.5, 0.8, 0.06]} pos={[0, 1.2, 0]} color={c.raised} />
          {([-0.6, 0.6] as const).map((x) => (
            <Part key={x} size={[0.06, 0.8, 0.06]} pos={[x, 0.4, 0]} color={c.ink3} />
          ))}
          {([-0.42, 0, 0.42] as const).map((x, i) => (
            <group key={x}>
              <Part size={[0.3, 0.2, 0.02]} pos={[x, 1.36, 0.04]} color={i === 1 ? c.ink2 : c.ink3} />
              <Part size={[0.3, 0.2, 0.02]} pos={[x, 1.08, 0.04]} color={c.card} />
            </group>
          ))}
        </group>
      )
    case 'reviewer':
      // Two screens side by side: the change and what it replaces.
      return (
        <>
          <Monitor x={-0.5} width={0.48} turn={0.15} c={c} />
          <Monitor x={0.0} width={0.48} turn={-0.15} c={c} />
        </>
      )
  }
}

function RoleDesk({ role, x, status, colors, shadow }: { role: Role; x: number; status: RoleStatus; colors: SceneColors; shadow: ReturnType<typeof useShadowTexture> }) {
  const busy = status.state === 'active' || status.state === 'automatic'
  const edgeX = PAD_W / 2 - 0.04
  const edgeZ = PAD_D / 2 - 0.04
  return (
    <group position={[x, 0, 0]}>
      <Part size={[PAD_W, PAD_HEIGHT, PAD_D]} pos={[0, PAD_HEIGHT / 2, 0]} color={deskPad(status.state, colors)} />
      {/* A thin accent frame on the pad of whoever is working now, as on the pipeline. */}
      {busy &&
        ([
          [0, -edgeZ, PAD_W - 0.04, 0.08],
          [0, edgeZ, PAD_W - 0.04, 0.08],
          [-edgeX, 0, 0.08, PAD_D - 0.04],
          [edgeX, 0, 0.08, PAD_D - 0.04],
        ] as const).map(([px, pz, w, d]) => <Part key={`${px},${pz}`} size={[w, 0.03, d]} pos={[px, PAD_HEIGHT + 0.015, pz]} color={colors.accent} />)}
      <Shadow texture={shadow} size={[2.0, 1.4]} pos={[0, -0.1]} />
      <group position={[0, PAD_HEIGHT, 0]}>
        <Desk c={colors} />
      </group>
      <RoleProp role={role} c={colors} />
      {/* An empty stool for a role with no part in this level. */}
      {status.state === 'uninvolved' ? (
        <Cylinder radius={0.2} height={0.4} sides={6} pos={[SEAT[0], PAD_HEIGHT + 0.2, SEAT[1]]} color={colors.ink3} />
      ) : (
        <Person pos={[SEAT[0], PAD_HEIGHT, SEAT[1]]} shirt={busy ? colors.accent : colors.ink2} skin={colors.ink3} />
      )}
      <Blob radius={0.07} pos={[0.62, DESK_TOP + 0.07, -0.1]} color={colors.ink3} />
    </group>
  )
}

function Row({ stops, statuses, labels }: { stops: Role[]; statuses: Record<Role, RoleStatus>; labels: TicketLabelRefs }) {
  const colors = useSceneColors()
  const shadow = useShadowTexture()
  const size = useThree((s) => s.size)
  const camera = useThree((s) => s.camera) as OrthographicCamera
  const invalidate = useThree((s) => s.invalidate)

  const { zoom, spacing } = rowFit(size.width, size.height, SCENE_TOP - SCENE_BOTTOM, PADDING_PX)

  useLayoutEffect(() => {
    if (size.width < 10 || size.height < 10) return
    aimCamera(camera, zoom)
    invalidate()
  }, [camera, zoom, size.width, size.height, invalidate])

  // Desk labels sit over the back of each desk. Moved on every drawn frame, like the pipeline labels.
  const point = useRef(new Vector3())
  useFrame((state) => {
    for (const role of DESK_ORDER) {
      point.current.set(deskX(role, spacing), LABEL_POINT[0], LABEL_POINT[1])
      placeLabel(labels.current[role], point.current, state.camera, state.size, 'translate(-50%, -50%)')
    }
  })

  const rowWidth = spacing * (DESK_ORDER.length - 1)

  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight position={[4, 10, 6]} intensity={1.8} />
      <mesh position={[0, -0.2, 0]}>
        <boxGeometry args={[rowWidth + PAD_W + 0.8, 0.4, PAD_D + 0.6]} />
        <meshLambertMaterial color={mix(colors.raised, colors.ink3, 0.15)} flatShading />
      </mesh>
      {/* The walkway between the desks. */}
      <mesh position={[0, 0.03, 0.35]}>
        <boxGeometry args={[rowWidth, 0.06, 0.3]} />
        <meshLambertMaterial color={mix(colors.raised, colors.ink3, 0.3)} flatShading />
      </mesh>
      {DESK_ORDER.map((role) => (
        <RoleDesk key={role} role={role} x={deskX(role, spacing)} status={statuses[role]} colors={colors} shadow={shadow} />
      ))}
      <Ticket stops={stops} spacing={spacing} colors={colors} labels={labels} />
    </>
  )
}

export default function TicketScene({ stops, statuses, labels, onFail }: { stops: Role[]; statuses: Record<Role, RoleStatus>; labels: TicketLabelRefs; onFail: () => void }) {
  return (
    <Canvas
      orthographic
      // Draw only when something changes; the pixel ratio is capped at 1.5; `flat` keeps the
      // colours the same as the CSS. Same settings as the pipeline scene.
      frameloop="demand"
      dpr={[1, 1.5]}
      flat
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      camera={{ position: [0, 30, 40], zoom: 30, near: 0.1, far: 200 }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (event) => {
          event.preventDefault()
          onFail()
        })
      }}
    >
      <Row stops={stops} statuses={statuses} labels={labels} />
    </Canvas>
  )
}
