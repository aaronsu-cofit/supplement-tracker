"use client";
import { useState } from "react";
import Link from "next/link";
import styles from "../ReliefPage.module.css";

const QUOTES = [
  "今天已經夠努力了，現在我可以正式下班了。",
  "我不需要完美，現在的我已經足夠好了。",
  "那些還沒解決的事情，明天的大腦會幫我處理。",
  "任何人的情緒都不屬於我，我只對自己的平靜負責。",
  "我允許身體的所有感受存在，不去抗拒，只去感受。",
  "這是一個安全的空間，沒有人會來打擾我。",
  "我的心就像深海一樣，表面或許有波浪，但底層始終安靜。",
  "呼氣時，我把所有的擔憂都釋放出去了。",
  "我值得一個徹底、深層、不被打斷的睡眠。",
  "明天又是新的一天，不用害怕，我會好好的。"
];

export default function SleepNoiseReduction() {
  const [readIndex, setReadIndex] = useState(0);

  const nextQuote = () => {
    if (readIndex < QUOTES.length - 1) {
      setReadIndex(prev => prev + 1);
    }
  };

  return (
    <div className={styles.container}>
       <header className={styles.header}>
         <Link href="/relief" className={styles.backButton}>← 返回舒緩清單</Link>
       </header>

       <h1 className={styles.title}>睡前自我對話練習</h1>
       <p className={styles.subtitle}>請在心裡或輕聲跟著唸出這 10 句話，每唸完一句，就深呼吸一次。</p>

       <div className={styles.quoteArea}>
         <div className={styles.quoteCard}>
            <div className={styles.quoteIndex}>{readIndex + 1} / 10</div>
            <div className={styles.quoteText}>「{QUOTES[readIndex]}」</div>
         </div>
         
         {readIndex < QUOTES.length - 1 ? (
            <button onClick={nextQuote} className={styles.nextBtn}>下一句</button>
         ) : (
            <div className={styles.finishBox}>
               <p>太棒了！妳已經完成了今晚的對話。</p>
               <Link href="/relief" className={styles.doneButton}>現在去休息吧</Link>
            </div>
         )}
       </div>
    </div>
  );
}
