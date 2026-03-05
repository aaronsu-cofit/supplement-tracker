'use client';
import { apiFetch } from '@cofit/lib';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@cofit/lib';

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
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleImageCapture = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const compressed = await compressImage(file);
            setImagePreview(compressed);
        }
    };

    const toggleSymptom = (symptom) => {
        if (symptom === '皆無') { setSymptoms(['皆無']); return; }
        setSymptoms(prev => {
            const current = prev.filter(s => s !== '皆無');
            return current.includes(symptom) ? current.filter(s => s !== symptom) : [...current, symptom];
        });
    };

    const getNrsColor = (score) => {
        if (score <= 3) return '#2ed573';
        if (score <= 6) return '#ffa502';
        return '#ff4757';
    };

    const handleSubmit = async () => {
        if (!imagePreview) return alert('請先拍攝或上傳傷口照片');
        setIsAnalyzing(true);
        try {
            const payload = {
                image: imagePreview.split(',')[1],
                prompt: `這是一張傷口照片。請分析傷口的復原狀況。
                患者回報的疼痛指數 (NRS): ${nrsScore}/10。
                患者回報的症狀: ${symptoms.join(', ')}。
                請勿給出絕對醫療診斷，請使用情境描述。`
            };

            const response = await apiFetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
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

            router.push(`/wounds/result?logId=latest&woundId=${woundId}`);
        } catch (error) {
            console.error(error);
            alert('發生錯誤: ' + (error.message || JSON.stringify(error)));
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (isAnalyzing) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', marginTop: '25vh' }}>
                <div style={styles.analyzeIcon}>🪄</div>
                <h3 style={{ marginTop: '1.5rem', color: '#ff9a9e', fontSize: '1.1rem' }}>AI 正在分析傷口狀態...</h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>正在綜合評估客觀影像與您的感受</p>
                <div style={styles.analyzeBar}>
                    <div style={styles.analyzeBarFill}></div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '1.2rem', fontFamily: "'Inter', 'SF Pro', sans-serif" }}>
            <h2 style={styles.pageTitle}>📝 今日照護紀錄</h2>

            {/* 1. Camera Input */}
            <div style={{ marginBottom: '1.8rem' }}>
                <div style={styles.stepLabel}>
                    <span style={styles.stepNumber}>1</span>
                    拍攝傷口照片
                </div>
                {!imagePreview ? (
                    <div onClick={() => fileInputRef.current.click()} style={styles.uploadZone}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem', filter: 'drop-shadow(0 2px 10px rgba(255,154,158,0.3))' }}>📸</div>
                        <div style={{ fontWeight: 700, color: '#ff9a9e' }}>點擊拍攝或上傳</div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.5rem' }}>請在光線明亮處拍攝</div>
                    </div>
                ) : (
                    <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden' }}>
                        <img src={imagePreview} alt="Wound Preview" style={{ width: '100%', borderRadius: '16px', maxHeight: '280px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
                        <button onClick={() => setImagePreview(null)} style={styles.removeBtn}>✕</button>
                    </div>
                )}
                <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleImageCapture} style={{ display: 'none' }} />
            </div>

            {/* 2. NRS Pain Scale */}
            <div style={{ marginBottom: '1.8rem' }}>
                <div style={styles.stepLabel}>
                    <span style={styles.stepNumber}>2</span>
                    疼痛指數 (NRS)
                </div>
                <div style={styles.glassCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>無痛</span>
                        <span style={{
                            fontSize: '1.5rem', fontWeight: 800,
                            color: getNrsColor(nrsScore),
                            textShadow: `0 0 20px ${getNrsColor(nrsScore)}40`,
                        }}>{nrsScore}</span>
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>劇痛</span>
                    </div>
                    <input
                        type="range" min="0" max="10" step="1"
                        value={nrsScore}
                        onChange={(e) => setNrsScore(parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: getNrsColor(nrsScore), height: '6px' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                            <span key={n} style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', width: '20px', textAlign: 'center' }}>{n}</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* 3. Symptoms */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={styles.stepLabel}>
                    <span style={styles.stepNumber}>3</span>
                    異常症狀觀察
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {symptomOptions.map(sym => (
                        <button
                            key={sym}
                            onClick={() => toggleSymptom(sym)}
                            style={{
                                padding: '0.55rem 1rem',
                                borderRadius: '24px',
                                border: symptoms.includes(sym) ? '1px solid rgba(255,154,158,0.5)' : '1px solid rgba(255,255,255,0.1)',
                                background: symptoms.includes(sym) ? 'linear-gradient(135deg, rgba(255,154,158,0.25), rgba(253,164,133,0.2))' : 'rgba(255,255,255,0.04)',
                                color: symptoms.includes(sym) ? '#ff9a9e' : 'rgba(255,255,255,0.5)',
                                fontSize: '0.85rem',
                                fontWeight: symptoms.includes(sym) ? 600 : 400,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            {sym}
                        </button>
                    ))}
                </div>
            </div>

            {/* Submit Button */}
            <button
                onClick={handleSubmit}
                disabled={!imagePreview}
                style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '50px',
                    background: imagePreview ? 'linear-gradient(135deg, #ff9a9e, #fda085)' : 'rgba(255,255,255,0.06)',
                    color: imagePreview ? '#fff' : 'rgba(255,255,255,0.2)',
                    border: imagePreview ? 'none' : '1px solid rgba(255,255,255,0.06)',
                    fontWeight: 700,
                    fontSize: '1.05rem',
                    boxShadow: imagePreview ? '0 4px 20px rgba(255,154,158,0.35)' : 'none',
                    cursor: imagePreview ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s',
                }}
            >
                送出 AI 分析
            </button>

            <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
                @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
                @keyframes floatEmoji { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-10px) rotate(5deg); } }
            `}</style>
        </div>
    );
}

const styles = {
    pageTitle: {
        fontSize: '1.15rem', marginBottom: '1.5rem', color: '#fff', fontWeight: 700,
    },
    stepLabel: {
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.8rem', fontWeight: 600,
    },
    stepNumber: {
        width: '24px', height: '24px',
        borderRadius: '8px',
        background: 'linear-gradient(135deg, #ff9a9e, #fda085)',
        color: '#fff', fontSize: '0.75rem', fontWeight: 800,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    },
    uploadZone: {
        background: 'rgba(255,255,255,0.03)',
        border: '2px dashed rgba(255,154,158,0.25)',
        borderRadius: '18px',
        padding: '3rem 1rem',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'border-color 0.2s, background 0.2s',
    },
    removeBtn: {
        position: 'absolute', top: '10px', right: '10px',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
        color: 'white', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '50%', width: '32px', height: '32px',
        cursor: 'pointer', fontSize: '0.9rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    glassCard: {
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '1.2rem',
        borderRadius: '16px',
    },
    analyzeIcon: {
        fontSize: '3.5rem',
        animation: 'floatEmoji 2s ease-in-out infinite',
        filter: 'drop-shadow(0 0 20px rgba(255,154,158,0.4))',
    },
    analyzeBar: {
        width: '200px', height: '4px',
        background: 'rgba(255,255,255,0.06)',
        borderRadius: '4px',
        margin: '1.5rem auto 0',
        overflow: 'hidden',
    },
    analyzeBarFill: {
        width: '40%', height: '100%',
        background: 'linear-gradient(90deg, #ff9a9e, #fda085)',
        borderRadius: '4px',
        animation: 'shimmer 1.5s infinite',
    },
};
