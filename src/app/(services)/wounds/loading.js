export default function WoundsLoading() {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ width: 40, height: 40, border: '3px solid rgba(255,154,158,0.3)', borderTop: '3px solid #ff9a9e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: '#a8a8a8', fontSize: '0.9rem' }}>正在喚醒資料庫，請稍候...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
