import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Trophy, MessageCircle, Award, Settings,
  ArrowRight, Globe, ChevronRight,
} from 'lucide-react';

const Index = () => {
  const { t, i18n } = useTranslation();

  const languages = [
    { code: 'es', label: 'ES' },
    { code: 'en', label: 'EN' },
    { code: 'pt', label: 'PT' },
  ];

  const cards = [
    {
      icon: LayoutDashboard,
      title: t('home.featureDashboard'),
      desc: t('home.featureDashboardDesc'),
      href: '/dashboard',
      color: '#60a5fa',
      bg: 'rgba(59,130,246,0.12)',
      border: 'rgba(59,130,246,0.22)',
      glow: 'rgba(59,130,246,0.08)',
    },
    {
      icon: FileText,
      title: t('home.featureDocuments'),
      desc: t('home.featureDocumentsDesc'),
      href: '/certificates',
      color: '#818cf8',
      bg: 'rgba(99,102,241,0.12)',
      border: 'rgba(99,102,241,0.22)',
      glow: 'rgba(99,102,241,0.08)',
    },
    {
      icon: Trophy,
      title: t('home.featureStories'),
      desc: t('home.featureStoriesDesc'),
      href: '/success-stories',
      color: '#fbbf24',
      bg: 'rgba(245,158,11,0.12)',
      border: 'rgba(245,158,11,0.22)',
      glow: 'rgba(245,158,11,0.08)',
    },
    {
      icon: MessageCircle,
      title: t('home.featureAI'),
      desc: t('home.featureAIDesc'),
      href: '/ai-chat',
      color: '#34d399',
      bg: 'rgba(16,185,129,0.12)',
      border: 'rgba(16,185,129,0.22)',
      glow: 'rgba(16,185,129,0.08)',
    },
    {
      icon: Award,
      title: t('home.featureCertificates'),
      desc: t('home.featureCertificatesDesc'),
      href: '/my-certificates',
      color: '#c084fc',
      bg: 'rgba(139,92,246,0.12)',
      border: 'rgba(139,92,246,0.22)',
      glow: 'rgba(139,92,246,0.08)',
    },
    {
      icon: Settings,
      title: t('home.featureSettings'),
      desc: t('home.featureSettingsDesc'),
      href: '/settings',
      color: '#94a3b8',
      bg: 'rgba(100,116,139,0.12)',
      border: 'rgba(100,116,139,0.22)',
      glow: 'rgba(100,116,139,0.06)',
    },
  ];

  const currentLang = i18n.language?.split('-')[0] || 'es';

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, hsl(220,28%,7%) 0%, hsl(222,32%,10%) 50%, hsl(218,26%,8%) 100%)',
      }}
    >
      {/* ── Orbes difusos de fondo ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div style={{
          position: 'absolute', top: '-8%', left: '-6%', width: '55%', height: '55%',
          background: 'radial-gradient(ellipse, rgba(59,130,246,0.16) 0%, transparent 65%)',
          filter: 'blur(72px)',
        }} />
        <div style={{
          position: 'absolute', top: '15%', right: '-10%', width: '50%', height: '50%',
          background: 'radial-gradient(ellipse, rgba(139,92,246,0.14) 0%, transparent 65%)',
          filter: 'blur(80px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '0%', left: '15%', width: '45%', height: '40%',
          background: 'radial-gradient(ellipse, rgba(16,185,129,0.1) 0%, transparent 65%)',
          filter: 'blur(70px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', right: '10%', width: '35%', height: '35%',
          background: 'radial-gradient(ellipse, rgba(245,158,11,0.08) 0%, transparent 65%)',
          filter: 'blur(60px)',
        }} />
        {/* Subtle grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
      </div>

      {/* ── Selector de idioma ── */}
      <div
        className="absolute top-4 right-5 z-30 flex items-center gap-1 px-1 py-1 rounded-xl"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.09)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <Globe className="w-3.5 h-3.5 ml-1.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-200"
            style={{
              background: currentLang === lang.code
                ? 'rgba(59,130,246,0.28)'
                : 'transparent',
              color: currentLang === lang.code
                ? '#93c5fd'
                : 'rgba(255,255,255,0.35)',
              border: currentLang === lang.code
                ? '1px solid rgba(59,130,246,0.4)'
                : '1px solid transparent',
              letterSpacing: '0.05em',
            }}
          >
            {lang.label}
          </button>
        ))}
      </div>

      {/* ── Contenido principal ── */}
      <div className="relative z-10 flex flex-col items-center px-4 py-16 pt-24 min-h-screen">

        {/* Hero */}
        <div className="text-center mb-14 animate-slide-up">
          {/* Ícono logo DB */}
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.25) 0%, rgba(139,92,246,0.25) 100%)',
              border: '1px solid rgba(99,130,246,0.35)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 0 48px rgba(59,130,246,0.18), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="rgba(147,197,253,0.9)" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4" style={{ color: 'rgba(255,255,255,0.95)' }}>
            Smart
            <span style={{
              background: 'linear-gradient(135deg, #60a5fa 0%, #818cf8 50%, #c084fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>Match</span>
          </h1>

          <p
            className="text-base md:text-lg max-w-md mx-auto leading-relaxed mb-8"
            style={{ color: 'rgba(255,255,255,0.42)' }}
          >
            {t('home.subtitle')}
          </p>

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              color: '#fff',
              boxShadow: '0 4px 28px rgba(59,130,246,0.38), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            {t('home.goToDashboard')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Divisor con etiqueta */}
        <div className="flex items-center gap-4 mb-7 w-full max-w-3xl">
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08))' }} />
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            {t('home.quickAccess')}
          </span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.08), transparent)' }} />
        </div>

        {/* Grid de tarjetas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 w-full max-w-3xl">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                to={card.href}
                className="group relative rounded-2xl p-5 flex items-start gap-4 transition-all duration-300 hover:scale-[1.025] hover:-translate-y-0.5 animate-fade-in"
                style={{
                  background: 'rgba(255,255,255,0.035)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  backdropFilter: 'blur(24px)',
                  animationDelay: `${i * 0.06}s`,
                  animationFillMode: 'both',
                }}
              >
                {/* Hover glow overlay */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `radial-gradient(ellipse at 30% 50%, ${card.glow} 0%, transparent 70%)`,
                    border: `1px solid ${card.border}`,
                  }}
                />

                {/* Ícono */}
                <div
                  className="relative z-10 flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: card.bg,
                    border: `1px solid ${card.border}`,
                    boxShadow: `0 0 20px ${card.glow}`,
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: card.color }} />
                </div>

                {/* Texto */}
                <div className="relative z-10 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-sm font-semibold truncate"
                      style={{ color: 'rgba(255,255,255,0.88)' }}
                    >
                      {card.title}
                    </span>
                    <ChevronRight
                      className="w-3.5 h-3.5 flex-shrink-0 transition-all duration-200 group-hover:translate-x-0.5"
                      style={{ color: 'rgba(255,255,255,0.2)' }}
                    />
                  </div>
                  <p
                    className="text-xs mt-0.5 leading-relaxed line-clamp-2"
                    style={{ color: 'rgba(255,255,255,0.38)' }}
                  >
                    {card.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <p className="mt-14 text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>
          SmartMatch &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default Index;
