'use client';

import { useState } from 'react';
import Link from 'next/link';

const SETTING_SECTIONS = [
  { id: 'general', label: '通用', icon: '⚙' },
  { id: 'editor', label: '编辑器', icon: '✎' },
  { id: 'chat', label: '聊天', icon: '💬' },
  { id: 'record', label: '记录', icon: '📝' },
  { id: 'ai', label: 'AI 模型', icon: '🤖' },
  { id: 'about', label: '关于', icon: 'ℹ' },
];

function GeneralSettings() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">通用设置</h3>
      <div className="space-y-2">
        <label className="flex items-center justify-between rounded border p-3">
          <div>
            <p className="text-sm font-medium">自动保存</p>
            <p className="text-xs text-muted-foreground">编辑时自动保存草稿到本地</p>
          </div>
          <input type="checkbox" defaultChecked className="h-4 w-4" />
        </label>
        <label className="flex items-center justify-between rounded border p-3">
          <div>
            <p className="text-sm font-medium">自动同步</p>
            <p className="text-xs text-muted-foreground">网络恢复后自动提交待同步变更</p>
          </div>
          <input type="checkbox" defaultChecked className="h-4 w-4" />
        </label>
      </div>
    </div>
  );
}

function EditorSettings() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">编辑器设置</h3>
      <div className="space-y-2">
        <div>
          <label className="mb-1 block text-sm">字体大小</label>
          <select className="w-full rounded border bg-background px-2 py-1.5 text-sm" defaultValue="14">
            <option value="12">小 (12px)</option>
            <option value="14">中 (14px)</option>
            <option value="16">大 (16px)</option>
            <option value="18">特大 (18px)</option>
          </select>
        </div>
        <label className="flex items-center justify-between rounded border p-3">
          <div>
            <p className="text-sm font-medium">AI 行内续写</p>
            <p className="text-xs text-muted-foreground">在编辑时提供 AI 续写建议</p>
          </div>
          <input type="checkbox" className="h-4 w-4" />
        </label>
        <label className="flex items-center justify-between rounded border p-3">
          <div>
            <p className="text-sm font-medium">显示文档大纲</p>
            <p className="text-xs text-muted-foreground">在编辑器侧边显示标题大纲</p>
          </div>
          <input type="checkbox" defaultChecked className="h-4 w-4" />
        </label>
      </div>
    </div>
  );
}

function ChatSettings() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">聊天设置</h3>
      <div className="space-y-2">
        <div>
          <label className="mb-1 block text-sm">默认模型</label>
          <select className="w-full rounded border bg-background px-2 py-1.5 text-sm" defaultValue="default">
            <option value="default">默认模型</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm">上下文长度</label>
          <input
            type="number"
            className="w-full rounded border bg-background px-2 py-1.5 text-sm"
            defaultValue={10}
            min={1}
            max={50}
          />
          <p className="mt-1 text-xs text-muted-foreground">保留最近的消息轮数作为上下文</p>
        </div>
      </div>
    </div>
  );
}

function RecordSettings() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">记录设置</h3>
      <div className="space-y-2">
        <label className="flex items-center justify-between rounded border p-3">
          <div>
            <p className="text-sm font-medium">剪贴板监听</p>
            <p className="text-xs text-muted-foreground">粘贴文本或图片时自动创建记录</p>
          </div>
          <input type="checkbox" defaultChecked className="h-4 w-4" />
        </label>
        <div>
          <label className="mb-1 block text-sm">默认记录类型</label>
          <select className="w-full rounded border bg-background px-2 py-1.5 text-sm" defaultValue="text">
            <option value="text">文本</option>
            <option value="todo">待办</option>
            <option value="link">链接</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function AiModelSettings() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">AI 模型管理</h3>
      <div className="space-y-2">
        {[{ id: 'default', name: '默认模型', provider: '环境配置' }].map((model) => (
          <div key={model.id} className="flex items-center justify-between rounded border p-3">
            <div>
              <p className="text-sm font-medium">{model.name}</p>
              <p className="text-xs text-muted-foreground">提供商：{model.provider}</p>
            </div>
            <button type="button" className="rounded border px-2 py-1 text-xs hover:bg-accent">
              配置
            </button>
          </div>
        ))}
        <button
          type="button"
          className="w-full rounded border border-dashed p-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground"
        >
          + 添加模型
        </button>
      </div>
    </div>
  );
}

function AboutSettings() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">关于 SupaNoteGen</h3>
      <div className="space-y-2 text-sm">
        <p>
          SupaNoteGen 是基于{' '}
          <a
            href="https://github.com/codexu/note-gen"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            NoteGen
          </a>
          {' '}交互体验重构的 Web 云端知识库平台。
        </p>
        <div className="mt-3 rounded border p-3">
          <p className="font-medium">许可证</p>
          <p className="mt-1 text-xs text-muted-foreground">
            本项目基于 GPL-3.0 许可证发布。完整许可证文本见项目根目录 LICENSE 文件。
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            原始 NoteGen 项目地址：https://github.com/codexu/note-gen
          </p>
        </div>
        <div className="rounded border p-3">
          <p className="font-medium">技术栈</p>
          <p className="mt-1 text-xs text-muted-foreground">Next.js · React · Zustand · TipTap · react-resizable-panels · Supabase</p>
        </div>
      </div>
    </div>
  );
}

const sectionComponents: Record<string, () => React.ReactNode> = {
  general: GeneralSettings,
  editor: EditorSettings,
  chat: ChatSettings,
  record: RecordSettings,
  ai: AiModelSettings,
  about: AboutSettings,
};

export default function SettingPage() {
  const [activeSection, setActiveSection] = useState('general');

  const ActiveComponent = sectionComponents[activeSection];

  return (
    <div className="flex h-screen">
      <nav className="w-48 shrink-0 border-r bg-muted/30 p-3">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/core/main" className="text-xs text-muted-foreground hover:text-foreground">
            ← 返回
          </Link>
        </div>
        <h2 className="mb-3 text-sm font-medium">设置</h2>
        <div className="space-y-0.5">
          {SETTING_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${
                activeSection === section.id
                  ? 'bg-accent font-medium'
                  : 'hover:bg-accent/50'
              }`}
              onClick={() => setActiveSection(section.id)}
            >
              <span>{section.icon}</span>
              <span>{section.label}</span>
            </button>
          ))}
        </div>
      </nav>
      <main className="flex-1 overflow-auto p-6">
        {ActiveComponent && <ActiveComponent />}
      </main>
    </div>
  );
}
