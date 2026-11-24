import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Home page feature overview', () => {
  it('reveals a feature card when it enters the viewport', () => {
    let callback: IntersectionObserverCallback | undefined;
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(onIntersection: IntersectionObserverCallback) {
          callback = onIntersection;
        }
        observe = observe;
        unobserve = vi.fn();
        disconnect = disconnect;
      }
    );

    render(<HomePage />);
    const card = screen.getByText(english.homeQueryAnalysisTitle).closest('div.flex-col');
    expect(card).not.toBeNull();
    expect(observe).toHaveBeenCalledWith(card);
    act(() => {
      callback?.(
        [{ target: card, isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });
    expect(card).toHaveClass('home-card-revealed');
  });

  it('keeps feature cards visible when viewport observation is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    render(<HomePage />);

    expect(screen.getByText(english.homeQueryAnalysisTitle)).toBeVisible();
    expect(screen.getByText(english.homeMyBatisTitle)).toBeVisible();
  });

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
