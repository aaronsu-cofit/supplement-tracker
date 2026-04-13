import Link from 'next/link';
import styles from './Relief.module.css';

export default function ReliefMenu() {
  const tools = [
    { title: '呼吸安定', desc: '透過 4-7-8 呼吸法快速找回平靜', icon: '🌬️', path: '/relief/breathing' },
    { title: '身體放鬆', desc: '掃描緊繃部位，釋放身體底層壓力', icon: '🧘‍♀️', path: '/relief/body' },
    { title: '睡前降噪', desc: '清空腦袋雜念，進入深層睡眠準備', icon: '🎵', path: '/relief/sleep' }
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.backButton}>← 返回</Link>
        <h1 className={styles.title}>線上立即舒緩</h1>
        <p className={styles.subtitle}>花 3 分鐘，把頻率調回最安定的狀態</p>
      </header>

      <div className={styles.toolList}>
        {tools.map(tool => (
          <Link key={tool.path} href={tool.path} className={styles.card}>
            <div className={styles.icon}>{tool.icon}</div>
            <div className={styles.textContainer}>
              <h2 className={styles.cardTitle}>{tool.title}</h2>
              <p className={styles.cardDesc}>{tool.desc}</p>
            </div>
            <div className={styles.arrow}>→</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
