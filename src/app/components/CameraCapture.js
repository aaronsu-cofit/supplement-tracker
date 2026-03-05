'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/app/lib/i18n/LanguageContext';

export default function CameraCapture({ mode, onResult, onClose }) {
    const { t } = useLanguage();
    const [preview, setPreview] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);
    const galleryInputRef = useRef(null);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleCapture = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        const reader = new FileReader();
        reader.onload = (ev) => {
            setPreview(ev.target.result);
        };
        reader.readAsDataURL(file);
    };

    const handleAnalyze = async () => {
        if (!preview) return;
        setAnalyzing(true);
        setError(null);

        try {
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: preview, mode }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || t('ai.error'));
                return;
            }

            onResult(data);
        } catch (err) {
            setError(t('ai.error'));
        } finally {
            setAnalyzing(false);
        }
    };

    const handleRetake = () => {
        setPreview(null);
        setError(null);
        fileInputRef.current.value = '';
    };

    return (
        <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={mode === 'label' ? t('ai.scanLabel') : t('ai.scanPill')}>
            <div className="modal-content camera-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">
                    {mode === 'label' ? t('ai.scanLabel') : t('ai.scanPill')}
                </h2>

                {!preview ? (
                    <div className="camera-capture-area">
                        <div className="camera-icon">📸</div>
                        <p className="camera-hint">
                            {mode === 'label' ? t('ai.labelHint') : t('ai.pillHint')}
                        </p>
                        {/* Camera capture — opens camera directly on mobile */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleCapture}
                            className="camera-file-input"
                            id="camera-input"
                            aria-label={t('ai.takePhoto')}
                        />
                        <label htmlFor="camera-input" className="btn btn-primary camera-btn">
                            {t('ai.takePhoto')}
                        </label>
                        {/* Gallery input — no capture attribute so user can pick from album */}
                        <input
                            ref={galleryInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleCapture}
                            className="camera-file-input"
                            id="gallery-input"
                            aria-label={t('ai.choosePhoto')}
                        />
                        <label htmlFor="gallery-input" className="btn btn-ghost camera-btn" style={{ marginTop: 8 }}>
                            {t('ai.choosePhoto')}
                        </label>
                    </div>
                ) : (
                    <div className="camera-preview-area">
                        <img src={preview} alt={t('ai.previewAlt') || '已選擇的照片預覽'} className="camera-preview-img" />

                        {error && <div className="camera-error" role="alert">{error}</div>}

                        <div className="form-actions" style={{ marginTop: 16 }}>
                            <button className="btn btn-ghost" onClick={handleRetake} disabled={analyzing} aria-label={t('ai.retake')}>
                                {t('ai.retake')}
                            </button>
                            <button className="btn btn-primary" onClick={handleAnalyze} disabled={analyzing} aria-label={analyzing ? t('ai.analyzing') : t('ai.analyze')}>
                                {analyzing ? (
                                    <span className="analyzing-text">
                                        <span className="spinner-small" aria-hidden="true"></span>
                                        {t('ai.analyzing')}
                                    </span>
                                ) : (
                                    t('ai.analyze')
                                )}
                            </button>
                        </div>
                    </div>
                )}

                <button
                    className="btn btn-ghost"
                    style={{ marginTop: 12, width: '100%' }}
                    onClick={onClose}
                    aria-label={t('common.close')}
                >
                    {t('common.close')}
                </button>
            </div>
        </div>
    );
}
