'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import { isDemoAuthenticated } from '@/lib/demoAuth';
import {
  Database,
  Zap,
  BarChart3,
  Network,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  Table2,
  Menu,
  X,
  BookOpen,
  Layers,
  LayoutGrid,
  Workflow as WorkflowIcon,
} from 'lucide-react';

const FocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const FeatureCard = ({
  icon,
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
    className="group relative flex flex-col border border-border/70 bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5"
    style={{ animation: `slideUp 0.6s ease-out ${delay}ms both` }}
  >
    <div className="mb-4 w-11 h-11 rounded-lg border border-primary/20 bg-primary/10 flex items-center justify-center text-primary transition-transform duration-300 group-hover:scale-110">
      {icon}
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
  </div>
);

const StatItem = ({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  accent: string;
}) => (
  <div className="flex items-center gap-4 rounded-xl border border-border/70 bg-card/50 p-4 text-left">
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${accent}`}>
      {icon}
    </div>
    <div>
      <div className="text-2xl font-bold leading-none text-foreground">{value}</div>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  </div>
);

export default function HomePage() {
  const router = useRouter();
  const [isHovering, setIsHovering] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { settings, beginNavigation } = useAppStore();
  const t = getT(settings.locale as 'en' | 'vi');

  const handleGetStarted = () => {
    if (isDemoAuthenticated()) {
      beginNavigation('/query-input');
      router.push('/query-input');
      return;
    }

    beginNavigation('/login');
    router.push('/login');
  };

  const goToGuideline = () => {
    beginNavigation('/guideline');
    router.push('/guideline');
  };

  const goToReadme = () => {
    beginNavigation('/readme');
    router.push('/readme');
  };

  return (
    <div id="top" className="relative min-h-screen bg-background overflow-hidden">
      {/* Grid pattern overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
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

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>

      {/* Skip link */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        {t.homeSkipToContent}
      </a>
        {/* Header Navigation */}
        <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex h-16 items-center justify-between gap-4">
              <a href="#top" className="flex items-center gap-3" aria-label={t.appName}>
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md shadow-primary/20">
                  <Database className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-xl font-bold text-foreground leading-tight">{t.appName}</p>
                  <p className="text-xs text-muted-foreground">{t.appTagline}</p>
                </div>
              </a>

              <nav className="hidden md:flex items-center gap-1" aria-label={t.appName}>
                <a
                  href="#features"
                  className={`rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground ${FocusRing}`}
                >
                  {t.homeNavFeatures}
                </a>
                <a
                  href="#workflow"
                  className={`rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground ${FocusRing}`}
                >
                  {t.homeNavWorkflow}
                </a>
                <button
                  onClick={goToGuideline}
                  className={`rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground ${FocusRing}`}
                >
                  {t.navGuideline}
                </button>
                <button
                  onClick={goToReadme}
                  className={`rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground ${FocusRing}`}
                >
                  {t.homeNavDocs}
                </button>
              </nav>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleGetStarted}
                  className={`hidden md:inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground bg-gradient-to-r from-primary to-accent shadow-md shadow-primary/20 transition-opacity hover:opacity-90 ${FocusRing}`}
                >
                  {t.homeGetStartedButton}
                  <ArrowUpRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setMobileMenuOpen((open) => !open)}
                  className={`md:hidden rounded-md p-2 text-foreground transition-colors hover:bg-muted/50 ${FocusRing}`}
                  aria-expanded={mobileMenuOpen}
                  aria-controls="mobile-nav"
                  aria-label={mobileMenuOpen ? t.homeNavCloseMenu : t.homeNavOpenMenu}
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>

          {mobileMenuOpen && (
            <nav
              id="mobile-nav"
              className="md:hidden border-t border-border/60 bg-background/95 backdrop-blur-md"
              aria-label={t.appName}
            >
              <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-1">
                <a
                  href="#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-md px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 ${FocusRing}`}
                >
                  {t.homeNavFeatures}
                </a>
                <a
                  href="#workflow"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-md px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 ${FocusRing}`}
                >
                  {t.homeNavWorkflow}
                </a>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    goToGuideline();
                  }}
                  className={`rounded-md px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/50 ${FocusRing}`}
                >
                  {t.navGuideline}
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    goToReadme();
                  }}
                  className={`rounded-md px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/50 ${FocusRing}`}
                >
                  {t.homeNavDocs}
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleGetStarted();
                  }}
                  className={`mt-2 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-gradient-to-r from-primary to-accent transition-opacity hover:opacity-90 ${FocusRing}`}
                >
                  {t.homeGetStartedButton}
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </nav>
          )}
        </header>

        <main id="main" className="relative z-10">

        {/* Hero Section */}
        <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-24">
          {/* Decorative glow */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute right-0 top-1/3 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
          </div>

          <div className="relative text-center space-y-10">
            {/* Animated badge */}
            <div
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 backdrop-blur-sm"
              style={{ animation: 'slideUp 0.6s ease-out 0ms both' }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="text-sm font-medium text-primary">{t.homeWelcomeTitle}</span>
            </div>

            {/* Main heading */}
            <div className="space-y-5" style={{ animation: 'slideUp 0.6s ease-out 100ms both' }}>
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.1] tracking-tight">
                {t.homeMainHeading}
                <br />
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  {t.homeMainHeadingGradient}
                </span>
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                {t.homeDescription}
              </p>
            </div>

            {/* SQL preview panel */}
            <div
              className="mx-auto grid max-w-4xl grid-cols-1 overflow-hidden rounded-xl border border-border bg-card text-left shadow-2xl shadow-black/20 md:grid-cols-[1.2fr_0.8fr]"
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
              <div className="space-y-3 border-t border-border/60 p-4 md:border-l md:border-t-0">
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
                className={`group relative overflow-hidden rounded-lg bg-gradient-to-r from-primary to-accent px-8 py-4 text-lg font-semibold text-primary-foreground shadow-lg transition-all duration-300 hover:shadow-xl ${FocusRing}`}
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
                onClick={goToGuideline}
                className={`px-6 py-4 rounded-lg font-semibold text-foreground bg-card border border-border transition-colors duration-200 hover:border-primary/50 hover:bg-muted/50 ${FocusRing}`}
              >
                {t.homeGuidelinesButton}
              </button>
            </div>

            {/* Stats section */}
            <div
              className="grid grid-cols-1 gap-4 pt-12 mt-12 border-t border-border/50 sm:grid-cols-3"
              style={{ animation: 'slideUp 0.6s ease-out 300ms both' }}
            >
              <StatItem
                icon={<Layers className="w-5 h-5" />}
                value={t.homeStatDialectsValue}
                label={t.homeStatDialectsLabel}
                accent="border-primary/20 bg-primary/10 text-primary"
              />
              <StatItem
                icon={<LayoutGrid className="w-5 h-5" />}
                value={t.homeStatFeaturesValue}
                label={t.homeStatFeaturesLabel}
                accent="border-accent/20 bg-accent/10 text-accent"
              />
              <StatItem
                icon={<WorkflowIcon className="w-5 h-5" />}
                value={t.homeStatWorkflowValue}
                label={t.homeStatWorkflowLabel}
                accent="border-info/20 bg-info/10 text-info"
              />
            </div>
          </div>
        </section>

        <section id="workflow" className="scroll-mt-24 border-y border-border/50 bg-card/40">
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
                <div
                  key={number}
                  className="group border-t-2 border-primary/50 bg-background p-6 transition-colors hover:border-primary hover:bg-muted/20"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-primary">{number}</span>
                    <Icon size={19} className="text-primary transition-transform duration-300 group-hover:scale-110" />
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
        <section id="features" className="scroll-mt-24 max-w-7xl mx-auto px-6 py-20 border-t border-border/50">
          <div
            className="text-center mb-16"
            style={{ animation: 'slideUp 0.6s ease-out 0ms both' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t.homeFeaturesEyebrow}
            </p>
            <h3 className="mt-3 text-3xl md:text-4xl font-bold text-foreground">
              {t.homePowerfulFeaturesTitle}
            </h3>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
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

        {/* Documentation Section */}
        <section id="docs" className="scroll-mt-24 max-w-7xl mx-auto px-6 pb-20">
          <div
            className="relative overflow-hidden rounded-2xl border border-border bg-card/60 p-8 md:p-12"
            style={{ animation: 'slideUp 0.6s ease-out 0ms both' }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10"
            />
            <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {t.homeDocsSectionEyebrow}
                </p>
                <h3 className="text-2xl md:text-3xl font-bold text-foreground">
                  {t.homeDocsSectionTitle}
                </h3>
                <p className="text-muted-foreground leading-relaxed">{t.homeDocsSectionDesc}</p>
              </div>
              <div className="flex-shrink-0">
                <button
                  onClick={goToReadme}
                  className={`inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-accent px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-opacity hover:opacity-90 ${FocusRing}`}
                >
                  <BookOpen className="w-5 h-5" />
                  {t.homeDocsSectionButton}
                  <ArrowUpRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="dialects" className="scroll-mt-24 border-y border-border/50 bg-card/40">
          <div className="max-w-7xl mx-auto flex flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between lg:px-8 xl:px-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t.homeDialectsLabel}
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">{t.homeDialectsTitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              {[
                { asset: 'my_sql_logo.png', name: 'MySQL' },
                { asset: 'postgresql_logo.jpg', name: 'PostgreSQL' },
                { asset: 'mssql_logo.png', name: 'SQL Server' },
                { asset: 'oracle_logo.png', name: 'Oracle' },
              ].map(({ asset, name }) => (
                <img
                  key={asset}
                  src={`/assets/images/${asset}`}
                  alt={name}
                  title={name}
                  className="h-9 w-auto object-contain opacity-80 transition-opacity hover:opacity-100"
                />
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="get-started" className="scroll-mt-24 max-w-7xl mx-auto px-6 py-20">
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{ animation: 'slideUp 0.6s ease-out 300ms both' }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 blur-xl" />
            <div className="absolute inset-0 rounded-2xl border border-primary/20" />

            <div className="relative z-10 bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-12 text-center space-y-6">
              <h4 className="text-3xl font-bold text-foreground">{t.homeReadyToAnalyzeTitle}</h4>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t.homeReadyToAnalyzeDesc}
              </p>
              <button
                onClick={handleGetStarted}
                className={`inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-accent px-8 py-4 text-lg font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-opacity hover:opacity-90 ${FocusRing}`}
              >
                {t.homeGetStartedNowButton}
                <ArrowUpRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 backdrop-blur-md bg-background/80">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground text-center sm:text-left">
              {t.homeCopyrightText} <span className="text-primary" aria-hidden="true">✨</span> {t.homeForDevelopers}
            </p>
            <nav className="flex items-center gap-5 text-sm text-muted-foreground" aria-label={t.appName}>
              <button
                onClick={goToReadme}
                className={`inline-flex items-center gap-1.5 transition-colors hover:text-primary ${FocusRing}`}
              >
                <BookOpen className="w-4 h-4" />
                {t.homeDocsLink}
              </button>
              <a
                href="https://github.com/oscar20041998/sql-visualizer"
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 transition-colors hover:text-primary ${FocusRing}`}
              >
                {t.homeGitHubLink}
                <ArrowUpRight className="w-4 h-4" />
              </a>
              <a
                href="https://github.com/oscar20041998/sql-visualizer/issues"
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 transition-colors hover:text-primary ${FocusRing}`}
              >
                {t.homeContactLink}
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
