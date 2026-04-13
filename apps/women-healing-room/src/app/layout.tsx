import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cofit 女人療心室',
  description: '針對前更年期女性設計的身心整合支持工具，提供 AI 情緒評估、舒緩練習與專業線上課程，與鄧雯心醫師一起找回安定的自己。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body>
        <main className="mobile-container">
          {children}
        </main>
      </body>
    </html>
  )
}
