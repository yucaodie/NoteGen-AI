export const webSettingsSections = [
  { id: 'general', label: '通用' },
  { id: 'ai', label: 'AI 模型' },
  { id: 'sync', label: '同步' },
  { id: 'file', label: '文件与工作区' },
] as const

export type WebSettingsSection = (typeof webSettingsSections)[number]['id']

export function isWebSettingsSection(value: string): value is WebSettingsSection {
  return webSettingsSections.some((section) => section.id === value)
}
