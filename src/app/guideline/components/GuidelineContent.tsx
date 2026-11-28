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
  Sparkles,
  Database,
  FileWarning,
  History,
  ArrowLeftRight,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import ScoreWeightTable from '@/components/ui/ScoreWeightTable';
import { getGuidelineAccent, type GraphTheme } from '@/app/common/colorConstant';

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
function createSections(t: ReturnType<typeof getT>, theme: GraphTheme): Section[] {
  return [
    {
      id: 'query-input',
      icon: Code2,
      color: getGuidelineAccent('cyan', theme),
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
      id: 'sql-code-generator',
      icon: FileCode,
      color: getGuidelineAccent('teal', theme),
      title: t.guidelineCodeGenTitle,
      subtitle: t.guidelineCodeGenSubtitle,
      steps: [
        {
          label: t.guidelineCodeGenStep1Label,
          desc: t.guidelineCodeGenStep1Desc,
        },
        {
          label: t.guidelineCodeGenStep2Label,
          desc: t.guidelineCodeGenStep2Desc,
        },
        {
          label: t.guidelineCodeGenStep3Label,
          desc: t.guidelineCodeGenStep3Desc,
        },
      ],
      tips: [{ text: t.guidelineCodeGenTip1 }, { text: t.guidelineCodeGenTip2 }],
    },
    {
      id: 'graph-visualizer',
      icon: GitFork,
      color: getGuidelineAccent('amber', theme),
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
          label: t.guidelineGraphDetailsLabel,
          desc: t.guidelineGraphDetailsDesc,
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
      color: getGuidelineAccent('emerald', theme),
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
        {
          label: t.guidelineMetricsStep4Label,
          desc: t.guidelineMetricsStep4Desc,
        },
      ],
      tips: [{ text: t.guidelineMetricsTip1 }],
    },
    {
      id: 'cte-analysis',
      icon: Layers,
      color: getGuidelineAccent('violet', theme),
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
      color: getGuidelineAccent('slate', theme),
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
        {
          label: t.guidelineSettingsStep5Label,
          desc: t.guidelineSettingsStep5Desc,
        },
      ],
      tips: [{ text: t.guidelineSettingsTip1 }, { text: t.guidelineSettingsTip2 }],
    },
    {
      id: 'ai-sql-explainer',
      icon: Sparkles,
      color: getGuidelineAccent('indigo', theme),
      title: t.guidelineAiExplainerTitle,
      subtitle: t.guidelineAiExplainerSubtitle,
      steps: [
        {
          label: t.guidelineAiExplainerStep1Label,
          desc: t.guidelineAiExplainerStep1Desc,
        },
        {
          label: t.guidelineAiExplainerStep2Label,
          desc: t.guidelineAiExplainerStep2Desc,
        },
        {
          label: t.guidelineAiExplainerStep3Label,
          desc: t.guidelineAiExplainerStep3Desc,
        },
        {
          label: t.guidelineAiExplainerStep4Label,
          desc: t.guidelineAiExplainerStep4Desc,
        },
      ],
      tips: [{ text: t.guidelineAiExplainerTip1 }, { text: t.guidelineAiExplainerTip2 }],
    },
    {
      id: 'ai-speech',
      icon: Layers,
      color: getGuidelineAccent('pink', theme),
      title: t.guidelineAiSpeechTitle,
      subtitle: t.guidelineAiSpeechSubtitle,
      steps: [
        {
          label: t.guidelineAiSpeechStep1Label,
          desc: t.guidelineAiSpeechStep1Desc,
        },
        {
          label: t.guidelineAiSpeechStep2Label,
          desc: t.guidelineAiSpeechStep2Desc,
        },
        {
          label: t.guidelineAiSpeechStep3Label,
          desc: t.guidelineAiSpeechStep3Desc,
        },
      ],
      tips: [{ text: t.guidelineAiSpeechTip1 }, { text: t.guidelineAiSpeechTip2 }],
    },
    {
      id: 'database-ai-assistant',
      icon: Database,
      color: getGuidelineAccent('sky', theme),
      title: t.guidelineDbAssistantTitle,
      subtitle: t.guidelineDbAssistantSubtitle,
      steps: [
        {
          label: t.guidelineDbAssistantStep1Label,
          desc: t.guidelineDbAssistantStep1Desc,
        },
        {
          label: t.guidelineDbAssistantStep2Label,
          desc: t.guidelineDbAssistantStep2Desc,
        },
        {
          label: t.guidelineDbAssistantStep3Label,
          desc: t.guidelineDbAssistantStep3Desc,
        },
      ],
      tips: [{ text: t.guidelineDbAssistantTip1 }, { text: t.guidelineDbAssistantTip2 }],
    },
    {
      id: 'db-assistant-chat-history',
      icon: History,
      color: getGuidelineAccent('indigo', theme),
      title: t.guidelineChatHistoryTitle,
      subtitle: t.guidelineChatHistorySubtitle,
      steps: [
        {
          label: t.guidelineChatHistoryStep1Label,
          desc: t.guidelineChatHistoryStep1Desc,
        },
        {
          label: t.guidelineChatHistoryStep2Label,
          desc: t.guidelineChatHistoryStep2Desc,
        },
        {
          label: t.guidelineChatHistoryStep3Label,
          desc: t.guidelineChatHistoryStep3Desc,
        },
      ],
      tips: [{ text: t.guidelineChatHistoryTip1 }, { text: t.guidelineChatHistoryTip2 }],
    },
    {
      id: 'format-error-diagnostics',
      icon: FileWarning,
      color: getGuidelineAccent('rose', theme),
      title: t.guidelineFormatErrorTitle,
      subtitle: t.guidelineFormatErrorSubtitle,
      steps: [
        {
          label: t.guidelineFormatErrorStep1Label,
          desc: t.guidelineFormatErrorStep1Desc,
        },
        {
          label: t.guidelineFormatErrorStep2Label,
          desc: t.guidelineFormatErrorStep2Desc,
        },
        {
          label: t.guidelineFormatErrorStep3Label,
          desc: t.guidelineFormatErrorStep3Desc,
        },
      ],
      tips: [{ text: t.guidelineFormatErrorTip1 }, { text: t.guidelineFormatErrorTip2 }],
    },
    {
      id: 'sql-comparison',
      icon: ArrowLeftRight,
      color: getGuidelineAccent('cyan', theme),
      title: t.guidelineComparisonTitle,
      subtitle: t.guidelineComparisonSubtitle,
      steps: [
        {
          label: t.guidelineComparisonStep1Label,
          desc: t.guidelineComparisonStep1Desc,
        },
        {
          label: t.guidelineComparisonStep2Label,
          desc: t.guidelineComparisonStep2Desc,
        },
        {
          label: t.guidelineComparisonStep3Label,
          desc: t.guidelineComparisonStep3Desc,
        },
      ],
      tips: [{ text: t.guidelineComparisonTip1 }, { text: t.guidelineComparisonTip2 }],
    },
    {
      id: 'tools',
      icon: Zap,
      color: getGuidelineAccent('red', theme),
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
        {
          text: t.guidelineToolsExportAnalysisJson + ': ' + t.guidelineToolsExportAnalysisJsonDesc,
        },
      ],
    },
    {
      id: 'complexity-evaluation',
      icon: TrendingUp,
      color: getGuidelineAccent('red', theme),
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
      color: getGuidelineAccent('amber', theme),
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
  const [open, setOpen] = useState(false);
  const Icon = section.icon;

  return (
    <div
      className="overflow-hidden rounded-2xl border transition-colors duration-200"
      style={{ borderColor: section.color + '33', background: 'var(--card)' }}
    >
      <button
        id={`guideline-section-${section.id}-trigger`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`guideline-section-${section.id}-panel`}
        className="flex min-h-16 w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-6"
        style={{ background: section.color + '0d' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: section.color + '22', border: `1px solid ${section.color}44` }}
        >
          <Icon size={18} style={{ color: section.color }} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-foreground">{section.title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{section.subtitle}</p>
        </div>
        <div className="flex-shrink-0 text-muted-foreground" aria-hidden="true">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      <div
        id={`guideline-section-${section.id}-panel`}
        role="region"
        aria-labelledby={`guideline-section-${section.id}-trigger`}
        hidden={!open}
        className="space-y-5 px-5 py-5 sm:px-6"
      >
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
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
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
              <Lightbulb size={13} style={{ color: section.color }} aria-hidden="true" />
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
    </div>
  );
}

