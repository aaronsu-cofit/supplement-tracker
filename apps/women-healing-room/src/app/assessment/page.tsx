"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Assessment.module.css";
import Link from "next/link";
import { apiFetch } from '@vitera/lib';

const questions = [
  {
    title: "最近一週，您特別有感的是哪一種情緒狀態？",
    options: [
      { text: "腦袋好像停不下來，一直盤算著待辦事項", type: "A" },
      { text: "心情起伏變大，容易因為小事覺得煩躁或低落", type: "B" },
      { text: "相比情緒，更覺得身體沉重、莫名的倦怠", type: "C" },
    ],
  },
  {
    title: "回想最近幾天的睡眠狀況，您比較常遇到哪個問題？",
    options: [
      { text: "躺在床上思緒亂轉，很難入睡", type: "A" },
      { text: "睡前常常覺得心裡悶悶的，或者有些焦慮", type: "B" },
      { text: "容易因為身體燥熱、心悸或頻尿而醒來", type: "C" },
    ],
  },
  {
    title: "遇到比較大的壓力時，您通常會產生什麼反應？",
    options: [
      { text: "變得非常緊繃，肌肉容易痠痛（如肩頸、頭痛）", type: "A" },
      { text: "忍不住想發脾氣，或是必須大哭一場", type: "B" },
      { text: "突然覺得非常疲憊，甚至出現不規律的心跳", type: "C" },
    ],
  },
  {
    title: "對於以前喜歡做的事情或興趣，您現在的態度是？",
    options: [
      { text: "總覺得沒時間，想要先把「該做的事」做完", type: "A" },
      { text: "常常提不起勁，覺得做什麼都沒意思", type: "B" },
      { text: "只要體力許可就想做，但常常覺得力不從心", type: "C" },
    ],
  },
  {
    title: "您覺得最近自己的專注力或記憶力有改變嗎？",
    options: [
      { text: "因為心裡掛念太多事，很難專注在當下", type: "A" },
      { text: "一旦情緒上來，就完全無法思考", type: "B" },
      { text: "明顯覺得記憶力減退，常有「斷片」或忘東忘西的感覺", type: "C" },
    ],
  },
  {
    title: "在與家人或同事相處時，您最近比較常發生什麼狀況？",
    options: [
      { text: "對別人的速度或效率感到不耐煩", type: "A" },
      { text: "覺得別人都不懂我的辛苦，容易感到委屈", type: "B" },
      { text: "講話講到一半突然覺得很累、或是喘不過氣", type: "C" },
    ],
  },
  {
    title: "如果這個週末完全沒有安排，您的第一反應是？",
    options: [
      { text: "有點焦慮，覺得是不是太廢了、應該做點什麼", type: "A" },
      { text: "因為終於不用面對別人而鬆了一口氣", type: "B" },
      { text: "只想狂睡，因為平常身體已經透支了", type: "C" },
    ],
  },
  {
    title: "最後一題：您目前最希望能獲得哪一種幫助？",
    options: [
      { text: "希望能學會關掉腦袋的開關，好好放鬆", type: "A" },
      { text: "希望情緒能平穩一點，找回內心的平靜", type: "B" },
      { text: "希望能改善身體各種不知名的不舒服與熱潮紅", type: "C" },
    ],
  },
];

interface Answer {
  question: string;
  selected: string;
  type: "A" | "B" | "C";
}

export default function Assessment() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [scores, setScores] = useState({ A: 0, B: 0, C: 0 });
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSelect = async (type: "A" | "B" | "C") => {
    const newScores = { ...scores, [type]: scores[type] + 1 };
    const newAnswers: Answer[] = [
      ...answers,
      {
        question: questions[currentStep].title,
        selected: questions[currentStep].options.find((o) => o.type === type)?.text || "",
        type,
      },
    ];

    setScores(newScores);
    setAnswers(newAnswers);

    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
      return;
    }

    // 最後一題：呼叫 Gemini 分析
    setIsAnalyzing(true);

    const scanInsight = sessionStorage.getItem("scanInsight") || "";
    const minDelay = new Promise<void>((resolve) => setTimeout(resolve, 2500));

    const apiCall = (async () => {
      try {
        const res = await apiFetch("/api/women/assessment/analyze", {
          method: "POST",
          body: JSON.stringify({ scores: newScores, scanInsight, answers: newAnswers }),
        });
        if (!res.ok) throw new Error("API error");
        const result = await res.json();
        sessionStorage.setItem("assessmentResult", JSON.stringify(result));
      } catch {
        // fallback：清除舊資料，讓 result 頁用規則計算
        sessionStorage.removeItem("assessmentResult");
        const type =
          newScores.B > newScores.A && newScores.B > newScores.C
            ? "B"
            : newScores.C > newScores.A && newScores.C > newScores.B
            ? "C"
            : "A";
        sessionStorage.setItem("assessmentFallbackType", type);
      }
    })();

    await Promise.all([minDelay, apiCall]);
    router.push("/assessment/result");
  };

  if (isAnalyzing) {
    return (
      <div className={styles.analyzingContainer}>
        <div className={styles.spinner}></div>
        <h2 className={styles.analyzingText}>女人療心室 AI 分析中...</h2>
        <p className={styles.analyzingSub}>正在為您綜合評估睡眠、情緒與臉部指標</p>
      </div>
    );
  }

  const progressPercentage = ((currentStep + 1) / questions.length) * 100;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.backButton}>← 返回</Link>
        <div className={styles.progressText}>{currentStep + 1} / {questions.length}</div>
      </header>

      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progressPercentage}%` }}></div>
      </div>

      <div className={styles.questionSection}>
        <h2 className={styles.questionTitle}>{questions[currentStep].title}</h2>
      </div>

      <div className={styles.optionsSection}>
        {questions[currentStep].options.map((opt, i) => (
          <button
            key={i}
            className={styles.optionButton}
            onClick={() => handleSelect(opt.type as "A" | "B" | "C")}
          >
            {opt.text}
          </button>
        ))}
      </div>
    </div>
  );
}
