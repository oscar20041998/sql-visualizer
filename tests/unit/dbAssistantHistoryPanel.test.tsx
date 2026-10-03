import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DatabaseAssistantHistoryPanel } from '@/app/database-ai-assistant/components/DatabaseAssistantHistoryPanel';
import { useDatabaseAssistantHistoryStore } from '@/lib/conversationHistoryStore';
import { getT } from '@/lib/i18n';
import { resetTestStorage, signInAsSocialUser } from '../utils/test-setup';

const SIDEBAR_WIDTH_KEY = 'sqlvisualizer:db-assistant:sidebar-width';

/** jsdom has no layout, so the panel's viewport breakpoint has to be simulated per test. */
function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true, configurable: true });
}

beforeEach(async () => {
  resetTestStorage();
  // The panel only shows its list once an identity owns a partition.
  await signInAsSocialUser();
  setViewportWidth(1280);
  useDatabaseAssistantHistoryStore.getState().resetForIdentity('social-test');
});

describe('History panel width', () => {
  it('starts at the default width and remembers a dragged one', () => {
    render(<DatabaseAssistantHistoryPanel />);

    const aside = screen.getByRole('complementary');
    expect(aside).toHaveStyle({ width: '256px' });

    const handle = screen.getByRole('separator', { name: getT('en').dbAssistantHistoryResize });
    fireEvent.pointerDown(handle, { clientX: 300 });
    fireEvent.pointerMove(window, { clientX: 400 });
    fireEvent.pointerUp(window);

    expect(aside).toHaveStyle({ width: '356px' });
    // Persisted so the next visit reopens at the size the user chose.
    expect(window.localStorage.getItem(SIDEBAR_WIDTH_KEY)).toBe('356');
  });

  it('clamps the drag so the sidebar cannot be squeezed shut or swallow the chat', () => {
    render(<DatabaseAssistantHistoryPanel />);
    const aside = screen.getByRole('complementary');
    const handle = screen.getByRole('separator', { name: getT('en').dbAssistantHistoryResize });

    fireEvent.pointerDown(handle, { clientX: 300 });
    fireEvent.pointerMove(window, { clientX: -5000 });
    fireEvent.pointerUp(window);
    expect(aside).toHaveStyle({ width: '200px' });

    fireEvent.pointerDown(handle, { clientX: 300 });
    fireEvent.pointerMove(window, { clientX: 9000 });
    fireEvent.pointerUp(window);
    expect(aside).toHaveStyle({ width: '480px' });
  });

  it('restores a remembered width and ignores a stored value outside the allowed range', () => {
    window.localStorage.setItem(SIDEBAR_WIDTH_KEY, '9999');
    const { unmount } = render(<DatabaseAssistantHistoryPanel />);
    expect(screen.getByRole('complementary')).toHaveStyle({ width: '480px' });
    unmount();

    window.localStorage.setItem(SIDEBAR_WIDTH_KEY, 'not-a-number');
    render(<DatabaseAssistantHistoryPanel />);
    expect(screen.getByRole('complementary')).toHaveStyle({ width: '256px' });
  });

  it('resizes with the arrow keys so the width is not pointer-only', () => {
    render(<DatabaseAssistantHistoryPanel />);
    const aside = screen.getByRole('complementary');
    const handle = screen.getByRole('separator', { name: getT('en').dbAssistantHistoryResize });

    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(aside).toHaveStyle({ width: '264px' });

    // Shift is the coarse step.
    fireEvent.keyDown(handle, { key: 'ArrowLeft', shiftKey: true });
    expect(aside).toHaveStyle({ width: '232px' });
  });

  it('resets to the default width on double click', () => {
    render(<DatabaseAssistantHistoryPanel />);
    const handle = screen.getByRole('separator', { name: getT('en').dbAssistantHistoryResize });

    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(screen.getByRole('complementary')).toHaveStyle({ width: '264px' });

    fireEvent.doubleClick(handle);
    expect(screen.getByRole('complementary')).toHaveStyle({ width: '256px' });
  });
});

describe('History panel collapse', () => {
  it('collapses and expands from the header control', () => {
    render(<DatabaseAssistantHistoryPanel />);

    fireEvent.click(screen.getByRole('button', { name: getT('en').dbAssistantHistoryCollapse }));
    expect(screen.getByRole('button', { name: getT('en').dbAssistantHistoryExpand })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: getT('en').dbAssistantHistoryExpand }));
    expect(screen.getByRole('button', { name: getT('en').dbAssistantHistoryCollapse })).toBeInTheDocument();
  });

  it('hides the panel from assistive tech while collapsed', () => {
    render(<DatabaseAssistantHistoryPanel />);

    fireEvent.click(screen.getByRole('button', { name: getT('en').dbAssistantHistoryCollapse }));

    expect(screen.getByRole('complementary', { hidden: true })).toHaveAttribute('aria-hidden', 'true');
  });

  it('offers no collapse control on mobile, where the drawer governs visibility', () => {
    setViewportWidth(800);
    render(<DatabaseAssistantHistoryPanel />);

    expect(screen.queryByRole('button', { name: getT('en').dbAssistantHistoryCollapse })).toBeNull();
    // The floating drawer trigger takes over instead.
    expect(screen.getByRole('button', { name: getT('en').dbAssistantHistoryToggle })).toBeInTheDocument();
  });
});