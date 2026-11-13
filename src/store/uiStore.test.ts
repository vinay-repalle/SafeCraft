// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { safeLocalStorage, TOUR_LENGTH, UI_STORAGE_KEY, useUiStore } from './uiStore'

// Node has no localStorage. Some tests put a small stand-in on globalThis, and remove it after.
const g = globalThis as { localStorage?: unknown }

function fakeStorage() {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  }
}

describe('uiStore', () => {
  beforeEach(() => useUiStore.setState({ view: 'my', guideSlug: null, gitGraphOpen: true, tourDone: false, tourStep: null, playZone: 'code' }))
  afterEach(() => {
    delete g.localStorage
  })

  it('opens a guide article and switches to the Field guide view', () => {
    useUiStore.getState().openGuide('what-is-a-branch')
    expect(useUiStore.getState()).toMatchObject({ view: 'guide', guideSlug: 'what-is-a-branch' })
  })

  it('keeps the view when the article is closed', () => {
    useUiStore.getState().openGuide('what-is-a-branch')
    useUiStore.getState().closeGuide()
    expect(useUiStore.getState()).toMatchObject({ view: 'guide', guideSlug: null })
  })

  it('toggles the Git graph panel and saves only that choice', () => {
    const storage = fakeStorage()
    g.localStorage = storage
    useUiStore.getState().toggleGitGraph()
    expect(useUiStore.getState().gitGraphOpen).toBe(false)
    const saved = JSON.parse(storage.data.get(UI_STORAGE_KEY)!)
    expect(saved.state).toEqual({ gitGraphOpen: false, tourDone: false })
  })

  it('reads the saved choice back on rehydrate, and ignores nonsense', async () => {
    const storage = fakeStorage()
    g.localStorage = storage
    storage.setItem(UI_STORAGE_KEY, JSON.stringify({ state: { gitGraphOpen: false }, version: 1 }))
    await useUiStore.persist.rehydrate()
    expect(useUiStore.getState().gitGraphOpen).toBe(false)

    useUiStore.setState({ gitGraphOpen: true })
    storage.setItem(UI_STORAGE_KEY, JSON.stringify({ state: { gitGraphOpen: 'yes' }, version: 1 }))
    await useUiStore.persist.rehydrate()
    expect(useUiStore.getState().gitGraphOpen).toBe(true)
  })

  it('steps through the tour, then marks it done and saves that', () => {
    const storage = fakeStorage()
    g.localStorage = storage
    useUiStore.setState({ view: 'guide' })
    useUiStore.getState().startTour()
    expect(useUiStore.getState()).toMatchObject({ view: 'my', tourStep: 0 })
    for (let i = 1; i < TOUR_LENGTH; i++) {
      useUiStore.getState().nextTourStep()
      expect(useUiStore.getState().tourStep).toBe(i)
    }
    useUiStore.getState().nextTourStep()
    expect(useUiStore.getState()).toMatchObject({ tourStep: null, tourDone: true })
    expect(JSON.parse(storage.data.get(UI_STORAGE_KEY)!).state.tourDone).toBe(true)
  })

  it('skipping the tour also marks it done, and the zone choice is not saved', () => {
    const storage = fakeStorage()
    g.localStorage = storage
    useUiStore.getState().startTour()
    useUiStore.getState().endTour()
    useUiStore.getState().setPlayZone('task')
    expect(useUiStore.getState()).toMatchObject({ tourStep: null, tourDone: true, playZone: 'task' })
    expect(JSON.parse(storage.data.get(UI_STORAGE_KEY)!).state).toEqual({ gitGraphOpen: true, tourDone: true })
  })

  it('reads a saved tourDone back, and ignores nonsense', async () => {
    const storage = fakeStorage()
    g.localStorage = storage
    storage.setItem(UI_STORAGE_KEY, JSON.stringify({ state: { gitGraphOpen: false, tourDone: true }, version: 1 }))
    await useUiStore.persist.rehydrate()
    expect(useUiStore.getState()).toMatchObject({ gitGraphOpen: false, tourDone: true })

    useUiStore.setState({ tourDone: false })
    storage.setItem(UI_STORAGE_KEY, JSON.stringify({ state: { tourDone: 1 }, version: 1 }))
    await useUiStore.persist.rehydrate()
    expect(useUiStore.getState().tourDone).toBe(false)
  })

  it('keeps working when storage throws', () => {
    g.localStorage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('full')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    }
    expect(safeLocalStorage.getItem('x')).toBeNull()
    expect(() => safeLocalStorage.setItem('x', '1')).not.toThrow()
    expect(() => useUiStore.getState().toggleGitGraph()).not.toThrow()
    expect(useUiStore.getState().gitGraphOpen).toBe(false)
  })
})
