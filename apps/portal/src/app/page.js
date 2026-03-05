'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useModules, useAuth } from '@cofit/lib';

export default function PortalPage() {
  const { modules, isLoading: isModulesLoading } = useModules();
  const { user } = useAuth();
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLiffRouting, setIsLiffRouting] = useState(true);
  const [imageErrors, setImageErrors] = useState({});

  const handleImageError = (moduleId) => setImageErrors(prev => ({ ...prev, [moduleId]: true }));

  useEffect(() => {
    try {
      const decodedUrl = decodeURIComponent(window.location.href);
      if (decodedUrl.includes('path=')) {
        const t = setTimeout(() => setIsLiffRouting(false), 3000);
        return () => clearTimeout(t);
      } else {
        setIsLiffRouting(false);
      }
    } catch {
      setIsLiffRouting(false);
    }
  }, []);

  const moduleStyles = {
    supplements: { bg: 'linear-gradient(135deg, #A0C4FF 0%, #C4B5FD 100%)', emoji: '💊', color: '#1E40AF' },
    wounds: { bg: 'linear-gradient(135deg, #BDE0FE 0%, #A7F3D0 100%)', emoji: '🩹', color: '#065F46' },
    bones: { bg: 'linear-gradient(135deg, #FFC8DD 0%, #FFD6A5 100%)', emoji: '🦴', color: '#9A3412' },
    intimacy: { bg: 'linear-gradient(135deg, #FFAFCC 0%, #FFB5A7 100%)', emoji: '💖', color: '#BE123C' },
    hormones: { bg: 'linear-gradient(135deg, #9BF6FF 0%, #A0C4FF 100%)', emoji: '☯️', color: '#0369A1' },
    habits: { bg: 'linear-gradient(135deg, #FDFFB6 0%, #CAFFBF 100%)', emoji: '📅', color: '#3F6212' },
    default: { bg: 'linear-gradient(135deg, #E2E8F0 0%, #CBD5E1 100%)', emoji: '✨', color: '#334155' },
  };

  const handleNavigation = (e, url) => {
    e.preventDefault();
    setIsNavigating(true);
    setTimeout(() => {
      if (url.startsWith('http')) window.location.href = url;
      else router.push(url);
    }, 300);
  };

  if (isNavigating || isLiffRouting) {
    return (
      <div style={{ backgroundColor: '#0a0a12', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.85)', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
          <div style={{ width: 50, height: 50, border: '5px solid rgba(255,255,255,0.2)', borderTop: '5px solid #A0C4FF', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: 20, fontSize: '1.2rem', fontWeight: 'bold', color: 'white', letterSpacing: '2px' }}>載入中...</p>
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } .grid-item { transition: transform 0.2s ease, box-shadow 0.2s ease; } .grid-item:active { transform: scale(0.95); }`}</style>
      <header style={{ padding: '2rem 1.5rem 1rem', textAlign: 'center' }}>
        <p style={{ fontSize: '1rem', color: '#64748B', margin: 0 }}>
          {user ? `Hello, ${user.displayName || 'User'}!` : 'Welcome back!'} 👋
        </p>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#0F172A', marginTop: '0.5rem', letterSpacing: '-0.5px' }}>
          Health & Care Portal
        </h1>
      </header>
      <main style={{ padding: '0 1.5rem 2rem', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isModulesLoading ? (
          <div style={{ color: '#94A3B8', textAlign: 'center', fontWeight: '500' }}>Loading modules...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', maxWidth: '500px', width: '100%' }}>
            {modules.filter(m => m.is_active).map(module => {
              const styleConfig = moduleStyles[module.id] || moduleStyles.default;
              const specialRoutes = { 'sexual_health': '/intimacy' };
              const defaultTarget = specialRoutes[module.id] || `/${module.id}`;
              const targetUrl = module.external_url || defaultTarget;
              const hasImageError = imageErrors[module.id];
              return (
                <a key={module.id} href={targetUrl} onClick={(e) => handleNavigation(e, targetUrl)} className="grid-item"
                  style={{ textDecoration: 'none', background: hasImageError ? styleConfig.bg : 'transparent', borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(255,255,255,0.4)', overflow: 'hidden', minHeight: hasImageError ? 150 : 'auto', position: 'relative', width: '100%', aspectRatio: hasImageError ? 'auto' : '833 / 843' }}>
                  {!hasImageError ? (
                    <img src={`/images/portal/${module.id}.jpg`} alt={module.name_en} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={() => handleImageError(module.id)} />
                  ) : (
                    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ fontSize: '4.5rem', marginBottom: '1rem', filter: 'drop-shadow(0px 8px 6px rgba(0,0,0,0.15))' }}>{styleConfig.emoji}</div>
                      <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: styleConfig.color, margin: 0, lineHeight: 1.2 }}>{module.name_en}</h2>
                    </div>
                  )}
                </a>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
