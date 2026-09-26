import { readFileSync } from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import type { Metadata } from 'next';
import ThemeProvider from '@/components/ThemeProvider';
import DocumentationLayout from '@/components/ui/DocumentationLayout';

export const metadata: Metadata = {
  title: 'README — SQL Visualizer',
  description:
    'Project documentation, feature overview, setup instructions, and architecture guide for SQL Visualizer.',
};

export default function ReadmePage() {
  // README.md is a repo-controlled file (not user input), so rendering it as HTML via
  // `marked` is safe here.
  const raw = readFileSync(path.join(process.cwd(), 'README.md'), 'utf8');
  const html = marked.parse(raw) as string;

  return (
    <>
      <ThemeProvider />
      <DocumentationLayout html={html} footerKey="readmeFooterNote" />
    </>
  );
}
