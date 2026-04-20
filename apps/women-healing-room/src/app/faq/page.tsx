"use client";
import { useState } from "react";
import Link from "next/link";
import styles from "./Faq.module.css";

const QA_LIST = [
  {
    q: "常常睡到一半突然覺得很熱、或流汗醒來，這是正常的嗎？",
    a: "這是典型的前更年期「熱潮紅」與「夜間盜汗」現象。是因為體內雌激素分泌波動導致體溫調節中樞混亂。建議可以挑選透氣衣物，睡前避免激烈運動與飲用含咖啡因/酒精的飲料來緩解。"
  },
  {
    q: "情緒很容易失控，容易對身邊的人發脾氣，我是不是有憂鬱症？",
    a: "更年期與前更年期的荷爾蒙波動，的確會劇烈影響大腦中的血清素分泌，讓人變得易怒或感到憂鬱。這不見得是憂鬱症，建議可以由家醫科醫師進行荷爾蒙與壓力醇檢測，從根源調整。"
  },
  {
    q: "為什麼腦袋一直覺得很緊繃，停不下來？",
    a: "這可能是因為自律神經失調與「壓力醇」長期過高所致。可以嘗試使用我們的「線上立即舒緩」工具，藉由 4-7-8 呼吸法或睡前對話練習來重啟副交感神經。"
  }
];

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  
  // 文字聊天的狀態
  const [inputText, setInputText] = useState("");
  const [aiReply, setAiReply] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  const toggle = (i: number) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  const analyzeAndRespond = () => {
    if (!inputText.trim()) return;
    
    setIsThinking(true);
    setAiReply("");

    // MVP 模擬的同理心分析引擎
    const text = inputText;
    const keywords = {
      grief: ["狗", "貓", "寵物", "走", "離", "離世", "死", "痛", "想念", "分開", "分手"],
      burnout: ["累", "疲", "煩", "壓力", "忙", "無力", "工作", "喘不過氣"],
      anger: ["氣", "怒", "不爽", "討厭", "恨", "火", "生氣"],
      body: ["熱", "汗", "痛", "不舒服", "病", "暈", "燥", "心悸"],
      sleep: ["睡不好", "失眠", "睡不著", "半夜"]
    };
    
    let responseText = "謝謝妳跟我說這些。這些感受都是非常真實的，妳絕對不孤單。如果覺得緊繃，我們網站裡有準備舒緩放鬆的練習，要不要去試試看呢？";
    
    if (keywords.grief.some(k => text.includes(k))) {
      responseText = "我懂那種失去的痛。不需要壓抑悲傷，想哭的時候就盡情哭出來吧，這段日子請溫柔地陪著自己，療心室會一直在這裡陪著妳。";
    } else if (keywords.burnout.some(k => text.includes(k))) {
      responseText = "妳最近真的辛苦了！大腦和身體都在發出罷工的警訊。今天的妳已經足夠努力了，請把重擔暫時放下，好好疼愛自己一下吧。";
    } else if (keywords.anger.some(k => text.includes(k))) {
      responseText = "受到荷爾蒙波動影響，神經系統有時候會變得異常敏感，生氣和煩躁都是正常的！試著深呼吸吐氣，不用覺得自責。";
    } else if (keywords.body.some(k => text.includes(k))) {
      responseText = "身體的種種不適確實非常消耗能量。妳的身體目前正在經歷一場轉變，請多給她一點包容。去喝杯溫熱水，做點伸展好嗎？";
    } else if (keywords.sleep.some(k => text.includes(k))) {
      responseText = "睡不著總讓人特別焦慮。但越著急反而越難入睡喔。今晚試著去首頁「今晚睡好點」的看板做個大腦放鬆，給自己一個不受打擾的儀式。";
    }

    setTimeout(() => {
      setIsThinking(false);
      setAiReply(responseText);
      setInputText(""); // 送出後清空輸入框
    }, 1200);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
         <Link href="/" className={styles.backButton}>← 返回</Link>
         <h1 className={styles.title}>女人療心室</h1>
      </header>

      {/* 文字對話區 */}
      <div className={styles.searchContainer}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>💬</span>
          <input 
            type="text" 
            placeholder="請輸入您想詢問或訴說的心情..." 
            className={styles.searchInput}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && analyzeAndRespond()}
          />
          <button className={styles.sendBtn} onClick={analyzeAndRespond}>送出</button>
        </div>

        {/* AI 思考中 */}
        {isThinking && (
          <div className={styles.aiReplyBox}>
             <div className={styles.dotPulse}>
               <span className={styles.dot}>.</span>
               <span className={styles.dot}>.</span>
               <span className={styles.dot}>.</span> 
               大腦運算中
             </div>
          </div>
        )}

        {/* AI 給予純文字回覆 */}
        {aiReply && !isThinking && (
          <div className={styles.aiReplyBox}>
            <div className={styles.aiName}>✨ 給妳的悄悄話</div>
            <p className={styles.aiText}>{aiReply}</p>
          </div>
        )}
      </div>

      <div className={styles.hotSection}>
         <h2 className={styles.sectionTitle}>
            <span className={styles.icon}>⚡️</span> 熱門快速解答
         </h2>
         
         <div className={styles.qaList}>
           {QA_LIST.map((item, i) => {
             const isOpen = openIndex === i;
             return (
               <div key={i} className={styles.qaCard} onClick={() => toggle(i)}>
                 <div className={styles.qText}>
                    <span className={styles.qMark}>Q:</span> {item.q}
                 </div>
                 {isOpen && (
                   <div className={styles.aText}>
                     <span className={styles.aMark}>A:</span> {item.a}
                   </div>
                 )}
               </div>
             )
           })}
         </div>
      </div>

      {/* 語音陪伴入口 */}
      <div className={styles.voiceChatEntry}>
         <div className={styles.voiceBox}>
           <span className={styles.voiceIcon}>🎙️</span>
           <div className={styles.voiceText}>
             <h3 className={styles.voiceTitle}>用語音跟我聊聊</h3>
             <p className={styles.voiceDesc}>不想打字嗎？點擊進入專屬語音陪伴房，我會用聽的。</p>
           </div>
         </div>
         <Link href="/voice-chat" className={styles.voiceBtn}>進入語音對話</Link>
      </div>

      <div className={styles.footerLink}>
         找不到答案嗎？ 
         <Link href="https://cofit.me/psychologist" className={styles.psychologistBtn}>
           轉接線上心理師
         </Link>
      </div>
    </div>
  );
}
