'use client';
import { apiFetch } from '@vitera/lib';

import { useState } from 'react';
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
    },
    {
        id: 'wounds',
        name: '傷口照護 (Wounds)',
        description: 'NRS評估與傷口影像 AI 分析',
        liffIdEnv: 'NEXT_PUBLIC_LIFF_ID_WOUNDS',
        route: '/wounds',
        adminRoute: '/wounds/admin',
        icon: '🩹',
    },
    {
        id: 'bones',
        name: '足踝照護 (Bones & Joints)',
        description: '姆趾外翻 AI 量測與復健',
        liffIdEnv: 'NEXT_PUBLIC_LIFF_ID_BONES',
        route: '/bones',
        adminRoute: '/bones/history',
        icon: '🦶',
    },
    {
        id: 'intimacy',
        name: '私密健康 (Intimacy)',
        description: '零壓力問卷與性學 AI 諮詢',
        liffIdEnv: 'NEXT_PUBLIC_LIFF_ID_INTIMACY',
        route: '/intimacy',
        adminRoute: null,
        icon: '🌹',
    }
];

const MENU_MAPPING = [
    { label: 'A 區塊: 傷口照護', route: '/wounds' },
    { label: 'B 區塊: 足踝照護', route: '/bones' },
    { label: 'C 區塊: 保健追蹤', route: '/supplements' },
    { label: 'D 區塊: 私密健康', route: '/intimacy' },
];

export default function HQClientDashboard() {
    const [imageFile, setImageFile] = useState(null);
    const [isDeploying, setIsDeploying] = useState(false);
    const [deployStatus, setDeployStatus] = useState(null);
    const [deployError, setDeployError] = useState(null);

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

            const res = await apiFetch('/api/line/richmenu/deploy', {
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
            {/* Modules Grid */}
            <h2 className="hq-section-title">
                <span className="hq-dot-green"></span>
                模組大廳 (Module Registry)
            </h2>
            <div className="hq-grid-2">
                {MODULES.map(mod => (
                    <div key={mod.id} className="hq-card hq-module-card">
                        <div className="hq-module-header">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xl">{mod.icon}</span>
                                    <h3>{mod.name}</h3>
                                </div>
                                <span className="hq-env-tag">{mod.liffIdEnv}</span>
                            </div>
                            <span className="hq-status-active">
                                <span className="hq-pulse"></span>
                                運行中
                            </span>
                        </div>

                        <p className="hq-module-desc">{mod.description}</p>

                        <div className="hq-module-uris">
                            <div className="hq-uri-row">
                                <span className="hq-uri-label">客戶端入口 (Client URL)</span>
                                <Link href={mod.route} target="_blank" className="hq-uri-link client-uri">
                                    {mod.route}
                                </Link>
                            </div>
                            {mod.adminRoute ? (
                                <div className="hq-uri-row">
                                    <span className="hq-uri-label">模組後台 (Admin URL)</span>
                                    <Link href={mod.adminRoute} target="_blank" className="hq-uri-link admin-uri">
                                        {mod.adminRoute}
                                    </Link>
                                </div>
                            ) : (
                                <div className="hq-uri-row">
                                    <span className="hq-uri-label">模組後台 (Admin URL)</span>
                                    <span className="hq-uri-none">無專屬管理介面</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* LINE Engine */}
            <h2 className="hq-section-title">
                <span className="hq-dot-green"></span>
                LINE 中樞神經控制 (Matrix Engine)
            </h2>
            <div className="hq-card hq-engine-card">
                <h3 className="text-base font-bold mb-2">圖文選單 (Rich Menu) 自動發布器</h3>
                <p className="hq-engine-desc">
                    一鍵為官方帳號換上四宮格選單，並自動綁定上方四大模組的 LIFF 網址。
                    您無需再手動前往 LINE 官方後台拉框、貼網址。
                </p>

                <div className="hq-card mb-6">
                    {MENU_MAPPING.map(({ label, route }) => (
                        <div key={route} className="hq-uri-row">
                            <span className="hq-uri-label">{label}</span>
                            <span className="hq-muted-text font-mono text-xs">{route}</span>
                        </div>
                    ))}
                </div>

                {deployStatus && (
                    <div className={`hq-alert ${deployStatus.type === 'success' ? 'hq-alert-success' : 'hq-alert-error'}`}>
                        {deployStatus.message}
                    </div>
                )}

                {deployError && (
                    <div className="hq-alert hq-alert-error">{deployError}</div>
                )}

                <div className="hq-upload-row">
                    <label className="hq-file-label">
                        <span className="hq-file-label-text">上傳選單圖片 (2500x1686 JPG/PNG)</span>
                        <input
                            type="file"
                            accept="image/jpeg, image/png"
                            onChange={(e) => { setImageFile(e.target.files[0]); setDeployError(null); }}
                            className="hq-file-input"
                        />
                    </label>

                    <button
                        onClick={handleDeploy}
                        disabled={isDeploying || !imageFile}
                        className="hq-btn-primary"
                    >
                        {isDeploying ? (
                            <>
                                <span className="hq-spinner"></span> 部署中...
                            </>
                        ) : (
                            '同步發布全球圖文選單'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
