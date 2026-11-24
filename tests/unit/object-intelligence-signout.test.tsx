import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import Sidebar from '@/components/Sidebar';
import { setGuestSession } from '@/lib/demoAuth';
import { DEFAULT_SETTINGS, useAppStore } from '@/lib/store';
import { resetTestStorage, stubSessionEndpoint } from '../utils/test-setup';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/query-input',
}));

it('clears the object draft when the user signs out', () => {
  resetTestStorage();
  stubSessionEndpoint();
  setGuestSession({ startedAt: Date.now(), locale: 'en' });
  useAppStore.setState({
    settings: { ...DEFAULT_SETTINGS, locale: 'en' },
    objectSql: 'CREATE VIEW private_view AS SELECT id FROM orders;',
  });

  render(<Sidebar />);
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

  expect(useAppStore.getState().objectSql).toBe('');
});
