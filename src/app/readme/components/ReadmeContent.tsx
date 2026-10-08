'use client';

import { useAppStore } from '@/lib/store';
import DocumentationLayout from '@/components/ui/DocumentationLayout';
import type { Locale } from '@/lib/i18n';

interface ReadmeContentProps {
  /** Pre-rendered README HTML, keyed by the locale it belongs to. */
  docs: Record<Locale, string>;
}

/**
 * Routes the selection made on the home page to the matching README variant and renders it with the
 * shared documentation shell. Both variants are rendered to HTML on the server by the route shell, so
 * the Markdown parser and the README files stay out of the client bundle.
 */
export default function ReadmeContent({ docs }: ReadmeContentProps) {
  const locale = useAppStore((state) => state.settings.locale);

  return <DocumentationLayout html={docs[locale]} footerKey="readmeFooterNote" />;
}
