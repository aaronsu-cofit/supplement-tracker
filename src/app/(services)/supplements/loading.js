export default function SupplementsLoading() {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ width: 40, height: 40, border: '3px solid rgba(124, 92, 252, 0.3)', borderTopColor: '#7c5cfc', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: '#a8a8a8', fontSize: '0.9rem' }}>正在喚醒資料庫，請稍候...</p>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
