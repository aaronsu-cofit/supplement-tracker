# iOS / Safari WebRTC 相機踩坑與修復紀錄

這份文件記錄了在實作 V3.2 智能相機 (Custom WebRTC Camera) 時，遇到針對 iOS 環境 (Safari 以及如 LINE 內部瀏覽器的 WKWebView) 在存取 `getUserMedia` 與渲染 `<video>` 標籤時的已知限制與應對解法。

這些經驗可作為後續維護或新增跨平台相機應用的重要參考。

## 1. 嚴苛的 `facingMode` 權限阻擋

### 問題描述
如果嚴格要求提取後置鏡頭 `getUserMedia({ video: { facingMode: 'environment' } })`，在某些舊型號手機或未完善支援該參數的 WebView 裡面，瀏覽器若找不到**絕對符合**要求的硬體，會直接拋出 `OverconstrainedError`，而不會退而求其次回傳預設鏡頭。這導致許多使用者直接看到無法啟動相機的錯誤。

### 解法
1. **軟性提議 (Ideal)**：改用 `{ facingMode: { ideal: 'environment' } }` 作為期待值，讓瀏覽器保有妥協的空間。
2. **Fallback Fallback**：在 `catch` 區塊中，進行第二次無條件的裝置請求 `{ video: true }`。如果這樣仍失敗，才顯示錯誤 UI。
3. **精準錯誤訊息**：判斷 `err.name === 'NotAllowedError'` 來判定使用者是不小心按到拒絕，並提示須至系統設定開啟權限。

## 2. iOS Video Render 卡死 (第一次載入黑畫面)

### 問題描述
即使順利拿到鏡頭權限，且 `<video>.srcObject` 也正確被賦值了視訊串流 (Stream)，但在 iOS Safari 或是 WKWebView 中，`<video>` 標籤極常發生**無法驅動第一幀畫面解碼**的問題。畫面會持續黑屏，直到被外部觸發重新渲染 (例如 React Component Rerender) 才會突然亮起。

### 解法一：強制硬體加速渲染 (CSS)
在 `<video>` 的 `style` 強制加入 3D 渲染屬性，逼迫 iOS 分配獨立的 GPU Layer 來繪製視訊串流，防止 WebView 在背景隱藏/暫停該區塊。
```css
transform: 'translateZ(0)',
WebkitTransform: 'translateZ(0)'
```

### 解法二：重置組件與精準的事件勾點 (React)
1. **強制重置 DOM**：使用 React 的 `key={isCameraActive ? 'active' : 'inactive'}` 來**強制卸載並重新掛載** `<video>` 標籤。這確保了每一次啟動相機，都是全新的影片容器，避免被前一次失敗的狀態快取卡住。
2. **延遲綁定串流**：由於 iOS 對於 React 和 DOM 的繪製時機有時不同步，在狀態變更為 `isCameraActive` 後，使用 `setTimeout(..., 50)` 或 `requestAnimationFrame` 來確保 `<video>` 元素已經確實在畫面上出現，再去賦值 `srcObject`。
3. **監聽 `onLoadedMetadata`**：將手動觸發 `video.play()` 的時機點從 `onCanPlay` 移到 **`onLoadedMetadata`**。一旦影片標籤解析出影像串流的基本資訊（寬高、軌道），就必須立刻透過非同步的 `await video.play()` 驅動播放，衝撞 iOS 為了省電而封鎖自動播放的機制。

### 解法三：滿足 iOS 靜音自動播放政策 
iOS 絕對禁止任何帶有音軌的媒體未經互動就自動播放。即使 `getUserMedia` 只取了 `video: true`，HTML 的 `<video>` 仍可能被判定具有播放聲音的潛力。
必須明確在 React 中寫下：
```jsx
<video 
  autoPlay 
  playsInline 
  muted={true} // 必須是明確的布林值，確保 React 確實渲染 attribute
/>
```
`playsInline` 則是防止影片在 iOS 播放時擅自彈出全螢幕播放器的關鍵屬性。

---
撰寫日期：2026-03-01
對應功能：`/bones/scan/page.js` 智能相機。
