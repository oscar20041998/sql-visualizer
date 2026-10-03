import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import SignInPanel from '@/components/auth/SignInPanel';
import { DEFAULT_SETTINGS, useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import {
  GUEST_AUTH_STORAGE_KEY,
  getGuestSession,
  setGuestSession,
  clearGuestSession,
} from '@/lib/demoAuth';
import { resetTestStorage, stubSessionEndpoint } from '../utils/test-setup';

/**
 * User Story 1 — evaluate the tool without signing up (specs/013-guest-access-mode).
 * The guest link, the disclosure dialog, and the guest session marker.
 */

const push = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => '/query-input',
}));

const t = getT('en');

beforeEach(() => {
  resetTestStorage();
  // setGuestSession fires a real /api/session request; without a stub jsdom falls back to its
  // default fetch and logs an unhandled rejection in every test that starts a guest session.
  stubSessionEndpoint();
  push.mockClear();
  useAppStore.setState({ settings: { ...DEFAULT_SETTINGS } });
  window.localStorage.removeItem(GUEST_AUTH_STORAGE_KEY);
});

/**
 * User Story 2 — the locked AI surfaces themselves (specs/013-guest-access-mode).
 *
 * Complements the entitlement unit tests: those prove the predicate is right, these prove each
 * surface actually asks it, which is the part that silently regresses when a new AI panel is added.
 */
describe('U21-U23 — a guest sees the locked explanation on each AI surface', () => {
  beforeEach(() => {
    setGuestSession({ startedAt: Date.now(), locale: 'en' });
  });

  it('locks the Optimize panel', async () => {
    const { OptimizeQueryModal } = await import('@/app/smart-sql-editor/components/OptimizeQueryModal');
    // Only the props needed to reach the locked branch; the rest are irrelevant once locked.
    const minimal = { isOpen: true, onClose: vi.fn(), onOpen: vi.fn() } as unknown as React.ComponentProps<
      typeof OptimizeQueryModal
    >;
    render(<OptimizeQueryModal {...minimal} />);

    // The panel body is replaced by the explanation, so there is no form to fail on submit.
    expect(await screen.findByRole('note')).toHaveTextContent(t.guestAccessLockedReason);
  });

  it('locks the follow-up chat', async () => {
    const { AiFollowUpChat } = await import('@/app/smart-sql-editor/components/AiFollowUpChat');
    render(
      <AiFollowUpChat
        sql="SELECT 1"
        config={useAppStore.getState().settings.aiConfig}
        locale="en"
        contextBrief=""
        t={t}
      />
    );

    expect(await screen.findByRole('note')).toHaveTextContent(t.guestAccessLockedReason);
  });

  // A guest who signs in must get the feature back, or the lock becomes a dead end.
  it('hides the locked explanation once the guest session is gone', async () => {
    const { AiFollowUpChat } = await import('@/app/smart-sql-editor/components/AiFollowUpChat');
    const { unmount } = render(
      <AiFollowUpChat
        sql="SELECT 1"
        config={useAppStore.getState().settings.aiConfig}
        locale="en"
        contextBrief=""
        t={t}
      />
    );
    expect(await screen.findByRole('note')).toBeInTheDocument();
    unmount();

    clearGuestSession();
    render(
      <AiFollowUpChat
        sql="SELECT 1"
        config={useAppStore.getState().settings.aiConfig}
        locale="en"
        contextBrief=""
        t={t}
      />
    );
    expect(screen.queryByRole('note')).toBeNull();
  });
});

describe('U14-U17 — guest marker on the existing session', () => {
  it('U14 records a guest session the auth check can read back', () => {
    setGuestSession({ startedAt: Date.now(), locale: 'en' });
    expect(getGuestSession()?.startedAt).toBeTypeOf('number');
  });

  it('U15 stores no identity fields on a guest session', () => {
    setGuestSession({ startedAt: Date.now(), locale: 'en' });
    const raw = window.localStorage.getItem(GUEST_AUTH_STORAGE_KEY) ?? '';
    expect(raw).not.toContain('email');
    expect(raw).not.toContain('accessToken');
  });

  it('U17 clears the guest marker on sign-out', () => {
    setGuestSession({ startedAt: Date.now(), locale: 'en' });
    clearGuestSession();
    expect(getGuestSession()).toBeNull();
  });
});

