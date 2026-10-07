import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CteExplanationText } from '@/app/smart-sql-editor/components/AiCteBatchPanel';

describe('CteExplanationText', () => {
  it('renders safe Markdown and highlights SQL-related tokens', () => {
    const { container } = render(
      <CteExplanationText
        text={
          '### **Purpose**\nUses `active_facilities` to **keep active sites**.\n- Applies WHERE employee_role\n1. Returns facility_id'
        }
      />
    );

    expect(screen.getByRole('heading', { name: 'Purpose' })).toHaveClass('text-primary');
    expect(screen.getByText('keep active sites').tagName).toBe('STRONG');
    expect(screen.getByText('active_facilities').tagName).toBe('CODE');
    expect(screen.getByText('WHERE').tagName).toBe('CODE');
    expect(container.querySelector('ul')).not.toBeNull();
    expect(container.querySelector('ol')).not.toBeNull();
    expect(container.textContent).not.toContain('**');
  });
});
