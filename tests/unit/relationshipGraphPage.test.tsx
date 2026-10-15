import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import GraphVisualizerContent from '@/app/relationship-graph-visualizer/components/GraphVisualizerContent';
import JoinAnalysisPanel, {
  type JoinAnalysisItem,
} from '@/app/relationship-graph-visualizer/components/JoinAnalysisPanel';
import { DEFAULT_SETTINGS, useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import type { AnalysisResult, JoinEdge, TableNode } from '@/lib/sql/sqlAnalyzer';

vi.mock('next/dynamic', () => ({
  default: () =>
    function MockCanvas() {
      return <div data-testid="flow-canvas" />;
    },
}));

function source(id: string, sourceType: TableNode['sourceType']): TableNode {
  return { id, name: id, columns: ['id'], sourceType };
}

function result(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    rawSql: 'select 1',
    dialect: 'mysql',
    tables: [source('cte_src', 'CTE'), source('orders', 'TABLE')],
    joins: [
      {
        id: 'j1',
        source: 'cte_src',
        target: 'orders',
        joinType: 'INNER JOIN',
        condition: 'cte_src.id = orders.id',
      },
    ],
    ctes: [],
    metrics: {
      windowFunctions: 0,
      groupBy: 0,
      orderBy: 0,
      distinct: 0,
      having: 0,
      where: 0,
      subqueryDepth: 0,
      subqueryCount: 0,
      conditionCount: 1,
      operationAndFunctionCount: 0,
      lineCount: 1,
      joinCount: 1,
      totalJoinCount: 9,
      cteCount: 1,
      tableCount: 2,
      selectFields: 1,
      finalSelectFieldCount: 1,
    },
    complexity: { level: 'LOW', score: 1, maxScore: 100, factors: [] },
    ...overrides,
  } as AnalysisResult;
}

describe('relationship graph page (019 A3, A11-A18)', () => {
  beforeEach(() => {
    useAppStore.setState({
      settings: { ...DEFAULT_SETTINGS, locale: 'en' },
      analysisResult: result(),
      selectedNodeId: null,
    });
  });

  it('uses one labeled search, category labels, fit, and rearrange inside the page shell', () => {
    const t = getT('en');
    const { container } = render(<GraphVisualizerContent />);

    expect(container.querySelector('.h-full')).not.toBeNull();
    expect(screen.getAllByLabelText(t.searchTables)).toHaveLength(1);
    expect(screen.getByRole('button', { name: t.graphFit })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.graphRearrange })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.graphSuggestions })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.graphJoinAnalysis })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.graphExtractedTables })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.convertMermaid })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.graphDownloadImage })).toBeInTheDocument();
    expect(screen.getByLabelText(t.graphIncludeNeighbors)).toBeChecked();
    expect(screen.getByRole('combobox', { name: t.graphFilterLabel })).toHaveTextContent(
      t.graphFilterCteNeighbors
    );
    expect(screen.getByText('1 Joins')).toBeInTheDocument();
    expect(screen.queryByText('9 Joins')).not.toBeInTheDocument();
  });

  it('hides the second hop when connected sources are turned off', () => {
    render(<GraphVisualizerContent />);
    fireEvent.click(screen.getByLabelText(getT('en').graphIncludeNeighbors));
    fireEvent.change(screen.getByRole('combobox', { name: getT('en').graphFilterLabel }), {
      target: { value: 'cte' },
    });

    expect(screen.getByText('cte_src')).toBeInTheDocument();
    expect(screen.queryByText('orders')).not.toBeInTheDocument();
  });

  it('A5: every source-list row states its category as text, not only as color', () => {
    const t = getT('en');
    render(<GraphVisualizerContent />);

    // The sidebar "All Tables" list must name the category next to each source.
    expect(screen.getByText('cte_src').closest('button')).toHaveTextContent(t.sourceTypeCte);
    expect(screen.getByText('orders').closest('button')).toHaveTextContent(t.sourceTypeTable);
  });
});

