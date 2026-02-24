'use client';

import { useState, useRef } from 'react';
import { useLanguage } from '@/app/lib/i18n/LanguageContext';

export default function CameraCapture({ mode, onResult, onClose }) {
    const { t } = useLanguage();
    const [preview, setPreview] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

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
        <div className="modal-overlay" onClick={onClose}>
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
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleCapture}
                            className="camera-file-input"
                            id="camera-input"
                        />
                        <label htmlFor="camera-input" className="btn btn-primary camera-btn">
                            {t('ai.takePhoto')}
                        </label>
                        <label
                            className="btn btn-ghost camera-btn"
                            style={{ marginTop: 8 }}
                            onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = handleCapture;
                                input.click();
                            }}
                        >
                            {t('ai.choosePhoto')}
                        </label>
                    </div>
                ) : (
                    <div className="camera-preview-area">
                        <img src={preview} alt="Preview" className="camera-preview-img" />

                        {error && <div className="camera-error">{error}</div>}

                        <div className="form-actions" style={{ marginTop: 16 }}>
                            <button className="btn btn-ghost" onClick={handleRetake} disabled={analyzing}>
                                {t('ai.retake')}
                            </button>
                            <button className="btn btn-primary" onClick={handleAnalyze} disabled={analyzing}>
                                {analyzing ? (
                                    <span className="analyzing-text">
                                        <span className="spinner-small"></span>
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
                >
                    {t('common.close')}
                </button>
            </div>
        </div>
    );
}
