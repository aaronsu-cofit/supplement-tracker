import Link from "next/link";
import CourseCard from "@/components/CourseCard";
import styles from "./Complete.module.css";

export default function ReliefComplete() {
  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.icon}>✨</div>
        <h1 className={styles.title}>辛苦了，為你的練習拍拍手</h1>
        <p className={styles.subtitle}>短短的 3 分鐘，你已經成功把注意力帶回自己身上。請記得這份平靜的感覺，隨時把它帶回生活中。</p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>如果覺得意猶未盡...</h3>
        <CourseCard 
          title="【好眠正念課】睡前降噪的腦部放鬆指南"
          description="由鄧雯心醫師帶領，結合專業醫學知識與正念心理，循序漸進改善您的身心困擾與睡眠品質。"
          href="/courses"
          tag="🔥 舒緩後延伸推薦"
        />
      </div>

      <div className={styles.actionGroup}>
        <Link href="/" className={styles.backHomeBtn}>← 返回功能首頁</Link>
      </div>
    </div>
  );
}
