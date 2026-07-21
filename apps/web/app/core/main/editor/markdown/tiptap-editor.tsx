'use client';

import { useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import HorizontalRule from '@tiptap/extension-horizontal-rule';

interface TiptapEditorProps {
  content: string;
  onUpdate: (html: string, markdown: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}

function ToolbarButton({
  icon,
  title,
  active,
  onClick,
}: {
  icon: string;
  title: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`rounded px-1.5 py-0.5 text-xs hover:bg-accent ${active ? 'bg-accent font-bold' : ''}`}
      title={title}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}

function Toolbar({ editor }: { editor: NonNullable<ReturnType<typeof useEditor>> }) {
  if (!editor) return null;

  const buttons = [
    { icon: 'B', title: '粗体', action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold') },
    { icon: 'I', title: '斜体', action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic') },
    { icon: 'S', title: '删除线', action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike') },
    { icon: 'H', title: '高亮', action: () => editor.chain().focus().toggleHighlight().run(), active: editor.isActive('highlight') },
    { icon: 'U', title: '下划线', action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline') },
    { type: 'separator' },
    { icon: 'H1', title: '一级标题', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive('heading', { level: 1 }) },
    { icon: 'H2', title: '二级标题', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }) },
    { icon: 'H3', title: '三级标题', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }) },
    { type: 'separator' },
    { icon: '•', title: '无序列表', action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList') },
    { icon: '1.', title: '有序列表', action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList') },
    { icon: '☑', title: '任务列表', action: () => editor.chain().focus().toggleTaskList().run(), active: editor.isActive('taskList') },
    { icon: '▬', title: '引用', action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive('blockquote') },
    { icon: '</>', title: '代码块', action: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive('codeBlock') },
    { icon: '—', title: '分隔线', action: () => editor.chain().focus().setHorizontalRule().run() },
  ];

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 px-2 py-1">
      {buttons.map((b, i) => {
        if ('type' in b) {
          return <span key={i} className="mx-1 text-muted-foreground">|</span>;
        }
        const btn = b as { icon: string; title: string; active?: boolean; action: () => void };
        return (
          <ToolbarButton key={i} icon={btn.icon} title={btn.title} active={btn.active} onClick={btn.action} />
        );
      })}
    </div>
  );
}

function FooterBar({
  wordCount,
  onCopy,
  onExport,
}: {
  wordCount: number;
  onCopy: () => void;
  onExport: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-t bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground">
      <span>{wordCount} 字</span>
      <span className="mx-1">|</span>
      <button type="button" className="hover:text-foreground" onClick={onCopy}>复制</button>
      <button type="button" className="hover:text-foreground" onClick={onExport}>导出</button>
    </div>
  );
}

export function TiptapEditor({
  content,
  onUpdate,
  readOnly = false,
  placeholder = '开始写作...',
}: TiptapEditorProps) {
  const [wordCount, setWordCount] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Placeholder.configure({ placeholder }),
      Highlight,
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      HorizontalRule,
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      const text = ed.getText();
      setWordCount(text.replace(/\s/g, '').length);
      onUpdate(html, text);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none outline-none p-4 min-h-[300px] focus:outline-none',
      },
    },
  });

  const handleCopy = useCallback(() => {
    if (editor) {
      navigator.clipboard.writeText(editor.getText());
    }
  }, [editor]);

  const handleExport = useCallback(() => {
    if (editor) {
      const md = editor.getText();
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'export.md';
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [editor]);

  return (
    <div className="flex h-full flex-col">
      <Toolbar editor={editor!} />
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} />
      </div>
      <FooterBar
        wordCount={wordCount}
        onCopy={handleCopy}
        onExport={handleExport}
      />
    </div>
  );
}
