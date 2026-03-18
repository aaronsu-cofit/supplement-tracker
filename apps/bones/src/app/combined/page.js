'use client';
import { apiFetch } from '@vitera/lib';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Bot, AlertTriangle, CheckCircle, ShoppingBag } from 'lucide-react';

const SEVERITY_LABELS = { normal: '正常', mild: '輕度外翻', moderate: '中度外翻', severe: '重度外翻' };
const SEVERITY_BADGE = {
    normal:   'bg-emerald-100 text-emerald-700',
    mild:     'bg-blue-100 text-blue-700',
    moderate: 'bg-amber-100 text-amber-700',
    severe:   'bg-red-100 text-red-700',
};
const RISK_LABELS  = { low: '低風險', moderate: '中等風險', high: '高風險' };
const RISK_BADGE   = { low: 'bg-emerald-100 text-emerald-700', moderate: 'bg-amber-100 text-amber-700', high: 'bg-red-100 text-red-700' };
const WEAR_LABELS  = {
    medial_forefoot: '前掌內側磨損', lateral: '外側磨損',
    heel_center: '後跟中央磨損', toe_asymmetric: '前趾不對稱磨損',
    uniform: '均勻磨損', mixed: '複合磨損',
};

function getCombinedRecommendation(footSeverity, shoeRisk) {
    if (footSeverity === 'severe') {
        return {
            level: 'urgent',
            title: '建議盡快就醫評估',
            body: '外翻程度已達重度，且鞋底磨損顯示步態異常持續施壓。建議諮詢骨科或足科醫師，評估保守治療或手術介入的必要性。',
        };
    }
    if (footSeverity === 'moderate' && shoeRisk === 'high') {
        return {
            level: 'urgent',
            title: '建議盡快就醫評估',
            body: '中度外翻合併高風險步態磨損，兩者相互加劇。建議儘快諮詢足科醫師，並停止穿著加速磨損的鞋款。',
        };
    }
    if (footSeverity === 'moderate' || shoeRisk === 'high') {
        return {
            level: 'warning',
            title: '建議積極介入處理',
            body: '目前狀況需要主動改善。建議選用寬楦頭鞋款、搭配足弓矯正鞋墊，並考慮諮詢復健科或物理治療師調整步態。',
        };
    }
    if (footSeverity === 'mild' || shoeRisk === 'moderate') {
        return {
            level: 'caution',
            title: '建議預防性介入',
            body: '輕度警訊，若不加以注意可能逐漸惡化。建議選用足弓支撐鞋墊、避免長時間穿著高跟鞋，並定期追蹤。',
        };
    }
    return {
        level: 'good',
        title: '整體狀況良好',
        body: '足部結構與步態模式目前在正常範圍內。繼續保持合適的鞋款選擇，並定期追蹤即可。',
    };
}

const RECOMMENDATION_STYLES = {
    urgent:  { card: 'bg-red-50 border-red-200',    icon: <AlertTriangle size={18} className="text-red-500 shrink-0" />,     title: 'text-red-700' },
    warning: { card: 'bg-amber-50 border-amber-200', icon: <AlertTriangle size={18} className="text-amber-500 shrink-0" />,   title: 'text-amber-700' },
    caution: { card: 'bg-blue-50 border-blue-200',   icon: <Bot size={18} className="text-blue-500 shrink-0" />,              title: 'text-blue-700' },
    good:    { card: 'bg-emerald-50 border-emerald-200', icon: <CheckCircle size={18} className="text-emerald-500 shrink-0" />, title: 'text-emerald-700' },
};

