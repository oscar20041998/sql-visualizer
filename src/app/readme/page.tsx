import type { Metadata } from 'next';
import ThemeProvider from '@/components/ThemeProvider';
import { loadReadmeDocs } from './readmeDocs';
import ReadmeContent from './components/ReadmeContent';

export const metadata: Metadata = {
  title: 'README — SQL Visualizer',
  description:
    'Project documentation, feature overview, setup instructions, and architecture guide for SQL Visualizer.',
};

/**
 * README route.
 *
 * Both language variants are rendered to HTML on the server (see ./readmeDocs) and handed to a client
 * component that displays the variant matching the language selected on the home page — the same
 * shape as /confluence.
 */
export default function ReadmePage() {
  const docs = loadReadmeDocs();

  return (
    <>
      <ThemeProvider />
      <ReadmeContent docs={docs} />
    </>
  );
}
