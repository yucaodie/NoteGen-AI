interface BrowserCapabilities {
  fileSystemAccess: boolean
  mediaRecorder: boolean
  clipboardRead: boolean
  clipboardWrite: boolean
  speechRecognition: boolean
  speechSynthesis: boolean
  notification: boolean
  serviceWorker: boolean
  share: boolean
  indexedDB: boolean
}

let cached: BrowserCapabilities | null = null

export function detectCapabilities(): BrowserCapabilities {
  if (cached) return cached

  const win = typeof window !== 'undefined' ? window : undefined
  const nav = typeof navigator !== 'undefined' ? navigator : undefined

  cached = {
    fileSystemAccess: Boolean((win as any)?.showDirectoryPicker),
    mediaRecorder: Boolean(win?.MediaRecorder),
    clipboardRead: Boolean(nav?.clipboard?.read),
    clipboardWrite: Boolean(nav?.clipboard?.write),
    speechRecognition: Boolean(win?.SpeechRecognition || (win as any)?.webkitSpeechRecognition),
    speechSynthesis: Boolean(win?.speechSynthesis),
    notification: Boolean(win?.Notification),
    serviceWorker: Boolean(nav?.serviceWorker),
    share: Boolean(nav?.share),
    indexedDB: Boolean(win?.indexedDB),
  }

  return cached
}

export function supports(mode: keyof BrowserCapabilities): boolean {
  return detectCapabilities()[mode]
}
