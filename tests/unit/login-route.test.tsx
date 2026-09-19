import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoginPage from '@/app/login/page';
import { setDemoAuthenticated } from '@/lib/demoAuth';
import { resetTestStorage } from '../utils/test-setup';

const replaceMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock, prefetch: vi.fn() }),
}));

beforeEach(() => {
  resetTestStorage();
  replaceMock.mockClear();
});

describe('/login route gate (specs/006-login-ui-redesign T009 regression / FR-012)', () => {
  it('renders the sign-in page for signed-out visitors', () => {
    render(<LoginPage />);

    expect(screen.getByRole('tablist', { name: 'Authentication mode' })).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('renders nothing and redirects signed-in visitors to the workspace', () => {
    setDemoAuthenticated();
    const { container } = render(<LoginPage />);

    expect(container).toBeEmptyDOMElement();
    expect(replaceMock).toHaveBeenCalledWith('/query-input');
  });
});
