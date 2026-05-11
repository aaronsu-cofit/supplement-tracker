'use client';
import { apiFetch } from '@vitera/lib';
import Link from 'next/link';

import { useState, useEffect, useMemo } from 'react';
import type { HQUser } from '../../types';

type TabType = 'admin' | 'user';

export default function HQAdminsClient() {
    const [activeTab, setActiveTab] = useState<TabType>('admin');
    const [users, setUsers] = useState<HQUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleChangeError, setRoleChangeError] = useState<string | null>(null);

    // Add Admin Form State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newAdmin, setNewAdmin] = useState({ email: '', displayName: '', password: '', role: 'admin' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const endpoint = activeTab === 'admin' ? '/api/hq/admins' : '/api/hq/users';
            const res = await apiFetch(endpoint);
            if (!res.ok) throw new Error(`無法取得${activeTab === 'admin' ? '管理員' : '使用者'}名單`);
            const data = await res.json();
            setUsers(data.users || []);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        setRoleChangeError(null);
        try {
            const res = await apiFetch(`/api/hq/admins/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            });
            const data = await res.json();
            if (!res.ok) {
                setRoleChangeError(data.error || '權限變更失敗');
                return;
            }
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (err) {
            setRoleChangeError('網路錯誤，無法變更權限');
        }
    };

    const handleAddAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddError(null);

        if (!newAdmin.password || newAdmin.password.length < 6) {
            setAddError('請輸入至少 6 個字元的密碼');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await apiFetch('/api/hq/admins', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAdmin)
            });
            const data = await res.json();
            if (!res.ok) {
                setAddError(data.error || '建立失敗');
                return;
            }
            // Success
            setShowAddModal(false);
            setNewAdmin({ email: '', displayName: '', password: '', role: 'admin' });
            fetchData(); // Refresh list
        } catch (err) {
            setAddError('網路錯誤，請稍後再試');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredUsers = useMemo(() => {
        if (!searchTerm) return users;
        const low = searchTerm.toLowerCase();
        return users.filter(u => 
            u.display_name?.toLowerCase().includes(low) || 
            u.email?.toLowerCase().includes(low) ||
            u.id.toLowerCase().includes(low)
        );
    }, [users, searchTerm]);

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'superadmin':
                return <span className="hq-badge hq-badge-purple shadow-sm">Super Admin</span>;
            case 'admin':
                return <span className="hq-badge hq-badge-blue shadow-sm">Admin</span>;
            case 'user':
                return <span className="hq-badge hq-badge-gray shadow-sm opacity-80">User</span>;
            default:
                return <span className="hq-badge hq-badge-gray shadow-sm">{role || 'User'}</span>;
        }
    };

    return (
        <div className="hq-fade-in space-y-6">
            {/* Header Section */}
            <div className="hq-header">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h2>人員管理 <span className="text-white/20 font-light ml-2">Personnel</span></h2>
                        <p className="mt-1">管理系統內部管理員與外部使用者的存取權限與基本資訊。</p>
                    </div>
                    <div className="flex gap-3">
                        {activeTab === 'admin' && (
                            <button 
                                onClick={() => setShowAddModal(true)}
                                className="hq-btn-primary gap-2 text-sm"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                加入管理員
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs & Search Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-8 border-b border-white/5">
                    <div className="flex gap-8">
                        <button
                            onClick={() => { setActiveTab('admin'); setSearchTerm(''); }}
                            className={`pb-4 px-1 text-sm font-semibold transition-all relative cursor-pointer ${
                                activeTab === 'admin' 
                                ? 'text-[#7c5cfc]' 
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            管理員 (Admins)
                            <span className="ml-2 text-xs opacity-50 bg-slate-100 px-2 py-0.5 rounded-full">
                                {activeTab === 'admin' ? users.length : '—'}
                            </span>
                            {activeTab === 'admin' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7c5cfc] rounded-full shadow-[0_2px_4px_rgba(124,92,252,0.3)]" />
                            )}
                        </button>
                        <button
                            onClick={() => { setActiveTab('user'); setSearchTerm(''); }}
                            className={`pb-4 px-1 text-sm font-semibold transition-all relative cursor-pointer ${
                                activeTab === 'user' 
                                ? 'text-[#7c5cfc]' 
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            一般使用者 (Users)
                            <span className="ml-2 text-xs opacity-50 bg-slate-100 px-2 py-0.5 rounded-full">
                                {activeTab === 'user' ? users.length : '—'}
                            </span>
                            {activeTab === 'user' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7c5cfc] rounded-full shadow-[0_2px_4px_rgba(124,92,252,0.3)]" />
                            )}
                        </button>
                    </div>

                    <div className="pb-4 w-full md:w-64">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder={`搜尋 ${activeTab === 'admin' ? '管理員' : '使用者'}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:border-[#7c5cfc]/50 focus:ring-1 focus:ring-[#7c5cfc]/20 transition-all placeholder:text-slate-400"
                            />
                            <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Box */}
            <div className="bg-[#7c5cfc]/5 border border-[#7c5cfc]/10 rounded-xl p-4 flex gap-4 items-start">
                <div className="bg-[#7c5cfc]/10 p-2 rounded-lg text-[#7c5cfc]">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div className="text-sm">
                    <div className="font-semibold text-slate-700 mb-1">{activeTab === 'admin' ? '管理權限定義' : '外部使用者說明'}</div>
                    {activeTab === 'admin' ? (
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-slate-500">
                            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#c084fc]" /> <span>Super Admin: 系統設定與管理員維護</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#60a5fa]" /> <span>Admin: 模組管理與病患諮詢</span></div>
                        </div>
                    ) : (
                        <p className="text-slate-500">
                            由 LINE OA 註冊之病患或一般消費者，具備基本前台操作權限，無法進入 HQ 後台。
                        </p>
                    )}
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div className="hq-alert hq-alert-error animate-pulse">
                    <span className="mr-2 font-bold">⚠️</span> {error}
                </div>
            )}

            {roleChangeError && (
                <div className="hq-alert hq-alert-error">
                    <span className="mr-2 font-bold">❌</span> {roleChangeError}
                </div>
            )}

            {/* Main Table */}
            <div className="hq-table-container shadow-sm border-white/5">
                <table className="hq-table">
                    <thead>
                        <tr>
                            <th className="pl-6">人員基本資訊</th>
                            <th>角色權限</th>
                            <th>註冊日期</th>
                            <th className="text-right pr-6">操作設定</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr>
                                <td colSpan={4} className="py-20 text-center text-slate-300">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-2 border-[#7c5cfc]/30 border-t-[#7c5cfc] rounded-full animate-spin" />
                                        <span className="text-sm tracking-widest">資料載入中</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="py-20 text-center">
                                    <div className="text-slate-300 mb-2">
                                        <svg className="w-12 h-12 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                        {searchTerm ? '找不到符合條件的人員' : `目前尚無${activeTab === 'admin' ? '管理員' : '使用者'}資料`}
                                    </div>
                                    {searchTerm && (
                                        <button onClick={() => setSearchTerm('')} className="text-[#7c5cfc] text-xs hover:underline cursor-pointer">清除搜尋</button>
                                    )}
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-[#7c5cfc]/5 transition-colors group">
                                    <td className="pl-6">
                                        <div className="flex items-center gap-4">
                                            {user.picture_url ? (
                                                <img src={user.picture_url} alt="" className="w-10 h-10 rounded-full border border-slate-100 group-hover:border-[#7c5cfc]/40 transition-colors" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-100 flex items-center justify-center text-sm font-bold text-slate-400 group-hover:text-[#7c5cfc] transition-colors">
                                                    {(user.display_name || user.email || 'U')[0].toUpperCase()}
                                                </div>
                                            )}
                                            <div className="flex flex-col">
                                                <Link href={`/admins/${user.id}`} className="font-semibold text-slate-700 hover:text-[#7c5cfc] transition-colors">
                                                    {user.display_name || 'Anonymous User'}
                                                </Link>
                                                <span className="text-xs text-slate-400 font-mono">{user.email || 'LINE OA Login'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center">
                                            {getRoleBadge(user.role)}
                                        </div>
                                    </td>
                                    <td className="text-slate-400 text-xs font-mono">
                                        {new Date(user.created_at).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                                    </td>
                                    <td className="text-right pr-6">
                                        {activeTab === 'admin' ? (
                                            <div className="inline-block relative">
                                                <select
                                                    value={user.role || 'admin'}
                                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                    className="appearance-none bg-[#f8fafc] border border-slate-200 text-slate-600 text-xs rounded-md py-1.5 pl-3 pr-8 hover:border-[#7c5cfc]/30 focus:outline-none focus:border-[#7c5cfc]/50 transition-all cursor-pointer"
                                                >
                                                    <option value="admin">管理員 Admin</option>
                                                    <option value="superadmin">最高權限 Super</option>
                                                </select>
                                                <div className="pointer-events-none absolute right-2 top-2 text-slate-400">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-end gap-2 text-slate-300 text-[10px] uppercase tracking-tighter">
                                                <div className="w-1 h-1 rounded-full bg-slate-200" />
                                                ReadOnly
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Admin Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl hq-fade-in p-6 border border-slate-100">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-800">建立新管理員</h3>
                            <button 
                                onClick={() => setShowAddModal(false)}
                                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {addError && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
                                {addError}
                            </div>
                        )}

                        <form onSubmit={handleAddAdmin} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">顯示名稱</label>
                                <input 
                                    type="text" 
                                    required
                                    placeholder="例如：王小明"
                                    value={newAdmin.displayName}
                                    onChange={e => setNewAdmin({...newAdmin, displayName: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#7c5cfc] transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">電子郵件 (Email)</label>
                                <input 
                                    type="email" 
                                    required
                                    placeholder="admin@example.com"
                                    value={newAdmin.email}
                                    onChange={e => setNewAdmin({...newAdmin, email: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#7c5cfc] transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">登入密碼 (必填)</label>
                                <input 
                                    type="password" 
                                    required
                                    minLength={6}
                                    autoComplete="new-password"
                                    placeholder="請設定登入密碼"
                                    value={newAdmin.password}
                                    onChange={e => setNewAdmin({...newAdmin, password: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#7c5cfc] transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">初始權限</label>
                                <select 
                                    value={newAdmin.role}
                                    onChange={e => setNewAdmin({...newAdmin, role: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#7c5cfc] transition-colors"
                                >
                                    <option value="admin">管理員 (Admin)</option>
                                    <option value="superadmin">最高權限 (Super Admin)</option>
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                                >
                                    取消
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#7c5cfc] rounded-lg hover:bg-[#6d4df5] transition-colors shadow-lg shadow-[#7c5cfc]/20 disabled:opacity-50 cursor-pointer"
                                >
                                    {isSubmitting ? '建立中...' : '確認建立'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            <div className="flex justify-end pt-4">
                <p className="text-[10px] text-slate-300 tracking-widest uppercase">Vitera Identity Access Management System</p>
            </div>
        </div>
    );
}
