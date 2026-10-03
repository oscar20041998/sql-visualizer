import { readFileSync } from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import type { Locale } from '@/lib/i18n';

/**
 * The README in each supported UI language.
 *
 * `README_VI.md` sits beside `README.md` at the repository root, matching the `_EN`/`_VI` naming used
 * for the Confluence docs. The locale is selected on the home page, so the /readme route renders
 * every variant the same way and lets the client pick one (see ./components/ReadmeContent.tsx).
 */
export const README_DOC_FILES: Record<Locale, string> = {
  en: 'README.md',
  vi: 'README_VI.md',
};

/**
 * Reads every locale variant of the README and renders it to HTML. Server-only: callers are route
 * shells, so the Markdown files and the parser never reach the browser bundle.
 */
export function loadReadmeDocs(): Record<Locale, string> {
  const render = (fileName: string) => {
    // These Markdown files are repo-controlled (never user input), so rendering them as HTML via
    // `marked` is safe here — same pattern as the /confluence page.
    const raw = readFileSync(path.join(process.cwd(), fileName), 'utf8');
    return marked.parse(raw) as string;
  };

  return {
    en: render(README_DOC_FILES.en),
    vi: render(README_DOC_FILES.vi),
  };
}