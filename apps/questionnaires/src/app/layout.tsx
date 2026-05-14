import './globals.css';
import ClientLayout from './ClientLayout';

export const metadata = {
  title: 'Vitera 問卷',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <head><meta name="theme-color" content="#0ea5e9" /></head>
      <body suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
