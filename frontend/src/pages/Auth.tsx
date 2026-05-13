import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Database } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Auth() {
  const { t, i18n } = useTranslation();
  const { signIn, user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const languages = [
    { code: 'es', label: 'ES' },
    { code: 'en', label: 'EN' },
    { code: 'pt', label: 'PT' },
  ];
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg, hsl(220,28%,7%) 0%, hsl(222,32%,10%) 50%, hsl(218,26%,8%) 100%)' }}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', background: 'linear-gradient(160deg, hsl(220,28%,7%) 0%, hsl(222,32%,10%) 50%, hsl(218,26%,8%) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      {/* Diffuse orbs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-8%', left: '-6%', width: '55%', height: '55%', background: 'radial-gradient(ellipse, rgba(59,130,246,0.16) 0%, transparent 65%)', filter: 'blur(72px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-8%', width: '60%', height: '60%', background: 'radial-gradient(ellipse, rgba(139,92,246,0.14) 0%, transparent 65%)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', top: '40%', right: '15%', width: '35%', height: '40%', background: 'radial-gradient(ellipse, rgba(99,102,241,0.1) 0%, transparent 65%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '20%', left: '10%', width: '30%', height: '30%', background: 'radial-gradient(ellipse, rgba(59,130,246,0.08) 0%, transparent 65%)', filter: 'blur(50px)' }} />
      </div>

      {/* Language selector */}
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2rem', padding: '0.25rem' }}>
        {languages.map(lang => (
          <button
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '1.5rem',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600,
              transition: 'all 0.2s',
              background: currentLang === lang.code ? 'rgba(59,130,246,0.35)' : 'transparent',
              color: currentLang === lang.code ? '#93c5fd' : 'rgba(255,255,255,0.5)',
            }}
          >
            {lang.label}
          </button>
        ))}
      </div>

      {/* Card */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '1rem', background: 'linear-gradient(135deg, rgba(59,130,246,0.3) 0%, rgba(139,92,246,0.3) 100%)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', marginBottom: '1rem' }}>
            <Database style={{ width: '32px', height: '32px', color: '#93c5fd' }} />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>Sondabase</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', marginTop: '0.5rem', fontSize: '0.9rem' }}>{t('auth.signInSubtitle')}</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1.25rem', padding: '2rem', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
          <h2 style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700, fontSize: '1.25rem', marginBottom: '1.5rem', marginTop: 0 }}>{t('auth.signInTitle')}</h2>
          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Label htmlFor="email" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>{t('auth.email')}</Label>
              <Input id="email" name="email" type="email" placeholder={t('auth.emailPlaceholder')} value={formData.email} onChange={handleInputChange} required style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Label htmlFor="password" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>{t('auth.password')}</Label>
              <Input id="password" name="password" type="password" placeholder={t('auth.passwordPlaceholder')} value={formData.password} onChange={handleInputChange} required style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)' }} />
            </div>
            <Button type="submit" disabled={isLoading} style={{ marginTop: '0.5rem', background: 'linear-gradient(135deg, rgba(59,130,246,0.8) 0%, rgba(139,92,246,0.8) 100%)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: 600, padding: '0.625rem', borderRadius: '0.625rem' }}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('auth.signIn')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
