import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SupaNoteGen',
  description: 'Browser-first knowledge workspace inspired by NoteGen.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
