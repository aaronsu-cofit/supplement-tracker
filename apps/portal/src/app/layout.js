import './globals.css';
import ClientLayout from './ClientLayout';

export const metadata = {
  title: 'Health & Care Portal',
  description: '健康照護平台 — 統一入口',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0a0a12" />
      </head>
      <body suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
