'use client';
import { apiFetch } from '@cofit/lib';

import { useState, useEffect } from 'react';
import { useAuth } from '@cofit/lib';
import { useRouter } from 'next/navigation';

export default function HQModulesClient() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [modules, setModules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [savingId, setSavingId] = useState(null);

    useEffect(() => {
        if (!authLoading && (!user || (user.role !== 'super_admin' && user.role !== 'admin'))) {
            router.replace('/hq');
            return;
        }

        if (user) {
            fetchModules();
        }
    }, [user, authLoading, router]);

    const fetchModules = async () => {
        try {
            const res = await apiFetch('/api/hq/modules');
            if (!res.ok) throw new Error('Failed to fetch modules');
            const data = await res.json();
            setModules(data.modules || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdate = async (id, field, value) => {
        setSavingId(id);
        setError(null);
        try {
            const res = await fetch(`/api/hq/modules/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update module');
            }
            // Update local state
            setModules(modules.map(m => m.id === id ? { ...m, [field]: value } : m));
        } catch (err) {
            setError(err.message);
        } finally {
            setSavingId(null);
        }
    };

    if (authLoading || isLoading) {
        return <div className="hq-loading">載入模組清單中...</div>;
    }

    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
        return null; // RouteGuard will redirect
    }

    return (
        <div className="hq-modules-container fade-in">
            <header className="hq-header">
                <h2>模組設定 (Module Configuration)</h2>
                <p>設定前台入口網站要顯示的模組名稱與開關狀態。</p>
            </header>

            {error && <div className="hq-error">錯誤: {error}</div>}

            <div className="hq-card">
                <table className="hq-table">
                    <thead>
                        <tr>
                            <th>ID (Code)</th>
                            <th>中文名稱 (zh)</th>
                            <th>英文名稱 (en)</th>
                            <th>狀態 (Status)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {modules.map(mod => (
                            <tr key={mod.id}>
                                <td><span className="hq-badge" style={{ background: '#334155' }}>{mod.id}</span></td>
                                <td>
                                    <input
                                        type="text"
                                        className="hq-input"
                                        defaultValue={mod.name_zh}
                                        onBlur={(e) => {
                                            if (e.target.value !== mod.name_zh) {
                                                handleUpdate(mod.id, 'name_zh', e.target.value);
                                            }
                                        }}
                                        disabled={savingId === mod.id}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="text"
                                        className="hq-input"
                                        defaultValue={mod.name_en}
                                        onBlur={(e) => {
                                            if (e.target.value !== mod.name_en) {
                                                handleUpdate(mod.id, 'name_en', e.target.value);
                                            }
                                        }}
                                        disabled={savingId === mod.id}
                                    />
                                </td>
                                <td>
                                    <label className="hq-toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={mod.is_active}
                                            onChange={(e) => handleUpdate(mod.id, 'is_active', e.target.checked)}
                                            disabled={savingId === mod.id}
                                        />
                                        <span className="hq-toggle-slider"></span>
                                    </label>
                                    {savingId === mod.id && <span style={{ marginLeft: '10px', fontSize: '12px', color: 'var(--accent-primary)' }}>儲存中...</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#64748B' }}>
                    提示：修改名稱後，只要點擊旁邊的空白處（取消聚焦）就會自動儲存並生效於前台了。
                </p>
            </div>

            <style jsx>{`
                .hq-toggle-switch {
                    position: relative;
                    display: inline-block;
                    width: 44px;
                    height: 24px;
                }
                .hq-toggle-switch input { display: none; }
                .hq-toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background-color: #CBD5E1;
                    transition: .3s;
                    border-radius: 24px;
                }
                .hq-toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: .3s;
                    border-radius: 50%;
                }
                .hq-toggle-switch input:checked + .hq-toggle-slider {
                    background-color: var(--accent-primary, #7c5cfc);
                }
                .hq-toggle-switch input:checked + .hq-toggle-slider:before {
                    transform: translateX(20px);
                }
                .hq-toggle-switch input:disabled + .hq-toggle-slider {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            `}</style>
        </div>
    );
}
