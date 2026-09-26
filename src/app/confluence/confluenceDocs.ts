import { readFileSync } from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import type { Locale } from '@/lib/i18n';

/**
 * Repo-controlled Confluence documentation, one Markdown file per supported UI locale.
 * The locale is selected on the home page, so the /confluence route loads and renders every
 * variant the same way and lets the client pick one (see ./components/ConfluenceContent.tsx).
 */
export const CONFLUENCE_DOC_FILES: Record<Locale, string> = {
  en: 'SQL_Visualizer_Confluence_EN.md',
  vi: 'SQL_Visualizer_Confluence_VI.md',
};

const CONFLUENCE_DOCS_DIR = path.join(process.cwd(), 'docs', 'confluence');

/**
 * Reads every locale variant of the documentation and renders it to HTML. Server-only:
 * callers are route shells, so the Markdown files never reach the browser bundle.
 */
export function loadConfluenceDocs(): Record<Locale, string> {
  const render = (fileName: string) => {
    // These Markdown files are repo-controlled (never user input), so rendering them as HTML via
    // `marked` is safe here — same pattern as the /readme page.
    const raw = readFileSync(path.join(CONFLUENCE_DOCS_DIR, fileName), 'utf8');
    return marked.parse(raw) as string;
  };

  return {
    en: render(CONFLUENCE_DOC_FILES.en),
    vi: render(CONFLUENCE_DOC_FILES.vi),
  };
}