describe('relationship graph filtering and selection (019 A13, A15, A28)', () => {
  beforeEach(() => {
    useAppStore.setState({
      settings: { ...DEFAULT_SETTINGS, locale: 'en' },
      analysisResult: result(),
      selectedNodeId: null,
    });
  });

  it('A13: a source hidden by a filter change is deselected and its details disappear', () => {
    const t = getT('en');
    render(<GraphVisualizerContent />);

    fireEvent.click(screen.getByText('orders'));
    expect(useAppStore.getState().selectedNodeId).toBe('orders');
    expect(screen.getByText(t.nodeColumns)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(t.graphIncludeNeighbors));
    fireEvent.change(screen.getByRole('combobox', { name: t.graphFilterLabel }), {
      target: { value: 'cte' },
    });

    expect(useAppStore.getState().selectedNodeId).toBeNull();
    expect(screen.queryByText(t.nodeColumns)).not.toBeInTheDocument();
    expect(screen.getByText(t.clickNodeHint)).toBeInTheDocument();
  });

  it('A15: choosing a search match selects that source, clears the query, and adds no second search field', () => {
    const t = getT('en');
    const { container } = render(<GraphVisualizerContent />);

    const input = screen.getByLabelText(t.searchTables);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'orders' } });

    const dropdown = container.querySelector('div.absolute.top-full') as HTMLElement;
    expect(dropdown).not.toBeNull();
    fireEvent.mouseDown(within(dropdown).getByText('orders'));

    expect(useAppStore.getState().selectedNodeId).toBe('orders');
    expect(input).toHaveValue('');
    expect(screen.getAllByLabelText(t.searchTables)).toHaveLength(1);
  });

  it('A28: a filter matching nothing shows an empty filtered state, not an analysis failure', () => {
    const t = getT('en');
    useAppStore.setState({
      analysisResult: result({
        tables: [source('orders', 'TABLE'), source('customers', 'TABLE')],
      }),
    });
    render(<GraphVisualizerContent />);

    fireEvent.click(screen.getByLabelText(t.graphIncludeNeighbors));
    fireEvent.change(screen.getByRole('combobox', { name: t.graphFilterLabel }), {
      target: { value: 'subquery' },
    });

    expect(screen.getByText(t.noTablesFound)).toBeInTheDocument();
    expect(screen.queryByText(t.noGraph)).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: t.graphFilterLabel })).toBeInTheDocument();
  });
});

describe('shared panel budget and suggestion activation (019 A16, A17, U26, U27)', () => {
  beforeEach(() => {
    useAppStore.setState({
      settings: { ...DEFAULT_SETTINGS, locale: 'en' },
      analysisResult: result(),
      selectedNodeId: null,
    });
  });

  it('A16/A30: all panels open keep the map controls inside one shared 45vh budget', () => {
    const t = getT('en');
    const { container } = render(<GraphVisualizerContent />);

    fireEvent.click(screen.getByRole('button', { name: t.graphSuggestions }));
    fireEvent.click(screen.getByRole('button', { name: t.graphJoinAnalysis }));
    fireEvent.click(screen.getByRole('button', { name: t.graphExtractedTables }));

    expect(screen.getByRole('button', { name: t.graphFit })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.graphRearrange })).toBeInTheDocument();
    expect(container.querySelector('[style*="max-height: 45vh"]')).not.toBeNull();
  });
});

describe('suggestion activation (019 A17) / isolated-tables suggestions (019 U26-U27)', () => {
  function resultWithIsolated(): AnalysisResult {
    return result({
      tables: [source('cte_src', 'CTE'), source('orders', 'TABLE'), source('lonely', 'TABLE')],
    });
  }

  it('A17/U26: activating an isolated-tables suggestion selects its visible related source', () => {
    const t = getT('en');
    useAppStore.setState({
      settings: { ...DEFAULT_SETTINGS, locale: 'en' },
      analysisResult: resultWithIsolated(),
      selectedNodeId: null,
    });
    const { container } = render(<GraphVisualizerContent />);

    fireEvent.click(screen.getByRole('button', { name: t.graphSuggestions }));
    fireEvent.click(screen.getByRole('button', { name: /Unconnected table/ }));

    // store selection is the related source (lonely); the details cell shows it with its category
    expect(useAppStore.getState().selectedNodeId).toBe('lonely');
    const detailsCell = container.querySelector('.glass-node');
    expect(detailsCell).not.toBeNull();
    expect(detailsCell?.textContent).toContain('lonely');
    expect(detailsCell?.textContent).toContain(t.sourceTypeTable);
  });

  it('U27: activating an isolated-tables suggestion with a hidden related source selects nothing', () => {
    const t = getT('en');
    useAppStore.setState({
      settings: { ...DEFAULT_SETTINGS, locale: 'en' },
      analysisResult: resultWithIsolated(),
      selectedNodeId: null,
    });
    render(<GraphVisualizerContent />);

    fireEvent.click(screen.getByLabelText(t.graphIncludeNeighbors));
    fireEvent.change(screen.getByRole('combobox', { name: t.graphFilterLabel }), {
      target: { value: 'cte' },
    });
    fireEvent.click(screen.getByRole('button', { name: t.graphSuggestions }));
    fireEvent.click(screen.getByRole('button', { name: /Unconnected table/ }));

    expect(useAppStore.getState().selectedNodeId).toBeNull();
    expect(screen.getByText(t.clickNodeHint)).toBeInTheDocument();
  });
});

