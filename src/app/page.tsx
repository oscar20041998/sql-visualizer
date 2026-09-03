'use client';

import React, { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import { isDemoAuthenticated, setDemoAuthenticated } from '@/lib/demoAuth';
import {
  Database,
  Zap,
  BarChart3,
  Network,
  Sparkles,
  ArrowUpRight,
  Check,
  SearchCheck,
  ShieldAlert,
  Table2,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  LockKeyhole,
  Mail,
  PanelsTopLeft,
  UserRoundPlus,
} from 'lucide-react';

const FeatureCard = ({
  icon: Icon,
  title,
  description,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}) => (
  <div
    className="group relative border-t-2 border-primary/50 bg-card p-6 transition-colors hover:bg-muted/40"
    style={{
      animation: `slideUp 0.6s ease-out ${delay}ms both`,
    }}
  >
    <div className="relative z-10">
      <div className="w-11 h-11 border border-primary/20 bg-primary/10 rounded-md flex items-center justify-center mb-4">
        <div className="text-primary">{Icon}</div>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  </div>
);

function AuthenticationPanel() {
  const router = useRouter();
  const { settings, beginNavigation } = useAppStore();
  const t = getT(settings.locale as 'en' | 'vi');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (username.trim() !== 'admin' || password !== '1234@') {
      toast.error(t.authLoginInvalidCredentials);
      return;
    }

    setDemoAuthenticated();
    toast.success(t.authLoginSuccess);
    beginNavigation('/query-input');
    router.push('/query-input');
  };

  const handleRegister = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    toast.info(t.authRegisterUnavailable);
  };

  const handleUnavailableAuth = (provider: string) => {
    toast.info(t.authSocialUnavailable.replace('{provider}', provider));
  };

  // Splits the localized notice on {username}/{password} tokens so the credentials stay styled.
  const noticeParts = t.authTemporaryAccessNotice.split(/(\{username\}|\{password\})/g);

  return (
    <aside
      id="workspace-access"
      className="w-full border border-border bg-card shadow-2xl shadow-black/20 xl:fixed xl:inset-y-0 xl:right-0 xl:z-30 xl:flex xl:w-[36rem] xl:flex-col xl:justify-center xl:overflow-y-auto xl:rounded-none xl:border-0 xl:border-l xl:border-border"
    >
      <div className="border-b border-border bg-muted/30 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center border border-primary/30 bg-primary/10 text-primary">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">{t.authWorkspaceAccessTitle}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {t.authWorkspaceAccessSubtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5">
        <div
          className="mb-4 grid grid-cols-2 border border-border bg-muted/40 p-1"
          role="tablist"
          aria-label={t.authModeTabsLabel}
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            onClick={() => setMode('login')}
            className={`h-8 text-xs font-medium transition-colors ${mode === 'login' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t.authTabLogin}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            onClick={() => setMode('register')}
            className={`h-8 text-xs font-medium transition-colors ${mode === 'register' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t.authTabRegister}
          </button>
        </div>

        {mode === 'login' ? (
          <form key="login-form" className="space-y-3" onSubmit={handleLogin}>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                {t.authUsernameLabel}
              </span>
              <span className="flex h-9 items-center border border-border bg-background focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                <Mail className="ml-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  placeholder={t.authUsernamePlaceholder}
                  className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-xs text-foreground outline-none placeholder:text-muted-foreground"
                  required
                />
              </span>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                {t.authPasswordLabel}
              </span>
              <span className="flex h-9 items-center border border-border bg-background focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                <LockKeyhole className="ml-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder={t.authPasswordPlaceholder}
                  className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-xs text-foreground outline-none placeholder:text-muted-foreground"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="mr-1.5 grid h-6 w-6 place-items-center text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? t.authHidePassword : t.authShowPassword}
                >
                  {showPassword ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </span>
            </label>
            <button
              type="submit"
              className="flex h-9 w-full items-center justify-center gap-1.5 bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t.authLoginButton} <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </form>
        ) : (
          <form key="register-form" className="space-y-3" onSubmit={handleRegister}>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                {t.authEmailLabel}
              </span>
              <span className="flex h-9 items-center border border-border bg-background focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                <Mail className="ml-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={registerEmail}
                  onChange={(event) => setRegisterEmail(event.target.value)}
                  type="email"
                  autoComplete="email"
                  required
                  placeholder={t.authEmailPlaceholder}
                  className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-xs text-foreground outline-none placeholder:text-muted-foreground"
                />
              </span>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                {t.authCreatePasswordLabel}
              </span>
              <span className="flex h-9 items-center border border-border bg-background focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                <LockKeyhole className="ml-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={registerPassword}
                  onChange={(event) => setRegisterPassword(event.target.value)}
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder={t.authCreatePasswordPlaceholder}
                  className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-xs text-foreground outline-none placeholder:text-muted-foreground"
                />
              </span>
            </label>
            <button
              type="submit"
              className="flex h-9 w-full items-center justify-center gap-1.5 border border-primary bg-primary/10 px-4 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              <UserRoundPlus className="h-3.5 w-3.5" /> {t.authRegisterButton}
            </button>
          </form>
        )}

        <div className="my-4 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          {t.authOrContinueWith}
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleUnavailableAuth(t.authGoogleButton)}
            className="flex h-8 items-center justify-center gap-1.5 border border-border bg-background text-[11px] font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-muted"
          >
            <Globe2 className="h-3.5 w-3.5" />
            {t.authGoogleButton}
          </button>
          <button
            type="button"
            onClick={() => handleUnavailableAuth(t.authMicrosoftButton)}
            className="flex h-8 items-center justify-center gap-1.5 border border-border bg-background text-[11px] font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-muted"
          >
            <PanelsTopLeft className="h-3.5 w-3.5" />
            {t.authMicrosoftButton}
          </button>
        </div>

        <div className="mt-4 border-l-2 border-warning bg-warning/5 px-2.5 py-2 text-[10px] leading-relaxed text-muted-foreground">
          {noticeParts.map((part, index) => {
            if (part === '{username}') {
              return (
                <code key={index} className="text-warning">
                  admin
                </code>
              );
            }
            if (part === '{password}') {
              return (
                <code key={index} className="text-warning">
                  1234@
                </code>
              );
            }
            return <React.Fragment key={index}>{part}</React.Fragment>;
          })}
        </div>
      </div>
    </aside>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [isHovering, setIsHovering] = useState(false);
  const { settings, beginNavigation } = useAppStore();
  const t = getT(settings.locale as 'en' | 'vi');

  const handleGetStarted = () => {
    if (isDemoAuthenticated()) {
      beginNavigation('/query-input');
      router.push('/query-input');
      return;
    }

    document
      .getElementById('workspace-access')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    toast.info(t.authSignInPrompt);
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, var(--border) 1px, transparent 1px),
                            linear-gradient(to bottom, var(--border) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
          opacity: 0.03,
        }}
      />

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

      `}</style>

      {/* Content */}
      <div className="relative z-10 xl:pr-[36rem]">
        {/* Header Navigation */}
        <nav className="border-b border-border/50 backdrop-blur-md bg-background/80 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{t.appName}</h1>
                <p className="text-xs text-muted-foreground">{t.appTagline}</p>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-6 pt-8 xl:mx-0 xl:max-w-none xl:px-0 xl:pt-0">
          <AuthenticationPanel />
        </div>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 py-20 md:py-24">
          <div className="text-center space-y-8">
            {/* Animated badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm"
              style={{ animation: 'slideUp 0.6s ease-out 0ms both' }}
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">{t.homeWelcomeTitle}</span>
            </div>

            {/* Main heading */}
            <div className="space-y-4" style={{ animation: 'slideUp 0.6s ease-out 100ms both' }}>
              <h2 className="text-5xl md:text-7xl font-bold text-foreground leading-tight">
                {t.homeMainHeading}
                <br />
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-pulse">
                  {t.homeMainHeadingGradient}
                </span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                {t.homeDescription}
              </p>
            </div>

            <div
              className="mx-auto grid max-w-4xl grid-cols-1 overflow-hidden border border-border bg-card text-left shadow-xl shadow-black/20 md:grid-cols-[1.2fr_0.8fr]"
              style={{ animation: 'slideUp 0.6s ease-out 160ms both' }}
            >
              <div className="bg-[#0d1117] p-5 font-mono text-xs leading-7">
                <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3 text-[#8b949e]">
                  <span>{t.homePreviewQueryTitle}</span>
                  <span className="rounded bg-[#238636]/20 px-2 py-0.5 text-[#3fb950]">
                    {t.homePreviewAnalyzed}
                  </span>
                </div>
                <p>
                  <span className="text-[#79c0ff]">WITH</span>{' '}
                  <span className="text-[#d2a8ff]">revenue_by_region</span>{' '}
                  <span className="text-[#c9d1d9]">AS (</span>
                </p>
                <p className="pl-4">
                  <span className="text-[#79c0ff]">SELECT</span> region, SUM(amount){' '}
                  <span className="text-[#79c0ff]">AS</span> revenue
                </p>
                <p className="pl-4">
                  <span className="text-[#79c0ff]">FROM</span> orders{' '}
                  <span className="text-[#79c0ff]">GROUP BY</span> region
                </p>
                <p>
                  <span className="text-[#c9d1d9]">)</span>{' '}
                  <span className="text-[#79c0ff]">SELECT</span> region, revenue
                </p>
                <p>
                  <span className="text-[#79c0ff]">FROM</span> revenue_by_region{' '}
                  <span className="text-[#79c0ff]">ORDER BY</span> revenue DESC;
                </p>
              </div>
              <div className="space-y-3 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t.homePreviewInsightTitle}
                </p>
                <div className="border-l-2 border-primary bg-primary/5 p-3">
                  <p className="text-[10px] text-muted-foreground">{t.homePreviewComplexity}</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    24 <span className="text-xs text-primary">MEDIUM</span>
                  </p>
                </div>
                <div className="border-l-2 border-accent bg-accent/5 p-3">
                  <p className="text-[10px] text-muted-foreground">{t.homePreviewRelationships}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    3 {t.homePreviewTables}
                  </p>
                </div>
                <div className="border-l-2 border-warning bg-warning/5 p-3">
                  <p className="text-[10px] text-muted-foreground">{t.homePreviewRecommendation}</p>
                  <p className="mt-1 text-xs leading-relaxed text-foreground">
                    {t.homePreviewRecommendationText}
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              style={{ animation: 'slideUp 0.6s ease-out 200ms both' }}
            >
              <button
                onClick={handleGetStarted}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                className="group relative px-8 py-4 rounded-lg font-semibold text-lg text-primary-foreground bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all duration-300 overflow-hidden shadow-lg hover:shadow-xl"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {t.homeGetStartedButton}
                  <ArrowUpRight
                    className={`w-5 h-5 transition-all duration-300 ${
                      isHovering ? 'translate-x-1 -translate-y-1' : ''
                    }`}
                  />
                </span>
              </button>
              <button
                onClick={() => {
                  beginNavigation('/guideline');
                  router.push('/guideline');
                }}
                className="px-6 py-4 rounded-lg font-semibold text-foreground bg-card border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors duration-200"
              >
                {t.homeGuidelinesButton}
              </button>
            </div>

            {/* Stats section */}
            <div
              className="grid grid-cols-3 gap-6 pt-12 mt-12 border-t border-border/50"
              style={{ animation: 'slideUp 0.6s ease-out 300ms both' }}
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">{t.homeAccuracyLabel}</div>
                <p className="text-sm text-muted-foreground">{t.homeAccuracyValue}</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-accent mb-1">{t.homeRealtimeLabel}</div>
                <p className="text-sm text-muted-foreground">{t.homeRealtimeValue}</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-info mb-1">{t.homeDialectLabel}</div>
                <p className="text-sm text-muted-foreground">{t.homeDialectValue}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border/50 bg-card/40">
          <div className="max-w-7xl mx-auto px-6 py-16 lg:px-8 xl:px-10">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {t.homeWorkflowEyebrow}
              </p>
              <h3 className="mt-3 text-3xl font-bold text-foreground">{t.homeWorkflowTitle}</h3>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                {t.homeWorkflowDescription}
              </p>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {[
                {
                  number: '01',
                  icon: Database,
                  title: t.homeWorkflowInputTitle,
                  description: t.homeWorkflowInputDescription,
                },
                {
                  number: '02',
                  icon: Table2,
                  title: t.homeWorkflowInspectTitle,
                  description: t.homeWorkflowInspectDescription,
                },
                {
                  number: '03',
                  icon: ShieldAlert,
                  title: t.homeWorkflowImproveTitle,
                  description: t.homeWorkflowImproveDescription,
                },
              ].map(({ number, icon: Icon, title, description }) => (
                <div key={number} className="border-t-2 border-primary/50 bg-background p-6">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-primary">{number}</span>
                    <Icon size={19} className="text-primary" />
                  </div>
                  <h4 className="mt-7 text-lg font-semibold text-foreground">{title}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="max-w-7xl mx-auto px-6 py-20 border-t border-border/50">
          <div
            className="text-center mb-16"
            style={{ animation: 'slideUp 0.6s ease-out 0ms both' }}
          >
            <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t.homePowerfulFeaturesTitle}
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t.homeFeaturesDescription}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Database className="w-6 h-6" />}
              title={t.homeQueryAnalysisTitle}
              description={t.homeQueryAnalysisDesc}
              delay={100}
            />
            <FeatureCard
              icon={<Network className="w-6 h-6" />}
              title={t.homeRelationshipMappingTitle}
              description={t.homeRelationshipMappingDesc}
              delay={150}
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title={t.homeMetricsDashboardTitle}
              description={t.homeMetricsDashboardDesc}
              delay={200}
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title={t.homeSmartRecommendationsTitle}
              description={t.homeSmartRecommendationsDesc}
              delay={250}
            />
            <FeatureCard
              icon={<Sparkles className="w-6 h-6" />}
              title={t.homeAiExplainerTitle}
              description={t.homeAiExplainerDesc}
              delay={300}
            />
          </div>
        </section>

        <section className="border-y border-border/50 bg-card/40">
          <div className="max-w-7xl mx-auto flex flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between lg:px-8 xl:px-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t.homeDialectsLabel}
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">{t.homeDialectsTitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              {['my_sql_logo.png', 'postgresql_logo.jpg', 'mssql_logo.png', 'oracle_logo.png'].map(
                (asset) => (
                  <img
                    key={asset}
                    src={`/assets/images/${asset}`}
                    alt=""
                    className="h-9 w-auto object-contain opacity-80"
                  />
                )
              )}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{ animation: 'slideUp 0.6s ease-out 300ms both' }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 blur-xl" />
            <div className="absolute inset-0 border border-primary/20" />

            <div className="relative z-10 bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-12 text-center space-y-6">
              <h4 className="text-3xl font-bold text-foreground">{t.homeReadyToAnalyzeTitle}</h4>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t.homeReadyToAnalyzeDesc}
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/50 backdrop-blur-md bg-background/80 mt-20">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t.homeCopyrightText} <span className="text-primary">✨</span> {t.homeForDevelopers}
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <button className="hover:text-primary transition-colors">{t.homeDocsLink}</button>
                <a
                  className="hover:text-primary transition-colors"
                  href="https://github.com/oscar20041998/sql-visualizer"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t.homeGitHubLink}
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
