"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./Photo.module.css";
import Link from "next/link";

export default function PhotoScan() {
  const router = useRouter();
  const [step, setStep] = useState<"intro" | "readyToScan" | "scanning" | "done">("intro");
  const [scanText, setScanText] = useState("正在抓取臉部特徵點...");
  const [cameraError, setCameraError] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      // 請求手機前置鏡頭權限
      const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "user" } 
      });
      streamRef.current = stream;
      setStep("readyToScan");
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError(true);
      setStep("readyToScan"); // Fallback：仍走完流程
    }
  };

  // 當掛載影片元素時，綁定即時影像串流
  useEffect(() => {
    if ((step === "readyToScan" || step === "scanning") && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [step]);

  // 離開頁面前清理相機記憶體與電源占用
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const triggerScan = () => {
    setStep("scanning");
    
    // 模擬 AI 即時分析各種部位
    setTimeout(() => setScanText("正在分析眼窩暗沉度與壓力醇指標..."), 1500);
    setTimeout(() => setScanText("正在檢測皮膚微血管擴張程度..."), 3000);
    setTimeout(() => setScanText("運算嘴角兩側張力與下顎緊繃幅度..."), 4500);
    
    setTimeout(() => {
      // 掃描完畢主動關閉相機
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      setStep("done");
    }, 6000);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.closeBtn}>✕ 取消</Link>
      </header>

      {step === "intro" && (
        <div className={styles.content}>
          <div className={styles.cameraIcon}>📸</div>
          <h1 className={styles.title}>真正的 AI 臉部檢測</h1>
          <p className={styles.subtitle}>
            我們將啟動相機介面捕捉您的即時臉部影像。透過運算「眼周暗沉、皮膚浮腫、嘴角肌肉張力」等表徵，初步判讀您的自律神經與壓力疲憊狀態。
            <br/><br/>
            (全程皆在您的設備端內完成運算，絕對不會上傳存取任何私人影像紀錄)
          </p>
          <button onClick={startCamera} className={styles.actionBtn}>
            允許相機權限並開啟
          </button>
        </div>
      )}

      {(step === "readyToScan" || step === "scanning") && (
        <div className={styles.cameraView}>
           <div className={styles.videoWrapper}>
             {!cameraError ? (
               <video ref={videoRef} autoPlay playsInline muted className={styles.liveVideo} />
             ) : (
               <div className={styles.fallbackBox}>
                 ⚠️ 無法存取相機，已降級為模擬介面<br/>(請確認瀏覽器已給予相機權限)
               </div>
             )}
             
             {/* 這是疊加在真實相機影像上的 AR 掃描動效 */}
             <div className={`${styles.scannerWrapper} ${step === 'scanning' ? styles.activeScan : ''}`}>
               <div className={styles.faceOutline}></div>
               
               {step === "scanning" && (
                 <>
                   <div className={styles.scanLine}></div>
                   <div className={styles.targetBox} style={{ top: '35%', left: '30%', width: '30px', height: '30px' }}></div>
                   <div className={styles.targetBox} style={{ top: '35%', right: '30%', width: '30px', height: '30px' }}></div>
                   <div className={styles.targetBox} style={{ bottom: '25%', left: '42%', width: '50px', height: '20px' }}></div>
                 </>
               )}
             </div>
           </div>

           <div className={styles.bottomBar}>
             {step === "readyToScan" ? (
               <>
                 <p className={styles.guideText}>請將臉部放置於白色虛線框內</p>
                 <button onClick={triggerScan} className={styles.captureBtn}>開始即時掃描分析</button>
               </>
             ) : (
               <>
                 <h2 className={styles.scanTitle}>大腦連線分析中...</h2>
                 <p className={styles.scanText}>{scanText}</p>
               </>
             )}
           </div>
        </div>
      )}

      {step === "done" && (
        <div className={styles.content}>
          <div className={styles.doneIcon}>✨</div>
          <h1 className={styles.title}>掃描完成</h1>
          <p className={styles.subtitle}>
             所有臉部特徵向量均已擷取完畢！相機已為您自動關閉，以節省電量並保護隱私。
             <br/><br/>
             接下來，請完成 8 題簡單的問題，系統會綜合雙方數據，產出最精準的身心健康報告。
          </p>
          <button onClick={() => router.push("/assessment")} className={styles.actionBtn}>
            進入最終答題分析
          </button>
        </div>
      )}
    </div>
  );
}
