import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import QueryHistoryPage from '@/app/query-history/page';
import { getT } from '@/lib/i18n';
import { DEFAULT_SETTINGS, useAppStore } from '@/lib/store';
import type { QueryHistoryEntry } from '@/lib/queryHistory';

const push = vi.fn();
const fetchHistory = vi.fn();
const removeEntry = vi.fn();
const clearHistory = vi.fn();
const embedText = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/queryHistoryClient', () => ({
  fetchQueryHistory: () => fetchHistory(),
  removeQueryHistoryEntry: (id: string) => removeEntry(id),
  clearQueryHistory: () => clearHistory(),
}));
vi.mock('@/lib/ai/embeddingService', () => ({
  tryEmbedText: (...args: unknown[]) => embedText(...args),
  cosineSimilarity: (a: number[], b: number[]) => a[0] * b[0],
}));

const t = getT('en');
const entries: QueryHistoryEntry[] = Array.from({ length: 41 }, (_, index) => ({
  id: `entry-${index}`,
  sql: `SELECT ${index} AS value`,
  dialect: index === 40 ? 'postgresql' : 'mysql',
  createdAt: 1700000000000 - index,
  tableCount: 1,
  joinCount: 0,
}));

beforeEach(() => {
  vi.clearAllMocks();
  fetchHistory.mockResolvedValue(entries);
  removeEntry.mockResolvedValue(undefined);
  clearHistory.mockResolvedValue(undefined);
  embedText.mockResolvedValue(null);
  useAppStore.setState({
    settings: { ...DEFAULT_SETTINGS, locale: 'en' },
    rawSql: '',
    dialect: 'mysql',
    inputMode: 'mybatis',
    pendingEditorJump: { sql: 'old', line: 1 },
    navigationTarget: null,
  });
});

describe('Query history page', () => {
  it('paginates 20 entries, filters across pages and resets the page on search', async () => {
    render(<QueryHistoryPage />);
    await screen.findByText('SELECT 0 AS value');
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(21);
    expect(screen.queryByText('SELECT 20 AS value')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: t.nextPage }));
    expect(screen.getByText('SELECT 20 AS value')).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'SELECT 40' } });
    expect(screen.getByText('SELECT 40 AS value')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t.queryHistoryClearSearch }));
    expect(screen.getByText('SELECT 0 AS value')).toBeInTheDocument();
  });

  it('loads the selected SQL and dialect and returns to Query Input', async () => {
    render(<QueryHistoryPage />);
    await screen.findByText('SELECT 0 AS value');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'SELECT 40' } });
    fireEvent.click(screen.getByRole('button', { name: t.queryHistoryLoadButton }));

    expect(useAppStore.getState()).toMatchObject({
      rawSql: 'SELECT 40 AS value',
      dialect: 'postgresql',
      inputMode: 'sql',
      pendingEditorJump: null,
      navigationTarget: '/query-input',
    });
    expect(push).toHaveBeenCalledWith('/query-input');
  });

  it('clamps the page after deleting the last entry and requires confirmation to clear', async () => {
    render(<QueryHistoryPage />);
    await screen.findByText('SELECT 0 AS value');
    fireEvent.click(screen.getByRole('button', { name: t.nextPage }));
    fireEvent.click(screen.getByRole('button', { name: t.nextPage }));
    fireEvent.click(
      screen.getByRole('button', { name: `${t.queryHistoryDeleteButton}: SELECT 40 AS value` })
    );
    await waitFor(() => expect(screen.getByText('Page 2 of 2')).toBeInTheDocument());
    expect(removeEntry).toHaveBeenCalledWith('entry-40');

    fireEvent.click(screen.getByRole('button', { name: t.queryHistoryClearAllButton }));
    expect(clearHistory).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: t.queryHistoryConfirmYes }));
    expect(await screen.findByText(t.queryHistoryEmptyTitle)).toBeInTheDocument();
    expect(clearHistory).toHaveBeenCalledOnce();
  });

  it('falls back to text matches when semantic search is unavailable', async () => {
    render(<QueryHistoryPage />);
    await screen.findByText('SELECT 0 AS value');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'SELECT 40' } });
    fireEvent.click(screen.getByRole('button', { name: t.queryHistorySearchButton }));
    expect(await screen.findByText(t.queryHistorySemanticUnavailable)).toBeInTheDocument();
    expect(screen.getByText('SELECT 40 AS value')).toBeInTheDocument();
  });

  it('ranks saved entries when semantic search succeeds', async () => {
    fetchHistory.mockResolvedValue([
      { ...entries[0], embedding: [0.2] },
      { ...entries[1], embedding: [1] },
    ]);
    embedText.mockResolvedValue({ vector: [1], model: 'test' });
    render(<QueryHistoryPage />);
    await screen.findByText('SELECT 0 AS value');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'meaning' } });
    fireEvent.click(screen.getByRole('button', { name: t.queryHistorySearchButton }));
    await screen.findByText('100% match');
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('SELECT 1 AS value');
    expect(rows[2]).toHaveTextContent('SELECT 0 AS value');
  });

  it('ignores a semantic result when the search text changes before it finishes', async () => {
    let resolveSearch: (result: { vector: number[]; model: string }) => void = () => {};
    embedText.mockReturnValue(
      new Promise((resolve) => {
        resolveSearch = resolve;
      })
    );
    render(<QueryHistoryPage />);
    await screen.findByText('SELECT 0 AS value');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'old' } });
    fireEvent.click(screen.getByRole('button', { name: t.queryHistorySearchButton }));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'SELECT 40' } });
    await act(async () => resolveSearch({ vector: [1], model: 'test' }));
    expect(screen.getByText('SELECT 40 AS value')).toBeInTheDocument();
    expect(screen.queryByText('SELECT 0 AS value')).not.toBeInTheDocument();
  });
});
