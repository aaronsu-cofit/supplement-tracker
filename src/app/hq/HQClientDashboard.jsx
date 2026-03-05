'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const MODULES = [
    {
        id: 'supplements',
        name: '保健品追蹤 (Supplements)',
        description: 'AI 辨識營養標籤與建立服藥習慣',
        liffIdEnv: 'NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS',
        route: '/supplements',
        adminRoute: '/supplements/history',
        icon: '💊',
        status: 'active',
        color: 'from-amber-600 to-orange-700'
    },
    {
        id: 'wounds',
        name: '傷口照護 (Wounds)',
        description: 'NRS評估與傷口影像 AI 分析',
        liffIdEnv: 'NEXT_PUBLIC_LIFF_ID_WOUNDS',
        route: '/wounds',
        adminRoute: '/wounds/admin',
        icon: '🩹',
        status: 'active',
        color: 'from-blue-600 to-indigo-700'
    },
    {
        id: 'bones',
        name: '足踝照護 (Bones & Joints)',
        description: '姆趾外翻 AI 量測與復健',
        liffIdEnv: 'NEXT_PUBLIC_LIFF_ID_BONES',
        route: '/bones',
        adminRoute: '/bones/history',
        icon: '🦶',
        status: 'active',
        color: 'from-teal-600 to-emerald-700'
    },
    {
        id: 'intimacy',
        name: '私密健康 (Intimacy)',
        description: '零壓力問卷與性學 AI 諮詢',
        liffIdEnv: 'NEXT_PUBLIC_LIFF_ID_INTIMACY',
        route: '/intimacy',
        adminRoute: null,
        icon: '🌹',
        status: 'active',
        color: 'from-rose-700 to-pink-900'
    }
];

