import Link from "next/link";
import styles from "../ReliefPage.module.css";

const STEPS = [
  { img: "🧘‍♀️", title: "第一步：尋找舒適空間", desc: "找一個安靜的空間，您可以坐著或平躺，閉上雙眼，感受地板或椅面對您身體的支撐。" },
  { img: "💆‍♀️", title: "第二步：掃描眉心與臉部", desc: "將注意力轉移到臉部。放鬆總是微微皺起的眉心，鬆開咬緊的牙關，讓眼皮輕輕蓋著。" },
  { img: "🤷‍♀️", title: "第三步：放下雙肩重擔", desc: "吸氣時感覺肩膀微微上提，吐氣時讓肩膀完全鬆沉下來，想像所有壓力隨著吐氣流出。" },
  { img: "🫁", title: "第四步：深呼吸與腹部放鬆", desc: "將手放在腹部，感受吸氣時肚子圓滾滾地鼓起，吐氣時肚子扁平。不要憋氣，讓頻率自然減慢。" },
  { img: "🦶", title: "第五步：釋放四肢的緊繃", desc: "從大腿、小腿一路放鬆到腳趾頭。每一根腳趾頭都完全柔軟下來。享受這份專屬於妳的安寧。" },
];

export default function BodyRelaxation() {
  return (
    <div className={styles.container}>
       <header className={styles.header}>
         <Link href="/relief" className={styles.backButton}>← 返回舒緩清單</Link>
       </header>

       <h1 className={styles.title}>身體放鬆掃描</h1>
       <p className={styles.subtitle}>跟著這 5 個簡單的步驟，逐一釋放身體底層的疲勞累積。</p>

       <div className={styles.stepList}>
         {STEPS.map((step, i) => (
           <div key={i} className={styles.stepCard}>
             <div className={styles.stepImagePlaceholder}>{step.img}</div>
             <div className={styles.stepContent}>
               <h3 className={styles.stepTitle}>{step.title}</h3>
               <p className={styles.stepDesc}>{step.desc}</p>
             </div>
           </div>
         ))}
       </div>

       <div className={styles.footerAction}>
         <Link href="/relief" className={styles.doneButton}>我完成練習了</Link>
       </div>
    </div>
  );
}
