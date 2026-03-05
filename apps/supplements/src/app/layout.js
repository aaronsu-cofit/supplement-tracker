import './globals.css';
import ClientLayout from './ClientLayout';

export const metadata = {
  title: '保健品追蹤',
};

export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <head><meta name="theme-color" content="#0a0a12" /></head>
      <body suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
