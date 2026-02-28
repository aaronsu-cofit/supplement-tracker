export default function BonesLoading() {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ width: 40, height: 40, border: '3px solid rgba(168,255,120,0.3)', borderTopColor: '#a8ff78', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#a8a8a8', fontSize: '0.9rem' }}>正在喚醒資料庫，請稍候...</p>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
