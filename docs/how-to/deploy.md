# Deployment Guide

本指南說明如何將 Health & Care 專案部署上正式環境。目前專案配置了與 **Vercel** 深度整合的 CI/CD 流程。

## 1. Vercel 自動部署設定

只要將代碼庫推上 GitHub，Vercel 就會自動觸發部署（Auto-deploy from master/main branch）。

在 Vercel 面板的新增專案流程中：
1. Import 您的 GitHub Repository (`weichun1008/supplement-tracker`)。
2. **Framework Preset**：選擇 `Next.js` (通常會自動精準識別)。
3. **Build Command**：確保是 `npm run build` 或留空使用預設。
4. **Output Directory**：`.next/`
5. **Environment Variables**：這是最重要的一步，將所有生產環境 (Production) 需要的變數逐一貼入：
   * `DATABASE_URL` (或使用 Vercel Storage 功能來一鍵綁定 Neon)
   * `GEMINI_API_KEY`
   * `LINE_CHANNEL_ACCESS_TOKEN`
   * `LINE_CHANNEL_SECRET`
   * `NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS`
   * `NEXT_PUBLIC_LIFF_ID_WOUNDS` (選填)
   * `JWT_SECRET` 

## 2. Serverless 部署考量

由於部署在 Vercel Serverless Function 環境：
- **最大容量限制**：Request Body 最大預設為 **4.5 MB**。這也是我們為什麼要在前端實作圖片 Canvas 壓縮（800px / 70% Quality）的原因，以避免大照片上傳觸發 413 Payload Too Large 錯誤。
- **冷啟動 (Cold Boot)**：Neon Database 有隨用隨啟動的特性，首個 Request 如果碰上資料庫啟動，可能會有 1~2 秒的連線延遲。我們的前端 Loading state 足以應付此情境。

## 3. 部署後驗證清單 (Post-Deployment Checklist)

每次上線後，建議執行以下煙霧測試 (Smoke tests)：

- [ ] (Auth) 開啟應用首頁，能導向 `/login`。
- [ ] (Auth) 在有 LINE 帳戶的環境中 (LIFF 開啟時)，是否無縫登入成功？
- [ ] (Auth) 開啟網頁版，能成功註冊一組 Email 帳號。
- [ ] (Wounds) 上傳一張傷口照片，AI 是否能成功完成分析而不超時？
- [ ] (Notify) AI 分析完成後，自己的 LINE 聊天室是否有收到推播通知？
- [ ] (Wounds) 建立成功後，是否顯示在 `/wounds/history` 的 Timeline 中？
