import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ReadmePage from '@/app/readme/page';
import { README_DOC_FILES, loadReadmeDocs } from '@/app/readme/readmeDocs';
import { DEFAULT_SETTINGS, useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import { resetTestStorage } from '../utils/test-setup';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

beforeEach(() => {
  resetTestStorage();
  useAppStore.setState({ settings: { ...DEFAULT_SETTINGS } });
  document.documentElement.classList.remove('light', 'dark');
});

describe('README documentation sources', () => {
  it('maps each locale to its own Markdown file', () => {
    expect(README_DOC_FILES.en).toBe('README.md');
    expect(README_DOC_FILES.vi).toBe('README_VI.md');
  });

  it('pre-renders both language variants without mixing them up', () => {
    const rendered = loadReadmeDocs();

    expect(rendered.en).toContain('comprehensive SQL analysis and visualization');
    expect(rendered.vi).toContain('Công cụ phân tích và trực quan hóa SQL toàn diện');
    expect(rendered.en).not.toContain('Công cụ phân tích');
    expect(rendered.vi).not.toContain('comprehensive SQL analysis');
  });

  it('emits Mermaid fences as mermaid blocks the renderer can pick up', () => {
    const rendered = loadReadmeDocs();

    // The README documents its features as Mermaid diagrams. `marked` knows nothing about Mermaid, so
    // these must arrive as `code.language-mermaid` for MermaidDiagramRenderer to draw them; if they
    // ever flatten to plain text again the diagrams are silently lost.
    for (const html of [rendered.en, rendered.vi]) {
      expect(html).toContain('class="language-mermaid"');
      expect(html).toContain('flowchart TD');
    }

    // Both languages keep their own set of diagrams.
    const countBlocks = (html: string) => (html.match(/class="language-mermaid"/g) ?? []).length;
    expect(countBlocks(rendered.en)).toBe(countBlocks(rendered.vi));
    expect(countBlocks(rendered.en)).toBeGreaterThan(0);
  });
});

describe('README page (light-mode support)', () => {
  it('renders README.md inside the themed documentation shell', async () => {
    render(<ReadmePage />);

    // `<h1>` comes from README.md — proves the repository file is what gets rendered.
    expect(screen.getByRole('heading', { level: 1, name: 'SQL Visualizer' })).toBeInTheDocument();
    expect(screen.getByText(getT('en').readmeFooterNote)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: getT('en').backToHome })).toHaveAttribute('href', '/');

    // The theme now reaches this page: the stored theme is applied to <html>.
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
  });

  it('renders the Vietnamese README when the selected locale is vi', async () => {
    render(<ReadmePage />);

    act(() => {
      useAppStore.setState({ settings: { ...DEFAULT_SETTINGS, locale: 'vi' } });
    });

    // README_VI.md opens with the same <h1>, so assert on text unique to that file.
    await waitFor(() =>
      expect(screen.getByText(/Công cụ phân tích và trực quan hóa SQL toàn diện/)).toBeInTheDocument()
    );
    expect(screen.queryByText(/comprehensive SQL analysis and visualization/)).not.toBeInTheDocument();
    expect(screen.getByText(getT('vi').readmeFooterNote)).toBeInTheDocument();
  });

  it('keeps prose readable in both themes instead of forcing the dark palette', () => {
    const { container } = render(<ReadmePage />);
    const articleClasses = container.querySelector('article')?.className.split(' ') ?? [];

    expect(articleClasses).toContain('dark:prose-invert');
    expect(articleClasses).not.toContain('prose-invert');
    // Code blocks sit on the themed `card` surface, so their text colour must be themed too.
    expect(articleClasses).toContain('[&_pre]:text-foreground');
  });

  it('constrains a rendered diagram so a wide flowchart cannot break the page', () => {
    const { container } = render(<ReadmePage />);
    const articleClasses = container.querySelector('article')?.className.split(' ') ?? [];

    // A Mermaid SVG keeps its intrinsic width, so without these a wide flowchart would push the
    // whole page sideways instead of being contained by the article column.
    expect(articleClasses).toContain('[&_.mermaid_svg]:max-w-full');
    expect(articleClasses).toContain('[&_.mermaid_svg]:h-auto');
    expect(articleClasses).toContain('[&_.mermaid]:overflow-x-auto');
    expect(articleClasses).toContain('[&_pre]:overflow-x-auto');
    // The renderer needs this hook to find the article it must draw the diagrams into.
    expect(container.querySelector('[data-documentation-article]')).toBeInTheDocument();
  });

  it('translates its chrome when the language switch is used', () => {
    render(<ReadmePage />);

    fireEvent.click(screen.getByRole('button', { name: getT('en').languageVietnamese }));

    expect(useAppStore.getState().settings.locale).toBe('vi');
    expect(screen.getByText(getT('vi').readmeFooterNote)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: getT('vi').backToHome })).toBeInTheDocument();
  });
});
