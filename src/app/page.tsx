'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import {
  Database,
  Zap,
  BarChart3,
  Network,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
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
    className="group relative bg-card border border-border rounded-xl p-6 hover:border-primary/50 hover:shadow-lg transition-all duration-300 overflow-hidden"
    style={{
      animation: `slideUp 0.6s ease-out ${delay}ms both`,
    }}
  >
    {/* Background gradient on hover */}
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

    <div className="relative z-10">
      <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <div className="text-primary">{Icon}</div>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  </div>
);

const FloatingOrb = ({
  delay,
  size,
  className,
}: {
  delay: number;
  size: string;
  className?: string;
}) => (
  <div
    className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
    style={{
      animation: `float ${6 + delay * 0.5}s ease-in-out infinite`,
      animationDelay: `${delay}s`,
      width: size,
      height: size,
    }}
  />
);

export default function HomePage() {
  const router = useRouter();
  const [isHovering, setIsHovering] = useState(false);
  const { settings } = useAppStore();
  const t = getT(settings.locale as 'en' | 'vi');

  const handleGetStarted = () => {
    router.push('/query-input');
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Animated background orbs */}
      <FloatingOrb delay={0} size="400px" className="top-0 left-0 bg-primary/10 opacity-30" />
      <FloatingOrb delay={2} size="300px" className="bottom-0 right-0 bg-accent/10 opacity-20" />
      <FloatingOrb delay={1} size="250px" className="top-1/3 right-1/4 bg-info/10 opacity-25" />

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
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-30px) translateX(20px); }
          66% { transform: translateY(20px) translateX(-20px); }
        }

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

        @keyframes shimmer {
          0%, 100% { background-position: 200% center; }
          50% { background-position: -200% center; }
        }

        .shimmer-button {
          background: linear-gradient(
            90deg,
            var(--primary),
            var(--accent),
            var(--primary)
          );
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
        }

        .glow-effect {
          box-shadow: 0 0 20px rgba(var(--primary-rgb), 0.3);
        }
      `}</style>

      {/* Content */}
      <div className="relative z-10">
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
            <button
              onClick={handleGetStarted}
              className="px-4 py-2 rounded-lg text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition-colors duration-200"
            >
              {t.homeGetStartedButton}
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 py-20 md:py-32">
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
                onClick={() => router.push('/guideline')}
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <button
                onClick={handleGetStarted}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-lg font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-105"
              >
                {t.homeGetStartedNowButton}
                <ChevronRight className="w-5 h-5" />
              </button>
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
                <button className="hover:text-primary transition-colors">{t.homeGitHubLink}</button>
                <button className="hover:text-primary transition-colors">
                  {t.homeContactLink}
                </button>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
