import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SignInPanel from '@/components/auth/SignInPanel';
import { isDemoAuthenticated } from '@/lib/demoAuth';
import { resetTestStorage } from '../utils/test-setup';

// jsdom renders outside the App Router context, so the router hook is mocked.
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), prefetch: vi.fn() }),
}));

beforeEach(() => {
  resetTestStorage();
  pushMock.mockClear();
});

describe('SignInPanel (specs/006-login-ui-redesign T016 regression guard)', () => {
  it('renders the login/register tablist with login selected by default', () => {
    render(<SignInPanel />);

    expect(screen.getByRole('tablist', { name: 'Authentication mode' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Login' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Register' })).toHaveAttribute('aria-selected', 'false');
  });

  it('keeps the login form fields labelled and switches to the register panel on tab click', () => {
    render(<SignInPanel />);

    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Register' }));

    expect(screen.getByRole('tab', { name: 'Register' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Create password')).toBeInTheDocument();
  });

  it('toggles password visibility with the labelled eye button', () => {
    render(<SignInPanel />);

    const password = screen.getByLabelText('Password') as HTMLInputElement;
    const toggle = screen.getByRole('button', { name: 'Show password' });

    expect(password.type).toBe('password');
    fireEvent.click(toggle);

    expect(password.type).toBe('text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('shows the temporary administrator credentials in the notice', () => {
    render(<SignInPanel />);

    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('1234@')).toBeInTheDocument();
  });
});

describe('SignInPanel interaction states (T029)', () => {
  it('surfaces a visible alert when credentials are invalid', () => {
    render(<SignInPanel />);

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'wrong' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Use the temporary administrator account to continue.'
    );
    expect(isDemoAuthenticated()).toBe(false);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('signs in with the temporary administrator credentials and navigates to the workspace', () => {
    render(<SignInPanel />);

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: '1234@' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(isDemoAuthenticated()).toBe(true);
    expect(pushMock).toHaveBeenCalledWith('/query-input');
  });

  it('disables every control while a social sign-in popup is starting', () => {
    const popupWindow = { closed: false, focus: vi.fn() };
    const openSpy = vi
      .spyOn(window, 'open')
      .mockReturnValue(popupWindow as unknown as Window);

    try {
      render(<SignInPanel />);
      fireEvent.click(screen.getByRole('button', { name: 'Google' }));

      // authenticating state: the primary action and both social actions are disabled
      expect(screen.getByRole('button', { name: 'Login' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Google' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Microsoft' })).toBeDisabled();
      expect(openSpy).toHaveBeenCalledTimes(1);
    } finally {
      // let the component's poll interval settle so no cross-test state leaks
      popupWindow.closed = true;
      openSpy.mockRestore();
    }
  });

  it('shows an alert when the OAuth popup is blocked', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);

    render(<SignInPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Google' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Allow Popups to continue signing in.');
    vi.restoreAllMocks();
  });
});
