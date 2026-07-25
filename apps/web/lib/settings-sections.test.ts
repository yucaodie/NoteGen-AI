import { describe, expect, it } from 'vitest'
import { isWebSettingsSection, webSettingsSections } from './settings-sections'

describe('web settings sections', () => {
  it('exposes the browser settings sections', () => {
    expect(webSettingsSections.map((section) => section.id)).toContain('general')
    expect(webSettingsSections.map((section) => section.id)).toContain('audio')
    expect(webSettingsSections).toHaveLength(18)
  })

  it('recognizes valid settings sections', () => {
    expect(isWebSettingsSection('ai')).toBe(true)
    expect(isWebSettingsSection('mcp')).toBe(true)
    expect(isWebSettingsSection('invalid')).toBe(false)
  })
})
