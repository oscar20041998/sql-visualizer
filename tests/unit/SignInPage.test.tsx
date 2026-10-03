import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SignInPage from '@/components/auth/SignInPage';
import { DEFAULT_SETTINGS, useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import { resetTestStorage } from '../utils/test-setup';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

beforeEach(() => {
  resetTestStorage();
});

/** The brand column is the hidden-below-lg aside (unique `select-none` marker class). */
function getBrandColumn(container: HTMLElement): Element | null {
  return container.querySelector('div.select-none');
}

describe('SignInPage brand column (specs/006-login-ui-redesign T024 / FR-015)', () => {
  it('contains zero interactive controls so hiding it can never change tab order', () => {
    const { container } = render(<SignInPage />);
    const brand = getBrandColumn(container);

    expect(brand).not.toBeNull();
    const interactive = brand?.querySelectorAll(
      'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    expect(interactive?.length ?? 0).toBe(0);
  });

  it('renders localized brand copy for the active locale (FR-007)', () => {
    const { container, rerender } = render(<SignInPage />);

    // default locale is English
    expect(screen.getByText('SQL Visualizer')).toBeInTheDocument();
    expect(screen.getByText(/Inspect query structure/)).toBeInTheDocument();

    useAppStore.setState({
      settings: { ...useAppStore.getState().settings, locale: 'vi' },
    });
    rerender(<SignInPage />);

    const brand = getBrandColumn(container);
    expect(brand?.textContent).toContain('Kiểm tra cấu trúc truy vấn');
    expect(brand?.textContent).toContain('Truy vết CTE');
  });

  it('places the sign-in form before the brand column in DOM order (FR-016)', () => {
    const { container } = render(<SignInPage />);
    const brand = getBrandColumn(container) as Element;
    const form = container.querySelector('form');

    expect(form).not.toBeNull();
    // Node.DOCUMENT_POSITION_FOLLOWING: brand follows form in tree order.
    expect(
      (form as Element).compareDocumentPosition(brand) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('exposes the language and theme switches before signing in (specs/006 FR-008)', () => {
    useAppStore.setState({ settings: { ...DEFAULT_SETTINGS } });
    render(<SignInPage />);

    expect(screen.getByRole('group', { name: getT('en').language })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: getT('en').lightMode }));
    expect(useAppStore.getState().settings.theme).toBe('light');

    fireEvent.click(screen.getByRole('button', { name: getT('en').languageVietnamese }));
    expect(useAppStore.getState().settings.locale).toBe('vi');
  });

  it('offers a back-to-home link that leaves the sign-in page', () => {
    useAppStore.setState({ settings: { ...DEFAULT_SETTINGS } });
    render(<SignInPage />);

    const backLink = screen.getByRole('link', { name: getT('en').backToHome });
    expect(backLink).toHaveAttribute('href', '/');

    // The brand column must stay free of interactive controls (FR-015), so the link cannot
    // live in it; the test above already asserts that, and the switch test above covers the rest.
    expect(screen.getByRole('group', { name: getT('en').language })).toBeInTheDocument();
  });
});
