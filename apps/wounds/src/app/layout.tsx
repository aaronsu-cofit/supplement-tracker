import './globals.css';
import ClientLayout from './ClientLayout';

export const metadata = {
  title: '傷口智慧照護 | Wound Care',
  description: '智慧傷口追蹤與 AI 分析',
};

export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <head><meta name="theme-color" content="#1a1225" /></head>
      <body suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
