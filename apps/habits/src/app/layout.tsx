import type { Metadata } from 'next';
import './globals.css';
import ClientLayout from './ClientLayout';

export const metadata: Metadata = {
  title: '我的習慣 · Vitera',
  description: '每日習慣追蹤、連續紀錄、徽章與 Journey。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
