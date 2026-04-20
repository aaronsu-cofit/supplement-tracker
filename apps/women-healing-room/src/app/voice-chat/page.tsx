"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./VoiceChat.module.css";

export default function VoiceChat() {
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const [transcript, setTranscript] = useState("");
  const [aiMessage, setAiMessage] = useState("嗨！妳今天過得好嗎？不論是因為失眠、壓力，還是突如其來的情緒波動，都可以直接按著麥克風對我說喔。");

  // 載入系統語音庫
  const [voices, setVoices] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const loadVoices = () => {
        setVoices(window.speechSynthesis.getVoices());
      };
      window.speechSynthesis.onvoiceschanged = loadVoices;
      loadVoices();
    }
  }, []);
  // 但由於瀏覽器政策，通常需要點擊互動後才能播放聲音。所以我們先不自動播放。

  const analyzeAndRespond = (text: string) => {
    setIsThinking(true);
    const keywords = {
      grief: ["狗", "貓", "寵物", "走", "離", "離世", "過世", "死", "不見", "痛", "想念"],
      burnout: ["累", "疲", "煩", "壓力", "忙", "喘不過氣", "無力", "工作"],
      anger: ["氣", "怒", "不爽", "討厭", "恨", "生氣", "火", "爆炸"],
      body: ["熱", "汗", "痛", "不舒服", "病", "暈", "燥", "盜汗", "心悸"],
      sleep: ["睡不好", "失眠", "睡不著", "半夜", "醒來"]
    };
    
    let responseText = "謝謝妳跟我說這些。這些感受都是很真實的，妳絕對不孤單。如果覺得累了，我們網站裡有準備舒緩放鬆的練習，要不要試試看？";
    
    if (keywords.grief.some(k => text.includes(k))) {
      responseText = "我懂那種失去摯愛的痛。不需要壓抑悲傷，想哭的時候就盡情哭出來吧，這段日子請溫柔地陪著自己，我會一直在這裡聽妳說。";
    } else if (keywords.burnout.some(k => text.includes(k))) {
      responseText = "妳最近真的辛苦了！大腦和身體都在發出罷工的警訊。今天的妳已經足夠努力了，請把重擔暫時放下，好好疼愛自己一下吧。";
    } else if (keywords.anger.some(k => text.includes(k))) {
      responseText = "受到荷爾蒙波動影響，神經系統有時候會變得異常敏感，生氣和煩躁都是正常的！試著深呼吸，把體內的濁氣吐出來，不用覺得自責。";
    } else if (keywords.body.some(k => text.includes(k))) {
      responseText = "身體的種種不適確實非常消耗能量。妳的身體目前正在經歷一場巨大的轉變，請多給她一點包容。去喝杯溫熱的水，做點輕柔的伸展，好嗎？";
    } else if (keywords.sleep.some(k => text.includes(k))) {
      responseText = "睡不著總讓人特別焦慮對吧？但沒關係，越著急反而越難入睡喔。今晚試著去「今晚睡好點」做個大腦放鬆，給自己一個不受打擾的睡眠儀式。";
    }

    setTimeout(() => {
      setIsThinking(false);
      setAiMessage(responseText);
      speak(responseText);
    }, 1500);
  };

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    
    // 中斷當前所有的語音
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-TW";
    
    // 過濾出中文的語音
    const zhVoices = voices.filter(v => v.lang.includes('zh-TW') || v.lang.includes('zh_TW'));
    
    // 優先尋找高音質的女性人聲 (蘋果的 Mei-Jia / 微軟的 Yating / Google 女聲)
    const bestVoice = zhVoices.find(v => 
      v.name.includes('Mei-Jia') || 
      v.name.includes('Yating') || 
      v.name.includes('Google') || 
      v.name.includes('Premium') || 
      v.name.includes('Enhanced')
    ) || zhVoices[0];

    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    utterance.pitch = 1.1; // 稍微輕柔的女聲頻率
    utterance.rate = 0.95; // 放慢 5% 讓語意更溫柔、不像機器人
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    // 停止 AI 當前講話
    if (window.speechSynthesis) {
       window.speechSynthesis.cancel();
       setIsSpeaking(false);
    }

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("抱歉，您的設備瀏覽器（如舊版或是未開放權限的環境）不支援語音辨識。請測試使用最新的 Safari / Chrome 瀏覽器喔！");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "zh-TW";
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("正在聆聽中...");
      setAiMessage("");
    };

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      analyzeAndRespond(text);
    };

    recognition.onerror = (event: any) => {
      console.error(event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
         setTranscript('無法取得麥克風權限，請於瀏覽器設定中解鎖。');
      } else {
         setTranscript('沒有聽清楚，請再試一次。');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.closeBtn}>✕ 結束會談</Link>
      </header>

      <div className={styles.chatArea}>
        {/* User Bubble */}
        <div className={`${styles.bubble} ${styles.userBubble} ${transcript ? styles.show : ''}`}>
           {transcript}
        </div>

        {/* AI Thought State */}
        {isThinking && (
           <div className={`${styles.bubble} ${styles.aiBubble} ${styles.thinking}`}>
             <div className={styles.dot}></div>
             <div className={styles.dot}></div>
             <div className={styles.dot}></div>
           </div>
        )}

        {/* AI Answer Bubble */}
        {aiMessage && !isThinking && (
           <div className={`${styles.bubble} ${styles.aiBubble} ${styles.show}`}>
             {aiMessage}
           </div>
        )}
      </div>

      <div className={styles.controlArea}>
        <p className={styles.hintText}>
          {isSpeaking ? "正在回覆您..." : isListening ? "我正在聽，請說..." : "點擊下方圖示對我說話"}
        </p>

        <button 
          className={`${styles.micButton} ${isListening ? styles.activeMic : ''} ${isSpeaking ? styles.speakingMic : ''}`}
          onClick={startListening}
        >
          <div className={styles.ripple1}></div>
          <div className={styles.ripple2}></div>
          <span className={styles.micIcon}>🎙️</span>
        </button>
      </div>
    </div>
  );
}
