export const webSettingsSections = [
  { id: 'about', label: '关于' },
  { id: 'general', label: '通用' },
  { id: 'chat', label: '聊天' },
  { id: 'editor', label: '编辑器' },
  { id: 'record', label: '记录' },
  { id: 'sync', label: '同步' },
  { id: 'imageHosting', label: '图床' },
  { id: 'ai', label: 'AI 模型' },
  { id: 'rag', label: 'RAG' },
  { id: 'mcp', label: 'MCP' },
  { id: 'skills', label: 'Skills' },
  { id: 'prompt', label: '提示词' },
  { id: 'memories', label: '记忆' },
  { id: 'template', label: '模板' },
  { id: 'file', label: '文件与工作区' },
  { id: 'shortcuts', label: '快捷键' },
  { id: 'imageMethod', label: '图像处理' },
  { id: 'audio', label: '音频' },
] as const

export type WebSettingsSection = (typeof webSettingsSections)[number]['id']

export function isWebSettingsSection(value: string): value is WebSettingsSection {
  return webSettingsSections.some((section) => section.id === value)
}