export default function CombinedPage() {
    const [footImage, setFootImage]  = useState(null);
    const [shoeImage, setShoeImage]  = useState(null);
    const [loading, setLoading]      = useState(true);

    useEffect(() => {
        Promise.all([
            apiFetch('/api/footcare/images').then(r => r.ok ? r.json() : []),
            apiFetch('/api/footcare/shoe-images').then(r => r.ok ? r.json() : []),
        ]).then(([footImages, shoeImages]) => {
            setFootImage(Array.isArray(footImages) && footImages.length > 0 ? footImages[0] : null);
            setShoeImage(Array.isArray(shoeImages) && shoeImages.length > 0 ? shoeImages[0] : null);
        }).catch(() => {}).finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="p-5 max-w-[600px] mx-auto flex flex-col gap-4">
                <div className="flex items-center justify-center py-16">
                    <div className="spinner" />
                </div>
            </div>
        );
    }

    const reco = footImage && shoeImage
        ? getCombinedRecommendation(footImage.ai_severity, shoeImage.ai_risk_level)
        : null;
    const recoStyle = reco ? RECOMMENDATION_STYLES[reco.level] : null;

    return (
        <div className="p-5 max-w-[600px] mx-auto flex flex-col gap-5 pb-8">
            <header>
                <Link href="/" className="flex items-center gap-1 text-blue-600 no-underline text-[0.88rem] mb-3 hover:text-blue-700 transition-colors w-fit">
                    <ChevronLeft size={16} />
                    返回中心
                </Link>
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-[10px] bg-indigo-50 flex items-center justify-center">
                        <Bot size={20} className="text-indigo-600" />
                    </div>
                    <h2 className="text-[1.35rem] font-bold m-0 text-slate-800">綜合足部評估</h2>
                </div>
                <p className="text-slate-400 m-0 text-[0.88rem] leading-relaxed pl-[52px]">整合足部結構與鞋底磨損，提供完整健康建議。</p>
            </header>

            {/* 缺少資料提示 */}
            {(!footImage || !shoeImage) && (
                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-[14px] p-6 text-center">
                    <p className="text-slate-500 text-[0.9rem] m-0 mb-4">
                        {!footImage && !shoeImage && '尚未完成足部掃描與鞋底磨損分析。'}
                        {!footImage && shoeImage && '尚未完成足部掃描，請先進行 AI 拇趾外翻檢測。'}
                        {footImage && !shoeImage && '尚未完成鞋底磨損分析，請先進行 AI 鞋底磨損分析。'}
                    </p>
                    <div className="flex flex-col gap-2">
                        {!footImage && (
                            <Link href="/scan" className="block w-full py-3 bg-blue-600 text-white rounded-[10px] text-[0.9rem] font-semibold no-underline text-center hover:bg-blue-700 transition-colors">
                                前往足部掃描
                            </Link>
                        )}
                        {!shoeImage && (
                            <Link href="/shoe-scan" className="block w-full py-3 bg-amber-500 text-white rounded-[10px] text-[0.9rem] font-semibold no-underline text-center hover:bg-amber-600 transition-colors">
                                前往鞋底磨損分析
                            </Link>
                        )}
                    </div>
                </div>
            )}

            {footImage && shoeImage && (
                <>
                    {/* 綜合建議 */}
                    <div className={`border rounded-[16px] p-5 ${recoStyle.card}`}>
                        <div className="flex items-start gap-3">
                            {recoStyle.icon}
                            <div>
                                <h3 className={`m-0 mb-2 text-[1rem] font-semibold ${recoStyle.title}`}>{reco.title}</h3>
                                <p className="m-0 text-slate-700 text-[0.88rem] leading-relaxed">{reco.body}</p>
                            </div>
                        </div>
                    </div>

                    {/* 兩項結果並排 */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* 足部掃描 */}
                        <div className="bg-white border border-slate-200 rounded-[14px] p-4 shadow-sm flex flex-col gap-2">
                            <div className="text-[0.75rem] text-blue-600 font-semibold uppercase tracking-wide">足部結構</div>
                            <span className={`self-start py-1 px-2.5 rounded-full text-[0.78rem] font-semibold ${SEVERITY_BADGE[footImage.ai_severity] || 'bg-slate-100 text-slate-600'}`}>
                                {SEVERITY_LABELS[footImage.ai_severity] || footImage.ai_severity}
                            </span>
                            <p className="m-0 text-slate-500 text-[0.78rem] leading-snug line-clamp-3">{footImage.ai_summary}</p>
                            <Link href={`/result?id=${footImage.id}`} className="text-blue-500 text-[0.75rem] no-underline hover:text-blue-700 mt-auto">
                                查看完整報告 →
                            </Link>
                        </div>

                        {/* 鞋底磨損 */}
                        <div className="bg-white border border-slate-200 rounded-[14px] p-4 shadow-sm flex flex-col gap-2">
                            <div className="text-[0.75rem] text-amber-600 font-semibold uppercase tracking-wide">鞋底磨損</div>
                            <span className={`self-start py-1 px-2.5 rounded-full text-[0.78rem] font-semibold ${RISK_BADGE[shoeImage.ai_risk_level] || 'bg-slate-100 text-slate-600'}`}>
                                {RISK_LABELS[shoeImage.ai_risk_level] || shoeImage.ai_risk_level}
                            </span>
                            {shoeImage.ai_wear_pattern && (
                                <p className="m-0 text-slate-600 text-[0.8rem] font-medium">{WEAR_LABELS[shoeImage.ai_wear_pattern] || shoeImage.ai_wear_pattern}</p>
                            )}
                            <p className="m-0 text-slate-500 text-[0.78rem] leading-snug line-clamp-3">{shoeImage.ai_summary}</p>
                        </div>
                    </div>

                    {/* 圖片對比 */}
                    <div>
                        <h3 className="text-[0.8rem] mb-3 text-slate-400 font-semibold flex items-center gap-1.5 uppercase tracking-wide">
                            最新影像紀錄
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-[0.75rem] text-slate-400 mb-1.5 m-0">足部掃描</p>
                                <div className="rounded-[10px] overflow-hidden border border-slate-200 bg-slate-100 h-[120px] flex items-center justify-center">
                                    {footImage.image_data ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={footImage.image_data} alt="足部掃描" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-slate-400 text-[0.75rem]">無影像</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <p className="text-[0.75rem] text-slate-400 mb-1.5 m-0">鞋底磨損</p>
                                <div className="rounded-[10px] overflow-hidden border border-slate-200 bg-slate-100 h-[120px] flex items-center justify-center">
                                    {shoeImage.image_data ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={shoeImage.image_data} alt="鞋底磨損" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-slate-400 text-[0.75rem]">無影像</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 重新掃描 */}
                    <div className="grid grid-cols-2 gap-3">
                        <Link href="/scan" className="block py-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-[12px] text-[0.88rem] font-medium no-underline text-center hover:bg-blue-100 transition-colors">
                            更新足部掃描
                        </Link>
                        <Link href="/shoe-scan" className="block py-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-[12px] text-[0.88rem] font-medium no-underline text-center hover:bg-amber-100 transition-colors">
                            更新鞋底分析
                        </Link>
                    </div>

                    {/* 照護推薦 */}
                    {(reco.level === 'caution' || reco.level === 'warning' || reco.level === 'urgent') && (
                        <div className="bg-blue-50 border border-blue-200 rounded-[16px] p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <ShoppingBag size={18} className="text-blue-600" />
                                <h3 className="m-0 text-blue-700 text-[0.95rem] font-semibold">專屬照護推薦</h3>
                            </div>
                            <p className="m-0 mb-4 text-slate-600 text-[0.84rem] leading-relaxed">
                                依據您的評估結果，建議使用矯正鞋墊或夜間夾板。結帳輸入{' '}
                                <strong className="text-slate-800">CARE20</strong> 享專屬折扣。
                            </p>
                            <button className="w-full py-3 rounded-[10px] border-none bg-blue-600 text-white font-semibold cursor-pointer hover:bg-blue-700 transition-colors duration-200 min-h-[44px]">
                                前往商城選購
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
