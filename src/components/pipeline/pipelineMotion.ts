// Phase 7g: the moving parts of the pipeline (the test conveyor, the failure shake, the
// parcel stalling at a conflict), worked out as plain numbers. No three.js and no React in
// here, so the 3D scene and the 2D list share one set of rules, and all of it is unit-tested.
//
// Why a "test run" needs a clock at all: the engine runs the automated tests instantly, in the
// same moment the pull request is raised. Real tests take a while, and the waiting is part of
// the lesson, so the screen plays the run over TEST_RUN_SECONDS and only then shows the result.
// The engine's answer never changes; only when the screen reveals it.
import { STATIONS, type Station } from '../../engine/types'
import type { StationState } from '../../store/levelStore'
import { ease, type XZ } from './sceneLayout'

export const TEST_RUN_SECONDS = 1.6
export const SHAKE_SECONDS = 0.4

// What the store records when the tests run. `startedAt` is a Date.now() time in milliseconds.
export type TestRun = { seq: number; passed: boolean; startedAt: number }

// Where a test run is, seen from the screen:
//   none      no tests have run in this level yet
//   running   the conveyor moves and the result is not shown yet
//   shaking   the run failed and the test server is doing its one shake
//   settled   the result is shown and nothing moves
export type TestRunPhase = 'none' | 'running' | 'shaking' | 'settled'

export function testRunPhase(run: TestRun | null, now: number, reducedMotion: boolean): TestRunPhase {
  if (!run) return 'none'
  // Reduced motion shows the end state straight away: no waiting, no conveyor, no shake.
  if (reducedMotion) return 'settled'
  const seconds = (now - run.startedAt) / 1000
  if (seconds < TEST_RUN_SECONDS) return 'running'
  if (!run.passed && seconds < TEST_RUN_SECONDS + SHAKE_SECONDS) return 'shaking'
  return 'settled'
}

// Milliseconds until the phase next changes, or null when it never will. The screen uses this
// to schedule one re-render at the right moment, instead of checking on a timer.
export function msUntilNextPhase(run: TestRun | null, now: number, reducedMotion: boolean): number | null {
  const phase = testRunPhase(run, now, reducedMotion)
  if (!run || phase === 'none' || phase === 'settled') return null
  const end = phase === 'running' ? TEST_RUN_SECONDS : TEST_RUN_SECONDS + SHAKE_SECONDS
  return Math.max(0, run.startedAt + end * 1000 - now)
}

// The station states to draw while the tests run. The store already holds the result (and, on
// a pass, the reviewer's approval, which the engine does in the same moment). Until the run
// ends the test server shows "running" and GitHub has not been approved yet, so nothing on
// screen gets ahead of the conveyor.
export function displayStations(stations: Record<Station, StationState>, running: boolean): Record<Station, StationState> {
  if (!running) return stations
  return { ...stations, tests: 'active', github: stations.github === 'pass' ? 'done' : stations.github }
}

// Sideways offset of a shaking station, for progress 0..1 through the shake. Three quick
// swings that get smaller, starting and ending at rest. Multiply by the size you want.
export function shakeOffset(t: number): number {
  if (t <= 0 || t >= 1) return 0
  return Math.sin(t * Math.PI * 3) * (1 - t)
}

// How far the conveyor belt has moved after `seconds` of running, wrapped to one slat gap so
// the slats can be laid out again from the start. The belt only moves while tests run.
export function conveyorOffset(seconds: number, speed: number, gap: number): number {
  const d = (seconds * speed) % gap
  return d < 0 ? d + gap : d
}

// Where the parcel is between two points, for progress t (0..1) along the trip.
//   hop   carried by hand: the app easing, with a small arc up and down
//   ride  on the conveyor: a steady speed, flat on the belt
export type TravelKind = 'hop' | 'ride'
export function travel(kind: TravelKind, t: number): { k: number; lift: number } {
  const c = Math.min(1, Math.max(0, t))
  if (kind === 'ride') return { k: c, lift: 0 }
  const k = ease(c)
  return { k, lift: Math.sin(Math.PI * k) }
}

// The station after this one on the route, or null at the end.
export function nextStation(station: Station): Station | null {
  const i = STATIONS.indexOf(station)
  return i >= 0 && i < STATIONS.length - 1 ? STATIONS[i + 1] : null
}

// Where a stalled parcel waits: in the gap between its station and the next, on the same
// side line the parcel always travels along (`offset` from the station centres). So it reads
// as "left the desk, could not get through".
export function stallPoint(from: XZ, to: XZ, offset: XZ): XZ {
  const along: XZ = [to[0] - from[0], to[1] - from[1]]
  const horizontal = Math.abs(along[0]) >= Math.abs(along[1])
  const mid: XZ = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2]
  // Keep the side offset across the route, not along it, so the parcel stays in the gap.
  return horizontal ? [mid[0], mid[1] + offset[1]] : [mid[0] + offset[0], mid[1]]
}

// In words, for the caption, the labels and screen readers.
export function stallText(conflictOpen: boolean): string {
  return conflictOpen ? 'Stopped: merge conflict' : 'Merge finished. Waiting to be pushed'
}
