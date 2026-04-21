"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./Breathing.module.css";

export default function BreathingExercise() {
  const router = useRouter();
  const [phase, setPhase] = useState<"吸氣" | "屏息" | "吐氣">("吸氣");
  const [timeLeft, setTimeLeft] = useState(4);
  const [cycles, setCycles] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev > 1) return prev - 1;

        // Transition logic
        if (phase === "吸氣") {
          setPhase("屏息");
          return 7;
        } else if (phase === "屏息") {
          setPhase("吐氣");
          return 8;
        } else {
          setPhase("吸氣");
          setCycles((c) => c + 1);
          return 4;
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase]);

  // Finish after 3 cycles (about 1 minute)
  useEffect(() => {
    if (cycles >= 3) {
      router.push("/relief/complete");
    }
  }, [cycles, router]);

  const circleClass = phase === "吸氣" ? styles.breatheIn : phase === "屏息" ? styles.hold : styles.breatheOut;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/relief" className={styles.closeButton}>✕</Link>
      </header>

      <div className={styles.mainContent}>
        <h2 className={styles.title}>4-7-8 呼吸法</h2>
        <p className={styles.subtitle}>請跟著頻率，找回平靜</p>

        <div className={styles.animationArea}>
           <div className={`${styles.circle} ${circleClass}`}>
             <div className={styles.phaseText}>{phase}</div>
             <div className={styles.timerText}>{timeLeft}</div>
           </div>
        </div>
        
        <p className={styles.instruction}>
          {phase === "吸氣" && "用鼻子穩穩吸氣，感受腹部隆起"}
          {phase === "屏息" && "閉氣，讓氧氣在體內循環"}
          {phase === "吐氣" && "從嘴巴緩緩吐氣，釋放所有壓力"}
        </p>

        <p className={styles.cycleText}>已完成 {cycles}/3 次循環</p>

      </div>
      
      <button onClick={() => router.push("/relief/complete")} className={styles.skipBtn}>
        提早結束練習
      </button>
    </div>
  );
}
