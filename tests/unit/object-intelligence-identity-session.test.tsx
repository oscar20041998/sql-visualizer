import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

import { ObjectIntelligencePanel } from '@/app/query-input/components/ObjectIntelligencePanel';
import {
  clearDemoAuthenticated,
  clearGuestSession,
  clearSocialSession,
  DEMO_AUTH_STORAGE_KEY,
  GUEST_AUTH_STORAGE_KEY,
  SOCIAL_AUTH_STORAGE_KEY,
  setGuestSession,
} from '@/lib/demoAuth';
import { getT } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';
import {
  resetTestStorage,
  signInAsDemoUser,
  signInAsSocialUser,
  stubSessionEndpoint,
} from '../utils/test-setup';

it('does not expose a draft to a different guest session', () => {
  resetTestStorage();
  stubSessionEndpoint();
  useAppStore.getState().setObjectSql('');
  setGuestSession({ startedAt: 100, locale: 'en' });
  const first = render(<ObjectIntelligencePanel dialect="mysql" t={getT('en')} />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Database object SQL' }), {
    target: { value: 'CREATE VIEW private_view AS SELECT id FROM orders;' },
  });

  first.unmount();

  setGuestSession({ startedAt: 200, locale: 'en' });
  expect(useAppStore.getState().objectSql).toBe('');
  render(<ObjectIntelligencePanel dialect="mysql" t={getT('en')} />);

  expect(screen.getByRole('textbox', { name: 'Database object SQL' })).toHaveValue('');
  expect(useAppStore.getState().objectSql).toBe('');
});

it('clears a draft when a different social user signs in while the workspace is closed', async () => {
  resetTestStorage();
  await signInAsSocialUser({ email: 'first@example.com' });
  useAppStore
    .getState()
    .setObjectSql('CREATE VIEW private_view AS SELECT 1;', 'social:google:first@example.com');

  await signInAsSocialUser({ email: 'second@example.com' });

  expect(useAppStore.getState().objectSql).toBe('');
});

it('clears a draft when another tab changes the guest session while the workspace is closed', () => {
  resetTestStorage();
  stubSessionEndpoint();
  setGuestSession({ startedAt: 100, locale: 'en' });
  useAppStore.getState().setObjectSql('CREATE VIEW private_view AS SELECT 1;', 'guest:100');

  const next = JSON.stringify({ startedAt: 200, locale: 'en' });
  window.localStorage.setItem(GUEST_AUTH_STORAGE_KEY, next);
  fireEvent(window, new StorageEvent('storage', { key: GUEST_AUTH_STORAGE_KEY, newValue: next }));

  expect(useAppStore.getState().objectSql).toBe('');
});

it('clears a social draft on sign-out in another tab while the workspace is closed', async () => {
  resetTestStorage();
  await signInAsSocialUser();
  useAppStore
    .getState()
    .setObjectSql('CREATE VIEW private_view AS SELECT 1;', 'social:google:test@example.com');

  window.localStorage.removeItem(SOCIAL_AUTH_STORAGE_KEY);
  fireEvent(window, new StorageEvent('storage', { key: SOCIAL_AUTH_STORAGE_KEY, newValue: null }));

  expect(useAppStore.getState().objectSql).toBe('');
});

it('clears a social draft when its session ends while the workspace is closed', async () => {
  resetTestStorage();
  await signInAsSocialUser();
  useAppStore
    .getState()
    .setObjectSql('CREATE VIEW private_view AS SELECT 1;', 'social:google:test@example.com');

  clearSocialSession();

  expect(useAppStore.getState().objectSql).toBe('');
});

it('clears a guest draft when its session ends while the workspace is closed', () => {
  resetTestStorage();
  stubSessionEndpoint();
  setGuestSession({ startedAt: 100, locale: 'en' });
  useAppStore.getState().setObjectSql('CREATE VIEW private_view AS SELECT 1;', 'guest:100');

  clearGuestSession();

  expect(useAppStore.getState().objectSql).toBe('');
});

it('clears a guest draft when a demo session starts while the workspace is closed', async () => {
  resetTestStorage();
  stubSessionEndpoint();
  setGuestSession({ startedAt: 100, locale: 'en' });
  useAppStore.getState().setObjectSql('CREATE VIEW private_view AS SELECT 1;', 'guest:100');

  await signInAsDemoUser();

  expect(useAppStore.getState().objectSql).toBe('');
});

it('clears a demo draft when the demo session ends while the workspace is closed', async () => {
  resetTestStorage();
  await signInAsDemoUser();
  useAppStore.getState().setObjectSql('CREATE VIEW private_view AS SELECT 1;', 'demo');

  clearDemoAuthenticated();

  expect(useAppStore.getState().objectSql).toBe('');
});

it('clears a demo draft when another tab signs out while the workspace is closed', async () => {
  resetTestStorage();
  await signInAsDemoUser();
  useAppStore.getState().setObjectSql('CREATE VIEW private_view AS SELECT 1;', 'demo');

  window.localStorage.removeItem(DEMO_AUTH_STORAGE_KEY);
  fireEvent(window, new StorageEvent('storage', { key: DEMO_AUTH_STORAGE_KEY, newValue: null }));

  expect(useAppStore.getState().objectSql).toBe('');
});
