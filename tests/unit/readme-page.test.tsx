import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ReadmePage from '@/app/readme/page';
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

  it('keeps prose readable in both themes instead of forcing the dark palette', () => {
    const { container } = render(<ReadmePage />);
    const articleClasses = container.querySelector('article')?.className.split(' ') ?? [];

    expect(articleClasses).toContain('dark:prose-invert');
    expect(articleClasses).not.toContain('prose-invert');
    // Code blocks sit on the themed `card` surface, so their text colour must be themed too.
    expect(articleClasses).toContain('[&_pre]:text-foreground');
  });

  it('translates its chrome when the language switch is used', () => {
    render(<ReadmePage />);

    fireEvent.click(screen.getByRole('button', { name: getT('en').languageVietnamese }));

    expect(useAppStore.getState().settings.locale).toBe('vi');
    expect(screen.getByText(getT('vi').readmeFooterNote)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: getT('vi').backToHome })).toBeInTheDocument();
  });
});
