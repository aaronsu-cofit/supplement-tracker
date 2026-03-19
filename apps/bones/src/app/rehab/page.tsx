'use client';
import { apiFetch } from '@vitera/lib';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronDown, ChevronUp, CheckCircle, Circle, Dumbbell, Clock, Layers } from 'lucide-react';

const DIFFICULTY_CLASSES = {
    easy:   { badge: 'bg-emerald-100 text-emerald-700', label: '入門' },
    medium: { badge: 'bg-amber-100 text-amber-700',     label: '進階' },
};

// 嚴重度越高，越需要做哪些動作
const SEVERITY_PRIORITY = {
    normal:   ['toe_splay', 'calf_stretch', 'manual_stretch'],
    mild:     ['toe_splay', 'hallux_abduction', 'manual_stretch', 'calf_stretch'],
    moderate: ['toe_splay', 'hallux_abduction', 'short_foot', 'manual_stretch', 'calf_stretch'],
    severe:   ['toe_splay', 'hallux_abduction', 'short_foot', 'towel_scrunch', 'manual_stretch', 'calf_stretch'],
};

const EXERCISES = [
    {
        id: 'toe_splay',
        name: '腳趾張開運動',
        subtitle: 'Toe Splay',
        target: '拇趾外展肌、足部靈活度',
        duration: '10 秒 × 3 組',
        difficulty: 'easy',
        image: '/exercises/toe_splay.png',
        steps: [
            '坐在椅子上，雙腳平放於地板',
            '盡量將五根腳趾往外張開，維持 10 秒',
            '放鬆，重複 3 組，每組間休息 5 秒',
        ],
        tip: '若一開始難以張開，可用手輔助，慢慢訓練神經肌肉控制。',
    },
    {
        id: 'hallux_abduction',
        name: '大拇趾外展運動',
        subtitle: 'Hallux Abduction',
        target: '拇趾外展肌（直接對抗外翻趨勢）',
        duration: '15 秒 × 3 組',
        difficulty: 'easy',
        image: '/exercises/hallux_abduction.png',
        steps: [
            '坐姿，腳掌平放於地板',
            '嘗試單獨將大拇趾向外側移動，遠離其他四趾',
            '其餘腳趾保持不動，維持 15 秒後放鬆',
            '重複 3 組',
        ],
        tip: '初期可用手指輕壓其他四趾，幫助大腦專注訓練大拇趾。',
    },
    {
        id: 'towel_scrunch',
        name: '毛巾抓取運動',
        subtitle: 'Towel Scrunch',
        target: '足底內在肌群、足弓強化',
        duration: '30 秒 × 3 組',
        difficulty: 'medium',
        image: '/exercises/towel_scrunch.png',
        steps: [
            '將一條薄毛巾平鋪於地板',
            '腳跟固定不動，用腳趾將毛巾向內抓取、推進',
            '持續動作 30 秒，感受足底肌群收縮',
            '雙腳各做 3 組',
        ],
        tip: '若家中沒有毛巾，可改用彈珠或小石頭練習腳趾抓取。',
    },
    {
        id: 'short_foot',
        name: '短足運動',
        subtitle: 'Short Foot Exercise',
        target: '足弓內在肌群、預防扁平足加劇',
        duration: '10 秒 × 5 組',
        difficulty: 'medium',
        image: '/exercises/short_foot.png',
        steps: [
            '坐姿或站姿，腳掌平放於地板',
            '腳跟與腳趾球保持接觸地面，嘗試將足弓向上拱起',
            '此動作會使腳掌「縮短」，維持 10 秒',
            '慢慢放下，重複 5 組',
        ],
        tip: '注意腳趾不要捲曲，是足弓本身在收縮，非腳趾在發力。',
    },
    {
        id: 'calf_stretch',
        name: '小腿及足底伸展',
        subtitle: 'Calf & Plantar Stretch',
        target: '阿基里斯腱、足底筋膜（間接影響步態）',
        duration: '30 秒 × 2 組（每側）',
        difficulty: 'easy',
        image: '/exercises/calf_stretch.png',
        steps: [
            '面對牆壁站立，雙手輕扶牆面',
            '一腳向後踏，腳跟完全貼地，後腿保持伸直',
            '前腳膝蓋微彎，感受後腳小腿與腳底的拉伸感',
            '維持 30 秒後換腳，各做 2 組',
        ],
        tip: '若小腿張力過高，每天伸展有助改善足弓塌陷與步態問題。',
    },
    {
        id: 'manual_stretch',
        name: '大拇趾手動伸展',
        subtitle: 'Manual Hallux Stretch',
        target: '拇趾關節囊、軟組織柔軟度',
        duration: '30 秒 × 3 組',
        difficulty: 'easy',
        image: '/exercises/manual_stretch.png',
        steps: [
            '坐姿，將腳放在對側膝蓋上',
            '一手固定腳掌，另一手輕握大拇趾',
            '緩慢將大拇趾向外側（遠離第二趾方向）拉伸',
            '維持 30 秒，感受輕微拉伸感即可，避免強行扳折',
        ],
        tip: '動作要輕柔，若感到疼痛應立即停止，諮詢醫師後再繼續。',
    },
];

