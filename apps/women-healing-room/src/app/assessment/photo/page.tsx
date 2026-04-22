"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./Photo.module.css";
import Link from "next/link";
import { apiFetch } from '@vitera/lib';

export default function PhotoScan() {
  const router = useRouter();
  const [step, setStep] = useState<"intro" | "readyToScan" | "scanning" | "done">("intro");
  const [scanText, setScanText] = useState("正在抓取臉部特徵點...");
  const [cameraError, setCameraError] = useState(false);
  const [cameraErrorType, setCameraErrorType] = useState<"denied" | "unsupported" | "error" | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraErrorType("unsupported");
      setCameraError(true);
      setStep("readyToScan");
      return;
    }

    try {
      // Check if permission was previously denied (Android won't re-prompt if denied)
      if (navigator.permissions) {
        try {
          const permStatus = await navigator.permissions.query({ name: "camera" as PermissionName });
          if (permStatus.state === "denied") {
            setCameraErrorType("denied");
            setCameraError(true);
            setStep("readyToScan");
            return;
          }
        } catch {
          // Permissions API not supported, proceed to getUserMedia
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      streamRef.current = stream;
      setStep("readyToScan");
    } catch (err: unknown) {
      console.error("Camera error:", err);
      const errorName = err instanceof Error ? err.name : "";
      if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
        setCameraErrorType("denied");
      } else {
        setCameraErrorType("error");
      }
      setCameraError(true);
      setStep("readyToScan");
    }
  };

  useEffect(() => {
    if ((step === "readyToScan" || step === "scanning") && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [step]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const triggerScan = async () => {
    setStep("scanning");
    setScanText("正在抓取臉部特徵點...");

    // 擷取當前畫面
    let imageBase64 = "";
    if (videoRef.current && !cameraError) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        imageBase64 = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
      }
    }

    // 動畫計時與 API 呼叫同步進行
    const animDelay = new Promise<void>((resolve) => {
      setTimeout(() => setScanText("正在分析眼窩暗沉度與壓力醇指標..."), 1500);
      setTimeout(() => setScanText("正在檢測皮膚微血管擴張程度..."), 3000);
      setTimeout(() => setScanText("運算嘴角兩側張力與下顎緊繃幅度..."), 4500);
      setTimeout(resolve, 6000);
    });

    const apiCall = (async () => {
      try {
        const res = await apiFetch("/api/women/assessment/scan", {
          method: "POST",
          body: JSON.stringify({ imageBase64 }),
        });
        const data = await res.json();
        sessionStorage.setItem("scanInsight", data.insight || "");
      } catch {
        sessionStorage.setItem("scanInsight", "");
      }
    })();

    await Promise.all([animDelay, apiCall]);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setStep("done");
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.closeBtn}>✕ 取消</Link>
      </header>

      {step === "intro" && (
        <div className={styles.content}>
          <div className={styles.cameraIcon}>📸</div>
          <h1 className={styles.title}>AI 臉部氣色分析</h1>
          <p className={styles.subtitle}>
            啟動相機後，系統將透過 AI 觀察您的眼周、膚色、肌肉張力等表徵，
            初步評估自律神經與壓力疲憊狀態。
            <br /><br />
            影像將透過加密 API 處理，不會儲存任何個人影像。
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
                {cameraErrorType === "denied" ? (
                  <>
                    🔒 相機權限遭拒絕<br />
                    請前往手機的<strong>設定 → 瀏覽器 → 權限 → 相機</strong>，
                    將此網站改為「允許」後重新整理頁面。
                  </>
                ) : cameraErrorType === "unsupported" ? (
                  <>
                    ⚠️ 瀏覽器不支援相機存取<br />
                    請使用 Chrome 或 Safari，並確認網站使用 HTTPS 連線。
                  </>
                ) : (
                  <>
                    ⚠️ 無法存取相機，已降級為模擬介面<br />
                    (請確認瀏覽器已給予相機權限)
                  </>
                )}
              </div>
            )}

            <div className={`${styles.scannerWrapper} ${step === "scanning" ? styles.activeScan : ""}`}>
              <div className={styles.faceOutline}></div>
              {step === "scanning" && (
                <>
                  <div className={styles.scanLine}></div>
                  <div className={styles.targetBox} style={{ top: "35%", left: "30%", width: "30px", height: "30px" }}></div>
                  <div className={styles.targetBox} style={{ top: "35%", right: "30%", width: "30px", height: "30px" }}></div>
                  <div className={styles.targetBox} style={{ bottom: "25%", left: "42%", width: "50px", height: "20px" }}></div>
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
                <h2 className={styles.scanTitle}>AI 分析中...</h2>
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
            臉部特徵已分析完畢，相機已自動關閉。
            <br /><br />
            接下來請完成 8 題問卷，系統將綜合兩份資料，生成您的個人化身心健康報告。
          </p>
          <button onClick={() => router.push("/assessment")} className={styles.actionBtn}>
            進入問卷分析
          </button>
        </div>
      )}
    </div>
  );
}
