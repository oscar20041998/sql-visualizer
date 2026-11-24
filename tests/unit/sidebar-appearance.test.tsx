import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import Sidebar from '@/components/Sidebar';
import { DEFAULT_SETTINGS, useAppStore } from '@/lib/store';
import { resetTestStorage } from '../utils/test-setup';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/query-input',
}));

beforeEach(() => {
  resetTestStorage();
  useAppStore.setState({ settings: { ...DEFAULT_SETTINGS, locale: 'en' } });
});

it('keeps navigation available while collapsing and expanding the sidebar', () => {
  render(<Sidebar />);
  expect(screen.getByRole('link', { name: 'Query Input' })).toBeVisible();

  fireEvent.click(screen.getByRole('button', { name: 'Collapse' }));
  expect(screen.getByRole('link', { name: 'Query Input' })).toBeVisible();

  fireEvent.click(screen.getByRole('button', { name: 'Expand' }));
  expect(screen.getByRole('link', { name: 'Query Input' })).toBeVisible();
});

it('announces whether the sidebar is expanded', () => {
  render(<Sidebar />);
  expect(screen.getByRole('button', { name: 'Collapse' })).toHaveAttribute('aria-expanded', 'true');

  fireEvent.click(screen.getByRole('button', { name: 'Collapse' }));
  expect(screen.getByRole('button', { name: 'Expand' })).toHaveAttribute('aria-expanded', 'false');
});