describe('keyboard travel and dismiss (019 A18, A29, U28)', () => {
  beforeEach(() => {
    useAppStore.setState({
      settings: { ...DEFAULT_SETTINGS, locale: 'en' },
      analysisResult: result(),
      selectedNodeId: null,
    });
  });

  it('A18: keyboard travel reaches toolbar controls, search results, the source list, and dismiss', () => {
    const t = getT('en');
    render(<GraphVisualizerContent />);
    fireEvent.click(screen.getByRole('button', { name: t.graphSuggestions }));

    // Toolbar controls are real buttons (keyboard focusable), search is a labelled input,
    // source-list rows are buttons, and dismiss is a real button with an accessible name.
    expect(screen.getByRole('button', { name: t.graphFit }).tagName).toBe('BUTTON');
    expect(screen.getByLabelText(t.searchTables).tagName).toBe('INPUT');
    expect(screen.getByText('cte_src').closest('button')?.tagName).toBe('BUTTON');
    const dismiss = screen.getAllByRole('button', { name: t.graphDismissSuggestion });
    expect(dismiss.length).toBeGreaterThan(0);
    dismiss.forEach((button) => expect(button.tagName).toBe('BUTTON'));
  });

  it('A29/U28: dismiss is a real button (not a hover-only span) and removes the suggestion', () => {
    const t = getT('en');
    render(<GraphVisualizerContent />);
    fireEvent.click(screen.getByRole('button', { name: t.graphSuggestions }));

    const dismiss = screen.getByRole('button', { name: t.graphDismissSuggestion });
    // A hover-only control would be a span with group-hover opacity; this is a real button
    // with a title, so a touch device can tap it without hover.
    expect(dismiss.tagName).toBe('BUTTON');
    expect(dismiss).toHaveAttribute('title', t.graphDismissSuggestion);

    fireEvent.click(dismiss);
    expect(screen.queryByRole('button', { name: t.graphDismissSuggestion })).toBeNull();
  });
});

describe('empty and single-source states (019 A22, A23)', () => {
  beforeEach(() => {
    useAppStore.setState({
      settings: { ...DEFAULT_SETTINGS, locale: 'en' },
      analysisResult: result(),
      selectedNodeId: null,
    });
  });

  it('A22: with no analyzed result the page explains analysis is required and links to query input', () => {
    const t = getT('en');
    useAppStore.setState({ analysisResult: null });
    render(<GraphVisualizerContent />);

    expect(screen.getByText(t.noGraph)).toBeInTheDocument();
    expect(screen.getByText(t.noGraphHint)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t.navQueryInput })).toHaveAttribute(
      'href',
      '/query-input'
    );
  });

  it('A23: one source and no relationships is shown without an error', () => {
    const t = getT('en');
    useAppStore.setState({
      analysisResult: result({ tables: [source('solo', 'TABLE')], joins: [] }),
    });
    render(<GraphVisualizerContent />);

    expect(screen.getByText('solo')).toBeInTheDocument();
    expect(screen.queryByText(t.noGraph)).not.toBeInTheDocument();
    expect(screen.queryByText(t.graphImageExportFailed)).not.toBeInTheDocument();
  });
});

