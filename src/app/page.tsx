'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import ThemeProvider from '@/components/ThemeProvider';
import LanguageThemeSwitch from '@/components/ui/LanguageThemeSwitch';
import { getT } from '@/lib/i18n';
import { isDemoAuthenticated, isGuestSession } from '@/lib/demoAuth';
import {
  Database,
  Zap,
  BarChart3,
  Network,
  Sparkles,
  FileCode,
  GitFork,
  Code2,
  History,
  MessagesSquare,
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
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Platform-wide capabilities that are not a feature card of their own. Deliberately
 * language-neutral (locale pairs, theme modes, provider and engine names) so the row needs no
 * translations.
 */
const PLATFORM_CHIPS = ['EN / VI', 'Light / Dark', 'Google + Microsoft OAuth', 'Piper TTS'];

const FeatureCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="flex flex-col border border-border bg-card p-6 transition-colors duration-150 hover:border-primary/50">
    <div className="mb-2 flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-primary">{icon}</span>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
    </div>
    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
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
  <div className="flex items-center gap-4 border-t border-border py-4 text-left">
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center ${accent}`}>{icon}</div>
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
    // A guest also belongs in the workspace (specs/013 FR-008): they confirmed the disclosure and
    // hold a session, so sending them to /login would strand them on a page they cannot pass —
    // the same predicate mismatch that made the workspace unreachable for guests.
    if (isDemoAuthenticated() || isGuestSession()) {
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

  const goToConfluence = () => {
    beginNavigation('/confluence');
    router.push('/confluence');
  };

  // ThemeProvider applies the selected light/dark theme to <html>; LanguageThemeSwitch (header)
  // writes both preferences, and the selected language also picks the /confluence documentation
  // variant.
  return (
    <div id="top" className="relative min-h-screen overflow-x-clip bg-background">
      <ThemeProvider />

      {/* Skip link */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        {t.homeSkipToContent}
      </a>
      {/* Header Navigation */}
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <a href="#top" className="flex items-center gap-3" aria-label={t.appName}>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-primary">
                <Database className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <p className="text-xl font-bold text-foreground leading-tight">{t.appName}</p>
                <p className="text-xs text-muted-foreground">{t.appTagline}</p>
              </div>
            </a>

            <nav className="hidden lg:flex items-center gap-1" aria-label={t.appName}>
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
              <LanguageThemeSwitch />
              <button
                onClick={handleGetStarted}
                className={`hidden lg:inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 ${FocusRing}`}
              >
                {t.homeGetStartedButton}
                <ArrowUpRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMobileMenuOpen((open) => !open)}
                className={`lg:hidden rounded-md p-2 text-foreground transition-colors hover:bg-muted/50 ${FocusRing}`}
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
            className="lg:hidden border-t border-border bg-background"
            aria-label={t.appName}
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6 lg:px-8">
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
                className={`mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 ${FocusRing}`}
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
        <section className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div className="relative space-y-10">
            <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
              <div className="motion-safe:animate-slide-up space-y-7">
                <h2 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
                  {t.homeMainHeading} {t.homeMainHeadingGradient}
                </h2>
                <p className="text-sm font-medium text-primary">{t.homeWelcomeTitle}</p>
                <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
                  {t.homeDescription}
                </p>
                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                  <button
                    onClick={handleGetStarted}
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                    className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:bg-primary/85 ${FocusRing}`}
                  >
                    {t.homeGetStartedButton}
                    <ArrowUpRight
                      className={`h-5 w-5 motion-safe:transition-transform ${
                        isHovering ? 'translate-x-1 -translate-y-1' : ''
                      }`}
                    />
                  </button>
                  <button
                    onClick={goToGuideline}
                    className={`inline-flex min-h-12 items-center justify-center rounded-md border border-border bg-card px-6 py-3 font-semibold text-foreground transition-colors hover:bg-muted ${FocusRing}`}
                  >
                    {t.homeGuidelinesButton}
                  </button>
                </div>
              </div>

              <div className="motion-safe:animate-slide-up grid min-w-0 grid-cols-1 overflow-clip rounded-lg border border-border bg-card text-left md:grid-cols-[1.2fr_0.8fr]">
                <div className="min-w-0 overflow-x-auto bg-input p-5 font-mono text-xs leading-7">
                  <div className="mb-3 flex items-center justify-between gap-3 border-b border-border pb-3 text-muted-foreground">
                    <span>{t.homePreviewQueryTitle}</span>
                    <span className="rounded-sm bg-success/10 px-2 py-0.5 text-success">
                      {t.homePreviewAnalyzed}
                    </span>
                  </div>
                  <p>
                    <span className="text-info">WITH</span>{' '}
                    <span className="text-accent">revenue_by_region</span>{' '}
                    <span className="text-secondary-foreground">AS (</span>
                  </p>
                  <p className="pl-4">
                    <span className="text-info">SELECT</span> region, SUM(amount){' '}
                    <span className="text-info">AS</span> revenue
                  </p>
                  <p className="pl-4">
                    <span className="text-info">FROM</span> orders{' '}
                    <span className="text-info">GROUP BY</span> region
                  </p>
                  <p>
                    <span className="text-secondary-foreground">)</span>{' '}
                    <span className="text-info">SELECT</span> region, revenue
                  </p>
                  <p>
                    <span className="text-info">FROM</span> revenue_by_region{' '}
                    <span className="text-info">ORDER BY</span> revenue DESC;
                  </p>
                </div>
                <div className="space-y-3 border-t border-border p-4 md:border-l md:border-t-0">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t.homePreviewInsightTitle}
                  </p>
                  <div className="border-t border-border pt-3">
                    <p className="text-xs text-muted-foreground">{t.homePreviewComplexity}</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      24 <span className="text-xs text-primary">Medium</span>
                    </p>
                  </div>
                  <div className="border-t border-border pt-3">
                    <p className="text-xs text-muted-foreground">{t.homePreviewRelationships}</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      3 {t.homePreviewTables}
                    </p>
                  </div>
                  <div className="border-t border-border pt-3">
                    <p className="text-xs text-muted-foreground">{t.homePreviewRecommendation}</p>
                    <p className="mt-1 text-sm leading-relaxed text-foreground">
                      {t.homePreviewRecommendationText}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-x-8 border-t border-border sm:grid-cols-3">
              <StatItem
                icon={<Layers className="w-5 h-5" />}
                value={t.homeStatDialectsValue}
                label={t.homeStatDialectsLabel}
                accent="text-primary"
              />
              <StatItem
                icon={<LayoutGrid className="w-5 h-5" />}
                value={t.homeStatFeaturesValue}
                label={t.homeStatFeaturesLabel}
                accent="text-accent"
              />
              <StatItem
                icon={<WorkflowIcon className="w-5 h-5" />}
                value={t.homeStatWorkflowValue}
                label={t.homeStatWorkflowLabel}
                accent="text-info"
              />
            </div>
          </div>
        </section>

        <section id="workflow" className="scroll-mt-24 border-y border-border/50 bg-card/40">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 xl:px-10">
            <div className="max-w-2xl">
              <h3 className="text-3xl font-semibold text-foreground">{t.homeWorkflowTitle}</h3>
              <p className="mt-2 text-sm font-medium text-primary">{t.homeWorkflowEyebrow}</p>
              <p className="mt-3 leading-relaxed text-muted-foreground">
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
                  className="group border-t border-border bg-background p-6 transition-colors hover:border-primary"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-primary">{number}</span>
                    <h4 className="text-lg font-semibold text-foreground">{title}</h4>
                    <Icon
                      size={19}
                      className="ml-auto text-primary transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section
          id="features"
          className="scroll-mt-24 mx-auto max-w-7xl border-t border-border/50 px-4 py-20 sm:px-6 lg:px-8"
        >
          <div className="motion-safe:animate-slide-up mb-12 max-w-2xl">
            <h3 className="text-3xl font-semibold text-foreground md:text-4xl">
              {t.homePowerfulFeaturesTitle}
            </h3>
            <p className="mt-2 text-sm font-medium text-primary">{t.homeFeaturesEyebrow}</p>
            <p className="mt-4 text-muted-foreground">{t.homeFeaturesDescription}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Database className="w-6 h-6" />}
              title={t.homeQueryAnalysisTitle}
              description={t.homeQueryAnalysisDesc}
            />
            <FeatureCard
              icon={<FileCode className="w-6 h-6" />}
              title={t.homeMyBatisTitle}
              description={t.homeMyBatisDesc}
            />
            <FeatureCard
              icon={<GitFork className="w-6 h-6" />}
              title={t.homeCteAnalysisTitle}
              description={t.homeCteAnalysisDesc}
            />
            <FeatureCard
              icon={<Network className="w-6 h-6" />}
              title={t.homeRelationshipMappingTitle}
              description={t.homeRelationshipMappingDesc}
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title={t.homeMetricsDashboardTitle}
              description={t.homeMetricsDashboardDesc}
            />
            <FeatureCard
              icon={<Code2 className="w-6 h-6" />}
              title={t.homeSmartEditorTitle}
              description={t.homeSmartEditorDesc}
            />
            <FeatureCard
              icon={<Sparkles className="w-6 h-6" />}
              title={t.homeAiExplainerTitle}
              description={t.homeAiExplainerDesc}
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title={t.homeSmartRecommendationsTitle}
              description={t.homeSmartRecommendationsDesc}
            />
            <FeatureCard
              icon={<ShieldAlert className="w-6 h-6" />}
              title={t.homeFormatErrorTitle}
              description={t.homeFormatErrorDesc}
            />
            <FeatureCard
              icon={<MessagesSquare className="w-6 h-6" />}
              title={t.homeDatabaseAssistantTitle}
              description={t.homeDatabaseAssistantDesc}
            />
            <FeatureCard
              icon={<History className="w-6 h-6" />}
              title={t.homeQueryHistoryTitle}
              description={t.homeQueryHistoryDesc}
            />
            <FeatureCard
              icon={<BookOpen className="w-6 h-6" />}
              title={t.homeDocsConsultantTitle}
              description={t.homeDocsConsultantDesc}
            />
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            {PLATFORM_CHIPS.map((chip) => (
              <span
                key={chip}
                className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground"
              >
                {chip}
              </span>
            ))}
          </div>
        </section>

        {/* Documentation Section */}
        <section id="docs" className="scroll-mt-24 mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="border-y border-border py-8 lg:flex lg:items-center lg:justify-between lg:gap-8">
            <div className="max-w-2xl space-y-3">
              <h3 className="text-2xl font-semibold text-foreground md:text-3xl">
                {t.homeDocsSectionTitle}
              </h3>
              <p className="text-sm font-medium text-primary">{t.homeDocsSectionEyebrow}</p>
              <p className="leading-relaxed text-muted-foreground">{t.homeDocsSectionDesc}</p>
            </div>
            <div                         className="mt-6 flex flex-col gap-3 xl:flex-row lg:mt-0">
              <button
                onClick={goToConfluence}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 ${FocusRing}`}
              >
                <BookOpen className="h-5 w-5" />
                Confluence
                <ArrowUpRight className="h-5 w-5" />
              </button>
              <button
                onClick={goToReadme}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-card px-5 py-3 font-semibold text-foreground transition-colors hover:bg-muted ${FocusRing}`}
              >
                <BookOpen className="h-5 w-5" />
                {t.homeDocsSectionButton}
                <ArrowUpRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>

        <section id="dialects" className="scroll-mt-24 border-y border-border/50 bg-card/40">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8 xl:px-10">
            <div>
              <p className="mt-2 text-lg font-semibold text-foreground">{t.homeDialectsTitle}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t.homeDialectsLabel}</p>
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
        <section
          id="get-started"
          className="scroll-mt-24 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
        >
          <div className="space-y-5 border-y border-border py-10 md:py-12">
            <h4 className="text-3xl font-semibold text-foreground">{t.homeReadyToAnalyzeTitle}</h4>
            <p className="max-w-2xl text-muted-foreground">{t.homeReadyToAnalyzeDesc}</p>
            <button
              onClick={handleGetStarted}
              className={`inline-flex min-h-12 items-center gap-2 rounded-md bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 ${FocusRing}`}
            >
              {t.homeGetStartedNowButton}
              <ArrowUpRight className="w-5 h-5" />
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground text-center sm:text-left">
              {t.homeCopyrightText}{' '}
              <Sparkles className="inline h-4 w-4 text-primary" aria-hidden="true" />{' '}
              {t.homeForDevelopers}
            </p>
            <nav
              className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-sm text-muted-foreground"
              aria-label={t.appName}
            >
              <button
                onClick={goToConfluence}
                className={`inline-flex items-center gap-1.5 transition-colors hover:text-primary ${FocusRing}`}
              >
                <BookOpen className="w-4 h-4" />
                Confluence
              </button>
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
