import Link from "next/link";
import styles from "./Sleep.module.css";

export default function SleepPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.backButton}>✕ 準備入睡</Link>
      </header>

      <div className={styles.visualArea}>
        <div className={styles.moon}></div>
        <div className={styles.stars}></div>
        <div className={styles.pulsingGlow}></div>
      </div>

      <div className={styles.textArea}>
        <h1 className={styles.title}>把所有的煩惱，留在這裡</h1>
        
        <div className={styles.paragraphGroup}>
          <p className={styles.content}>
            白天，妳為了生活、工作與家庭不斷運轉。
          </p>
          <p className={styles.content}>
            現在，世界已經安靜下來了，<br/>妳的大腦也值得一個好好的休息。
          </p>
        </div>

        <div className={styles.paragraphGroup}>
          <p className={styles.content}>
            請想像妳的思緒像清空資源回收桶一樣，<br/>一件一件被移除。
          </p>
          <p className={styles.content}>
            那些還沒做完的、懊悔的、擔心的...<br/>都把它們打包，寄放在今夜的保險箱裡。
          </p>
        </div>

        <div className={styles.paragraphGroup}>
          <p className={styles.content}>
            放鬆妳總是微微皺起的眉心，<br/>鬆開不自覺咬緊的牙關，<br/>讓原本聳起的肩膀緩緩沉下。
          </p>
          <p className={styles.content}>
             妳已經做得很好了。今晚，就讓自己單純地存在著。<br/><br/>晚安。
          </p>
        </div>
      </div>
    </div>
  );
}
