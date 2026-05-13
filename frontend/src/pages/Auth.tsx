import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Globe, Network } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

const languages = [
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
  { code: 'pt', label: 'PT' },
];

export default function Auth() {
  const { t, i18n } = useTranslation();
  const { signIn, user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const currentLang = i18n.language?.split('-')[0] || 'es';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await signIn(formData.email, formData.password);
    setIsLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(218,16%,11%)' }}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4" style={{ background: 'hsl(218,16%,11%)' }}>

      {/* ambient city background */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'url(/smart-city-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.10,
        filter: 'blur(6px) saturate(0.5)',
      }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(10,14,26,0.80) 0%, rgba(12,16,28,0.76) 50%, rgba(10,14,26,0.82) 100%)' }} />

      {/* glow orbs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div style={{ position: 'absolute', top: '-8%', left: '-6%', width: '55%', height: '55%', background: 'radial-gradient(ellipse, rgba(59,130,246,0.14) 0%, transparent 65%)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-8%', width: '60%', height: '60%', background: 'radial-gradient(ellipse, rgba(139,92,246,0.12) 0%, transparent 65%)', filter: 'blur(90px)' }} />
        <div style={{ position: 'absolute', top: '45%', right: '10%', width: '30%', height: '30%', background: 'radial-gradient(ellipse, rgba(6,182,212,0.08) 0%, transparent 65%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)', backgroundSize: '52px 52px' }} />
      </div>

      {/* floating ambient badges */}
      <motion.div className="absolute left-[8%] top-[22%] hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl pointer-events-none"
        style={{ background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.20)', backdropFilter: 'blur(16px)' }}
        animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
        <span style={{ color: 'rgba(147,197,253,0.85)', fontSize: '0.7rem', fontWeight: 600 }}>RAG · Smart Cities</span>
      </motion.div>
      <motion.div className="absolute right-[7%] top-[30%] hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl pointer-events-none"
        style={{ background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.20)', backdropFilter: 'blur(16px)' }}
        animate={{ y: [0, -6, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}>
        <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
        <span style={{ color: 'rgba(196,181,253,0.85)', fontSize: '0.7rem', fontWeight: 600 }}>AI · GPT-4o</span>
      </motion.div>
      <motion.div className="absolute left-[10%] bottom-[25%] hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl pointer-events-none"
        style={{ background: 'rgba(6,182,212,0.09)', border: '1px solid rgba(6,182,212,0.18)', backdropFilter: 'blur(16px)' }}
        animate={{ y: [0, -7, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2.5 }}>
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span style={{ color: 'rgba(103,232,249,0.85)', fontSize: '0.7rem', fontWeight: 600 }}>Smart Cities · ISO</span>
      </motion.div>

      {/* language selector */}
      <div className="absolute top-4 right-5 z-30 flex items-center gap-1 px-1 py-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
        <Globe className="w-3.5 h-3.5 ml-1.5" style={{ color: 'rgba(255,255,255,0.28)' }} />
        {languages.map(lang => (
          <button key={lang.code} onClick={() => i18n.changeLanguage(lang.code)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-200"
            style={{ background: currentLang === lang.code ? 'rgba(59,130,246,0.25)' : 'transparent', color: currentLang === lang.code ? '#93c5fd' : 'rgba(255,255,255,0.3)', border: currentLang === lang.code ? '1px solid rgba(59,130,246,0.38)' : '1px solid transparent', letterSpacing: '0.05em' }}>
            {lang.label}
          </button>
        ))}
      </div>

      {/* login card */}
      <motion.div
        className="relative z-10 w-full max-w-[400px]"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        {/* logo + brand */}
        <div className="text-center mb-8">
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{ background: 'linear-gradient(135deg, rgba(30,41,80,0.95) 0%, rgba(20,27,60,0.95) 100%)', border: '1px solid rgba(99,130,246,0.45)', backdropFilter: 'blur(24px)', boxShadow: '0 0 48px rgba(59,130,246,0.25), inset 0 1px 0 rgba(255,255,255,0.08)' }}
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg width="36" height="36" viewBox="0 0 44 44" fill="none">
              <defs>
                <linearGradient id="authLogoGrad" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="50%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>
              </defs>
              <polygon points="22,3 39,12.5 39,31.5 22,41 5,31.5 5,12.5" stroke="url(#authLogoGrad)" strokeWidth="1.5" fill="none" opacity="0.5" />
              <circle cx="22" cy="22" r="3.5" fill="url(#authLogoGrad)" />
              <circle cx="12" cy="16" r="2" fill="url(#authLogoGrad)" opacity="0.7" />
              <circle cx="32" cy="16" r="2" fill="url(#authLogoGrad)" opacity="0.7" />
              <circle cx="12" cy="28" r="2" fill="url(#authLogoGrad)" opacity="0.7" />
              <circle cx="32" cy="28" r="2" fill="url(#authLogoGrad)" opacity="0.7" />
              <line x1="22" y1="22" x2="12" y2="16" stroke="url(#authLogoGrad)" strokeWidth="1" opacity="0.5" />
              <line x1="22" y1="22" x2="32" y2="16" stroke="url(#authLogoGrad)" strokeWidth="1" opacity="0.5" />
              <line x1="22" y1="22" x2="12" y2="28" stroke="url(#authLogoGrad)" strokeWidth="1" opacity="0.5" />
              <line x1="22" y1="22" x2="32" y2="28" stroke="url(#authLogoGrad)" strokeWidth="1" opacity="0.5" />
            </svg>
          </motion.div>

          <h1 className="text-3xl font-bold tracking-tight mb-1">
            <span style={{ color: 'rgba(255,255,255,0.95)' }}>Smart</span>
            <span style={{ background: 'linear-gradient(135deg, #60a5fa 0%, #818cf8 50%, #c084fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Match</span>
          </h1>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Enterprise AI Platform · Smart Cities</p>
        </div>

        {/* form card */}
        <div style={{ background: 'rgba(255,255,255,0.035)', backdropFilter: 'blur(28px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1.25rem', padding: '1.75rem', boxShadow: '0 8px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
          <h2 className="text-base font-semibold mb-5" style={{ color: 'rgba(255,255,255,0.88)' }}>{t('auth.signInTitle')}</h2>
          <form onSubmit={handleSignIn} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{t('auth.email')}</Label>
              <Input id="email" name="email" type="email" placeholder={t('auth.emailPlaceholder')} value={formData.email} onChange={handleInputChange} required
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)', borderRadius: '0.625rem' }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{t('auth.password')}</Label>
              <Input id="password" name="password" type="password" placeholder={t('auth.passwordPlaceholder')} value={formData.password} onChange={handleInputChange} required
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)', borderRadius: '0.625rem' }} />
            </div>
            <Button type="submit" disabled={isLoading} className="mt-1 gap-2"
              style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)', border: 'none', color: 'white', fontWeight: 600, padding: '0.625rem', borderRadius: '0.625rem', boxShadow: '0 4px 20px rgba(59,130,246,0.35)' }}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Network className="h-4 w-4" />}
              {t('auth.signIn')}
            </Button>
          </form>
        </div>

        <p className="text-center text-[10px] mt-5" style={{ color: 'rgba(255,255,255,0.12)' }}>
          SmartMatch &copy; {new Date().getFullYear()} · Enterprise AI Platform
        </p>
      </motion.div>
    </div>
  );
}
