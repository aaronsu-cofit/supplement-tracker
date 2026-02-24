import "./globals.css";
import ClientLayout from "./ClientLayout";

export const metadata = {
  title: "保健品追蹤 | Supplement Tracker",
  description: "輕鬆記錄和追蹤你每天吃的保健品 - Easily track your daily supplement intake",
  keywords: "supplement, tracker, health, 保健品, 追蹤, 健康",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <head>
        <meta name="theme-color" content="#0a0a12" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
