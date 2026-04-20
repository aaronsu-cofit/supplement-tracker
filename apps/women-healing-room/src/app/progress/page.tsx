"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./Progress.module.css";

const MOOD_EMOJIS = [
  { val: 1, label: "極差", emoji: "😭" },
  { val: 2, label: "偏低", emoji: "🥺" },
  { val: 3, label: "普通", emoji: "😐" },
  { val: 4, label: "不錯", emoji: "🙂" },
  { val: 5, label: "極佳", emoji: "🤩" },
];

const SLEEP_EMOJIS = [
  { val: 1, label: "極差", emoji: "😫" },
  { val: 2, label: "難入眠", emoji: "🥱" },
  { val: 3, label: "普通", emoji: "😐" },
  { val: 4, label: "穩定", emoji: "😴" },
  { val: 5, label: "深層", emoji: "🛌" },
];

// 本地 fallback（API 失敗時使用）
function localFallback(text: string, mood: number | null, sleep: number | null): string {
  const keywords = {
    grief: ["狗", "貓", "寵物", "走", "離", "離世", "過世", "死", "不見", "痛", "想念"],
    burnout: ["累", "疲", "煩", "壓力", "忙", "喘不過氣", "無力", "工作"],
    anger: ["氣", "怒", "不爽", "討厭", "恨", "生氣", "火", "爆炸"],
    body: ["熱", "汗", "痛", "不舒服", "病", "暈", "燥", "盜汗", "心悸"],
  };

  if (keywords.grief.some((k) => text.includes(k))) {
    return "面對摯愛的離開，那種深沉的痛與失落是無法用言語簡單形容的。允許自己悲傷，不需要急著好起來... 這段時間請溫柔地陪著自己。";
  } else if (keywords.burnout.some((k) => text.includes(k))) {
    return "看來最近真的承擔了太多壓力呢。大腦和身體都在發出罷工的警訊，今天的妳已經足夠努力了，現在請把重擔暫時放下。";
  } else if (keywords.anger.some((k) => text.includes(k))) {
    return "感到生氣和煩躁是完全可以被接受的！目前荷爾蒙波動讓神經系統變得異常敏感，試著透過深呼吸，把體內的濁氣吐出來。";
  } else if (keywords.body.some((k) => text.includes(k))) {
    return "身體的種種不適，確實會讓人感到沮喪無力。請給她多一點耐心與包容，等一下去喝杯溫熱的水，做點輕柔的伸展吧。";
  } else if (mood !== null && mood <= 2) {
    return "今天的心情似乎有些低落。能誠實地記錄下來，就是照顧自己最好的第一步！偶爾在谷底休息一下也是必要的，想哭就哭吧。";
  } else if (sleep !== null && sleep <= 2) {
    return "昨晚沒睡好，今天白天一定特別疲憊吧... 今晚試著去「線上舒緩區」使用引導工具，給自己一個不受打擾的睡眠儀式。";
  } else {
    return "謝謝妳願意分享這些心裡的聲音。每一天的觀察與書寫，都能幫助妳更拿回情緒的主導權。今晚好好睡一覺吧，晚安。";
  }
}

