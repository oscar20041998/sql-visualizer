import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SignInPage from '@/components/auth/SignInPage';
import { useAppStore } from '@/lib/store';
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
});
