import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { ObjectIntelligencePanel } from '@/app/query-input/components/ObjectIntelligencePanel';
import { ObjectAiPanel } from '@/app/query-input/components/ObjectAiPanel';
import { getT } from '@/lib/i18n';
import { DEFAULT_SETTINGS, useAppStore } from '@/lib/store';
import { generateWithAI, type AIGenerateRequest } from '@/lib/ai/aiService';
import { resetTestStorage, signInAsDemoUser } from '../utils/test-setup';
import { clearDemoAuthenticated, setGuestSession } from '@/lib/demoAuth';

vi.mock('@/lib/ai/aiService', () => ({ generateWithAI: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

beforeEach(async () => {
  vi.clearAllMocks();
  vi.mocked(generateWithAI).mockReset();
  resetTestStorage();
  await signInAsDemoUser();
  useAppStore.setState({
    settings: {
      ...DEFAULT_SETTINGS,
      locale: 'en',
      aiConfig: { ...DEFAULT_SETTINGS.aiConfig, provider: 'openai' },
    },
    objectSql: '',
    objectSqlOwner: null,
    objectSessionObjects: [],
    objectSessionOwner: null,
    objectAiConsent: null,
  });
});

it('asks before sending object facts externally and cancel sends nothing', async () => {
  render(<ObjectIntelligencePanel dialect="mysql" t={getT('en')} />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Database object SQL' }), {
    target: { value: 'CREATE TABLE sales.staff (id INT);' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Explain with AI' }, { timeout: 30000 }));
  const consent = within(screen.getByRole('group', { name: 'Confirm external AI request' }));
  expect(consent.getByText(/openai/i)).toBeInTheDocument();
  expect(consent.getByText(/SQL source and identifiers are not sent/i)).toBeInTheDocument();
  fireEvent.click(consent.getByRole('button', { name: 'Cancel' }));
  expect(generateWithAI).not.toHaveBeenCalled();
  vi.mocked(generateWithAI).mockResolvedValue('AI explanation');
  fireEvent.click(screen.getByRole('button', { name: 'Explain with AI' }));
  fireEvent.click(within(screen.getByRole('group', { name: 'Confirm external AI request' })).getByRole('button', { name: 'Confirm and send' }));
  expect(await screen.findByText('AI explanation')).toBeInTheDocument();
  expect(generateWithAI).toHaveBeenCalledTimes(1);
}, 60000);

it('sends only allowlisted static facts, never SQL or identifiers', async () => {
  vi.mocked(generateWithAI).mockResolvedValue('partial static explanation');
  render(<ObjectIntelligencePanel dialect="mysql" t={getT('en')} />);
  const sql = "CREATE TABLE private_schema.private_table (id INT COMMENT 'secret-value');";
  fireEvent.change(screen.getByRole('textbox', { name: 'Database object SQL' }), { target: { value: sql } });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Explain with AI' }, { timeout: 30000 }));
  fireEvent.click(within(screen.getByRole('group', { name: 'Confirm external AI request' })).getByRole('button', { name: 'Confirm and send' }));
  await screen.findByText('partial static explanation');
  const request: AIGenerateRequest = vi.mocked(generateWithAI).mock.calls[0][1];
  const sent = request.messages?.map((message) => message.content).join('\n') ?? '';
  expect(sent).toContain('"kind":"table"');
  expect(sent).not.toContain('private_schema');
  expect(sent).not.toContain('private_table');
  expect(sent).not.toContain('secret-value');
  expect(sent).not.toContain(sql);
}, 60000);

it('requires a new confirmation after the provider changes', async () => {
  vi.mocked(generateWithAI).mockResolvedValue('AI explanation');
  render(<ObjectIntelligencePanel dialect="mysql" t={getT('en')} />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Database object SQL' }), {
    target: { value: 'CREATE TABLE sales.staff (id INT);' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Explain with AI' }, { timeout: 30000 }));
  fireEvent.click(within(screen.getByRole('group', { name: 'Confirm external AI request' })).getByRole('button', { name: 'Confirm and send' }));
  await screen.findByText('AI explanation');
  act(() => {
    const settings = useAppStore.getState().settings;
    useAppStore.setState({ settings: { ...settings, aiConfig: { ...settings.aiConfig, provider: 'anthropic' } } });
  });
  fireEvent.click(screen.getByRole('button', { name: 'Explain with AI' }));
  const consent = within(screen.getByRole('group', { name: 'Confirm external AI request' }));
  expect(consent.getByText(/anthropic/i)).toBeInTheDocument();
  expect(generateWithAI).toHaveBeenCalledTimes(1);
}, 60000);

it('discards a late AI response after the SQL changes', async () => {
  let resolveAnswer: (answer: string) => void = () => {};
  vi.mocked(generateWithAI).mockImplementation(() => new Promise((resolve) => { resolveAnswer = resolve; }));
  render(<ObjectIntelligencePanel dialect="mysql" t={getT('en')} />);
  const editor = screen.getByRole('textbox', { name: 'Database object SQL' });
  fireEvent.change(editor, { target: { value: 'CREATE TABLE sales.staff (id INT);' } });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Explain with AI' }, { timeout: 30000 }));
  fireEvent.click(within(screen.getByRole('group', { name: 'Confirm external AI request' })).getByRole('button', { name: 'Confirm and send' }));
  fireEvent.change(editor, { target: { value: 'CREATE TABLE sales.other (id INT);' } });
  await act(async () => { resolveAnswer('old explanation'); });
  expect(screen.queryByText('old explanation')).not.toBeInTheDocument();
}, 60000);

it('clears consent on sign-out and never persists it with settings', async () => {
  vi.mocked(generateWithAI).mockResolvedValue('AI explanation');
  render(<ObjectIntelligencePanel dialect="mysql" t={getT('en')} />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Database object SQL' }), {
    target: { value: 'CREATE TABLE sales.staff (id INT);' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Explain with AI' }, { timeout: 30000 }));
  fireEvent.click(within(screen.getByRole('group', { name: 'Confirm external AI request' })).getByRole('button', { name: 'Confirm and send' }));
  await screen.findByText('AI explanation');
  expect(useAppStore.getState().objectAiConsent?.provider).toBe('openai');
  expect(window.localStorage.getItem('sqlvisualizer-store')).not.toContain('objectAiConsent');
  act(() => clearDemoAuthenticated());
  expect(useAppStore.getState().objectAiConsent).toBeNull();
}, 60000);

it('keeps object AI locked for guests under the existing policy', async () => {
  setGuestSession({ startedAt: 123, locale: 'en' });
  render(<ObjectIntelligencePanel dialect="mysql" t={getT('en')} />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Database object SQL' }), {
    target: { value: 'CREATE TABLE sales.staff (id INT);' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));
  expect(await screen.findByRole('note', {}, { timeout: 30000 })).toHaveTextContent('Object AI explanation');
  expect(screen.queryByRole('button', { name: 'Explain with AI' })).not.toBeInTheDocument();
  expect(generateWithAI).not.toHaveBeenCalled();
}, 60000);

it('does not send additional untrusted fields supplied alongside static facts', async () => {
  vi.mocked(generateWithAI).mockResolvedValue('AI explanation');
  const facts = {
    dialect: 'mysql' as const,
    kind: 'table' as const,
    status: 'partial' as const,
    columnCount: 1,
    sql: 'secret-sql-that-must-not-leave',
  };
  render(<ObjectAiPanel t={getT('en')} facts={facts} />);
  fireEvent.click(screen.getByRole('button', { name: 'Explain with AI' }));
  fireEvent.click(within(screen.getByRole('group', { name: 'Confirm external AI request' })).getByRole('button', { name: 'Confirm and send' }));
  await screen.findByText('AI explanation');
  const request: AIGenerateRequest = vi.mocked(generateWithAI).mock.calls[0][1];
  expect(request.messages?.map((message) => message.content).join('\n')).not.toContain('secret-sql-that-must-not-leave');
});
