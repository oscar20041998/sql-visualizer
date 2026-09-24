import { readFileSync } from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import { marked } from 'marked';
import { ArrowLeft, Database } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation — SQL Visualizer',
  description:
    'Comprehensive feature overview and technical architecture documentation for SQL Visualizer, prepared for management review.',
};

export default function ConfluencePage() {
  // CONFLUENCE.md is a repo-controlled file (not user input), so rendering it as HTML via
  // `marked` is safe here — same pattern as the /readme page.
  const raw = readFileSync(path.join(process.cwd(), 'docs', 'confluence', 'CONFLUENCE.md'), 'utf8');
  const html = marked.parse(raw) as string;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                <Database className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">SQL Visualizer</span>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <article
          className="prose prose-invert max-w-none [&_a]:text-primary [&_code]:text-primary [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border [&_pre]:bg-card [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_td]:border [&_td]:border-border"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </main>

      <footer className="border-t border-border/50 py-8">
        <div className="mx-auto max-w-5xl px-6 text-center text-sm text-muted-foreground">
          SQL Visualizer — feature documentation
        </div>
      </footer>
    </div>
  );
}