// ─── Quick Reference ──────────────────────────────────────────────────────────
function createQuickRef(t: ReturnType<typeof getT>, theme: GraphTheme) {
  return [
    {
      icon: Code2,
      color: getGuidelineAccent('cyan', theme),
      label: t.guidelineQuickRefQueryInput,
      href: '/query-input',
    },
    {
      icon: GitFork,
      color: getGuidelineAccent('amber', theme),
      label: t.guidelineQuickRefGraph,
      href: '/relationship-graph-visualizer',
    },
    {
      icon: BarChart3,
      color: getGuidelineAccent('emerald', theme),
      label: t.guidelineQuickRefMetrics,
      href: '/sql-metrics-dashboard',
    },
    {
      icon: Layers,
      color: getGuidelineAccent('violet', theme),
      label: t.guidelineQuickRefCTE,
      href: '/cte-analysis',
    },
    {
      icon: Settings,
      color: getGuidelineAccent('slate', theme),
      label: t.guidelineQuickRefSettings,
      href: '/settings-preferences',
    },
    {
      icon: Sparkles,
      color: getGuidelineAccent('indigo', theme),
      label: t.guidelineQuickRefAiExplainer,
      href: '/smart-sql-editor',
    },
    {
      icon: Database,
      color: getGuidelineAccent('sky', theme),
      label: t.guidelineQuickRefDbAssistant,
      href: '/database-ai-assistant',
    },
    {
      icon: History,
      color: getGuidelineAccent('indigo', theme),
      label: t.guidelineQuickRefChatHistory,
      href: '/database-ai-assistant',
    },
    {
      icon: FileCode,
      color: getGuidelineAccent('teal', theme),
      label: t.guidelineQuickRefCodeGen,
      href: '/query-input',
    },
    {
      icon: ArrowLeftRight,
      color: getGuidelineAccent('cyan', theme),
      label: t.guidelineQuickRefComparison,
      href: '/query-input',
    },
  ];
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GuidelineContent() {
  const { settings } = useAppStore();
  const t = getT(settings.locale);
  const theme: GraphTheme = settings.theme === 'light' ? 'light' : 'dark';
  const sections = createSections(t, theme);
  const quickRef = createQuickRef(t, theme);

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      <header className="floating-header mb-6 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="floating-header-icon">
            <BookOpen size={20} className="text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-page-title text-foreground">{t.guidelineTitle}</h1>
            <p className="text-xs text-muted-foreground">{t.guidelineSubtitle}</p>
          </div>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-8">
        <aside className="lg:sticky lg:top-4 lg:col-start-2 lg:row-start-1">
          <nav
            aria-label={t.guidelineTitle}
            className="rounded-2xl border border-border bg-card p-3 sm:p-4"
          >
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {quickRef.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <li key={`${item.href}-${item.label}`}>
                    <a
                      href={item.href}
                      className="group flex min-h-11 items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-xs font-medium transition-colors hover:border-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      style={{ color: item.color }}
                    >
                      <ItemIcon size={15} className="flex-shrink-0" aria-hidden="true" />
                      <span className="min-w-0 flex-1">{item.label}</span>
                      <ArrowRight
                        size={13}
                        className="flex-shrink-0 opacity-60 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <main className="min-w-0 lg:col-start-1 lg:row-start-1">
          <section
            className="mb-6 flex items-start gap-4 rounded-2xl border p-5 sm:p-6"
            style={{
              background: 'color-mix(in srgb, var(--primary) 8%, var(--card))',
              borderColor: 'color-mix(in srgb, var(--primary) 24%, var(--border))',
            }}
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <Zap size={18} className="text-primary" aria-hidden="true" />
            </div>
            <div>
              <h2 className="mb-1 text-sm font-bold text-foreground">{t.guidelineQuickStart}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t.guidelineQuickStartDesc}
              </p>
            </div>
          </section>

          <div className="space-y-3">
            {sections.map((section) => (
              <SectionCard key={section.id} section={section} />
            ))}
          </div>

          <div className="mt-8">
            <ScoreWeightTable />
          </div>

          <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Info size={15} className="text-muted-foreground" aria-hidden="true" />
              <h2 className="text-sm font-bold text-foreground">{t.guidelineSidebarControls}</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                {
                  icon: Moon,
                  color: getGuidelineAccent('violet', theme),
                  label: t.guidelineSidebarDarkLight,
                  desc: t.guidelineSidebarDarkLightDesc,
                },
                {
                  icon: Globe,
                  color: getGuidelineAccent('cyan', theme),
                  label: t.guidelineSidebarLanguage,
                  desc: t.guidelineSidebarLanguageDesc,
                },
                {
                  icon: Copy,
                  color: getGuidelineAccent('emerald', theme),
                  label: t.guidelineSidebarCopyChart,
                  desc: t.guidelineSidebarCopyChartDesc,
                },
                {
                  icon: FileCode,
                  color: getGuidelineAccent('amber', theme),
                  label: t.guidelineSidebarExportCSV,
                  desc: t.guidelineSidebarExportCSVDesc,
                },
              ].map((item, i) => {
                const ItemIcon = item.icon;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl p-3"
                    style={{ background: item.color + '0a', border: `1px solid ${item.color}22` }}
                  >
                    <div
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
                      style={{ background: item.color + '20' }}
                    >
                      <ItemIcon size={14} style={{ color: item.color }} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <p className="mt-8 pb-4 text-center text-xs text-muted-foreground">
            SQL Visualizer — {t.guidelineBuiltFor}
          </p>
        </main>
      </div>
    </div>
  );
}
