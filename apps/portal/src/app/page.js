'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useModules, useAuth } from '@vitera/lib';

const MODULE_STYLES = {
  supplements: { bg: 'linear-gradient(135deg, #A0C4FF 0%, #C4B5FD 100%)', emoji: '💊', color: '#1E40AF' },
  wounds:      { bg: 'linear-gradient(135deg, #BDE0FE 0%, #A7F3D0 100%)', emoji: '🩹', color: '#065F46' },
  bones:       { bg: 'linear-gradient(135deg, #FFC8DD 0%, #FFD6A5 100%)', emoji: '🦴', color: '#9A3412' },
  intimacy:    { bg: 'linear-gradient(135deg, #FFAFCC 0%, #FFB5A7 100%)', emoji: '💖', color: '#BE123C' },
  hormones:    { bg: 'linear-gradient(135deg, #9BF6FF 0%, #A0C4FF 100%)', emoji: '☯️', color: '#0369A1' },
  habits:      { bg: 'linear-gradient(135deg, #FDFFB6 0%, #CAFFBF 100%)', emoji: '📅', color: '#3F6212' },
  default:     { bg: 'linear-gradient(135deg, #E2E8F0 0%, #CBD5E1 100%)', emoji: '✨', color: '#334155' },
};

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
      <div className="bg-[#0a0a12] min-h-screen flex flex-col relative">
        <div className="fixed inset-0 bg-slate-900/85 z-[99999] flex flex-col items-center justify-center backdrop-blur-[10px]">
          <div className="w-[50px] h-[50px] border-[5px] border-white/20 border-t-[#A0C4FF] rounded-full animate-spin" />
          <p className="mt-5 text-[1.2rem] font-bold text-white tracking-[2px]">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <header className="px-6 pt-8 pb-4 text-center">
        <p className="text-[1rem] text-slate-500 m-0">
          {user ? `Hello, ${user.displayName || 'User'}!` : 'Welcome back!'} 👋
        </p>
        <h1 className="text-[2rem] font-extrabold text-slate-900 mt-2 tracking-tight">
          Health & Care Portal
        </h1>
      </header>
      <main className="px-6 pb-8 flex-1 flex items-center justify-center">
        {isModulesLoading ? (
          <div className="text-slate-400 text-center font-medium">Loading modules...</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 max-w-[500px] w-full">
            {modules.filter(m => m.is_active).map(module => {
              const styleConfig = MODULE_STYLES[module.id] || MODULE_STYLES.default;
              const specialRoutes = { 'sexual_health': '/intimacy' };
              const defaultTarget = specialRoutes[module.id] || `/${module.id}`;
              const targetUrl = module.external_url || defaultTarget;
              const hasImageError = imageErrors[module.id];
              return (
                <a
                  key={module.id}
                  href={targetUrl}
                  onClick={(e) => handleNavigation(e, targetUrl)}
                  className="no-underline rounded-[20px] overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.06),inset_0_0_0_1px_rgba(255,255,255,0.4)] relative w-full transition-transform duration-200 active:scale-95"
                  style={{
                    background: hasImageError ? styleConfig.bg : 'transparent',
                    minHeight: hasImageError ? 150 : 'auto',
                    aspectRatio: hasImageError ? 'auto' : '833 / 843',
                  }}
                >
                  {!hasImageError ? (
                    <img
                      src={`/images/portal/${module.id}.jpg`}
                      alt={module.name_en}
                      className="w-full h-full object-cover block"
                      onError={() => handleImageError(module.id)}
                    />
                  ) : (
                    <div className="flex flex-col items-center py-6 px-4">
                      <div className="text-[4.5rem] mb-4 drop-shadow-[0_8px_6px_rgba(0,0,0,0.15)]">{styleConfig.emoji}</div>
                      <h2 className="text-[1.4rem] font-extrabold m-0 leading-tight" style={{ color: styleConfig.color }}>{module.name_en}</h2>
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
