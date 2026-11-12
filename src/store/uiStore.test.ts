// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import { useUiStore } from './uiStore'

// The progress store saves to localStorage, which does not exist in the node test environment,
// so these tests cover the unsaved screen state and the pure parts of guide reading.
describe('uiStore', () => {
  beforeEach(() => useUiStore.setState({ view: 'my', guideSlug: null }))

  it('opens a guide article and switches to the Field guide view', () => {
    useUiStore.getState().openGuide('what-is-a-branch')
    expect(useUiStore.getState()).toMatchObject({ view: 'guide', guideSlug: 'what-is-a-branch' })
  })

  it('keeps the view when the article is closed', () => {
    useUiStore.getState().openGuide('what-is-a-branch')
    useUiStore.getState().closeGuide()
    expect(useUiStore.getState()).toMatchObject({ view: 'guide', guideSlug: null })
  })
})
