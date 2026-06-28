'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Code2,
  GitFork,
  BarChart3,
  Layers,
  Settings,
  ChevronDown,
  ChevronUp,
  Zap,
  Copy,
  FileCode,
  Globe,
  Moon,
  ArrowRight,
  CheckCircle2,
  Info,
  Lightbulb,
  TrendingUp,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import ScoreWeightTable from '@/components/ui/ScoreWeightTable';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Section {
  id: string;
  icon: React.ElementType;
  color: string;
  title: string;
  subtitle: string;
  steps: Step[];
  tips?: Tip[];
}

interface Step {
  label: string;
  desc: string;
}

interface Tip {
  text: string;
}

// ─── Content Data ─────────────────────────────────────────────────────────────
function createSections(t: ReturnType<typeof getT>): Section[] {
  return [
    {
      id: 'query-input',
      icon: Code2,
      color: '#6ee7f7',
      title: t.guidelineQueryInputTitle,
      subtitle: t.guidelineQueryInputSubtitle,
      steps: [
        {
          label: t.guidelineQueryInputStep1Label,
          desc: t.guidelineQueryInputStep1Desc,
        },
        {
          label: t.guidelineQueryInputStep2Label,
          desc: t.guidelineQueryInputStep2Desc,
        },
        {
          label: t.guidelineQueryInputStep3Label,
          desc: t.guidelineQueryInputStep3Desc,
        },
        {
          label: t.guidelineQueryInputStep4Label,
          desc: t.guidelineQueryInputStep4Desc,
        },
      ],
      tips: [{ text: t.guidelineQueryInputTip1 }, { text: t.guidelineQueryInputTip2 }],
    },
    {
      id: 'graph-visualizer',
      icon: GitFork,
      color: '#f59e0b',
      title: t.guidelineGraphTitle,
      subtitle: t.guidelineGraphSubtitle,
      steps: [
        {
          label: t.guidelineGraphStep1Label,
          desc: t.guidelineGraphStep1Desc,
        },
        {
          label: t.guidelineGraphStep2Label,
          desc: t.guidelineGraphStep2Desc,
        },
        {
          label: t.guidelineGraphStep3Label,
          desc: t.guidelineGraphStep3Desc,
        },
        {
          label: t.guidelineGraphStep4Label,
          desc: t.guidelineGraphStep4Desc,
        },
      ],
      tips: [{ text: t.guidelineGraphTip1 }, { text: t.guidelineGraphTip2 }],
    },
    {
      id: 'metrics-dashboard',
      icon: BarChart3,
      color: '#10b981',
      title: t.guidelineMetricsTitle,
      subtitle: t.guidelineMetricsSubtitle,
      steps: [
        {
          label: t.guidelineMetricsStep1Label,
          desc: t.guidelineMetricsStep1Desc,
        },
        {
          label: t.guidelineMetricsStep2Label,
          desc: t.guidelineMetricsStep2Desc,
        },
        {
          label: t.guidelineMetricsStep3Label,
          desc: t.guidelineMetricsStep3Desc,
        },
      ],
      tips: [{ text: t.guidelineMetricsTip1 }],
    },
    {
      id: 'cte-analysis',
      icon: Layers,
      color: '#a78bfa',
      title: t.guidelineCTETitle,
      subtitle: t.guidelineCTESubtitle,
      steps: [
        {
          label: t.guidelineCTEStep1Label,
          desc: t.guidelineCTEStep1Desc,
        },
        {
          label: t.guidelineCTEStep2Label,
          desc: t.guidelineCTEStep2Desc,
        },
        {
          label: t.guidelineCTEStep3Label,
          desc: t.guidelineCTEStep3Desc,
        },
      ],
      tips: [{ text: t.guidelineCTETip1 }],
    },
    {
      id: 'settings',
      icon: Settings,
      color: '#8b949e',
      title: t.guidelineSettingsTitle,
      subtitle: t.guidelineSettingsSubtitle,
      steps: [
        {
          label: t.guidelineSettingsStep1Label,
          desc: t.guidelineSettingsStep1Desc,
        },
        {
          label: t.guidelineSettingsStep2Label,
          desc: t.guidelineSettingsStep2Desc,
        },
        {
          label: t.guidelineSettingsStep3Label,
          desc: t.guidelineSettingsStep3Desc,
        },
        {
          label: t.guidelineSettingsStep4Label,
          desc: t.guidelineSettingsStep4Desc,
        },
      ],
      tips: [{ text: t.guidelineSettingsTip1 }],
    },
    {
      id: 'tools',
      icon: Zap,
      color: '#ef4444',
      title: t.guidelineToolsTitle,
      subtitle: t.guidelineToolsSubtitle,
      steps: [
        {
          label: t.guidelineToolsIntroTitle,
          desc: t.guidelineToolsIntroDesc,
        },
        {
          label: t.guidelineToolsQueryInputName,
          desc: t.guidelineToolsQueryInputDesc + '\n\n' + t.guidelineToolsQueryInputFeatures,
        },
        {
          label: t.guidelineToolsGraphName,
          desc: t.guidelineToolsGraphDesc + '\n\n' + t.guidelineToolsGraphFeatures,
        },
        {
          label: t.guidelineToolsMetricsName,
          desc: t.guidelineToolsMetricsDesc + '\n\n' + t.guidelineToolsMetricsFeatures,
        },
        {
          label: t.guidelineToolsCTEName,
          desc: t.guidelineToolsCTEDesc + '\n\n' + t.guidelineToolsCTEFeatures,
        },
        {
          label: t.guidelineToolsSettingsName,
          desc: t.guidelineToolsSettingsDesc + '\n\n' + t.guidelineToolsSettingsFeatures,
        },
      ],
      tips: [
        { text: t.guidelineToolsExportTitle + ': ' + t.guidelineToolsExportCSVDesc },
        { text: t.guidelineToolsExportMermaid + ': ' + t.guidelineToolsExportMermaidDesc },
        { text: t.guidelineToolsExportCTESQL + ': ' + t.guidelineToolsExportCTESQLDesc },
      ],
    },
    {
      id: 'complexity-evaluation',
      icon: TrendingUp,
      color: '#ef4444',
      title: t.guidelineComplexityEvaluationTitle,
      subtitle: t.guidelineComplexityEvaluationSubtitle,
      steps: [
        {
          label: t.guidelineComplexityEvalStep1Label,
          desc: t.guidelineComplexityEvalStep1Desc,
        },
        {
          label: t.guidelineComplexityEvalStep2Label,
          desc: t.guidelineComplexityEvalStep2Desc,
        },
        {
          label: t.guidelineComplexityEvalStep3Label,
          desc: t.guidelineComplexityEvalStep3Desc,
        },
        {
          label: t.guidelineComplexityEvalStep4Label,
          desc: t.guidelineComplexityEvalStep4Desc,
        },
        {
          label: t.guidelineComplexityEvalStep5Label,
          desc: t.guidelineComplexityEvalStep5Desc,
        },
        {
          label: t.guidelineComplexityEvalStep6Label,
          desc: t.guidelineComplexityEvalStep6Desc,
        },
      ],
      tips: [
        { text: t.guidelineComplexityEvalTip1 },
        { text: t.guidelineComplexityEvalTip2 },
        { text: t.guidelineComplexityEvalTip3 },
        { text: t.guidelineComplexityEvalTip4 },
      ],
    },
    {
      id: 'advanced-features',
      icon: Lightbulb,
      color: '#f59e0b',
      title: t.guidelineAdvancedFeaturesTitle,
      subtitle: t.guidelineAdvancedFeaturesSubtitle,
      steps: [
        {
          label: t.guidelineAdvancedFeaturesStep1Label,
          desc: t.guidelineAdvancedFeaturesStep1Desc,
        },
        {
          label: t.guidelineAdvancedFeaturesStep2Label,
          desc: t.guidelineAdvancedFeaturesStep2Desc,
        },
        {
          label: t.guidelineAdvancedFeaturesStep3Label,
          desc: t.guidelineAdvancedFeaturesStep3Desc,
        },
        {
          label: t.guidelineAdvancedFeaturesStep4Label,
          desc: t.guidelineAdvancedFeaturesStep4Desc,
        },
        {
          label: t.guidelineAdvancedFeaturesStep5Label,
          desc: t.guidelineAdvancedFeaturesStep5Desc,
        },
      ],
      tips: [
        { text: t.guidelineAdvancedFeaturesTip1 },
        { text: t.guidelineAdvancedFeaturesTip2 },
        { text: t.guidelineAdvancedFeaturesTip3 },
        { text: t.guidelineAdvancedFeaturesTip4 },
      ],
    },
  ];
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function SectionCard({ section }: { section: Section }) {
  const [open, setOpen] = useState(true);
  const Icon = section.icon;

  return (
    <div
      className="rounded-2xl overflow-hidden border transition-all duration-200"
      style={{ borderColor: section.color + '33', background: 'var(--card)' }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 px-6 py-4 text-left hover:opacity-90 transition-opacity"
        style={{ background: section.color + '0d' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: section.color + '22', border: `1px solid ${section.color}44` }}
        >
          <Icon size={18} style={{ color: section.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-foreground">{section.title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{section.subtitle}</p>
        </div>
        <div className="flex-shrink-0 text-muted-foreground">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="px-6 py-5 space-y-5 animate-fade-in">
          {/* Steps */}
          <div className="space-y-3">
            {section.steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5"
                  style={{
                    background: section.color + '22',
                    color: section.color,
                    border: `1px solid ${section.color}44`,
                  }}
                >
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{step.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Tips */}
          {section.tips && section.tips.length > 0 && (
            <div
              className="rounded-xl p-4 space-y-2"
              style={{ background: section.color + '0a', border: `1px solid ${section.color}22` }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb size={13} style={{ color: section.color }} />
              </div>
              {section.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2
                    size={12}
                    className="flex-shrink-0 mt-0.5"
                    style={{ color: section.color }}
                  />
                  <p className="text-xs text-muted-foreground leading-relaxed">{tip.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Quick Reference ──────────────────────────────────────────────────────────
function createQuickRef(t: ReturnType<typeof getT>) {
  return [
    { icon: Code2, color: '#6ee7f7', label: t.guidelineQuickRefQueryInput, href: '/' },
    {
      icon: GitFork,
      color: '#f59e0b',
      label: t.guidelineQuickRefGraph,
      href: '/relationship-graph-visualizer',
    },
    {
      icon: BarChart3,
      color: '#10b981',
      label: t.guidelineQuickRefMetrics,
      href: '/sql-metrics-dashboard',
    },
    {
      icon: Layers,
      color: '#a78bfa',
      label: t.guidelineQuickRefCTE,
      href: '/cte-analysis',
    },
    {
      icon: Settings,
      color: '#8b949e',
      label: t.guidelineQuickRefSettings,
      href: '/settings-preferences',
    },
  ];
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GuidelineContent() {
  const { settings } = useAppStore();
  const t = getT(settings.locale);
  const sections = createSections(t);
  const quickRef = createQuickRef(t);

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <BookOpen size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{t.guidelineTitle}</h1>
            <p className="text-xs text-muted-foreground">{t.guidelineSubtitle}</p>
          </div>
        </div>

        {/* Quick nav pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          {quickRef.map((item) => {
            const ItemIcon = item.icon;
            return (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:opacity-80"
                style={{
                  background: item.color + '12',
                  borderColor: item.color + '33',
                  color: item.color,
                }}
              >
                <ItemIcon size={11} />
                {item.label}
                <ArrowRight size={10} />
              </a>
            );
          })}
        </div>
      </div>

      {/* Getting Started Banner */}
      <div
        className="rounded-2xl p-5 mb-6 flex items-start gap-4"
        style={{ background: 'var(--primary)' + '10', border: '1px solid var(--primary)' + '30' }}
      >
        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Zap size={18} className="text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground mb-1">{t.guidelineQuickStart}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t.guidelineQuickStartDesc}
          </p>
        </div>
      </div>

      {/* Feature Sections */}
      <div className="space-y-4">
        {sections.map((section) => (
          <SectionCard key={section.id} section={section} />
        ))}
      </div>

      {/* Score Weight Table */}
      <div className="mt-8">
        <ScoreWeightTable />
      </div>

      {/* Keyboard / UI Shortcuts */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Info size={15} className="text-muted-foreground" />
          <h3 className="text-sm font-bold text-foreground">{t.guidelineSidebarControls}</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              icon: Moon,
              color: '#a78bfa',
              label: t.guidelineSidebarDarkLight,
              desc: t.guidelineSidebarDarkLightDesc,
            },
            {
              icon: Globe,
              color: '#6ee7f7',
              label: t.guidelineSidebarLanguage,
              desc: t.guidelineSidebarLanguageDesc,
            },
            {
              icon: Copy,
              color: '#10b981',
              label: t.guidelineSidebarCopyChart,
              desc: t.guidelineSidebarCopyChartDesc,
            },
            {
              icon: FileCode,
              color: '#f59e0b',
              label: t.guidelineSidebarExportCSV,
              desc: t.guidelineSidebarExportCSVDesc,
            },
          ].map((item, i) => {
            const ItemIcon = item.icon;
            return (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: item.color + '0a', border: `1px solid ${item.color}22` }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: item.color + '20' }}
                >
                  <ItemIcon size={14} style={{ color: item.color }} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-center text-[10px] text-muted-foreground mt-8 pb-4">
        SQL Visualizer — {t.guidelineBuiltFor}
      </p>
    </div>
  );
}
