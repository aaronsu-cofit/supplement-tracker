"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import styles from "./Result.module.css";
import CourseCard from "@/components/CourseCard";

interface ResultData {
  type: "A" | "B" | "C";
  title: string;
  description: string;
  advice: string;
  faceInsight: string;
  nutrition: string;
  courseTitle: string;
}

// 保留原有內容作為 fallback
const FALLBACK_CONTENT: Record<"A" | "B" | "C", ResultData> = {
  A: {
    type: "A",
    title: "腦袋停不下來型",
    description: "您最近的腦袋就像一台沒有關機的引擎，思緒不斷運轉。這不僅影響了您的專注力，更讓您的睡眠變得非常淺。這種狀態往往是因為交感神經長期亢奮，導致大腦無法順利切換到「休息模式」。",
    advice: "建議您開始每天睡前給自己 5 分鐘的「大腦關機儀式」，避免睡前滑手機吸收過多資訊，並練習將明天的待辦事項寫下來。",
    courseTitle: "【好眠正念課】睡前降噪的腦部放鬆指南",
    faceInsight: "眼周暗沉明度降低、眉間呈現微小皺眉。這通常是因為皮質醇長時間處於高位，導致微血管收縮、影響血液循環與睡眠深度。",
    nutrition: "建議補充：GABA、鈣鎂錠。鈣鎂能幫助肌肉與神經放鬆；GABA 則有助於抑制過度亢奮的腦波，幫助進入深層睡眠。",
  },
  B: {
    type: "B",
    title: "情緒波動型",
    description: "近期您是否覺得自己像坐著情緒雲霄飛車？容易覺得委屈想哭，或是對很多事情提不起勁。這不是您的錯，而是身體正在經歷一場荷爾蒙重組的過程。",
    advice: "當察覺到情緒快要滿出來時，請先深吸一口氣，給自己一個擁抱。接納並允許這些情緒的存在。建議可以透過書寫或是輕柔的伸展來釋放內心的壓力。",
    courseTitle: "【情緒不暴走】找回內心平靜的安定課",
    faceInsight: "嘴角周圍肌肉緊繃，且兩頰有微微乾燥跡象。情緒的波動容易引起內分泌失調，導致皮脂分泌不穩與局部乾燥。",
    nutrition: "建議補充：維生素 B 群、色胺酸。B 群能安定神經並輔助能量代謝；色胺酸則是製造「快樂荷爾蒙（血清素）」的重要前驅物。",
  },
  C: {
    type: "C",
    title: "身心失衡型",
    description: "目前的您，身體的疲累感與不適感已經明顯浮現。可能伴隨著熱潮紅、心悸或是嚴重的肌肉痠痛。這是身體正在發出求救訊號，提醒您不能再只靠意志力撐下去了。",
    advice: "這是最需要被溫柔對待的時期。除了日常作息安排外，強烈建議您尋求醫療專業的協助，透過完整的荷爾蒙與營養評估，加速找回身體平衡。",
    courseTitle: "【前更年期必修】荷爾蒙重整與深層保養",
    faceInsight: "掃描偵測到兩頰些微異常泛紅與浮腫，眼白伴隨微血絲。這可能是血管舒縮症狀與代謝趨緩的表徵。",
    nutrition: "建議補充：大豆異黃酮、維生素 C、純魚油。植物性雌激素有助於緩解熱潮紅；魚油能對抗身體潛在的發炎狀況。",
  },
};

function ResultContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<ResultData | null>(null);

  useEffect(() => {
    // 優先使用 Gemini 生成的結果
    const stored = sessionStorage.getItem("assessmentResult");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ResultData;
        setData(parsed);
        return;
      } catch {
        // JSON 解析失敗，繼續 fallback
      }
    }

    // fallback：使用規則計算的類型或 URL 參數
    const fallbackType =
      (sessionStorage.getItem("assessmentFallbackType") as "A" | "B" | "C") ||
      (searchParams.get("type") as "A" | "B" | "C") ||
      "A";
    setData(FALLBACK_CONTENT[fallbackType]);
  }, [searchParams]);

  if (!data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        載入中...
      </div>
    );
  }

  const isSevere = data.type === "C";

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.label}>AI 綜合評估報告</div>
        <h1 className={styles.title}>
          您的當前狀態屬於：<br />
          <span className={styles.highlight}>{data.title}</span>
        </h1>
      </header>

      <section className={styles.scanSection}>
        <div className={styles.scanBox}>
          <div className={styles.scanHeader}>
            <span className={styles.scanIcon}>🔬</span> 臉部壓力醇分析特徵
          </div>
          <p className={styles.scanText}>{data.faceInsight}</p>
        </div>
      </section>

      <section className={styles.cardSection}>
        <div className={styles.resultCard}>
          <p className={styles.paragraph}>{data.description}</p>
          <div className={styles.divider}></div>
          <h3 className={styles.adviceTitle}>💡 專屬營養素補充建議</h3>
          <p className={styles.nutritionText}>{data.nutrition}</p>
          <div className={styles.divider}></div>
          <h3 className={styles.adviceTitle}>💡 女人療心室的建議</h3>
          <p className={styles.paragraph}>{data.advice}</p>
        </div>
      </section>

      <section className={styles.courseSection}>
        <CourseCard
          title={data.courseTitle}
          description="由鄧雯心醫師帶領，結合專業醫學知識與正念心理，循序漸進改善您的身心困擾。"
          href="/courses"
        />

        {isSevere && (
          <div className={styles.clinicAlert}>
            <p>⚠️ 由於您的生理不適較為明顯，推薦同步預約鄧雯心醫師門診，進行整體醫療評估。</p>
            <Link
              href="https://events.cofit.me/genesis-Dr-Wen-Shin-Teng-20394"
              target="_blank"
              className={styles.clinicButton}
            >
              了解門診資訊
            </Link>
          </div>
        )}
      </section>

      <div className={styles.actionGroup}>
        <Link href="/" className={styles.backHomeBtn}>返回首頁，使用其他舒緩工具</Link>
      </div>
    </div>
  );
}

export default function AssessmentResult() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResultContent />
    </Suspense>
  );
}
