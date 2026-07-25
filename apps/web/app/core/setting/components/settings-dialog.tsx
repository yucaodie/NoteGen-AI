'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Bot, FolderOpen, LoaderCircle, Settings, Sparkles } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useSettingsDialogStore } from '@/stores/settings-dialog'
import useSettingStore from '@/stores/setting'
import { Store } from '@tauri-apps/plugin-store'
import { isWebSettingsSection, webSettingsSections, type WebSettingsSection } from '@/lib/settings-sections'

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function GeneralSettings() {
  const { theme, setTheme } = useTheme()
  const { language, setLanguage, appFontFamily, setAppFontFamily } = useSettingStore()

  return (
    <div className="space-y-6">
      <SectionTitle title="通用" description="控制浏览器中的外观、语言与字体。" />
      <label className="grid gap-2 text-sm font-medium">
        主题
        <select
          className="h-9 rounded-md border bg-background px-3 text-sm"
          value={theme ?? 'system'}
          onChange={(event) => setTheme(event.target.value)}
        >
          <option value="system">跟随系统</option>
          <option value="light">浅色</option>
          <option value="dark">深色</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium">
        界面语言
        <select
          className="h-9 rounded-md border bg-background px-3 text-sm"
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
        >
          <option value="简体中文">简体中文</option>
          <option value="English">English</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium">
        应用字体
        <select
          className="h-9 rounded-md border bg-background px-3 text-sm"
          value={appFontFamily}
          onChange={(event) => void setAppFontFamily(event.target.value)}
        >
          <option value="system">系统默认</option>
          <option value="serif">衬线字体</option>
          <option value="monospace">等宽字体</option>
        </select>
      </label>
    </div>
  )
}

