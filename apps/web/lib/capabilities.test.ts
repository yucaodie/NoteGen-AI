import { describe, expect, it } from 'vitest'
import { detectCapabilities, supports } from './capabilities'

describe('capability detection', () => {
  it('returns all capability flags as booleans', () => {
    const caps = detectCapabilities()

    expect(typeof caps.fileSystemAccess).toBe('boolean')
    expect(typeof caps.mediaRecorder).toBe('boolean')
    expect(typeof caps.clipboardRead).toBe('boolean')
    expect(typeof caps.clipboardWrite).toBe('boolean')
    expect(typeof caps.speechRecognition).toBe('boolean')
    expect(typeof caps.speechSynthesis).toBe('boolean')
    expect(typeof caps.notification).toBe('boolean')
    expect(typeof caps.serviceWorker).toBe('boolean')
    expect(typeof caps.share).toBe('boolean')
    expect(typeof caps.indexedDB).toBe('boolean')
  })

  it('caches result across calls', () => {
    const a = detectCapabilities()
    const b = detectCapabilities()

    expect(a).toBe(b)
  })

  it('supports returns boolean for valid key', () => {
    expect(typeof supports('indexedDB')).toBe('boolean')
  })
})
