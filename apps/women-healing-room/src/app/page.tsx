import Link from "next/link";
import styles from "./Home.module.css";

export default function Home() {
  const menuItems = [
    {
      id: "assessment",
      title: "測測我怎麼了",
      subtitle: "60秒拍照了解",
      href: "/assessment/photo",
      icon: "🧠", // Placeholder for actual icon
      theme: styles.cardPrimary,
    },
    {
      id: "consultation",
      title: "找鄧雯心醫師聊聊",
      subtitle: "更年期身心評估",
      href: "https://events.cofit.me/genesis-Dr-Wen-Shin-Teng-20394",
      icon: "👩‍⚕️",
      theme: styles.cardSecondary,
      isExternal: true,
    },
    {
      id: "relief",
      title: "線上立即舒緩",
      subtitle: "3分鐘安定練習",
      href: "/relief",
      icon: "🧘‍♀️",
      theme: styles.cardTertiary,
    },
    {
      id: "sleep",
      title: "今晚睡好點",
      subtitle: "睡前放鬆引導",
      href: "/sleep",
      icon: "🌙",
      theme: styles.cardQuaternary,
    },
    {
      id: "progress",
      title: "我的心情日記",
      subtitle: "情緒睡眠簡單紀錄",
      href: "/progress",
      icon: "📖",
      theme: styles.cardQuinary,
    },
    {
      id: "voice-chat",
      title: "我有話想說",
      subtitle: "線上即時陪伴",
      href: "/faq",
      icon: "🤖",
      theme: styles.cardSenary,
    },
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>Cofit 女人療心室</div>
        <p className={styles.greeting}>給自己三分鐘，找回平靜的力量</p>
      </header>

      <div className={styles.grid}>
        {menuItems.map((item) => (
          item.isExternal ? (
            <a key={item.id} href={item.href} target="_blank" rel="noopener noreferrer" className={`${styles.card} ${item.theme}`}>
              <div className={styles.iconWrapper}>{item.icon}</div>
              <h2 className={styles.cardTitle}>{item.title}</h2>
              <p className={styles.cardSubtitle}>{item.subtitle}</p>
            </a>
          ) : (
            <Link key={item.id} href={item.href} className={`${styles.card} ${item.theme}`}>
              <div className={styles.iconWrapper}>{item.icon}</div>
              <h2 className={styles.cardTitle}>{item.title}</h2>
              <p className={styles.cardSubtitle}>{item.subtitle}</p>
            </Link>
          )
        ))}
      </div>
    </div>
  );
}
