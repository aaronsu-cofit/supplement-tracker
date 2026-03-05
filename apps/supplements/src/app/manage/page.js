'use client';
import { apiFetch } from '@cofit/lib';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@cofit/lib';
// AddSupplementModal moved to app-local — import from local copy if needed;
import { CameraCapture } from '@cofit/ui';
// LanguageSwitcher moved to app-local — import from local copy if needed;
import { IconPencil, IconTrash, IconPlus, IconCamera } from '@cofit/ui';

export default function SupplementsPage() {
    const { t } = useLanguage();
    const [supplements, setSupplements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [cameraOpen, setCameraOpen] = useState(false);
    const [aiResult, setAiResult] = useState(null);

    const fetchSupplements = useCallback(async () => {
        try {
            const res = await apiFetch('/api/supplements');
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
                await apiFetch(`/api/supplements/${editData.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                });
            } else {
                await apiFetch('/api/supplements', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                });
            }
            setModalOpen(false);
            setEditData(null);
            setAiResult(null);
            fetchSupplements();
        } catch (err) {
            console.error('Save error:', err);
        }
    };

    const handleDelete = async (id) => {
        try {
            await apiFetch(`/api/supplements/${id}`, { method: 'DELETE' });
            setDeleteConfirm(null);
            fetchSupplements();
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    const openEdit = (supplement) => {
        setEditData(supplement);
        setAiResult(null);
        setModalOpen(true);
    };

    const openAdd = () => {
        setEditData(null);
        setAiResult(null);
        setModalOpen(true);
    };

    const handleAiLabelResult = (data) => {
        if (data.success && data.supplement) {
            setCameraOpen(false);
            setAiResult(data.supplement);
            // Pre-fill form with AI results
            setEditData(null);
            setModalOpen(true);
        }
    };

    const handleConfirmAiResult = async () => {
        if (aiResult) {
            await handleSave(aiResult);
        }
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

            {/* Action Buttons */}
            <div className="action-group">
                <button className="btn-action" onClick={openAdd}>
                    <IconPlus /> {t('supplements.add')}
                </button>
                <button className="btn-action primary" onClick={() => setCameraOpen(true)}>
                    <IconCamera /> {t('ai.photoAdd')}
                </button>
            </div>

            <div>
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
                                    <button className="icon-btn" onClick={() => openEdit(sup)} title={t('supplements.edit')} aria-label={`${t('supplements.edit')} ${sup.name}`}>
                                        <IconPencil />
                                    </button>
                                    <button className="icon-btn danger" onClick={() => setDeleteConfirm(sup.id)} title={t('supplements.delete')} aria-label={`${t('supplements.delete')} ${sup.name}`}>
                                        <IconTrash />
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

            {/* Add/Edit Modal - with AI pre-fill support */}
            <AddSupplementModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setEditData(null); setAiResult(null); }}
                onSave={handleSave}
                editData={editData || aiResult}
            />

            {/* AI Result Confirmation (shown before modal if AI result exists) */}
            {modalOpen && aiResult && (
                <div style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', zIndex: 1100 }}>
                    <div className="ai-result-card" style={{ minWidth: 280 }}>
                        <div className="ai-result-title">🤖 {t('ai.labelResult')}</div>
                        <div className="ai-result-field">
                            <span className="ai-result-label">{t('supplements.name')}</span>
                            <span className="ai-result-value">{aiResult.name}</span>
                        </div>
                        {aiResult.dosage && (
                            <div className="ai-result-field">
                                <span className="ai-result-label">{t('supplements.dosage')}</span>
                                <span className="ai-result-value">{aiResult.dosage}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Camera Modal */}
            {cameraOpen && (
                <CameraCapture
                    mode="label"
                    onResult={handleAiLabelResult}
                    onClose={() => setCameraOpen(false)}
                />
            )}

            {/* Delete Confirmation */}
            {deleteConfirm && (
                <div className="modal-overlay" onClick={() => setDeleteConfirm(null)} role="dialog" aria-modal="true" aria-label={t('supplements.delete')}>
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
