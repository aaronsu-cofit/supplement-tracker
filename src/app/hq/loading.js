export default function HQLoading() {
    return (
        <div className="hq-layout">
            <aside className="hq-sidebar">
                <div className="hq-brand">
                    <div className="hq-logo">C</div>
                    <h1>HQ Control</h1>
                </div>
                <nav className="hq-nav">
                    {['總覽 (Overview)', '模組設定 (Modules)', '管理員權限 (Admins)'].map((label) => (
                        <div key={label} className="hq-nav-link" style={{ opacity: 0.4 }}>{label}</div>
                    ))}
                </nav>
            </aside>
            <main className="hq-main">
                <div className="hq-content hq-fade-in">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingTop: '2rem' }}>
                        <div style={{ height: '2rem', width: '40%', background: 'rgba(255,255,255,0.06)', borderRadius: '0.5rem' }} />
                        <div style={{ height: '1rem', width: '60%', background: 'rgba(255,255,255,0.04)', borderRadius: '0.5rem' }} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} style={{ height: '180px', background: 'rgba(255,255,255,0.04)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.06)' }} />
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
