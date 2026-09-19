import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import SignInPage from '@/components/auth/SignInPage';
import { resetTestStorage } from '../utils/test-setup';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

beforeEach(() => {
  resetTestStorage();
});

describe('SignInPage accessibility (specs/006-login-ui-redesign T017 / FR-018)', () => {
  it('has no axe-core WCAG 2.1 A/AA violations detectable in jsdom', async () => {
    const { container } = render(<SignInPage />);

    const results = await axe(container, {
      rules: {
        // jsdom cannot compute rendered geometry, so layout-dependent rules are
        // validated manually in quickstart.md scenarios instead.
        'color-contrast': { enabled: false },
      },
    });

    expect(results.violations).toEqual([]);
  });

  it('exposes exactly one main landmark and one visible level-1 heading', () => {
    render(<SignInPage />);

    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Workspace access' })).toBeInTheDocument();
  });
});
