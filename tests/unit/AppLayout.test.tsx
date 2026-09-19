import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AppLayout from '@/components/AppLayout';
import { setDemoAuthenticated, setSocialSession, DEMO_AUTH_STORAGE_KEY } from '@/lib/demoAuth';
import { resetTestStorage } from '../utils/test-setup';

const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock, prefetch: vi.fn() }),
  usePathname: () => '/guideline',
}));

vi.mock('@/components/Sidebar', () => ({ default: () => <nav data-testid="sidebar" /> }));
vi.mock('@/components/GlobalChat', () => ({ GlobalChat: () => <div data-testid="global-chat" /> }));
vi.mock('@/components/ui/LoadingOverlay', () => ({ default: () => null }));

beforeEach(() => {
  resetTestStorage();
  replaceMock.mockClear();
});

describe('AppLayout auth gate (signed-out users cannot reach dashboard pages)', () => {
  it('redirects to /login and renders nothing when not signed in', () => {
    render(<AppLayout><div>protected content</div></AppLayout>);

    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
    expect(replaceMock).toHaveBeenCalledWith('/login');
  });

  it('renders protected content when a demo session exists', () => {
    setDemoAuthenticated();

    render(<AppLayout><div>protected content</div></AppLayout>);

    expect(screen.getByText('protected content')).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('renders protected content when a valid social session exists', () => {
    setSocialSession({
      provider: 'google',
      displayName: 'Test User',
      email: 'test@example.com',
      accessToken: 'token',
      expiry: Date.now() + 60_000,
    });

    render(<AppLayout><div>protected content</div></AppLayout>);

    expect(screen.getByText('protected content')).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('redirects when the demo flag is stale but an expired social session remains', () => {
    window.localStorage.setItem(DEMO_AUTH_STORAGE_KEY, 'true');
    window.localStorage.setItem(
      'sqlvisualizer-user-session',
      JSON.stringify({
        provider: 'google',
        displayName: 'Test User',
        email: 'test@example.com',
        accessToken: 'token',
        expiry: Date.now() - 1000,
      })
    );

    render(<AppLayout><div>protected content</div></AppLayout>);

    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    expect(replaceMock).toHaveBeenCalledWith('/login');
  });
});
