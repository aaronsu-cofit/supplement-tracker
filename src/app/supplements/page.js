'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/app/lib/i18n/LanguageContext';
import AddSupplementModal from '@/app/components/AddSupplementModal';
import LanguageSwitcher from '@/app/components/LanguageSwitcher';

export default function SupplementsPage() {
    const { t } = useLanguage();
    const [supplements, setSupplements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const fetchSupplements = useCallback(async () => {
        try {
            const res = await fetch('/api/supplements');
            if (res.ok) {
                setSupplements(await res.json());
            }
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSupplements();
    }, [fetchSupplements]);

    const handleSave = async (formData) => {
        try {
            if (editData) {
                await fetch(`/api/supplements/${editData.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                });
            } else {
                await fetch('/api/supplements', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                });
            }
            setModalOpen(false);
            setEditData(null);
            fetchSupplements();
        } catch (err) {
            console.error('Save error:', err);
        }
    };

    const handleDelete = async (id) => {
        try {
            await fetch(`/api/supplements/${id}`, { method: 'DELETE' });
            setDeleteConfirm(null);
            fetchSupplements();
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    const openEdit = (supplement) => {
        setEditData(supplement);
        setModalOpen(true);
    };

    const openAdd = () => {
        setEditData(null);
        setModalOpen(true);
    };

    const timeIcons = { morning: '🌅', afternoon: '☀️', evening: '🌙' };
    const timeLabels = {
        morning: t('supplements.morning'),
        afternoon: t('supplements.afternoon'),
        evening: t('supplements.evening'),
    };
    const freqLabels = {
        daily: t('supplements.daily'),
        weekdays: t('supplements.weekdays'),
        custom: t('supplements.custom'),
    };

    if (loading) {
        return (
            <div className="page-container">
                <div className="loading-container"><div className="spinner"></div></div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <LanguageSwitcher />

            <div className="page-header">
                <h1 className="page-title">{t('supplements.title')}</h1>
            </div>

            <button className="btn-add" onClick={openAdd}>
                + {t('supplements.add')}
            </button>

            <div style={{ marginTop: 16 }}>
                {supplements.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📦</div>
                        <p className="empty-title">{t('supplements.empty')}</p>
                        <p className="empty-hint">{t('supplements.emptyHint')}</p>
                    </div>
                ) : (
                    supplements.map((sup, idx) => (
                        <div key={sup.id} className="supplement-card slide-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                            <div className="supplement-card-header">
                                <div className="supplement-card-name">{sup.name}</div>
                                <div className="supplement-card-actions">
                                    <button className="icon-btn" onClick={() => openEdit(sup)} title={t('supplements.edit')}>
                                        ✏️
                                    </button>
                                    <button className="icon-btn danger" onClick={() => setDeleteConfirm(sup.id)} title={t('supplements.delete')}>
                                        🗑️
                                    </button>
                                </div>
                            </div>
                            <div className="supplement-card-meta">
                                {sup.dosage && <span className="meta-tag">💊 {sup.dosage}</span>}
                                <span className="meta-tag">{timeIcons[sup.time_of_day]} {timeLabels[sup.time_of_day]}</span>
                                <span className="meta-tag">🔄 {freqLabels[sup.frequency]}</span>
                            </div>
                            {sup.notes && (
                                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                                    {sup.notes}
                                </p>
                            )}
                        </div>
                    ))
                )}
            </div>

            <AddSupplementModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setEditData(null); }}
                onSave={handleSave}
                editData={editData}
            />

            {/* Delete Confirmation */}
            {deleteConfirm && (
                <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div className="modal-content confirm-dialog" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">{t('supplements.delete')}</h2>
                        <p>{t('supplements.deleteConfirm')}</p>
                        <div className="confirm-actions">
                            <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>
                                {t('common.cancel')}
                            </button>
                            <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                                {t('common.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
