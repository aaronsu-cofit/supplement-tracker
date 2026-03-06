'use client';
import { apiFetch } from '@vitera/lib';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@vitera/lib';

const getNrsColor = (s) => s <= 3 ? '#2ed573' : s <= 6 ? '#ffa502' : '#ff4757';

export default function WoundScanPage() {
    const router = useRouter();
    const { user } = useAuth();
    const fileInputRef = useRef(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [nrsScore, setNrsScore] = useState(0);
    const [symptoms, setSymptoms] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const symptomOptions = ['局部發熱', '有異味', '滲出液增加', '邊緣紅腫', '皆無'];

    const compressImage = (file, maxWidth = 800, quality = 0.7) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;
                    if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
                    canvas.width = width; canvas.height = height;
                    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleImageCapture = async (e) => {
        const file = e.target.files?.[0];
        if (file) { setImagePreview(await compressImage(file)); }
    };

    const toggleSymptom = (symptom) => {
        if (symptom === '皆無') { setSymptoms(['皆無']); return; }
        setSymptoms(prev => {
            const c = prev.filter(s => s !== '皆無');
            return c.includes(symptom) ? c.filter(s => s !== symptom) : [...c, symptom];
        });
    };

    const handleSubmit = async () => {
        if (!imagePreview) return alert('請先拍攝或上傳傷口照片');
        setIsAnalyzing(true);
        try {
            const response = await apiFetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: imagePreview.split(',')[1],
                    prompt: `這是一張傷口照片。請分析傷口的復原狀況。
                患者回報的疼痛指數 (NRS): ${nrsScore}/10。
                患者回報的症狀: ${symptoms.join(', ')}。
                請勿給出絕對醫療診斷，請使用情境描述。`
                })
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || 'AI Analysis failed');

            const woundsRes = await apiFetch('/api/wounds');
            let woundsData = [];
            if (woundsRes.ok) woundsData = await woundsRes.json();

            let woundId;
            if (woundsData.length === 0) {
                const newWoundRes = await apiFetch('/api/wounds', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: user?.displayName ? `${user.displayName}的傷口` : '追蹤中傷口',
                        display_name: user?.displayName || null,
                        picture_url: user?.pictureUrl || null,
                    })
                });
                const newWound = await newWoundRes.json();
                woundId = newWound.id;
            } else {
                woundId = woundsData[0].id;
            }

            const logRes = await apiFetch(`/api/wounds/${woundId}/logs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image_data: imagePreview,
                    nrs_pain_score: nrsScore,
                    symptoms: symptoms.join(','),
                    ai_assessment_summary: data.analysis || '無法辨識',
                    ai_status_label: data.ai_status_label || '需多加留意觀察',
                })
            });
            if (!logRes.ok) throw new Error('Failed to save wound log');

            try {
                const statusEmoji = data.ai_status_label?.includes('穩定') ? '🟢' : '🟡';
                await apiFetch('/api/notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: `🩹 傷口照護紀錄完成\n\n${statusEmoji} AI 評估：${data.ai_status_label || '已分析'}\n🌡️ 疼痛指數：${nrsScore}/10\n📝 症狀：${symptoms.join(', ')}\n\n請持續追蹤傷口狀態，祝您早日康復！`
                    })
                });
            } catch (notifyErr) {
                console.log('LINE notification skipped:', notifyErr.message);
            }

            router.push(`/result?logId=latest&woundId=${woundId}`);
        } catch (error) {
            alert('發生錯誤: ' + (error.message || JSON.stringify(error)));
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (isAnalyzing) {
        return (
            <div className="p-8 text-center mt-[25vh]">
                <div className="text-[3.5rem] animate-float drop-shadow-[0_0_20px_rgba(255,154,158,0.4)]">🪄</div>
                <h3 className="mt-6 text-w-pink text-[1.1rem]">AI 正在分析傷口狀態...</h3>
                <p className="text-white/40 text-[0.9rem]">正在綜合評估客觀影像與您的感受</p>
                <div className="w-[200px] h-1 bg-white/[0.06] rounded mx-auto mt-6 overflow-hidden">
                    <div className="w-[40%] h-full bg-w-gradient rounded animate-shimmer" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-[1.2rem]">
            <h2 className="text-white text-[1.15rem] font-bold mb-6">📝 今日照護紀錄</h2>

            {/* 1. Camera */}
            <div className="mb-[1.8rem]">
                <div className="flex items-center gap-[0.6rem] text-[0.95rem] text-white/70 font-semibold mb-[0.8rem]">
                    <span className="w-6 h-6 rounded-lg bg-w-gradient text-white text-[0.75rem] font-extrabold inline-flex items-center justify-center shrink-0">1</span>
                    拍攝傷口照片
                </div>
                {!imagePreview ? (
                    <div
                        onClick={() => fileInputRef.current.click()}
                        className="bg-white/[0.03] border-2 border-dashed border-w-pink/25 rounded-[18px] py-12 px-4 text-center cursor-pointer transition-all duration-200"
                    >
                        <div className="text-[2.5rem] mb-2 drop-shadow-[0_2px_10px_rgba(255,154,158,0.3)]">📸</div>
                        <div className="font-bold text-w-pink">點擊拍攝或上傳</div>
                        <div className="text-[0.8rem] text-white/30 mt-2">請在光線明亮處拍攝</div>
                    </div>
                ) : (
                    <div className="relative rounded-2xl overflow-hidden">
                        <img src={imagePreview} alt="Wound Preview" className="w-full rounded-2xl max-h-[280px] object-cover border border-white/10" />
                        <button
                            onClick={() => setImagePreview(null)}
                            className="absolute top-[10px] right-[10px] bg-black/60 backdrop-blur-[10px] text-white border border-white/10 rounded-full w-8 h-8 cursor-pointer text-[0.9rem] flex items-center justify-center"
                        >✕</button>
                    </div>
                )}
                <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleImageCapture} className="hidden" />
            </div>

            {/* 2. NRS */}
            <div className="mb-[1.8rem]">
                <div className="flex items-center gap-[0.6rem] text-[0.95rem] text-white/70 font-semibold mb-[0.8rem]">
                    <span className="w-6 h-6 rounded-lg bg-w-gradient text-white text-[0.75rem] font-extrabold inline-flex items-center justify-center shrink-0">2</span>
                    疼痛指數 (NRS)
                </div>
                <div className="bg-white/[0.04] border border-white/[0.06] p-[1.2rem] rounded-2xl">
                    <div className="flex justify-between mb-[0.6rem]">
                        <span className="text-[0.8rem] text-white/40">無痛</span>
                        <span className="text-[1.5rem] font-extrabold" style={{ color: getNrsColor(nrsScore), textShadow: `0 0 20px ${getNrsColor(nrsScore)}40` }}>{nrsScore}</span>
                        <span className="text-[0.8rem] text-white/40">劇痛</span>
                    </div>
                    <input
                        type="range" min="0" max="10" step="1"
                        value={nrsScore}
                        onChange={(e) => setNrsScore(parseInt(e.target.value))}
                        className="w-full h-[6px]"
                        style={{ accentColor: getNrsColor(nrsScore) }}
                    />
                    <div className="flex justify-between mt-[0.3rem]">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                            <span key={n} className="text-[0.6rem] text-white/20 w-5 text-center">{n}</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* 3. Symptoms */}
            <div className="mb-8">
                <div className="flex items-center gap-[0.6rem] text-[0.95rem] text-white/70 font-semibold mb-[0.8rem]">
                    <span className="w-6 h-6 rounded-lg bg-w-gradient text-white text-[0.75rem] font-extrabold inline-flex items-center justify-center shrink-0">3</span>
                    異常症狀觀察
                </div>
                <div className="flex flex-wrap gap-2">
                    {symptomOptions.map(sym => (
                        <button
                            key={sym}
                            onClick={() => toggleSymptom(sym)}
                            className={`px-4 py-[0.55rem] rounded-[24px] cursor-pointer text-[0.85rem] transition-all duration-200 ${
                                symptoms.includes(sym)
                                    ? 'border border-w-pink/50 bg-gradient-to-br from-w-pink/25 to-w-coral/20 text-w-pink font-semibold'
                                    : 'border border-white/10 bg-white/[0.04] text-white/50 font-normal'
                            }`}
                        >{sym}</button>
                    ))}
                </div>
            </div>

            <button
                onClick={handleSubmit}
                disabled={!imagePreview}
                className={`w-full p-4 rounded-[50px] font-bold text-[1.05rem] transition-all duration-300 ${
                    imagePreview
                        ? 'bg-w-gradient text-white border-none shadow-[0_4px_20px_rgba(255,154,158,0.35)] cursor-pointer'
                        : 'bg-white/[0.06] text-white/20 border border-white/[0.06] cursor-not-allowed'
                }`}
            >
                送出 AI 分析
            </button>
        </div>
    );
}
