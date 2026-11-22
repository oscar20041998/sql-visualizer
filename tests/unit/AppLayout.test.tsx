import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AppLayout from '@/components/AppLayout';
import WorkspaceLayout from '@/components/WorkspaceLayout';
import { setSocialSession, DEMO_AUTH_STORAGE_KEY } from '@/lib/demoAuth';
import { useAppStore } from '@/lib/store';
import { resetTestStorage, signInAsDemoUser, signInAsSocialUser } from '../utils/test-setup';

const replaceMock = vi.fn();
const router = { push: vi.fn(), replace: replaceMock, prefetch: vi.fn() };
let pathname = '/guideline';

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => pathname,
}));

vi.mock('@/components/Sidebar', async () => {
  const React = await import('react');
  return {
    default: () => {
      const [collapsed, setCollapsed] = React.useState(false);
      return (
        <nav data-testid="sidebar">
          <button onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          </button>
        </nav>
      );
    },
  };
});
vi.mock('@/components/GlobalChat', () => ({ GlobalChat: () => <div data-testid="global-chat" /> }));
vi.mock('@/components/ui/LoadingOverlay', () => ({ default: () => null }));

beforeEach(() => {
  resetTestStorage();
  replaceMock.mockClear();
  pathname = '/guideline';
  useAppStore.setState({ navigationTarget: null });
  document.documentElement.removeAttribute('data-theme');
});

describe('persistent workspace shell', () => {
  it('keeps the same collapsed sidebar while navigation is pending and after arrival', async () => {
    await signInAsDemoUser();
    const { rerender } = render(<WorkspaceLayout>First page</WorkspaceLayout>);
    const sidebar = await screen.findByTestId('sidebar');
    fireEvent.click(screen.getByText('Collapse sidebar'));

    act(() => useAppStore.getState().beginNavigation('/settings-preferences'));
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
    expect(useAppStore.getState().navigationTarget).toBe('/settings-preferences');
    expect(screen.getByTestId('sidebar')).toBe(sidebar);
    expect(screen.getByText('Expand sidebar')).toBeInTheDocument();

    pathname = '/settings-preferences';
    rerender(<WorkspaceLayout>Second page</WorkspaceLayout>);
    await waitFor(() => expect(useAppStore.getState().navigationTarget).toBeNull());
    expect(screen.getByTestId('sidebar')).toBe(sidebar);
    expect(screen.getByText('Expand sidebar')).toBeInTheDocument();
    expect(screen.getByText('Second page')).toBeInTheDocument();

    pathname = '/query-history';
    rerender(<WorkspaceLayout>Query history</WorkspaceLayout>);
    expect(await screen.findByText('Query history')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBe(sidebar);
    expect(screen.getByText('Expand sidebar')).toBeInTheDocument();

    pathname = '/login';
    rerender(<WorkspaceLayout>Public page</WorkspaceLayout>);
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
    expect(screen.getByText('Public page')).toBeInTheDocument();
  });

  it('rechecks authorization before showing a new protected page', async () => {
    await signInAsDemoUser();
    const { rerender } = render(<WorkspaceLayout>First page</WorkspaceLayout>);
    expect(await screen.findByText('First page')).toBeInTheDocument();

    window.localStorage.removeItem(DEMO_AUTH_STORAGE_KEY);
    pathname = '/settings-preferences';
    rerender(<WorkspaceLayout>Second page</WorkspaceLayout>);

    expect(screen.queryByText('Second page')).not.toBeInTheDocument();
    expect(replaceMock).toHaveBeenCalledWith('/login');
  });
});

describe('AppLayout auth gate (signed-out users cannot reach dashboard pages)', () => {
  it('sets the document theme attribute used by semantic theme tokens', async () => {
    await signInAsDemoUser();
    useAppStore.setState((state) => ({
      settings: { ...state.settings, theme: 'light' },
    }));

    render(
      <AppLayout>
        <div>protected content</div>
      </AppLayout>
    );

    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', 'light'));
  });

  it('redirects to /login and renders nothing when not signed in', () => {
    render(
      <AppLayout>
        <div>protected content</div>
      </AppLayout>
    );

    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
    expect(replaceMock).toHaveBeenCalledWith('/login');
  });

  it('renders protected content when a demo session exists', async () => {
    await signInAsDemoUser();

    render(
      <AppLayout>
        <div>protected content</div>
      </AppLayout>
    );

    expect(screen.getByText('protected content')).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('renders protected content when a valid social session exists', async () => {
    await signInAsSocialUser({ expiry: Date.now() + 60_000 });

    render(
      <AppLayout>
        <div>protected content</div>
      </AppLayout>
    );

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

    render(
      <AppLayout>
        <div>protected content</div>
      </AppLayout>
    );

    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    expect(replaceMock).toHaveBeenCalledWith('/login');
  });
});
