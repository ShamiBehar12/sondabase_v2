import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard, FileText, Trophy, MessageCircle, Award, Settings,
  ArrowRight, Globe, ChevronRight, Zap, Shield, TrendingUp, Network,
  Brain, Building2,
} from 'lucide-react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';

// ── Particles canvas ───────────────────────────────────────────────────────
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animId: number;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const N = 60;
    const pts = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.5 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(96,165,250,${p.alpha})`;
        ctx.fill();
      }
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(99,102,241,${0.12 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animId); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ opacity: 0.6 }} />;
}

// ── Animated logo ──────────────────────────────────────────────────────────
function SmartMatchLogo() {
  const pulseControls = useAnimation();
  useEffect(() => {
    pulseControls.start({
      scale: [1, 1.08, 1],
      opacity: [0.6, 1, 0.6],
      transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
    });
  }, [pulseControls]);

  return (
    <motion.div
      className="relative inline-flex items-center justify-center"
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* outer glow ring */}
      <motion.div
        className="absolute inset-0 rounded-3xl"
        style={{ background: 'radial-gradient(ellipse, rgba(59,130,246,0.35) 0%, transparent 70%)', filter: 'blur(20px)' }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* logo box */}
      <div
        className="relative w-20 h-20 rounded-3xl flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, rgba(30,41,80,0.95) 0%, rgba(20,27,60,0.95) 100%)',
          border: '1px solid rgba(99,130,246,0.5)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 0 60px rgba(59,130,246,0.3), 0 0 120px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
        }}
      >
        {/* animated gradient sweep */}
        <motion.div
          className="absolute inset-0 rounded-3xl overflow-hidden"
          style={{ opacity: 0.25 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1, #c084fc, #3b82f6)', backgroundSize: '300% 300%' }}
            animate={{ backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
        {/* SM monogram */}
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none" className="relative z-10">
          <defs>
            <linearGradient id="logoGrad" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
          </defs>
          {/* hexagon outline */}
          <polygon points="22,3 39,12.5 39,31.5 22,41 5,31.5 5,12.5" stroke="url(#logoGrad)" strokeWidth="1.5" fill="none" opacity="0.5" />
          {/* inner network nodes */}
          <circle cx="22" cy="22" r="3.5" fill="url(#logoGrad)" />
          <circle cx="12" cy="16" r="2" fill="url(#logoGrad)" opacity="0.7" />
          <circle cx="32" cy="16" r="2" fill="url(#logoGrad)" opacity="0.7" />
          <circle cx="12" cy="28" r="2" fill="url(#logoGrad)" opacity="0.7" />
          <circle cx="32" cy="28" r="2" fill="url(#logoGrad)" opacity="0.7" />
          {/* connection lines */}
          <line x1="22" y1="22" x2="12" y2="16" stroke="url(#logoGrad)" strokeWidth="1" opacity="0.5" />
          <line x1="22" y1="22" x2="32" y2="16" stroke="url(#logoGrad)" strokeWidth="1" opacity="0.5" />
          <line x1="22" y1="22" x2="12" y2="28" stroke="url(#logoGrad)" strokeWidth="1" opacity="0.5" />
          <line x1="22" y1="22" x2="32" y2="28" stroke="url(#logoGrad)" strokeWidth="1" opacity="0.5" />
        </svg>
        {/* orbiting dot */}
        <motion.div
          className="absolute w-2 h-2 rounded-full"
          style={{ background: '#60a5fa', boxShadow: '0 0 8px #60a5fa', top: '8px', left: '50%', marginLeft: '-4px', transformOrigin: '4px 28px' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    </motion.div>
  );
}

// ── Floating metric card ───────────────────────────────────────────────────
function FloatingCard({ children, style, delay = 0 }: { children: React.ReactNode; style?: React.CSSProperties; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: [0, -6, 0] }}
      transition={{ opacity: { delay, duration: 0.6 }, y: { delay, duration: 3 + delay * 0.5, repeat: Infinity, ease: 'easeInOut' } }}
      className="absolute hidden lg:flex items-center gap-2.5 px-3 py-2.5 rounded-2xl"
      style={{
        background: 'rgba(15,20,40,0.75)',
        border: '1px solid rgba(99,130,246,0.2)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

// ── AI chip badge ──────────────────────────────────────────────────────────
function AiBadge({ label, color }: { label: string; color: string }) {
  return (
    <motion.span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide"
      style={{ background: `${color}18`, border: `1px solid ${color}40`, color }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
      {label}
    </motion.span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
const Index = () => {
  const { t, i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const languages = [
    { code: 'es', label: 'ES' },
    { code: 'en', label: 'EN' },
    { code: 'pt', label: 'PT' },
  ];

  const cards = [
    { icon: LayoutDashboard, title: t('home.featureDashboard'), desc: t('home.featureDashboardDesc'), href: '/dashboard', color: '#60a5fa', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', glow: 'rgba(59,130,246,0.08)' },
    { icon: FileText, title: t('home.featureDocuments'), desc: t('home.featureDocumentsDesc'), href: '/certificates', color: '#818cf8', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.2)', glow: 'rgba(99,102,241,0.08)' },
    { icon: Trophy, title: t('home.featureStories'), desc: t('home.featureStoriesDesc'), href: '/success-stories', color: '#fbbf24', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', glow: 'rgba(245,158,11,0.06)' },
    { icon: MessageCircle, title: t('home.featureAI'), desc: t('home.featureAIDesc'), href: '/ai-chat', color: '#34d399', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', glow: 'rgba(16,185,129,0.07)' },
    { icon: Award, title: t('home.featureCertificates'), desc: t('home.featureCertificatesDesc'), href: '/my-certificates', color: '#c084fc', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)', glow: 'rgba(139,92,246,0.07)' },
    { icon: Settings, title: t('home.featureSettings'), desc: t('home.featureSettingsDesc'), href: '/settings', color: '#94a3b8', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)', glow: 'rgba(100,116,139,0.05)' },
  ];

  const currentLang = i18n.language?.split('-')[0] || 'es';

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'hsl(222,32%,6%)' }}>

      {/* ── ambient background image ── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/smart-city-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.07,
          filter: 'blur(6px) saturate(0.4)',
        }}
      />
      {/* overlay to darken image further */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(8,12,28,0.92) 0%, rgba(10,15,35,0.88) 50%, rgba(8,12,28,0.94) 100%)' }} />

      {/* ── glow orbs ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div style={{ position: 'absolute', top: '-10%', left: '-8%', width: '60%', height: '60%', background: 'radial-gradient(ellipse, rgba(59,130,246,0.12) 0%, transparent 65%)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', top: '10%', right: '-12%', width: '55%', height: '55%', background: 'radial-gradient(ellipse, rgba(139,92,246,0.1) 0%, transparent 65%)', filter: 'blur(90px)' }} />
        <div style={{ position: 'absolute', bottom: '-5%', left: '10%', width: '50%', height: '45%', background: 'radial-gradient(ellipse, rgba(16,185,129,0.07) 0%, transparent 65%)', filter: 'blur(80px)' }} />
        {/* grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)', backgroundSize: '52px 52px' }} />
      </div>

      {/* ── particles ── */}
      {mounted && <ParticleField />}

      {/* ── floating metric cards ── */}
      <FloatingCard style={{ top: '18%', left: '4%' }} delay={0.8}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.2)' }}>
          <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <div>
          <div className="text-xs font-bold text-white">164 docs</div>
          <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>indexados · RAG</div>
        </div>
      </FloatingCard>

      <FloatingCard style={{ top: '30%', right: '4%' }} delay={1.1}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.2)' }}>
          <Brain className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <div>
          <div className="text-xs font-bold text-white">gpt-4o-mini</div>
          <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>AI · activo</div>
        </div>
      </FloatingCard>

      <FloatingCard style={{ top: '55%', left: '3%' }} delay={1.4}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.2)' }}>
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div>
          <div className="text-xs font-bold text-white">98.4%</div>
          <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>match accuracy</div>
        </div>
      </FloatingCard>

      <FloatingCard style={{ top: '60%', right: '3%' }} delay={1.7}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.2)' }}>
          <Building2 className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div>
          <div className="text-xs font-bold text-white">8 países</div>
          <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Smart Cities</div>
        </div>
      </FloatingCard>

      {/* ── lang switcher ── */}
      <div className="absolute top-4 right-5 z-30 flex items-center gap-1 px-1 py-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
        <Globe className="w-3.5 h-3.5 ml-1.5" style={{ color: 'rgba(255,255,255,0.28)' }} />
        {languages.map((lang) => (
          <button key={lang.code} onClick={() => i18n.changeLanguage(lang.code)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-200"
            style={{ background: currentLang === lang.code ? 'rgba(59,130,246,0.25)' : 'transparent', color: currentLang === lang.code ? '#93c5fd' : 'rgba(255,255,255,0.3)', border: currentLang === lang.code ? '1px solid rgba(59,130,246,0.38)' : '1px solid transparent', letterSpacing: '0.05em' }}>
            {lang.label}
          </button>
        ))}
      </div>

      {/* ── main content ── */}
      <div className="relative z-10 flex flex-col items-center px-4 py-16 pt-20 min-h-screen">

        {/* hero */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          {/* AI badge */}
          <motion.div
            className="flex justify-center mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', color: '#93c5fd', backdropFilter: 'blur(12px)' }}>
              <Zap className="w-3 h-3" />
              AI-Powered Smart City Platform
            </span>
          </motion.div>

          {/* logo */}
          <div className="flex justify-center mb-6">
            <SmartMatchLogo />
          </div>

          {/* title */}
          <motion.h1
            className="text-6xl md:text-7xl font-bold tracking-tight mb-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <span style={{ color: 'rgba(255,255,255,0.95)' }}>Smart</span>
            <motion.span
              style={{
                background: 'linear-gradient(135deg, #60a5fa 0%, #818cf8 40%, #c084fc 80%, #60a5fa 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
              animate={{ backgroundPosition: ['0% center', '200% center'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            >
              Match
            </motion.span>
          </motion.h1>

          {/* subtitle */}
          <motion.p
            className="text-base md:text-lg max-w-xl mx-auto leading-relaxed mb-4"
            style={{ color: 'rgba(255,255,255,0.45)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.6 }}
          >
            Inteligencia artificial para conectar datos, documentos, proveedores e infraestructura urbana.
          </motion.p>

          {/* AI chips */}
          <motion.div
            className="flex flex-wrap justify-center gap-2 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.6 }}
          >
            <AiBadge label="RAG · ChromaDB" color="#60a5fa" />
            <AiBadge label="IoT Analytics" color="#34d399" />
            <AiBadge label="Smart Cities" color="#818cf8" />
            <AiBadge label="Licitaciones IA" color="#fbbf24" />
            <AiBadge label="Vector Search" color="#c084fc" />
          </motion.div>

          {/* CTAs */}
          <motion.div
            className="flex flex-wrap justify-center gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5 }}
          >
            <Link to="/dashboard"
              className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.04] active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)', color: '#fff', boxShadow: '0 4px 32px rgba(59,130,246,0.4), inset 0 1px 0 rgba(255,255,255,0.15)' }}>
              Explorar Plataforma
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link to="/ai-chat"
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.04] active:scale-[0.97]"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(16px)' }}>
              <Network className="w-4 h-4" />
              Ver Demo IA
            </Link>
          </motion.div>
        </motion.div>

        {/* stats row */}
        <motion.div
          className="flex flex-wrap justify-center gap-6 mb-12"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          {[
            { value: '164', label: 'Documentos indexados' },
            { value: '8', label: 'Países activos' },
            { value: '98%', label: 'Precisión de match' },
            { value: '<2s', label: 'Tiempo de respuesta' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold" style={{ background: 'linear-gradient(135deg,#60a5fa,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{stat.value}</div>
              <div className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* divider */}
        <div className="flex items-center gap-4 mb-7 w-full max-w-3xl">
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07))' }} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.2)' }}>{t('home.quickAccess')}</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.07), transparent)' }} />
        </div>

        {/* feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 w-full max-w-3xl">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + i * 0.07, duration: 0.45 }}
              >
                <Link to={card.href}
                  className="group relative rounded-2xl p-5 flex items-start gap-4 transition-all duration-300 hover:scale-[1.025] hover:-translate-y-0.5 block"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(28px)' }}>
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `radial-gradient(ellipse at 30% 50%, ${card.glow} 0%, transparent 70%)`, border: `1px solid ${card.border}` }} />
                  <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: card.bg, border: `1px solid ${card.border}`, boxShadow: `0 0 20px ${card.glow}` }}>
                    <Icon className="w-5 h-5" style={{ color: card.color }} />
                  </div>
                  <div className="relative z-10 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold truncate" style={{ color: 'rgba(255,255,255,0.88)' }}>{card.title}</span>
                      <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 transition-all duration-200 group-hover:translate-x-0.5" style={{ color: 'rgba(255,255,255,0.18)' }} />
                    </div>
                    <p className="text-xs mt-0.5 leading-relaxed line-clamp-2" style={{ color: 'rgba(255,255,255,0.35)' }}>{card.desc}</p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <motion.p
          className="mt-14 text-xs"
          style={{ color: 'rgba(255,255,255,0.12)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          SmartMatch &copy; {new Date().getFullYear()} · Enterprise AI Platform
        </motion.p>
      </div>
    </div>
  );
};

export default Index;
