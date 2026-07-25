import { describe, expect, it } from 'vitest'
import { isWebSettingsSection, webSettingsSections } from './settings-sections'

describe('web settings sections', () => {
  it('exposes the browser settings sections', () => {
    expect(webSettingsSections.map((section) => section.id)).toEqual([
      'general',
      'ai',
      'sync',
      'file',
    ])
  })

  it('recognizes only implemented browser settings sections', () => {
    expect(isWebSettingsSection('ai')).toBe(true)
    expect(isWebSettingsSection('mcp')).toBe(false)
  })
})
