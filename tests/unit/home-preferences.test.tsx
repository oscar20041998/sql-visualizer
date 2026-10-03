import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import HomePage from '@/app/page';
import ThemeProvider from '@/components/ThemeProvider';
import { DEFAULT_SETTINGS, useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import { resetTestStorage } from '../utils/test-setup';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const english = getT('en');
const vietnamese = getT('vi');

beforeEach(() => {
  resetTestStorage();
  useAppStore.setState({ settings: { ...DEFAULT_SETTINGS } });
  document.documentElement.classList.remove('light', 'dark');
});

describe('Home page language switch', () => {
  it('renders the header copy in English by default', () => {
    render(<HomePage />);

    expect(screen.getByRole('link', { name: english.homeNavWorkflow })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: english.languageEnglish })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('switches the header copy and the selected language to Vietnamese', async () => {
    render(<HomePage />);

    fireEvent.click(screen.getByRole('button', { name: english.languageVietnamese }));

    expect(useAppStore.getState().settings.locale).toBe('vi');
    await waitFor(() =>
      expect(screen.getByRole('link', { name: vietnamese.homeNavWorkflow })).toBeInTheDocument()
    );
    expect(screen.queryByRole('link', { name: english.homeNavWorkflow })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: vietnamese.languageVietnamese })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});

describe('Home page theme switch', () => {
  it('applies the dark theme to the document by default', async () => {
    render(
      <ThemeProvider>
        <HomePage />
      </ThemeProvider>
    );

    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    expect(document.documentElement).not.toHaveClass('light');
  });

  it('applies the light theme when the toggle is used', async () => {
    render(
      <ThemeProvider>
        <HomePage />
      </ThemeProvider>
    );

    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));

    fireEvent.click(screen.getByRole('button', { name: english.lightMode }));

    expect(useAppStore.getState().settings.theme).toBe('light');
    await waitFor(() => expect(document.documentElement).toHaveClass('light'));
    expect(document.documentElement).not.toHaveClass('dark');
    expect(screen.getByRole('button', { name: english.darkMode })).toBeInTheDocument();
  });

  it('switches back to dark from the light theme', async () => {
    useAppStore.setState({ settings: { ...DEFAULT_SETTINGS, theme: 'light' } });

    render(
      <ThemeProvider>
        <HomePage />
      </ThemeProvider>
    );

    await waitFor(() => expect(document.documentElement).toHaveClass('light'));

    fireEvent.click(screen.getByRole('button', { name: english.darkMode }));

    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    expect(useAppStore.getState().settings.theme).toBe('dark');
  });
});
