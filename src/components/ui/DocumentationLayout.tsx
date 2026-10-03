'use client';

import Link from 'next/link';
import { ArrowLeft, Database } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n';
import LanguageThemeSwitch from '@/components/ui/LanguageThemeSwitch';
import MermaidDiagramRenderer from '@/components/ui/MermaidDiagramRenderer';

interface DocumentationLayoutProps {
  /** Documentation body, pre-rendered to HTML on the server. */
  html: string;
  /** Translation key for the footer note, resolved with the selected locale. */
  footerKey: TranslationKey;
}

/**
 * Shell shared by the Markdown documentation routes (/readme, /confluence): sticky header with the
 * language/theme switches and a back link, the rendered article, then a footer note.
 *
 * `html` must come from repo-controlled Markdown rendered on the server — never from user input.
 */
export default function DocumentationLayout({ html, footerKey }: DocumentationLayoutProps) {
  const locale = useAppStore((state) => state.settings.locale);
  const t = getT(locale);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex h-16 items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                <Database className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
              </div>
              <span className="hidden text-lg font-bold text-foreground sm:inline">
                {t.appName}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <LanguageThemeSwitch />
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {t.backToHome}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <article
          // `dark:prose-invert` keeps the typography readable in both themes; `text-foreground` on
          // <pre> is required because the code blocks sit on the themed `card` surface (prose's
          // light-on-dark default is unreadable on a light card).
          // `[&_pre]:overflow-x-auto` keeps a wide code sample from stretching the page. A drawn diagram is
          // scaled to fit the column (`max-w-full` + `h-auto`, so it never overflows and never
          // stretches vertically); `overflow-x-auto` on the block is the fallback for the rare
          // diagram that is still too wide, and `min-w-0` stops the SVG being squashed below its
          // own width by a flex/grid ancestor.
          className="prose max-w-none dark:prose-invert [&_a]:text-primary [&_code]:text-primary [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border [&_pre]:bg-card [&_pre]:text-foreground [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_td]:border [&_td]:border-border [&_.mermaid]:block [&_.mermaid]:min-w-0 [&_.mermaid]:overflow-x-auto [&_.mermaid]:border-0 [&_.mermaid]:bg-transparent [&_.mermaid]:p-0 [&_.mermaid_svg]:h-auto [&_.mermaid_svg]:max-w-full"
          data-documentation-article
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </main>

      {/* Draws the ```mermaid blocks in the article above; renders nothing itself. */}
      <MermaidDiagramRenderer />

      <footer className="border-t border-border/50 py-8">
        <div className="mx-auto max-w-5xl px-6 text-center text-sm text-muted-foreground">
          {t[footerKey]}
        </div>
      </footer>
    </div>
  );
}
