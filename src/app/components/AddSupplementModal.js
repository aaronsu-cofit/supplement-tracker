'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/app/lib/i18n/LanguageContext';

export default function AddSupplementModal({ isOpen, onClose, onSave, editData }) {
    const { t } = useLanguage();
    const [form, setForm] = useState({
        name: '',
        dosage: '',
        frequency: 'daily',
        time_of_day: 'morning',
        notes: '',
    });

    useEffect(() => {
        if (editData) {
            setForm({
                name: editData.name || '',
                dosage: editData.dosage || '',
                frequency: editData.frequency || 'daily',
                time_of_day: editData.time_of_day || 'morning',
                notes: editData.notes || '',
            });
        } else {
            setForm({ name: '', dosage: '', frequency: 'daily', time_of_day: 'morning', notes: '' });
        }
    }, [editData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        onSave(form);
    };

    const timeOptions = [
        { value: 'morning', label: t('supplements.morning'), icon: '🌅' },
        { value: 'afternoon', label: t('supplements.afternoon'), icon: '☀️' },
        { value: 'evening', label: t('supplements.evening'), icon: '🌙' },
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">
                    {editData ? t('supplements.edit') : t('supplements.add')}
                </h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">{t('supplements.name')} *</label>
                        <input
                            className="form-input"
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder={t('supplements.namePlaceholder')}
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('supplements.dosage')}</label>
                        <input
                            className="form-input"
                            type="text"
                            value={form.dosage}
                            onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                            placeholder={t('supplements.dosagePlaceholder')}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('supplements.frequency')}</label>
                        <select
                            className="form-select"
                            value={form.frequency}
                            onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                        >
                            <option value="daily">{t('supplements.daily')}</option>
                            <option value="weekdays">{t('supplements.weekdays')}</option>
                            <option value="custom">{t('supplements.custom')}</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('supplements.timeOfDay')}</label>
                        <div className="time-pills">
                            {timeOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    className={`time-pill ${form.time_of_day === opt.value ? 'active' : ''}`}
                                    onClick={() => setForm({ ...form, time_of_day: opt.value })}
                                >
                                    {opt.icon} {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('supplements.notes')}</label>
                        <textarea
                            className="form-input"
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            placeholder={t('supplements.notesPlaceholder')}
                        />
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>
                            {t('supplements.cancel')}
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {t('supplements.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