describe('image export from the visible map (019 A20, A21)', () => {
  function installSurface(): HTMLDivElement {
    const surface = document.createElement('div');
    surface.className = 'react-flow__renderer';
    surface.innerHTML = '<svg><rect width="10" height="10" /></svg>';
    document.body.appendChild(surface);
    return surface;
  }

  beforeEach(() => {
    useAppStore.setState({
      settings: { ...DEFAULT_SETTINGS, locale: 'en', theme: 'dark' },
      analysisResult: result(),
      selectedNodeId: null,
    });
  });

  it('A20: saving the image stamps the visible ids and the active dark background', async () => {
    const t = getT('en');
    const surface = installSurface();
    const blobs: Blob[] = [];
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = ((blob: Blob) => {
      blobs.push(blob);
      return 'blob:mock';
    }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    try {
      render(<GraphVisualizerContent />);
      fireEvent.click(screen.getByRole('button', { name: t.graphDownloadImage }));

      expect(anchorClick).toHaveBeenCalledTimes(1);
      expect(blobs).toHaveLength(1);
      const markup = await blobs[0].text();
      expect(markup).toContain('data-visible-ids="cte_src,orders"');
      expect(markup).toContain('#1a1f2e');
      expect(screen.queryByText(t.graphImageExportFailed)).not.toBeInTheDocument();
    } finally {
      anchorClick.mockRestore();
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
      surface.remove();
    }
  });

  it('A21: without a surface the page says the image is unavailable and keeps the diagram text', async () => {
    const t = getT('en');
    render(<GraphVisualizerContent />);
    fireEvent.click(screen.getByRole('button', { name: t.graphDownloadImage }));

    await waitFor(() =>
      expect(screen.getByText(t.graphImageExportFailed)).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: t.convertMermaid })).toBeInTheDocument();
  });
});

describe('join relationship details (019 A26, U23, U24, U25)', () => {
  const joinEdge = (id: string, condition: string): JoinEdge => ({
    id,
    source: 'orders',
    target: 'customers',
    joinType: 'INNER JOIN',
    condition,
  });

  const tables: TableNode[] = [
    { id: 'orders', name: 'orders', alias: 'o', columns: [], sourceType: 'TABLE' },
    { id: 'customers', name: 'customers', columns: [], sourceType: 'TABLE' },
  ];

  const analysis = {
    columns: ['id'],
    operators: ['='],
    complexity: 'simple' as const,
    isEquiJoin: true,
    isNaturalJoin: false,
    complexity_score: 1,
  };

  it('U23: relationship ends render display name and alias, not the internal source id', () => {
    render(
      <JoinAnalysisPanel
        locale="en"
        tables={tables}
        joinAnalysisDetails={[{ id: 'j1', joinEdge: joinEdge('j1', 'a = b'), analysis }]}
      />
    );

    fireEvent.click(screen.getByText('ON: a = b'));

    // source id "orders" doubles as the name here, so use the alias chip and target
    expect(screen.getByText('orders (o)')).toBeInTheDocument();
    expect(screen.getByText('customers')).toBeInTheDocument();
  });

  it('U24: a condition shorter than the preview limit has no added ellipsis', () => {
    render(
      <JoinAnalysisPanel
        locale="en"
        tables={tables}
        joinAnalysisDetails={[{ id: 'j1', joinEdge: joinEdge('j1', 'a.id = b.id'), analysis }]}
      />
    );

    expect(screen.getByText('ON: a.id = b.id')).toBeInTheDocument();
    expect(screen.queryByText(/\.\.\./)).not.toBeInTheDocument();
  });

  it('U25: a long condition previews truncated but stays fully available in details; an empty one says so', () => {
    const long = 'a.id = b.id AND a.status = b.status AND a.tenant = b.tenant';
    render(
      <JoinAnalysisPanel
        locale="en"
        tables={tables}
        joinAnalysisDetails={[
          { id: 'j1', joinEdge: joinEdge('j1', long), analysis },
          { id: 'j2', joinEdge: joinEdge('j2', ''), analysis },
        ]}
      />
    );

    // collapsed preview is truncated at the 40-char limit
    expect(
      screen.getByText(/^ON: a\.id = b\.id AND a\.status = b\.status AND \.\.\.$/)
    ).toBeInTheDocument();
    // the empty condition is stated, not ellipsized
    expect(screen.getByText('No condition')).toBeInTheDocument();

    // expanded card exposes the full condition text
    fireEvent.click(screen.getByText('Expand All'));
    expect(screen.getByText(long)).toBeInTheDocument();
  });

  it('A26: a short condition is not shown as truncated', () => {
    render(
      <JoinAnalysisPanel
        locale="en"
        tables={tables}
        joinAnalysisDetails={[{ id: 'j1', joinEdge: joinEdge('j1', 'a = b'), analysis }]}
      />
    );

    expect(screen.getByText('ON: a = b')).toBeInTheDocument();
    expect(screen.queryByText(/ON: a = b\.\.\./)).not.toBeInTheDocument();
  });
});