describe('U46/U47 — the guest link on the sign-in form', () => {
  it('U46 renders the guest link as a button, not a navigating anchor', () => {
    render(<SignInPanel />);
    const link = screen.getByRole('button', { name: t.guestAccessLink });
    expect(link.tagName).toBe('BUTTON');
    expect(link.closest('a')).toBeNull();
  });

  it('U47 opens the disclosure from the guest link', () => {
    render(<SignInPanel />);
    fireEvent.click(screen.getByRole('button', { name: t.guestAccessLink }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('U35/U37-U41 — the disclosure dialog', () => {
  it('U35 is a labelled modal dialog', () => {
    render(<SignInPanel />);
    fireEvent.click(screen.getByRole('button', { name: t.guestAccessLink }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName();
  });

  it('U37 dismisses without creating a session or navigating', () => {
    render(<SignInPanel />);
    fireEvent.click(screen.getByRole('button', { name: t.guestAccessLink }));
    // The header × and the footer button share a label, so target the footer explicitly.
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: t.guestAccessDialogCancel })
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(getGuestSession()).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it('U38-U41 names what is unavailable, why, and the local-AI exception', () => {
    render(<SignInPanel />);
    fireEvent.click(screen.getByRole('button', { name: t.guestAccessLink }));
    expect(screen.getByText(t.guestAccessDialogUnavailableList)).toBeInTheDocument();
    expect(screen.getByText(t.guestAccessDialogReason)).toBeInTheDocument();
    expect(screen.getByText(t.guestAccessDialogLocalAiNote)).toBeInTheDocument();
  });
});

describe('A3 — confirming admits the guest to the workspace', () => {
  it('A3 starts the guest session and navigates to the workspace', () => {
    render(<SignInPanel />);
    fireEvent.click(screen.getByRole('button', { name: t.guestAccessLink }));
    fireEvent.click(screen.getByRole('button', { name: t.guestAccessDialogConfirm }));
    expect(getGuestSession()).not.toBeNull();
    expect(push).toHaveBeenCalledWith('/query-input');
  });
});

/**
 * Regression (specs/013-guest-access-mode, T019 / FR-008 / U48): the workspace auth gate used to
 * test `isDemoAuthenticated()` alone, which deliberately excludes guests — so confirming the
 * disclosure navigated to /query-input only to be bounced straight back to /login, making the
 * dashboard unreachable for a guest. The gate must admit the guest marker.
 */
describe('U48/U49 — the workspace auth gate admits a guest', () => {
  it('renders the protected shell for a guest instead of redirecting to /login', async () => {
    stubSessionEndpoint();
    replace.mockClear();
    const { setGuestSession: startGuest } = await import('@/lib/demoAuth');
    const { default: AppLayout } = await import('@/components/AppLayout');
    startGuest({ startedAt: Date.now(), locale: 'en' });

    render(
      <AppLayout>
        <div>protected content</div>
      </AppLayout>
    );

    expect(await screen.findByText('protected content')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalledWith('/login');
  });
});

/**
 * Regression: a guest could not change page at all.
 *
 * `navigationTarget` drives the full-screen LoadingOverlay, and `completeNavigation` only clears a
 * target that equals the current path. The public pages (home, `/login`) set the target too but
 * render no AppLayout, so their target was never settled; once the guest reached the workspace the
 * overlay stayed up and swallowed every click. The layout must drop a target it is no longer
 * heading to.
 */
describe('navigation recovery — a stale navigation target cannot block the shell', () => {
  it('drops a target that does not match the current path instead of holding the overlay', async () => {
    stubSessionEndpoint();
    const { setGuestSession: startGuest } = await import('@/lib/demoAuth');
    const { default: AppLayout } = await import('@/components/AppLayout');
    startGuest({ startedAt: Date.now(), locale: 'en' });
    // Exactly what the home page leaves behind when it sends a visitor to /login.
    useAppStore.setState({ navigationTarget: '/login' });

    render(
      <AppLayout>
        <div>protected content</div>
      </AppLayout>
    );

    expect(await screen.findByText('protected content')).toBeInTheDocument();
    await waitFor(() => expect(useAppStore.getState().navigationTarget).toBeNull());
  });

  it('settles a target that matches the current path', async () => {
    stubSessionEndpoint();
    const { setGuestSession: startGuest } = await import('@/lib/demoAuth');
    const { default: AppLayout } = await import('@/components/AppLayout');
    startGuest({ startedAt: Date.now(), locale: 'en' });
    // The Sidebar sets this before pushing, so arriving at the page must settle it (not drop it).
    useAppStore.setState({ navigationTarget: '/query-input' });

    render(
      <AppLayout>
        <div>protected content</div>
      </AppLayout>
    );

    expect(await screen.findByText('protected content')).toBeInTheDocument();
    await waitFor(() => expect(useAppStore.getState().navigationTarget).toBeNull());
  });
});

/**
 * Regression: the home page's primary call to action tested `isDemoAuthenticated()` alone, which
 * deliberately excludes guests, so a guest who had already confirmed the disclosure was sent back
 * to `/login` — the same predicate mismatch that made the workspace unreachable (FR-008).
 */
describe('U50 — the home call to action admits a guest', () => {
  it('sends a guest to the workspace rather than the sign-in page', async () => {
    stubSessionEndpoint();
    const { setGuestSession: startGuest } = await import('@/lib/demoAuth');
    const { default: HomePage } = await import('@/app/page');
    startGuest({ startedAt: Date.now(), locale: 'en' });
    push.mockClear();
    useAppStore.setState({ navigationTarget: null });

    render(<HomePage />);
    // The label is reused by the header CTA and the mobile menu, so take the first (header) one.
    const ctas = screen.getAllByRole('button', { name: new RegExp(t.homeGetStartedButton, 'i') });
    fireEvent.click(ctas[0]);
    expect(push).toHaveBeenCalledWith('/query-input');
  });
});
