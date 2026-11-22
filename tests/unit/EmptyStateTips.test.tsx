import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { EmptyStateTips } from '@/app/query-input/components/EmptyStateTips';
import { getT } from '@/lib/i18n';

afterEach(() => {
  vi.restoreAllMocks();
});

it('positions tips above the dialect area, falling back below when needed', () => {
  const t = getT('en');
  let anchorTop = 320;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.getAttribute('aria-label') === t.tipsTitle) {
      return new DOMRect(300, anchorTop, 44, 44);
    }
    if (this.getAttribute('role') === 'tooltip') return new DOMRect(0, 0, 288, 140);
    return new DOMRect();
  });
  render(<EmptyStateTips tips={[t.tipCTE]} t={t} />);

  fireEvent.focus(screen.getByRole('button', { name: t.tipsTitle }));
  const tooltip = screen.getByRole('tooltip');
  expect(tooltip.parentElement).toBe(document.body);
  expect(tooltip).toHaveStyle({ left: '56px', top: '172px' });

  anchorTop = 20;
  act(() => window.dispatchEvent(new Event('resize')));
  expect(tooltip).toHaveStyle({ top: '72px' });
});
