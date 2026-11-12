// Names and one-line descriptions of the six stations, shared by the 2D list, the 3D
// labels and the screen-reader text, so all three always say the same thing.
import type { Station } from '../../engine/types'
import type { StationState } from '../../store/levelStore'

export const STATION_INFO: Record<Station, { name: string; detail: string }> = {
  client: { name: 'Client', detail: 'Asks for the change' },
  pm: { name: 'Project manager desk', detail: 'Writes the ticket' },
  dev: { name: 'Developer desk', detail: 'Writes the code' },
  github: { name: 'GitHub', detail: 'Holds the pull request' },
  tests: { name: 'Test server', detail: 'Runs the automated tests' },
  live: { name: 'Live app', detail: 'What customers use' },
}

export const STATE_TEXT: Record<StationState, string> = {
  idle: 'Waiting',
  active: 'Work is here',
  done: 'Handed on',
  pass: 'Passed',
  fail: 'Failed',
}