export default function ProgressPage() {
  const [mood, setMood] = useState<number | null>(null);
  const [sleep, setSleep] = useState<number | null>(null);
  const [diaryText, setDiaryText] = useState("");
  const [aiFeedback, setAiFeedback] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const mockHistory = [
    { date: "3/30", type: "mood", val: 3 },
    { date: "3/31", type: "mood", val: 2 },
    { date: "4/01", type: "mood", val: 4 },
    { date: "4/02", type: "sleep", val: 2 },
    { date: "4/03", type: "sleep", val: 3 },
    { date: "4/04", type: "mood", val: isSaved ? mood : null },
  ];

  const handleSave = async () => {
    if (!mood || !sleep) {
      alert("請完成今日的情緒與睡眠評分喔！");
      return;
    }

    setIsSaved(true);
    setIsAnalyzing(true);
    setAiFeedback("");

    try {
      const res = await fetch("/api/diary/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diary: diaryText, mood, sleep }),
      });

      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setAiFeedback(`「${data.feedback}」`);
    } catch {
      // API 失敗時使用本地 fallback
      const fallback = localFallback(diaryText, mood, sleep);
      setAiFeedback(`「${fallback}」`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.backButton}>← 返回</Link>
        <h1 className={styles.title}>我的安定進度</h1>
        <p className={styles.subtitle}>每天記錄一點點，看見自己的變化</p>
      </header>

      <section className={styles.checkInSection}>
        <h2 className={styles.sectionTitle}>📅 今日狀態打卡</h2>

        <div className={styles.ratingCard}>
          <h3 className={styles.ratingTitle}>現在的情緒狀態如何？</h3>
          <div className={styles.emojiRow}>
            {MOOD_EMOJIS.map((item) => (
              <button
                key={`mood-${item.val}`}
                className={`${styles.emojiBtn} ${mood === item.val ? styles.active : ""}`}
                onClick={() => setMood(item.val)}
                disabled={isSaved}
              >
                <div className={styles.emoji}>{item.emoji}</div>
                <div className={styles.label}>{item.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.ratingCard}>
          <h3 className={styles.ratingTitle}>昨晚的睡眠品質如何？</h3>
          <div className={styles.emojiRow}>
            {SLEEP_EMOJIS.map((item) => (
              <button
                key={`sleep-${item.val}`}
                className={`${styles.emojiBtn} ${sleep === item.val ? styles.active : ""}`}
                onClick={() => setSleep(item.val)}
                disabled={isSaved}
              >
                <div className={styles.emoji}>{item.emoji}</div>
                <div className={styles.label}>{item.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.ratingCard}>
          <h3 className={styles.ratingTitle}>有什麼想對自己說的嗎？(AI 小日記)</h3>
          <textarea
            className={styles.diaryInput}
            placeholder="寫下今天的開心、煩躁、身體不適，或是任何想抒發的心情..."
            value={diaryText}
            onChange={(e) => setDiaryText(e.target.value)}
            disabled={isSaved}
          />
        </div>

        {!isSaved ? (
          <button className={styles.saveBtn} onClick={handleSave}>
            儲存紀錄並獲取分析
          </button>
        ) : (
          <div className={styles.savedMsg}>✅ 今日紀錄已送出分析！</div>
        )}
      </section>

      {isAnalyzing && (
        <div className={styles.analyzingBox}>
          <div className={styles.spinner}></div>
          <span>AI 正在生成專屬回覆...</span>
        </div>
      )}

      {aiFeedback && !isAnalyzing && (
        <section className={styles.aiFeedbackSection}>
          <div className={styles.aiMessage}>
            <div className={styles.aiAvatar}>✨</div>
            <div>
              <div className={styles.aiTitle}>女人療心室給妳的悄悄話</div>
              <p className={styles.aiText}>{aiFeedback}</p>
            </div>
          </div>
        </section>
      )}

      <section className={styles.historySection}>
        <h2 className={styles.sectionTitle}>📊 最近 7 天趨勢</h2>
        <div className={styles.chartMock}>
          <div className={styles.chartBars}>
            {mockHistory.map((item, i) => (
              <div key={i} className={styles.barGroup}>
                <div className={styles.barTrack}>
                  {item.val && (
                    <div
                      className={`${styles.barFill} ${item.type === "mood" ? styles.moodBar : styles.sleepBar}`}
                      style={{ height: `${(item.val / 5) * 100}%` }}
                    ></div>
                  )}
                </div>
                <div className={styles.dateLabel}>{item.date}</div>
              </div>
            ))}
          </div>
          <div className={styles.legend}>
            <span className={styles.legendMood}>■ 情緒</span>
            <span className={styles.legendSleep}>■ 睡眠</span>
          </div>
        </div>
      </section>
    </div>
  );
}