export default function HQClientDashboard() {
    const [baseUrl, setBaseUrl] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [isDeploying, setIsDeploying] = useState(false);
    const [deployStatus, setDeployStatus] = useState(null);
    const [deployError, setDeployError] = useState(null);

    // Fetch base url on mount to form accurate copy links
    useEffect(() => {
        setBaseUrl(window.location.origin);
    }, []);

    const handleDeploy = async () => {
        if (!imageFile) {
            setDeployError('請先選擇一張 2500x1686 像素的圖片！');
            return;
        }

        setIsDeploying(true);
        setDeployStatus(null);
        setDeployError(null);

        try {
            const formData = new FormData();
            formData.append('image', imageFile);

            const res = await fetch('/api/line/richmenu/deploy', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (data.success) {
                setDeployStatus({ type: 'success', message: '圖文選單已成功部署至 LINE 預設選單！' });
            } else {
                setDeployStatus({ type: 'error', message: data.error || '部署失敗。請確定 LINE_CHANNEL_ACCESS_TOKEN 正確且圖片尺寸是 2500x1686。' });
                console.error('Deploy error details:', data.details);
            }
        } catch (error) {
            setDeployStatus({ type: 'error', message: '網路連線錯誤。' });
            console.error(error);
        } finally {
            setIsDeploying(false);
        }
    };

    return (
        <div className="hq-fade-in">
            {/* Header */}
            <div className="mb-12 border-b border-neutral-800 pb-8">
                <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold tracking-tight text-white">總管理中樞 (Control Center)</h1>
                </div>
                <p className="text-neutral-400">管理四大健康模組的入口網址與 LINE LIFF 生態圈系統。</p>
            </div>

            {/* Modules Grid */}
            <h2 className="text-xl font-semibold text-white mb-6">
                模組大廳 (Module Registry)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
                {MODULES.map(mod => (
                    <div key={mod.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden hover:border-neutral-700 transition-all flex flex-col">
                        <div className={`h-2 w-full bg-gradient-to-r ${mod.color}`}></div>
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-4xl">{mod.icon}</span>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{mod.name}</h3>
                                        <p className="text-xs text-neutral-500 font-mono mt-1">env: {mod.liffIdEnv}</p>
                                    </div>
                                </div>
                                <span className="bg-green-950 text-green-400 border border-green-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                    運行中
                                </span>
                            </div>

                            <p className="text-neutral-400 text-sm mb-6 flex-1">{mod.description}</p>

                            <div className="space-y-3 mt-auto">
                                <div className="bg-neutral-950 rounded-lg p-3 border border-neutral-800/50 flex justify-between items-center group">
                                    <div>
                                        <div className="text-xs font-semibold text-neutral-500 mb-1">客戶端入口 (Client URL)</div>
                                        <div className="text-sm font-mono text-cyan-300">{mod.route}</div>
                                    </div>
                                    <Link href={mod.route} target="_blank" className="text-neutral-600 hover:text-white px-3 py-1 bg-neutral-900 rounded-md text-xs transition-colors">
                                        測試
                                    </Link>
                                </div>

                                {mod.adminRoute ? (
                                    <div className="bg-neutral-950 rounded-lg p-3 border border-neutral-800/50 flex justify-between items-center">
                                        <div>
                                            <div className="text-xs font-semibold text-neutral-500 mb-1">模組後台 (Admin URL)</div>
                                            <div className="text-sm font-mono text-amber-300">{mod.adminRoute}</div>
                                        </div>
                                        <Link href={mod.adminRoute} target="_blank" className="text-neutral-600 hover:text-white px-3 py-1 bg-neutral-900 rounded-md text-xs transition-colors">
                                            進入
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="bg-neutral-950/50 rounded-lg p-3 border border-neutral-800/20 flex items-center justify-center">
                                        <div className="text-xs text-neutral-600">無專屬管理介面</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* LINE Engine Placeholder */}
            <h2 className="text-xl font-semibold text-white mb-6">
                LINE 中樞神經控制 (Matrix Engine)
            </h2>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#06C755]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>

                <div className="relative z-10">
                    <h3 className="text-lg font-bold text-white mb-2">圖文選單 (Rich Menu) 自動發布器</h3>
                    <p className="text-neutral-400 text-sm mb-6 max-w-2xl leading-relaxed">
                        一鍵為官方帳號換上四宮格選單，並自動綁定上方四大模組的 LIFF 網址。<br />
                        您無需再手動前往 LINE 官方後台拉框、貼網址。
                    </p>

                    <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl mb-6">
                        <div className="text-sm text-neutral-300 mb-2 font-mono flex justify-between">
                            <span>A 區塊: 傷口照護</span>
                            <span className="text-neutral-600">/wounds</span>
                        </div>
                        <div className="text-sm text-neutral-300 mb-2 font-mono flex justify-between">
                            <span>B 區塊: 足踝照護</span>
                            <span className="text-neutral-600">/bones</span>
                        </div>
                        <div className="text-sm text-neutral-300 mb-2 font-mono flex justify-between">
                            <span>C 區塊: 保健追蹤</span>
                            <span className="text-neutral-600">/supplements</span>
                        </div>
                        <div className="text-sm text-neutral-300 font-mono flex justify-between">
                            <span>D 區塊: 私密健康</span>
                            <span className="text-neutral-600">/intimacy</span>
                        </div>
                    </div>

                    {deployStatus && (
                        <div className={`p-4 mb-6 rounded-xl text-sm ${deployStatus.type === 'success' ? 'bg-green-950/50 text-green-400 border border-green-800' : 'bg-rose-950/50 text-rose-400 border border-rose-800'}`}>
                            {deployStatus.message}
                        </div>
                    )}

                    {deployError && (
                        <div className="p-4 mb-6 rounded-xl text-sm bg-rose-950/50 text-rose-400 border border-rose-800">
                            {deployError}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        <label className="flex flex-col gap-1 cursor-pointer">
                            <span className="text-xs text-neutral-500">上傳選單圖片 (2500x1686 JPG/PNG)</span>
                            <input
                                type="file"
                                accept="image/jpeg, image/png"
                                onChange={(e) => { setImageFile(e.target.files[0]); setDeployError(null); }}
                                className="block w-full text-sm text-neutral-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-full file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-neutral-800 file:text-white
                                    hover:file:bg-neutral-700 transition-colors"
                            />
                        </label>

                        <button
                            onClick={handleDeploy}
                            disabled={isDeploying || !imageFile}
                            className={`px-6 py-3 rounded-xl font-medium transition-all shadow-lg flex items-center gap-2 ${isDeploying || !imageFile
                                    ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
                                    : 'bg-[#06C755]/10 text-[#06C755] border border-[#06C755]/20 hover:bg-[#06C755] hover:text-white shadow-[#06C755]/5'
                                }`}
                        >
                            {isDeploying ? (
                                <>
                                    <span className="hq-spinner"></span> 部署中...
                                </>
                            ) : (
                                <>
                                    同步發布全球圖文選單
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
