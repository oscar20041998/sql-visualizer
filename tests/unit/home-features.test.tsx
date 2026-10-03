import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import HomePage from '@/app/page';
import { DEFAULT_SETTINGS, useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import { resetTestStorage } from '../utils/test-setup';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const english = getT('en');
const vietnamese = getT('vi');

/** One card per capability, in display order; the section heading itself is the first level-3 heading. */
const FEATURE_TITLES = [
  english.homeQueryAnalysisTitle,
  english.homeMyBatisTitle,
  english.homeCteAnalysisTitle,
  english.homeRelationshipMappingTitle,
  english.homeMetricsDashboardTitle,
  english.homeSmartEditorTitle,
  english.homeAiExplainerTitle,
  english.homeSmartRecommendationsTitle,
  english.homeFormatErrorTitle,
  english.homeDatabaseAssistantTitle,
  english.homeQueryHistoryTitle,
  english.homeDocsConsultantTitle,
];

/** Titles of the capability cards (everything after the section heading). */
function cardTitles(container: HTMLElement): (string | null)[] {
  const section = container.querySelector<HTMLElement>('#features');
  if (!section) return [];
  return within(section)
    .getAllByRole('heading', { level: 3 })
    .slice(1)
    .map((heading) => heading.textContent);
}

beforeEach(() => {
  resetTestStorage();
  useAppStore.setState({ settings: { ...DEFAULT_SETTINGS } });
});

describe('Home page feature overview', () => {
  it('lists the main capabilities of the product', () => {
    const { container } = render(<HomePage />);

    expect(cardTitles(container)).toEqual(FEATURE_TITLES);
  });

  it('keeps the advertised capability count in sync with the grid', () => {
    const { container } = render(<HomePage />);

    const stat = screen.getByText(english.homeStatFeaturesLabel).parentElement?.textContent ?? '';
    expect(cardTitles(container)).toHaveLength(Number.parseInt(english.homeStatFeaturesValue, 10));
    expect(stat).toContain(english.homeStatFeaturesValue);
  });

  it('translates the capabilities when the language switch is used', () => {
    render(<HomePage />);

    fireEvent.click(screen.getByRole('button', { name: english.languageVietnamese }));

    expect(screen.getByText(vietnamese.homeMyBatisTitle)).toBeInTheDocument();
    expect(screen.getByText(vietnamese.homeSmartEditorTitle)).toBeInTheDocument();
    expect(screen.getByText(vietnamese.homeQueryHistoryTitle)).toBeInTheDocument();
    expect(screen.queryByText(english.homeMyBatisTitle)).not.toBeInTheDocument();
  });
});
