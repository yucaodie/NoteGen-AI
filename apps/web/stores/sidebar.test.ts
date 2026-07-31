import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSidebarStore } from './sidebar'

function getStore() {
  return useSidebarStore.getState()
}

describe('sidebarStore', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    })
    useSidebarStore.setState({
      leftSidebarVisible: true,
      centerPanelVisible: true,
      rightSidebarVisible: true,
      leftSidebarTab: 'files',
    })
  })

  describe('toggleLeftSidebar', () => {
    it('toggles left panel when multiple panels are visible', async () => {
      await getStore().toggleLeftSidebar()
      expect(getStore().leftSidebarVisible).toBe(false)
    })

    it('prevents hiding the last visible panel (left only)', async () => {
      useSidebarStore.setState({
        leftSidebarVisible: true,
        centerPanelVisible: false,
        rightSidebarVisible: false,
      })

      await getStore().toggleLeftSidebar()
      expect(getStore().leftSidebarVisible).toBe(true)
    })

    it('allows toggling even when center is hidden', async () => {
      useSidebarStore.setState({
        leftSidebarVisible: true,
        centerPanelVisible: false,
        rightSidebarVisible: true,
      })

      await getStore().toggleLeftSidebar()
      expect(getStore().leftSidebarVisible).toBe(false)
    })
  })

  describe('toggleCenterPanel', () => {
    it('toggles center panel when other panels are visible', async () => {
      await getStore().toggleCenterPanel()
      expect(getStore().centerPanelVisible).toBe(false)
    })

    it('prevents hiding the last visible panel', async () => {
      useSidebarStore.setState({
        leftSidebarVisible: false,
        centerPanelVisible: true,
        rightSidebarVisible: false,
      })

      await getStore().toggleCenterPanel()
      expect(getStore().centerPanelVisible).toBe(true)
    })

    it('prevents hiding when only left+center visible', async () => {
      useSidebarStore.setState({
        leftSidebarVisible: true,
        centerPanelVisible: true,
        rightSidebarVisible: false,
      })

      await getStore().toggleCenterPanel()
      expect(getStore().centerPanelVisible).toBe(true)
    })
  })

  describe('toggleRightSidebar', () => {
    it('toggles right panel when multiple are visible', async () => {
      await getStore().toggleRightSidebar()
      expect(getStore().rightSidebarVisible).toBe(false)
    })

    it('prevents hiding the last visible panel', async () => {
      useSidebarStore.setState({
        leftSidebarVisible: false,
        centerPanelVisible: false,
        rightSidebarVisible: true,
      })

      await getStore().toggleRightSidebar()
      expect(getStore().rightSidebarVisible).toBe(true)
    })

    it('prevents hiding when only left+right visible', async () => {
      useSidebarStore.setState({
        leftSidebarVisible: true,
        centerPanelVisible: false,
        rightSidebarVisible: true,
      })

      await getStore().toggleRightSidebar()
      expect(getStore().rightSidebarVisible).toBe(true)
    })
  })

  describe('showCenterPanel', () => {
    it('shows center panel when hidden', async () => {
      useSidebarStore.setState({ centerPanelVisible: false })

      await getStore().showCenterPanel()
      expect(getStore().centerPanelVisible).toBe(true)
    })

    it('leaves panel visible when already shown', async () => {
      useSidebarStore.setState({ centerPanelVisible: true })

      await getStore().showCenterPanel()
      expect(getStore().centerPanelVisible).toBe(true)
    })
  })

  describe('setLeftSidebarTab', () => {
    it('switches tab from files to notes', async () => {
      useSidebarStore.setState({ leftSidebarTab: 'files' })

      await getStore().setLeftSidebarTab('notes')
      expect(getStore().leftSidebarTab).toBe('notes')
    })
  })
})
