'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function WoundScanPage() {
    const router = useRouter();
    const fileInputRef = useRef(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [nrsScore, setNrsScore] = useState(0); // 0-10 pain scale
    const [symptoms, setSymptoms] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const symptomOptions = ['局部發熱', '有異味', '滲出液增加', '邊緣紅腫', '皆無'];

    const handleImageCapture = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const toggleSymptom = (symptom) => {
        if (symptom === '皆無') {
            setSymptoms(['皆無']);
            return;
        }
        setSymptoms(prev => {
            const current = prev.filter(s => s !== '皆無');
            if (current.includes(symptom)) {
                return current.filter(s => s !== symptom);
            }
            return [...current, symptom];
        });
    };

    const handleSubmit = async () => {
        if (!imagePreview) return alert('請先拍攝或上傳傷口照片');
        setIsAnalyzing(true);
        try {
            // First, trigger AI Analysis (simulated logic for the scan component)
            // It will actually post to /api/analyze later
            const payload = {
                image: imagePreview.split(',')[1],
                prompt: `這是一張傷口照片。請分析傷口的復原狀況。
                患者回報的疼痛指數 (NRS): ${nrsScore}/10。
                患者回報的症狀: ${symptoms.join(', ')}。
                請勿給出絕對醫療診斷，請使用情境描述。`
            };

            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'AI Analysis failed');
            }

            // Next, we need to create/ensure a wound exists
            // We're simplifying V1 by fetching first wound or creating one
            const woundsRes = await fetch('/api/wounds');
            let woundsData = [];
            if (woundsRes.ok) woundsData = await woundsRes.json();
            
            let woundId;
            if (woundsData.length === 0) {
                 const newWoundRes = await fetch('/api/wounds', {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ name: '追蹤中傷口' })
                 });
                 const newWound = await newWoundRes.json();
                 woundId = newWound.id;
            } else {
                 woundId = woundsData[0].id;
            }

            // Finally, log the assessment to the DB
            const logRes = await fetch(`/api/wounds/${woundId}/logs`, {
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

            if (!logRes.ok) {
                const errData = await logRes.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to save wound log');
            }

            // Navigate to results
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
            <div style={{ padding: '2rem', textAlign: 'center', marginTop: '30vh' }}>
                <div style={{ fontSize: '3rem', animation: 'spin 2s linear infinite' }}>🪄</div>
                <h3 style={{ marginTop: '1rem', color: '#ff6b6b' }}>AI 正在分析傷口狀態...</h3>
                <p style={{ color: '#888' }}>正在綜合評估客觀影像與您的感受</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '1rem', fontFamily: 'sans-serif' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: '#333' }}>📝 今日照護紀錄</h2>

            {/* 1. Camera Input */}
            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', color: '#555', marginBottom: '0.8rem' }}>1. 拍攝傷口照片</h3>
                {!imagePreview ? (
                    <div 
                         onClick={() => fileInputRef.current.click()}
                         style={{
                            background: '#fff', border: '2px dashed #ff9a9e', borderRadius: '12px',
                            padding: '3rem 1rem', textAlign: 'center', cursor: 'pointer', color: '#ff6b6b'
                         }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📸</div>
                        <div style={{ fontWeight: 'bold' }}>點擊拍攝或上傳</div>
                        <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.5rem' }}>請在光線明亮處拍攝</div>
                    </div>
                ) : (
                    <div style={{ position: 'relative' }}>
                        <img src={imagePreview} alt="Wound Preview" style={{ width: '100%', borderRadius: '12px', maxHeight: '300px', objectFit: 'cover' }} />
                        <button 
                            onClick={() => setImagePreview(null)}
                            style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px' }}
                        >✕</button>
                    </div>
                )}
                <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    ref={fileInputRef} 
                    onChange={handleImageCapture} 
                    style={{ display: 'none' }} 
                />
            </div>

            {/* 2. NRS Pain Scale */}
            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', color: '#555', marginBottom: '0.8rem' }}>2. 疼痛指數 (NRS)</h3>
                <div style={{ background: '#fff', padding: '1rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.9rem', color: '#888' }}>無痛 (0)</span>
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: nrsScore > 6 ? '#ff6b6b' : '#333' }}>{nrsScore} 分</span>
                        <span style={{ fontSize: '0.9rem', color: '#888' }}>劇痛 (10)</span>
                    </div>
                    <input 
                        type="range" min="0" max="10" step="1" 
                        value={nrsScore} 
                        onChange={(e) => setNrsScore(parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: '#ff6b6b' }}
                    />
                </div>
            </div>

            {/* 3. Symptoms */}
            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', color: '#555', marginBottom: '0.8rem' }}>3. 異常症狀觀察</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {symptomOptions.map(sym => (
                        <button
                            key={sym}
                            onClick={() => toggleSymptom(sym)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '20px',
                                border: symptoms.includes(sym) ? 'none' : '1px solid #ddd',
                                background: symptoms.includes(sym) ? '#ff6b6b' : '#fff',
                                color: symptoms.includes(sym) ? '#fff' : '#666',
                                fontSize: '0.9rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            {sym}
                        </button>
                    ))}
                </div>
            </div>

            {/* Submit */}
            <button 
                onClick={handleSubmit}
                disabled={!imagePreview}
                style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '25px',
                    background: imagePreview ? 'linear-gradient(135deg, #ff9a9e 0%, #ff6a88 100%)' : '#ccc',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    boxShadow: imagePreview ? '0 4px 15px rgba(255, 106, 136, 0.4)' : 'none',
                    cursor: imagePreview ? 'pointer' : 'not-allowed'
                }}
            >
                送出 AI 分析
            </button>
            <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