function AiSettings() {
  const { aiModelList, setAiModelList, primaryModel, setPrimaryModel } = useSettingStore()
  const [title, setTitle] = useState('')
  const [baseURL, setBaseURL] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [saving, setSaving] = useState(false)

  async function addProvider(event: FormEvent) {
    event.preventDefault()
    if (!title.trim() || !baseURL.trim() || !model.trim()) return

    setSaving(true)
    try {
      const provider = {
        key: crypto.randomUUID(),
        title: title.trim(),
        baseURL: baseURL.trim(),
        apiKey: apiKey.trim(),
        modelType: 'chat',
        models: [{ id: crypto.randomUUID(), model: model.trim(), modelType: 'chat', enableStream: true }],
      }
      const nextModels = [...aiModelList, provider]
      setAiModelList(nextModels)
      const store = await Store.load('store.json')
      await store.set('aiModelList', nextModels)
      await store.save()
      if (!primaryModel) setPrimaryModel(provider.models[0].id)
      setTitle('')
      setBaseURL('')
      setApiKey('')
      setModel('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="AI 模型" description="添加浏览器端聊天连接。密钥保存在当前浏览器的本地存储中。" />
      <div className="space-y-2 rounded-lg border p-3">
        {aiModelList.length === 0 ? <p className="text-sm text-muted-foreground">尚未配置聊天模型。</p> : aiModelList.map((provider: any) => (
          <div key={provider.key} className="flex items-center justify-between gap-3 text-sm">
            <div className="min-w-0"><p className="font-medium">{provider.title}</p><p className="truncate text-muted-foreground">{provider.baseURL}</p></div>
            <Button size="sm" variant={primaryModel === provider.models?.[0]?.id ? 'secondary' : 'outline'} onClick={() => setPrimaryModel(provider.models?.[0]?.id ?? '')}>使用</Button>
          </div>
        ))}
      </div>
      <form className="grid gap-3" onSubmit={addProvider}>
        <Input aria-label="模型提供商名称" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="提供商名称" />
        <Input aria-label="模型接口地址" value={baseURL} onChange={(event) => setBaseURL(event.target.value)} placeholder="https://api.example.com/v1" type="url" />
        <Input aria-label="模型 API Key" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="API Key" type="password" />
        <Input aria-label="聊天模型名称" value={model} onChange={(event) => setModel(event.target.value)} placeholder="聊天模型名称" />
        <Button type="submit" disabled={saving || !title.trim() || !baseURL.trim() || !model.trim()}>{saving ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <Bot data-icon="inline-start" />}添加模型</Button>
      </form>
    </div>
  )
}

function SyncSettings() {
  const { primaryBackupMethod, setPrimaryBackupMethod, autoDataSyncEnabled, setAutoDataSyncEnabled, autoPullOnOpen, setAutoPullOnOpen } = useSettingStore()
  return (
    <div className="space-y-6">
      <SectionTitle title="同步" description="选择同步提供商并管理浏览器本地同步偏好。" />
      <label className="grid gap-2 text-sm font-medium">
        首选同步提供商
        <select className="h-9 rounded-md border bg-background px-3 text-sm" value={primaryBackupMethod} onChange={(event) => void setPrimaryBackupMethod(event.target.value as any)}>
          <option value="github">GitHub</option><option value="gitee">Gitee</option><option value="gitlab">GitLab</option><option value="gitea">Gitea</option><option value="s3">S3</option><option value="webdav">WebDAV</option>
        </select>
      </label>
      <div className="flex items-center justify-between gap-4 rounded-lg border p-3"><div><p className="text-sm font-medium">同步记录与配置</p><p className="text-xs text-muted-foreground">将本地变更纳入同步队列。</p></div><Switch checked={autoDataSyncEnabled} onCheckedChange={(value) => void setAutoDataSyncEnabled(value)} /></div>
      <div className="flex items-center justify-between gap-4 rounded-lg border p-3"><div><p className="text-sm font-medium">打开时拉取</p><p className="text-xs text-muted-foreground">进入工作区时检查远端更新。</p></div><Switch checked={autoPullOnOpen} onCheckedChange={(value) => void setAutoPullOnOpen(value)} /></div>
      <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">连接凭据和远端仓库配置将在后续同步分区中恢复。当前浏览器版保留本地偏好与同步队列。</p>
    </div>
  )
}

function FileSettings() {
  const { workspacePath, setWorkspacePath, assetsPath, setAssetsPath } = useSettingStore()
  return (
    <div className="space-y-6">
      <SectionTitle title="文件与工作区" description="浏览器版使用 IndexedDB 保存工作区文件和附件元数据。" />
      <label className="grid gap-2 text-sm font-medium">工作区标识<Input aria-label="工作区标识" value={workspacePath} onChange={(event) => void setWorkspacePath(event.target.value)} placeholder="我的工作区" /></label>
      <label className="grid gap-2 text-sm font-medium">附件目录名称<Input aria-label="附件目录名称" value={assetsPath} onChange={(event) => void setAssetsPath(event.target.value)} placeholder="assets" /></label>
      <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">当前工作区保存在浏览器本地。目录授权、导入和导出将在文件系统适配层完成后提供。</p>
    </div>
  )
}

function ModelSelect({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => unknown }) {
  const { aiModelList } = useSettingStore()
  const models = aiModelList.flatMap((provider: any) => (provider.models ?? []).map((model: any) => ({
    id: model.id,
    label: `${provider.title} / ${model.model}`,
  })))

  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <select className="h-9 rounded-md border bg-background px-3 text-sm" value={value} onChange={(event) => void onChange(event.target.value)}>
        <option value="">未选择</option>
        {models.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
      </select>
    </label>
  )
}

function ChatSettings() {
  const { primaryModel, setPrimaryModel, condenseModel, setCondenseModel } = useSettingStore()
  return <div className="space-y-6"><SectionTitle title="聊天" description="选择聊天和长对话压缩使用的模型。" /><ModelSelect label="默认聊天模型" value={primaryModel} onChange={setPrimaryModel} /><ModelSelect label="对话压缩模型" value={condenseModel} onChange={setCondenseModel} /></div>
}

function EditorSettings() {
  const { completionModel, setCompletionModel, commitModel, setCommitModel } = useSettingStore()
  return <div className="space-y-6"><SectionTitle title="编辑器" description="配置编辑器续写与提交信息生成模型。" /><ModelSelect label="续写模型" value={completionModel} onChange={setCompletionModel} /><ModelSelect label="提交信息模型" value={commitModel} onChange={setCommitModel} /></div>
}

function RecordSettings() {
  const { markDescModel, setMarkDescModel } = useSettingStore()
  return <div className="space-y-6"><SectionTitle title="记录" description="配置记录整理时使用的模型。" /><ModelSelect label="记录描述模型" value={markDescModel} onChange={setMarkDescModel} /></div>
}

function PromptSettings() {
  const { systemPrompt, setSystemPrompt, agentPermissionMode, setAgentPermissionMode } = useSettingStore()
  return <div className="space-y-6"><SectionTitle title="提示词" description="设置 AI 助手的系统提示词与操作确认方式。" /><label className="grid gap-2 text-sm font-medium">系统提示词<textarea className="min-h-44 rounded-md border bg-background p-3 text-sm" value={systemPrompt} onChange={(event) => void setSystemPrompt(event.target.value)} /></label><label className="grid gap-2 text-sm font-medium">操作确认<select className="h-9 rounded-md border bg-background px-3 text-sm" value={agentPermissionMode} onChange={(event) => void setAgentPermissionMode(event.target.value as typeof agentPermissionMode)}><option value="ask">每次询问</option><option value="allow">自动允许</option><option value="deny">始终拒绝</option></select></label></div>
}

function TemplateSettings() {
  const { templateList } = useSettingStore()
  return <div className="space-y-6"><SectionTitle title="模板" description="用于记录整理的内置模板。" /><div className="space-y-2">{templateList.map((template: any) => <div key={template.id} className="rounded-lg border p-3"><p className="text-sm font-medium">{template.title}</p><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{template.content}</p></div>)}</div></div>
}

function AudioSettings() {
  const { textToSpeechMode, setTextToSpeechMode, speechToTextMode, setSpeechToTextMode } = useSettingStore()
  return <div className="space-y-6"><SectionTitle title="音频" description="选择浏览器中的朗读与语音识别方式。" /><label className="grid gap-2 text-sm font-medium">文本朗读<select className="h-9 rounded-md border bg-background px-3 text-sm" value={textToSpeechMode} onChange={(event) => void setTextToSpeechMode(event.target.value as typeof textToSpeechMode)}><option value="auto">自动</option><option value="browser">浏览器</option><option value="model">模型</option></select></label><label className="grid gap-2 text-sm font-medium">语音识别<select className="h-9 rounded-md border bg-background px-3 text-sm" value={speechToTextMode} onChange={(event) => void setSpeechToTextMode(event.target.value as typeof speechToTextMode)}><option value="auto">自动</option><option value="browser">浏览器</option><option value="model">模型</option></select></label></div>
}

function PendingSettings({ title }: { title: string }) {
  return <div className="space-y-6"><SectionTitle title={title} description="该设置分区已恢复导航入口。浏览器适配将在后续阶段接入原版配置与运行时能力。" /><p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">当前应用继续保留工作区和本地数据。此分区的桌面端依赖正在迁移为浏览器能力。</p></div>
}

const sectionContent: Record<WebSettingsSection, () => React.JSX.Element> = {
  about: () => <PendingSettings title="关于" />,
  general: GeneralSettings,
  chat: ChatSettings,
  editor: EditorSettings,
  record: RecordSettings,
  sync: SyncSettings,
  imageHosting: () => <PendingSettings title="图床" />,
  ai: AiSettings,
  rag: () => <PendingSettings title="RAG" />,
  mcp: () => <PendingSettings title="MCP" />,
  skills: () => <PendingSettings title="Skills" />,
  prompt: PromptSettings,
  memories: () => <PendingSettings title="记忆" />,
  template: TemplateSettings,
  file: FileSettings,
  shortcuts: () => <PendingSettings title="快捷键" />,
  imageMethod: () => <PendingSettings title="图像处理" />,
  audio: AudioSettings,
}

export function SettingsDialog() {
  const { open, activeSection, closeSettings, setActiveSection } = useSettingsDialogStore()
  const { lastSettingPage, setLastSettingPage } = useSettingStore()
  const initialSection = isWebSettingsSection(activeSection) ? activeSection : 'general'
  const [section, setSection] = useState<WebSettingsSection>(initialSection)

  useEffect(() => {
    if (!open) return
    const nextSection = isWebSettingsSection(activeSection)
      ? activeSection
      : isWebSettingsSection(lastSettingPage) ? lastSettingPage : 'general'
    setSection(nextSection)
  }, [activeSection, lastSettingPage, open])

  function selectSection(nextSection: WebSettingsSection) {
    setSection(nextSection)
    setActiveSection(nextSection)
    void setLastSettingPage(nextSection)
  }

  const Section = sectionContent[section]
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && closeSettings()}>
      <DialogContent className="flex h-[min(820px,calc(100vh-3rem))] w-[calc(100vw-3rem)] max-w-[1280px] gap-0 overflow-hidden p-0">
        <DialogHeader className="sr-only"><DialogTitle>设置</DialogTitle><DialogDescription>配置 SupaNoteGen 浏览器版。</DialogDescription></DialogHeader>
        <aside className="flex w-56 shrink-0 flex-col gap-1 overflow-y-auto border-r bg-muted/30 p-3">
          <div className="mb-2 flex items-center gap-2 px-2 text-sm font-semibold"><Settings className="size-4" />设置</div>
          {webSettingsSections.map((item) => <Button key={item.id} variant={section === item.id ? 'secondary' : 'ghost'} className="justify-start" onClick={() => selectSection(item.id)}>{item.id === 'ai' ? <Sparkles data-icon="inline-start" /> : item.id === 'file' ? <FolderOpen data-icon="inline-start" /> : null}{item.label}</Button>)}
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto p-6"><Section /></main>
      </DialogContent>
    </Dialog>
  )
}
