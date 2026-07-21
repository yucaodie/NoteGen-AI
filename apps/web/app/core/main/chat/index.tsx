'use client';

export default function Chat() {
  return (
    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
      <div className="text-center p-4">
        <p className="text-lg">AI 对话</p>
        <p className="mt-1 text-sm">选择模型并输入问题开始对话</p>
      </div>
    </div>
  );
}
