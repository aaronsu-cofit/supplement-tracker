"use client";
import Link from "next/link";
import styles from "./Courses.module.css";

export default function CoursesPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.backButton}>← 返回首頁工具</Link>
      </header>

      <div className={styles.heroSection}>
        <div className={styles.heroBadge}>最多人推薦課程</div>
        <h1 className={styles.title}>【前更年期必修】荷爾蒙重整與深層保養</h1>
        <p className={styles.subtitle}>由鄧雯心醫師設計，結合醫學、營養與正念，陪伴妳走過身心的狂風暴雨。</p>
      </div>

      <section className={styles.doctorSection}>
        <div className={styles.doctorAvatar}>👩‍⚕️</div>
        <div className={styles.doctorInfo}>
          <h3 className={styles.docName}>鄧雯心 醫師</h3>
          <p className={styles.docTitle}>Cofit 家醫科主治醫師 / 身心整合專家</p>
        </div>
      </section>

      <div className={styles.cardSection}>
        <h2 className={styles.sectionTitle}>這堂課能帶給妳什麼？</h2>
        <ul className={styles.benefitList}>
          <li>✔️ 了解女性荷爾蒙波動的真相與應對</li>
          <li>✔️ 改善睡眠品質，減少半夜無故醒來</li>
          <li>✔️ 紓解焦慮情緒，找回大腦平靜放鬆的能力</li>
          <li>✔️ 獨家營養處方，舒緩熱潮紅與疲倦感</li>
        </ul>
      </div>

      <div className={styles.cardSection}>
        <h2 className={styles.sectionTitle}>適合對象</h2>
        <div className={styles.tags}>
          <span className={styles.tag}>情緒起伏大</span>
          <span className={styles.tag}>常常睡不好</span>
          <span className={styles.tag}>覺得心很累</span>
          <span className={styles.tag}>想改善身心平衡</span>
        </div>
      </div>

      <div className={styles.stickyFooter}>
        <div className={styles.priceInfo}>
          <span className={styles.originalPrice}>NT$ 3,200</span>
          <span className={styles.discountPrice}>NT$ 1,980</span>
        </div>
        <button className={styles.ctaButton} onClick={() => alert('MVP 展示：將前往金流購買頁面！')}>
          立即加入課程
        </button>
      </div>
    </div>
  );
}
