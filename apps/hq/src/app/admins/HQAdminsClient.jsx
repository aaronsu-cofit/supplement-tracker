'use client';
import { apiFetch } from '@vitera/lib';

import { useState, useEffect } from 'react';

export default function HQAdminsClient() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [roleChangeError, setRoleChangeError] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await apiFetch('/api/hq/admins');
            if (!res.ok) throw new Error('無法取得人員名單，請確認您的權限。');
            const data = await res.json();
            if (data.success) {
                setUsers(data.users);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        setRoleChangeError(null);
        try {
            const res = await apiFetch('/api/hq/admins', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, newRole })
            });
            const data = await res.json();
            if (data.success) {
                setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
            } else {
                setRoleChangeError(data.error || '權限變更失敗');
            }
        } catch (err) {
            setRoleChangeError('網路錯誤，無法變更權限');
        }
    };

    const getRoleBadge = (role) => {
        switch (role) {
            case 'superadmin':
                return <span className="hq-badge hq-badge-purple">Super Admin</span>;
            case 'admin':
                return <span className="hq-badge hq-badge-blue">Admin</span>;
            default:
                return <span className="hq-badge hq-badge-gray">User</span>;
        }
    };

    return (
        <div className="hq-fade-in">
            <div className="hq-header">
                <h2>權限管理 (Admins)</h2>
                <p>管理系統內部人員的存取權限 (Role-Based Access Control)。</p>
                <div className="mt-4 p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-sm text-[#A1A1A1]">
                    <strong>角色說明：</strong>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><span className="text-[#c084fc] font-semibold">Super Admin</span>: 擁有最高權限，可瀏覽所有模組、設定 LINE 圖文選單，並管理其他使用者的權限。</li>
                        <li><span className="text-[#60a5fa] font-semibold">Admin</span>: 一般管理員（如醫師、護理師、小編），僅可進入各模組後台（如傷口、骨骼）檢視病患資料與提供 AI 輔助諮詢，無法更改系統設定。</li>
                        <li><span className="text-[#888] font-semibold">User</span>: 一般病患或消費者，僅能透過 LINE 進入前台操作，無法訪問任何 <code>/hq</code> 或 <code>/admin</code> 後台路徑。</li>
                    </ul>
                </div>
            </div>

            {error && (
                <div className="hq-alert hq-alert-error mb-24">
                    {error}
                </div>
            )}

            {roleChangeError && (
                <div className="hq-alert hq-alert-error mb-4">
                    {roleChangeError}
                </div>
            )}

            <div className="hq-table-container">
                <table className="hq-table">
                    <thead>
                        <tr>
                            <th>使用者 (User)</th>
                            <th>權限 (Role)</th>
                            <th>註冊時間 (Joined)</th>
                            <th style={{ textAlign: 'right' }}>操作 (Actions)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan="4" className="hq-table-empty">載入中...</td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="hq-table-empty">目前沒有使用者資料</td>
                            </tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user.id}>
                                    <td className="hq-table-user">
                                        {user.picture_url ? (
                                            <img src={user.picture_url} alt="avatar" className="hq-avatar" />
                                        ) : (
                                            <div className="hq-avatar-fallback">
                                                {(user.display_name || user.email || '?')[0].toUpperCase()}
                                            </div>
                                        )}
                                        <div className="hq-user-info">
                                            <div className="hq-user-name">{user.display_name || 'Anonymous'}</div>
                                            <div className="hq-user-email">{user.email || 'LINE Login User'}</div>
                                        </div>
                                    </td>
                                    <td>
                                        {getRoleBadge(user.role)}
                                    </td>
                                    <td className="hq-table-date">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <select
                                            value={user.role || 'user'}
                                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                            className="hq-select"
                                        >
                                            <option value="user">一般使用者 (User)</option>
                                            <option value="admin">管理員 (Admin)</option>
                                            <option value="superadmin">最高權限 (Super)</option>
                                        </select>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
