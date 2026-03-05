import ClientLayout from './ClientLayout';

export const metadata = {
  title: '骨骼關節照護',
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
