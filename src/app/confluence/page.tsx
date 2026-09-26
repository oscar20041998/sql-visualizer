import type { Metadata } from 'next';
import ThemeProvider from '@/components/ThemeProvider';
import { loadConfluenceDocs } from './confluenceDocs';
import ConfluenceContent from './components/ConfluenceContent';

export const metadata: Metadata = {
  title: 'Documentation — SQL Visualizer',
  description:
    'Comprehensive feature overview and technical architecture documentation for SQL Visualizer, prepared for management review.',
};

/**
 * Confluence documentation route.
 *
 * Both language variants of the documentation are rendered to HTML on the server (see
 * ./confluenceDocs) and handed to a client component that displays the variant matching the
 * language selected on the home page.
 */
export default function ConfluencePage() {
  const docs = loadConfluenceDocs();

  return (
    <>
      <ThemeProvider />
      <ConfluenceContent docs={docs} />
    </>
  );
}