function ExerciseCard({ exercise, isRecommended, isDone, onToggleDone }) {
    const [expanded, setExpanded] = useState(false);
    const [imgError, setImgError] = useState(false);
    const diff = DIFFICULTY_CLASSES[exercise.difficulty];

    return (
        <div className={`bg-white rounded-[14px] border shadow-sm overflow-hidden transition-all duration-200 ${isRecommended ? 'border-blue-300' : 'border-slate-200'}`}>
            {/* 圖片區 */}
            <div className="relative w-full h-[140px] bg-slate-50 flex items-center justify-center overflow-hidden border-b border-slate-100">
                {!imgError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={exercise.image}
                        alt={exercise.name}
                        className="h-full w-full object-contain p-3"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-300">
                        <Dumbbell size={32} />
                        <span className="text-[0.78rem]">{exercise.subtitle}</span>
                    </div>
                )}
                {isRecommended && (
                    <div className="absolute top-2.5 left-2.5 bg-blue-600 text-white text-[0.7rem] font-semibold px-2 py-0.5 rounded-full">
                        建議訓練
                    </div>
                )}
                <button
                    onClick={() => onToggleDone(exercise.id)}
                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center border-none cursor-pointer hover:scale-105 transition-transform"
                >
                    {isDone
                        ? <CheckCircle size={20} className="text-emerald-500" />
                        : <Circle size={20} className="text-slate-300" />
                    }
                </button>
            </div>

            {/* 內容 */}
            <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                        <h3 className="m-0 text-slate-800 text-[0.95rem] font-semibold leading-snug">{exercise.name}</h3>
                        <p className="m-0 text-slate-400 text-[0.75rem]">{exercise.subtitle}</p>
                    </div>
                    <span className={`shrink-0 text-[0.72rem] font-semibold px-2 py-0.5 rounded-full ${diff.badge}`}>
                        {diff.label}
                    </span>
                </div>

                <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-1 text-slate-400 text-[0.78rem]">
                        <Clock size={12} />
                        {exercise.duration}
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 text-[0.78rem]">
                        <Layers size={12} />
                        {exercise.target}
                    </div>
                </div>

                <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-1 text-blue-600 text-[0.82rem] font-medium border-none bg-transparent cursor-pointer p-0 hover:text-blue-700 transition-colors"
                >
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {expanded ? '收起步驟' : '查看步驟'}
                </button>

                {expanded && (
                    <div className="mt-3 flex flex-col gap-2.5">
                        <ol className="m-0 p-0 list-none flex flex-col gap-2">
                            {exercise.steps.map((step, i) => (
                                <li key={i} className="flex items-start gap-2.5">
                                    <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[0.7rem] font-bold flex items-center justify-center mt-0.5">
                                        {i + 1}
                                    </span>
                                    <span className="text-slate-600 text-[0.85rem] leading-relaxed">{step}</span>
                                </li>
                            ))}
                        </ol>
                        <div className="bg-amber-50 border border-amber-200 rounded-[8px] p-2.5">
                            <p className="m-0 text-amber-700 text-[0.78rem] leading-relaxed">
                                <strong>注意：</strong>{exercise.tip}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function RehabPage() {
    const [severity, setSeverity] = useState(null);
    const [doneToday, setDoneToday] = useState({});

    useEffect(() => {
        // 讀取最新足部掃描嚴重度
        apiFetch('/api/footcare/images')
            .then(r => r.ok ? r.json() : [])
            .then(data => {
                if (Array.isArray(data) && data.length > 0) setSeverity(data[0].ai_severity);
            })
            .catch(() => {});

        // 讀取今日完成紀錄（localStorage）
        const today = new Date().toISOString().slice(0, 10);
        const stored = localStorage.getItem(`rehab_done_${today}`);
        if (stored) {
            try { setDoneToday(JSON.parse(stored)); } catch {}
        }
    }, []);

    const toggleDone = (id) => {
        const today = new Date().toISOString().slice(0, 10);
        const updated = { ...doneToday, [id]: !doneToday[id] };
        setDoneToday(updated);
        localStorage.setItem(`rehab_done_${today}`, JSON.stringify(updated));
    };

    const recommended = severity ? (SEVERITY_PRIORITY[severity] || []) : [];
    const doneCount = Object.values(doneToday).filter(Boolean).length;
    const totalCount = EXERCISES.length;

    // 建議的動作排在前面
    const sorted = [
        ...EXERCISES.filter(e => recommended.includes(e.id)),
        ...EXERCISES.filter(e => !recommended.includes(e.id)),
    ];

    return (
        <div className="p-5 max-w-[600px] mx-auto flex flex-col gap-5 pb-8">
            <header>
                <Link href="/" className="flex items-center gap-1 text-blue-600 no-underline text-[0.88rem] mb-3 hover:text-blue-700 transition-colors w-fit">
                    <ChevronLeft size={16} />
                    返回中心
                </Link>
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-[10px] bg-green-50 flex items-center justify-center">
                        <Dumbbell size={20} className="text-green-600" />
                    </div>
                    <h2 className="text-[1.35rem] font-bold m-0 text-slate-800">復健運動</h2>
                </div>
                <p className="text-slate-400 m-0 text-[0.88rem] leading-relaxed pl-[52px]">預防與改善拇趾外翻的日常訓練動作</p>
            </header>

            {/* 今日進度 */}
            <div className="bg-white border border-slate-200 rounded-[14px] p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-600 text-[0.88rem] font-medium">今日完成進度</span>
                    <span className="text-blue-600 font-semibold text-[0.88rem]">{doneCount} / {totalCount}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%` }}
                    />
                </div>
                {doneCount === totalCount && totalCount > 0 && (
                    <p className="m-0 mt-2 text-emerald-600 text-[0.82rem] font-medium">今日訓練全部完成！</p>
                )}
            </div>

            {/* 個人化提示 */}
            {severity && severity !== 'normal' && (
                <div className="bg-blue-50 border border-blue-200 rounded-[14px] p-4">
                    <p className="m-0 text-blue-700 text-[0.85rem] leading-relaxed">
                        根據您最新的足部掃描結果（
                        <strong>
                            {severity === 'mild' && '輕度外翻'}
                            {severity === 'moderate' && '中度外翻'}
                            {severity === 'severe' && '重度外翻'}
                        </strong>
                        ），已為您標示建議優先進行的訓練動作。
                    </p>
                </div>
            )}

            {!severity && (
                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-[14px] p-4 text-center">
                    <p className="m-0 text-slate-400 text-[0.85rem] mb-2">完成足部掃描後，可獲得個人化動作建議</p>
                    <Link href="/scan" className="text-blue-500 text-[0.85rem] font-medium no-underline hover:text-blue-700">
                        前往 AI 足部掃描 →
                    </Link>
                </div>
            )}

            {/* 動作列表 */}
            <div className="flex flex-col gap-4">
                {sorted.map(exercise => (
                    <ExerciseCard
                        key={exercise.id}
                        exercise={exercise}
                        isRecommended={recommended.includes(exercise.id)}
                        isDone={!!doneToday[exercise.id]}
                        onToggleDone={toggleDone}
                    />
                ))}
            </div>

            {/* 免責聲明 */}
            <div className="bg-slate-50 border border-slate-200 rounded-[12px] p-4">
                <p className="m-0 text-slate-400 text-[0.78rem] leading-relaxed">
                    以上動作僅供參考，若有疼痛加劇或不適，請停止訓練並諮詢骨科或復健科醫師。
                </p>
            </div>
        </div>
    );
}
