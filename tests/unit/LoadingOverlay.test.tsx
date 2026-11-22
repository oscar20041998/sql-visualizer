import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LoadingOverlay from '@/components/ui/LoadingOverlay';

afterEach(() => {
  vi.useRealTimers();
});

describe('LoadingOverlay', () => {
  it('renders the blocking status outside the page container and retains its delayed hide', () => {
    vi.useFakeTimers();
    const onHide = vi.fn();
    const { container, rerender } = render(
      <div style={{ transform: 'translateX(20px)' }}>
        <LoadingOverlay
          visible
          title="Analyzing"
          description="Parsing SQL"
          hideDelay={300}
          onHide={onHide}
        />
      </div>
    );

    const status = screen.getByRole('status');
    expect(status.parentElement).toBe(document.body);
    expect(container).not.toContainElement(status);
    expect(status).toHaveTextContent('Analyzing');
    expect(status).toHaveTextContent('Parsing SQL');
    expect(status).toHaveClass('fixed', 'inset-0', 'items-center', 'justify-center');

    rerender(
      <div style={{ transform: 'translateX(20px)' }}>
        <LoadingOverlay
          visible={false}
          title="Analyzing"
          description="Parsing SQL"
          hideDelay={300}
          onHide={onHide}
        />
      </div>
    );
    act(() => vi.advanceTimersByTime(299));
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(onHide).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(onHide).toHaveBeenCalledOnce();
  });
});
