'use client';

import { useState } from 'react';
import { useAuth } from '@vitera/lib';
import { useLiff } from '@vitera/lib';

export default function LoginPage() {
    const { login, register, isLoading } = useAuth();
    const { liff, isInitialized } = useLiff();
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleLineLogin = () => {
        if (liff && isInitialized) {
            // Use the LIFF endpoint URL (usually the deployment root)
            // The redirectUri must match the LIFF Endpoint URL configured in LINE Developer Console
            liff.login();
        } else {
            setError('LINE 登入服務尚未初始化，請稍後再試');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            if (mode === 'register') {
                await register(email, password, displayName);
            } else {
                await login(email, password);
            }
            // Always redirect to home after login (portal has no sub-routes)
            window.location.href = '/';
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div style={styles.container}>
                <div style={styles.spinner}></div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                {/* Logo / Header */}
                <div style={styles.header}>
                    <div style={styles.logo}>🏥</div>
                    <h1 style={styles.title}>Health & Care</h1>
                    <p style={styles.subtitle}>請登入以使用完整功能</p>
                </div>

                {/* LINE Login Button */}
                <button
                    onClick={handleLineLogin}
                    style={styles.lineButton}
                    disabled={!isInitialized}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white" style={{ marginRight: '0.5rem' }}>
                        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.064-.023.134-.034.2-.034.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                    </svg>
                    使用 LINE 帳號登入
                </button>

                {/* Divider */}
                <div style={styles.divider}>
                    <span style={styles.dividerLine}></span>
                    <span style={styles.dividerText}>或</span>
                    <span style={styles.dividerLine}></span>
                </div>

                {/* Mode Toggle */}
                <div style={styles.modeToggle}>
                    <button
                        onClick={() => { setMode('login'); setError(''); }}
                        style={mode === 'login' ? styles.modeActive : styles.modeInactive}
                    >
                        登入
                    </button>
                    <button
                        onClick={() => { setMode('register'); setError(''); }}
                        style={mode === 'register' ? styles.modeActive : styles.modeInactive}
                    >
                        註冊
                    </button>
                </div>

                {/* Email Form */}
                <form onSubmit={handleSubmit} style={styles.form}>
                    {mode === 'register' && (
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>顯示名稱</label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="輸入您的暱稱"
                                style={styles.input}
                            />
                        </div>
                    )}
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="example@email.com"
                            required
                            style={styles.input}
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>密碼</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="至少 8 位數"
                            minLength={8}
                            required
                            style={styles.input}
                        />
                    </div>

                    {error && <div style={styles.error}>{error}</div>}

                    <button
                        type="submit"
                        disabled={submitting}
                        style={{
                            ...styles.submitButton,
                            opacity: submitting ? 0.7 : 1,
                        }}
                    >
                        {submitting ? '處理中...' : mode === 'register' ? '註冊帳號' : '登入'}
                    </button>
                </form>
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f0c29 0%, #1a1a2e 50%, #16213e 100%)',
        padding: '1rem',
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '3px solid rgba(255,255,255,0.1)',
        borderTop: '3px solid #7c5cfc',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    card: {
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '2.5rem 2rem',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    },
    header: {
        textAlign: 'center',
        marginBottom: '2rem',
    },
    logo: {
        fontSize: '3rem',
        marginBottom: '0.5rem',
    },
    title: {
        color: '#fff',
        fontSize: '1.5rem',
        fontWeight: 'bold',
        margin: '0 0 0.3rem 0',
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: '0.9rem',
        margin: 0,
    },
    lineButton: {
        width: '100%',
        padding: '0.9rem',
        background: '#06C755',
        color: '#fff',
        border: 'none',
        borderRadius: '12px',
        fontSize: '1rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.2s, box-shadow 0.2s',
    },
    divider: {
        display: 'flex',
        alignItems: 'center',
        margin: '1.5rem 0',
        gap: '0.8rem',
    },
    dividerLine: {
        flex: 1,
        height: '1px',
        background: 'rgba(255, 255, 255, 0.15)',
    },
    dividerText: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: '0.85rem',
    },
    modeToggle: {
        display: 'flex',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '10px',
        padding: '4px',
        marginBottom: '1.5rem',
    },
    modeActive: {
        flex: 1,
        padding: '0.6rem',
        background: 'rgba(124, 92, 252, 0.3)',
        border: '1px solid rgba(124, 92, 252, 0.5)',
        borderRadius: '8px',
        color: '#fff',
        fontWeight: 'bold',
        fontSize: '0.9rem',
        cursor: 'pointer',
    },
    modeInactive: {
        flex: 1,
        padding: '0.6rem',
        background: 'transparent',
        border: '1px solid transparent',
        borderRadius: '8px',
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '0.9rem',
        cursor: 'pointer',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.3rem',
    },
    label: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '0.85rem',
        fontWeight: '500',
    },
    input: {
        padding: '0.8rem 1rem',
        background: 'rgba(255, 255, 255, 0.07)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '10px',
        color: '#fff',
        fontSize: '1rem',
        outline: 'none',
        transition: 'border-color 0.2s',
    },
    error: {
        background: 'rgba(255, 107, 107, 0.15)',
        border: '1px solid rgba(255, 107, 107, 0.3)',
        borderRadius: '8px',
        padding: '0.7rem 1rem',
        color: '#ff6b6b',
        fontSize: '0.85rem',
    },
    submitButton: {
        padding: '0.9rem',
        background: 'linear-gradient(135deg, #7c5cfc, #5ce0d8)',
        color: '#fff',
        border: 'none',
        borderRadius: '12px',
        fontSize: '1rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginTop: '0.5rem',
        transition: 'opacity 0.2s, transform 0.2s',
    },
};
