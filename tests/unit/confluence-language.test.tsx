import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import ConfluenceContent from '@/app/confluence/components/ConfluenceContent';
import { CONFLUENCE_DOC_FILES, loadConfluenceDocs } from '@/app/confluence/confluenceDocs';
import { DEFAULT_SETTINGS, useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import { resetTestStorage } from '../utils/test-setup';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const docs = {
  en: '<p>english documentation body</p>',
  vi: '<p>vietnamese documentation body</p>',
};

beforeEach(() => {
  resetTestStorage();
  useAppStore.setState({ settings: { ...DEFAULT_SETTINGS } });
});

describe('Confluence page follows the language selected on the home page', () => {
  it('renders the English variant and its chrome translations by default', () => {
    render(<ConfluenceContent docs={docs} />);

    expect(screen.getByText('english documentation body')).toBeInTheDocument();
    expect(screen.queryByText('vietnamese documentation body')).not.toBeInTheDocument();

    const backLink = screen.getByRole('link', { name: getT('en').backToHome });
    expect(backLink).toHaveAttribute('href', '/');
    expect(screen.getByText(getT('en').confluenceFooterNote)).toBeInTheDocument();
    // The language/theme switches are reachable straight from the documentation page.
    expect(screen.getByRole('group', { name: getT('en').language })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: getT('en').lightMode })).toBeInTheDocument();
  });

  it('swaps to the Vietnamese variant when the selected locale is vi', async () => {
    render(<ConfluenceContent docs={docs} />);

    act(() => {
      useAppStore.setState({ settings: { ...DEFAULT_SETTINGS, locale: 'vi' } });
    });

    await waitFor(() =>
      expect(screen.getByText('vietnamese documentation body')).toBeInTheDocument()
    );
    expect(screen.queryByText('english documentation body')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: getT('vi').backToHome })).toBeInTheDocument();
    expect(screen.getByText(getT('vi').confluenceFooterNote)).toBeInTheDocument();
  });
});

describe('Confluence documentation sources', () => {
  it('maps each locale to its own Markdown file', () => {
    expect(CONFLUENCE_DOC_FILES.en).toMatch(/_EN\.md$/);
    expect(CONFLUENCE_DOC_FILES.vi).toMatch(/_VI\.md$/);
  });

  it('pre-renders both language variants without mixing them up', () => {
    const rendered = loadConfluenceDocs();

    expect(rendered.en).toContain('An AI-Powered Platform for SQL Analysis');
    expect(rendered.vi).toContain('Nền tảng phân tích, trực quan hóa và tối ưu hóa SQL bằng AI');
    expect(rendered.en).not.toContain('Nền tảng phân tích');
  });
});
