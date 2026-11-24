'use client';

import React, { useEffect, useRef, useState } from 'react';
import { analyzeQuerySources, analyzeView, type ViewAnalysis } from '@/lib/sql/viewAnalyzer';
import { triggerFromStatement, type TriggerAnalysis } from '@/lib/sql/triggerAnalyzer';
import { procedureFromStatement, type ProcedureAnalysis } from '@/lib/sql/storeprocedureAnalyzer';
import { functionFromStatement, type FunctionAnalysis } from '@/lib/sql/functionAnalyzer';
import { analyzeTable, type TableAnalysis } from '@/lib/sql/tableAnalyzer';
import { analyzePostgresqlRoutine } from '@/lib/sql/postgresqlRoutineAnalyzer';
import {
  extractRoutineQueries,
  parseMySqlDefinition,
  type ExtractedQuery,
} from '@/lib/sql/mysqlObjectParser';
import { DIALECT_LABELS } from '@/lib/sql/dialectValidator';
import type { SqlDialect } from '@/lib/sql/sqlAnalyzer';
import type { Translations } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';
import { currentSessionOwner, SESSION_IDENTITY_CHANGED_EVENT } from '@/lib/demoAuth';
import { QueryInputPanel } from './QueryInputPanel';
import { ObjectDependencyPanel } from './ObjectDependencyPanel';
import { ObjectAiPanel } from './ObjectAiPanel';
import {
  sessionObjectFromAnalysis,
  type SessionObject,
} from '@/lib/sql/objectIntelligenceDependencies';
import { splitDefinitions } from '@/lib/sql/objectIntelligenceIngestion';

interface BatchTransaction {
  candidates: SessionObject[];
  staged: SessionObject[];
  base: SessionObject[];
  owner: string | null;
  revision: number;
}

interface BatchDocument {
  label: string | null;
  text: string;
}

function RoutineQueries({
  extraction,
  dialect,
  t,
  onReveal,
}: {
  extraction: { queries: ExtractedQuery[]; incomplete: boolean };
  dialect: SqlDialect;
  t: Translations;
  onReveal: (query: ExtractedQuery) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [sources, setSources] = useState<Awaited<ReturnType<typeof analyzeQuerySources>> | null>(
    null
  );
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setSources(null);
    setFailed(false);
    if (selected === null)
      return () => {
        active = false;
      };
    setLoading(true);
    analyzeQuerySources(extraction.queries[selected].text, dialect)
      .then((result) => {
        if (active) setSources(result);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selected, extraction, dialect]);

  return (
    <>
      <h3 className="font-medium">{t.objectStatements}</h3>
      {extraction.incomplete && (
        <p className="text-muted-foreground">{t.objectStatementsIncomplete}</p>
      )}
      {extraction.queries.length ? (
        <ul className="space-y-1">
          {extraction.queries.map((query, index) => (
            <li key={query.start.offset}>
              <button
                type="button"
                aria-pressed={selected === index}
                onClick={() => setSelected(index)}
                className="min-h-11 text-left text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t.objectStatement} {index + 1}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">{t.objectNoStatements}</p>
      )}
      {selected !== null && (
        <>
          <p className="text-muted-foreground">
            {t.objectLine} {extraction.queries[selected].start.line}, {t.objectColumn}{' '}
            {extraction.queries[selected].start.column}
          </p>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono">
            {extraction.queries[selected].text}
          </pre>
          <button
            type="button"
            onClick={() => onReveal(extraction.queries[selected])}
            className="min-h-11 text-left text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t.objectShowSource}
          </button>
          {loading && <p role="status">{t.analyzing}</p>}
          {failed && <p role="alert">{t.objectFailed}</p>}
          {sources && (
            <>
              <h4 className="font-medium">{t.objectTables}</h4>
              <p className="text-muted-foreground">
                {sources.sourceCrossCheck === 'disagreement'
                  ? t.objectSourcesDisagreed
                  : t.objectPartialHint}
              </p>
              {sources.sourceCrossCheck === 'unavailable' && (
                <p className="text-muted-foreground">{t.objectSourcesUnverified}</p>
              )}
              {sources.sourceCrossCheck !== 'disagreement' &&
                (sources.tables.length ? (
                  <ul className="list-inside list-disc">
                    {sources.tables.map((table, index) => (
                      <li key={`${table}-${index}`}>{table}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">{t.objectNoSources}</p>
                ))}
            </>
          )}
        </>
      )}
    </>
  );
}

export function ObjectIntelligencePanel({ dialect, t }: { dialect: SqlDialect; t: Translations }) {
  const storedSource = useAppStore((state) => state.objectSql);
  const sourceOwner = useAppStore((state) => state.objectSqlOwner);
  const setSource = useAppStore((state) => state.setObjectSql);
  const storedObjects = useAppStore((state) => state.objectSessionObjects);
  const sessionOwner = useAppStore((state) => state.objectSessionOwner);
  const setObjects = useAppStore((state) => state.setObjectSessionObjects);
  const owner = currentSessionOwner();
  const sessionObjects = sessionOwner === owner ? storedObjects : [];
  const source = sourceOwner === owner ? storedSource : '';
  const [result, setResult] = useState<
    ViewAnalysis | TriggerAnalysis | ProcedureAnalysis | FunctionAnalysis | TableAnalysis | null
  >(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingObject, setPendingObject] = useState<SessionObject | null>(null);
  const [pendingBatch, setPendingBatch] = useState<BatchTransaction | null>(null);
  const [sessionError, setSessionError] = useState(false);
  const [batchError, setBatchError] = useState(false);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [defaultSchema, setDefaultSchema] = useState('');
  const [queries, setQueries] = useState<{ queries: ExtractedQuery[]; incomplete: boolean } | null>(
    null
  );
  const revision = useRef(0);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const lastOwner = useRef(owner);

  useEffect(() => {
    const clearIfOwnerChanged = () => {
      const currentOwner = currentSessionOwner();
      if (lastOwner.current !== currentOwner) {
        lastOwner.current = currentOwner;
        revision.current += 1;
        setResult(null);
        setQueries(null);
        setPendingObject(null);
        setPendingBatch(null);
        setSessionError(false);
        setBatchError(false);
        setFileErrors([]);
        setDefaultSchema('');
        setFailed(false);
        setLoading(false);
      }
      const state = useAppStore.getState();
      if (state.objectSql && state.objectSqlOwner !== currentOwner) {
        state.setObjectSql('');
      }
    };
    clearIfOwnerChanged();
    window.addEventListener('storage', clearIfOwnerChanged);
    window.addEventListener(SESSION_IDENTITY_CHANGED_EVENT, clearIfOwnerChanged);
    return () => {
      window.removeEventListener('storage', clearIfOwnerChanged);
      window.removeEventListener(SESSION_IDENTITY_CHANGED_EVENT, clearIfOwnerChanged);
    };
  }, []);

  useEffect(() => {
    revision.current += 1;
    setResult(null);
    setQueries(null);
    setFailed(false);
    setLoading(false);
    setPendingObject(null);
    setPendingBatch(null);
    setSessionError(false);
    setBatchError(false);
    setFileErrors([]);
  }, [dialect, source]);

  useEffect(
    () => () => {
      revision.current += 1;
    },
    []
  );

  const analyze = async () => {
    const request = ++revision.current;
    setLoading(true);
    setFailed(false);
    setResult(null);
    setQueries(null);
    try {
      const view = await analyzeView(source, dialect);
      let next:
        | ViewAnalysis
        | TriggerAnalysis
        | ProcedureAnalysis
        | FunctionAnalysis
        | TableAnalysis = view;
      let nextQueries: { queries: ExtractedQuery[]; incomplete: boolean } | null = null;
      if (view.status === 'unsupported') {
        next = (await analyzeTable(source, dialect)) ?? view;
      }
      if (next.status === 'unsupported' && dialect === 'postgresql') {
        next = (await analyzePostgresqlRoutine(source)) ?? view;
      }
      if (next.status === 'unsupported' && dialect === 'mysql') {
        const statement = await parseMySqlDefinition(source);
        if (statement) {
          next =
            triggerFromStatement(source, statement) ??
            procedureFromStatement(source, statement) ??
            functionFromStatement(source, statement) ??
            view;
          if ('kind' in next) {
            const body =
              next.kind === 'trigger'
                ? statement.createTrigger()?.routineBody()
                : next.kind === 'function'
                  ? statement.createFunction()?.routineBody()
                  : statement.createProcedure()?.routineBody();
            if (body) nextQueries = extractRoutineQueries(source, body);
          }
        }
      }
      if (request === revision.current) {
        setResult(next);
        setQueries(nextQueries);
      }
    } catch {
      if (request === revision.current) setFailed(true);
    } finally {
      if (request === revision.current) setLoading(false);
    }
  };

  const advanceBatch = (transaction: BatchTransaction) => {
    if (
      transaction.revision !== revision.current ||
      transaction.owner !== currentSessionOwner() ||
      useAppStore.getState().objectSessionObjects !== transaction.base
    ) {
      setPendingBatch(null);
      setBatchError(true);
      return;
    }
    const staged = [...transaction.staged];
    for (let index = 0; index < transaction.candidates.length; index += 1) {
      const candidate = transaction.candidates[index];
      if (staged.some((object) => object.id === candidate.id)) {
        setPendingBatch({
          ...transaction,
          staged,
          candidates: transaction.candidates.slice(index),
        });
        return;
      }
      staged.push(candidate);
    }
    setObjects(staged, transaction.owner);
    setPendingBatch(null);
  };

  const addBatch = async (
    readDocuments: (isCurrent: () => boolean) => Promise<BatchDocument[] | null>
  ) => {
    const request = ++revision.current;
    const isCurrent = () =>
      request === revision.current &&
      currentSessionOwner() === owner &&
      useAppStore.getState().objectSessionObjects === storedObjects;
    setLoading(true);
    setFailed(false);
    setBatchError(false);
    setFileErrors([]);
    setPendingBatch(null);
    setPendingObject(null);
    setResult(null);
    setQueries(null);
    try {
      const documents = await readDocuments(isCurrent);
      if (!isCurrent()) {
        if (request === revision.current && currentSessionOwner() === owner) setBatchError(true);
        return;
      }
      if (!documents) return;
      const candidates: SessionObject[] = [];
      for (const document of documents) {
        const split = await splitDefinitions(document.text, dialect);
        if (split.status === 'unsupported') {
          if (isCurrent()) {
            if (document.label) setFileErrors([document.label]);
            else setBatchError(true);
          }
          return;
        }
        for (const definition of split.definitions) {
          const view = await analyzeView(definition.text, dialect);
          const analysis =
            view.status === 'partial' ? view : await analyzeTable(definition.text, dialect);
          const candidate =
            analysis &&
            sessionObjectFromAnalysis(definition.text, dialect, analysis, defaultSchema);
          if (!candidate) {
            if (isCurrent()) {
              if (document.label) setFileErrors([document.label]);
              else setBatchError(true);
            }
            return;
          }
          const ambiguous = [...sessionObjects, ...candidates].some(
            (object) =>
              object.dialect === candidate.dialect &&
              object.schema.toLowerCase() === candidate.schema.toLowerCase() &&
              object.name.toLowerCase() === candidate.name.toLowerCase() &&
              (object.id !== candidate.id || object.kind !== candidate.kind)
          );
          if (ambiguous) {
            if (request === revision.current) setBatchError(true);
            return;
          }
          candidate.sourceDocument = {
            label: document.label,
            text: document.text,
            start: definition.start,
            end: definition.end,
          };
          candidates.push(candidate);
        }
      }
      if (request === revision.current) {
        advanceBatch({
          candidates,
          staged: sessionObjects,
          base: storedObjects,
          owner,
          revision: request,
        });
      }
    } catch {
      if (request === revision.current) setFailed(true);
    } finally {
      if (request === revision.current) setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <QueryInputPanel title={t.objectSqlLabel} description={t.objectSqlHint}>
        <label className="sr-only" htmlFor="database-object-sql">
          {t.objectSqlLabel}
        </label>
        <textarea
          ref={sourceRef}
          id="database-object-sql"
          value={source}
          onChange={(event) => {
            revision.current += 1;
            setSource(event.target.value, currentSessionOwner());
            setResult(null);
            setQueries(null);
            setFailed(false);
            setLoading(false);
          }}
          spellCheck={false}
          className="min-h-[360px] w-full resize-y rounded-md border border-border bg-background p-3 font-mono text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="mt-2 text-sm text-muted-foreground">{t.objectDraftLimit}</p>
        <label className="mt-3 block text-sm font-medium" htmlFor="object-default-schema">
          {t.objectDefaultSchema}
        </label>
        <input
          id="object-default-schema"
          value={defaultSchema}
          onChange={(event) => {
            revision.current += 1;
            setDefaultSchema(event.target.value);
            setPendingBatch(null);
            setPendingObject(null);
            setBatchError(false);
            setSessionError(false);
            setFileErrors([]);
            setLoading(false);
          }}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="mt-1 text-sm text-muted-foreground">{t.objectDefaultSchemaHint}</p>
        <button
          type="button"
          disabled={!source.trim() || loading || !!pendingBatch}
          onClick={analyze}
          className="mt-4 min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {loading ? t.analyzing : t.objectAnalyze}
        </button>
        <button
          type="button"
          disabled={
            (dialect !== 'mysql' && dialect !== 'postgresql') ||
            !source.trim() ||
            loading ||
            !!pendingBatch
          }
          onClick={() => addBatch(async () => [{ label: null, text: source }])}
          className="ml-2 mt-4 min-h-11 rounded-md border border-border px-4 text-sm font-medium disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t.objectAddPasted}
        </button>
        <p className="mt-2 text-sm text-muted-foreground">{t.objectBatchHint}</p>
        {batchError && <p role="alert">{t.objectBatchUnsupported}</p>}
        <label className="mt-3 block text-sm font-medium" htmlFor="object-sql-files">
          {t.objectImportFiles}
        </label>
        <input
          id="object-sql-files"
          type="file"
          accept=".sql"
          multiple
          disabled={(dialect !== 'mysql' && dialect !== 'postgresql') || loading || !!pendingBatch}
          className="mt-1 block w-full min-w-0 rounded-md border border-border bg-background text-sm text-muted-foreground file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-l-md file:border-0 file:border-r file:border-solid file:border-border file:bg-muted file:px-4 file:text-sm file:font-medium file:text-foreground hover:file:bg-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:file:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? []);
            event.currentTarget.value = '';
            if (!files.length) return;
            void addBatch(async (isCurrent) => {
              const results = await Promise.all(
                files.map(async (file) => {
                  if (!file.name.toLowerCase().endsWith('.sql'))
                    return { ok: false as const, file };
                  try {
                    return { ok: true as const, file, text: await file.text() };
                  } catch {
                    return { ok: false as const, file };
                  }
                })
              );
              const errors = results.filter((result) => !result.ok);
              if (errors.length && isCurrent()) {
                setFileErrors(errors.map(({ file }) => file.name));
              }
              if (errors.length) {
                return null;
              }
              return results.map((result) => {
                if (!result.ok) throw new Error('Unresolved file read failure');
                return { label: result.file.name, text: result.text };
              });
            });
          }}
        />
        {fileErrors.length > 0 && (
          <div role="alert" className="mt-2 text-sm">
            <p>{t.objectFileReadError}</p>
            <ul>
              {fileErrors.map((name, index) => (
                <li key={`${name}-${index}`}>{name}</li>
              ))}
            </ul>
          </div>
        )}
        {pendingBatch && pendingBatch.owner === owner && (
          <div role="group" aria-label={t.objectBatchDuplicate} className="mt-3 space-y-2 text-sm">
            <p>{t.objectDuplicate}</p>
            <p>
              {pendingBatch.candidates[0].schema}.{pendingBatch.candidates[0].name}
            </p>
            {(pendingBatch.candidates[0].assumedSchema ||
              pendingBatch.staged.find((object) => object.id === pendingBatch.candidates[0].id)
                ?.assumedSchema) && (
              <p className="text-muted-foreground">{t.objectDefaultSchemaNotice}</p>
            )}
            <details>
              <summary>{t.objectCompareDefinitions}</summary>
              <p>{t.objectExistingDefinition}</p>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words">
                {
                  pendingBatch.staged.find((object) => object.id === pendingBatch.candidates[0].id)
                    ?.source
                }
              </pre>
              <p>{t.objectIncomingDefinition}</p>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words">
                {pendingBatch.candidates[0].source}
              </pre>
            </details>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="min-h-11 rounded-md border border-border px-3"
                onClick={() =>
                  advanceBatch({ ...pendingBatch, candidates: pendingBatch.candidates.slice(1) })
                }
              >
                {t.objectKeep}
              </button>
              <button
                type="button"
                className="min-h-11 rounded-md border border-border px-3"
                onClick={() =>
                  advanceBatch({
                    ...pendingBatch,
                    staged: pendingBatch.staged.map((object) =>
                      object.id === pendingBatch.candidates[0].id
                        ? pendingBatch.candidates[0]
                        : object
                    ),
                    candidates: pendingBatch.candidates.slice(1),
                  })
                }
              >
                {t.objectReplace}
              </button>
              <button
                type="button"
                className="min-h-11 rounded-md border border-border px-3"
                onClick={() => setPendingBatch(null)}
              >
                {t.objectCancelImport}
              </button>
            </div>
          </div>
        )}
      </QueryInputPanel>
      <QueryInputPanel title={t.objectResult}>
        {loading && <p role="status">{t.analyzing}</p>}
        {failed && <p role="alert">{t.objectFailed}</p>}
        {!loading && !failed && !result && (
          <p className="text-sm text-muted-foreground">{t.objectEmpty}</p>
        )}
        {result?.status === 'unsupported' && <p role="alert">{t.objectUnsupported}</p>}
        {result?.status === 'partial' && (
          <div className="space-y-4 text-sm">
            <p className="font-medium text-foreground">{t.objectPartial}</p>
            <p className="text-muted-foreground">
              {'kind' in result
                ? result.kind === 'table'
                  ? t.objectTablePartialHint
                  : t.objectRoutinePartialHint
                : t.objectPartialHint}
            </p>
            <dl className="grid grid-cols-2 gap-3">
              <dt className="text-muted-foreground">
                {'kind' in result
                  ? result.kind === 'trigger'
                    ? t.objectTrigger
                    : result.kind === 'table'
                      ? t.objectTable
                      : result.kind === 'function'
                        ? t.objectFunction
                        : t.objectProcedure
                  : t.objectView}
              </dt>
              <dd>{result.name}</dd>
              {(!('kind' in result) || result.kind === 'table') && result.schema && (
                <>
                  <dt className="text-muted-foreground">{t.objectSchema}</dt>
                  <dd>{result.schema}</dd>
                </>
              )}
              {'kind' in result && result.kind === 'function' && (
                <>
                  <dt className="text-muted-foreground">{t.objectReturnType}</dt>
                  <dd>{result.returnType}</dd>
                </>
              )}
              <dt className="text-muted-foreground">{t.dialectLabel}</dt>
              <dd>{DIALECT_LABELS[dialect]}</dd>
              {'kind' in result && result.kind === 'trigger' && (
                <>
                  <dt className="text-muted-foreground">{t.objectTiming}</dt>
                  <dd>{result.timing}</dd>
                  <dt className="text-muted-foreground">{t.objectEvent}</dt>
                  <dd>{result.event}</dd>
                  <dt className="text-muted-foreground">{t.objectTargetTable}</dt>
                  <dd>{result.table}</dd>
                </>
              )}
            </dl>
            {(!('kind' in result) || result.kind === 'table') && (
              <>
                <button
                  type="button"
                  className="min-h-11 rounded-md border border-border px-3"
                  onClick={() => {
                    const candidate = sessionObjectFromAnalysis(
                      source,
                      dialect,
                      result,
                      defaultSchema
                    );
                    if (!candidate) {
                      setSessionError(true);
                      return;
                    }
                    const same = sessionObjects.find((view) => view.id === candidate.id);
                    const ambiguous = sessionObjects.some(
                      (view) =>
                        view.dialect === candidate.dialect &&
                        (view.id !== candidate.id || view.kind !== candidate.kind) &&
                        view.schema.toLowerCase() === candidate.schema.toLowerCase() &&
                        view.name.toLowerCase() === candidate.name.toLowerCase()
                    );
                    if (ambiguous) {
                      setSessionError(true);
                    } else if (same) {
                      setPendingObject(candidate);
                    } else {
                      setSessionError(false);
                      setObjects([...sessionObjects, candidate], owner);
                    }
                  }}
                >
                  {t.objectAddToSession}
                </button>
                {sessionError && <p role="alert">{t.objectSessionUnsupported}</p>}
                {pendingObject && (
                  <div role="group" aria-label={t.objectDuplicate}>
                    <p>{t.objectDuplicate}</p>
                    <p>
                      {pendingObject.schema}.{pendingObject.name}
                    </p>
                    {(pendingObject.assumedSchema ||
                      sessionObjects.find((object) => object.id === pendingObject.id)
                        ?.assumedSchema) && (
                      <p className="text-muted-foreground">{t.objectDefaultSchemaNotice}</p>
                    )}
                    <button type="button" onClick={() => setPendingObject(null)}>
                      {t.objectKeep}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setObjects(
                          sessionObjects.map((view) =>
                            view.id === pendingObject.id ? pendingObject : view
                          ),
                          owner
                        );
                        setPendingObject(null);
                      }}
                    >
                      {t.objectReplace}
                    </button>
                  </div>
                )}
              </>
            )}
            <ObjectAiPanel
              t={t}
              facts={{
                dialect,
                kind: 'kind' in result ? result.kind : 'view',
                status: result.status,
                ...('kind' in result && result.kind === 'table'
                  ? { columnCount: result.columns.length }
                  : !('kind' in result) && result.columns
                    ? { columnCount: result.columns.length }
                    : {}),
                ...('kind' in result && (result.kind === 'procedure' || result.kind === 'function')
                  ? { parameterCount: result.parameters.length }
                  : {}),
                ...(!('kind' in result) && result.sourceCrossCheck === 'agreement'
                  ? { verifiedSourceCount: result.tables.length }
                  : {}),
              }}
            />
            {'kind' in result && result.kind === 'table' ? (
              <>
                <h3 className="font-medium">{t.objectColumns}</h3>
                <ul className="space-y-1 font-mono text-muted-foreground">
                  {result.columns.map((column, index) => (
                    <li key={`${column.name}-${index}`}>
                      {column.name} — {column.type}
                    </li>
                  ))}
                </ul>
              </>
            ) : 'kind' in result ? (
              <>
                {(result.kind === 'procedure' || result.kind === 'function') && (
                  <>
                    <h3 className="font-medium">{t.objectParameters}</h3>
                    {result.parameters.length ? (
                      <ul className="space-y-1 font-mono text-muted-foreground">
                        {result.parameters.map((parameter, index) => (
                          <li key={`${parameter}-${index}`}>{parameter}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">{t.objectNoParameters}</p>
                    )}
                  </>
                )}
                <h3 className="font-medium">{t.objectBody}</h3>
                <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono">
                  {result.body}
                </pre>
                {dialect === 'postgresql' && (
                  <p className="text-muted-foreground">{t.objectPostgresqlBodyIncomplete}</p>
                )}
                {queries && (
                  <RoutineQueries
                    extraction={queries}
                    dialect={dialect}
                    t={t}
                    onReveal={(query) => {
                      const editor = sourceRef.current;
                      if (editor) {
                        editor.focus();
                        editor.setSelectionRange(query.start.offset, query.end.offset);
                      }
                    }}
                  />
                )}
              </>
            ) : (
              <>
                <h3 className="font-medium">{t.objectColumns}</h3>
                {result.columns ? (
                  <ul className="space-y-1 font-mono text-muted-foreground">
                    {result.columns.map((column, index) => (
                      <li key={`${column}-${index}`}>{column}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">{t.objectColumnsUnavailable}</p>
                )}
                <h3 className="font-medium">{t.objectQuery}</h3>
                <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono">
                  {result.query}
                </pre>
                <h3 className="font-medium">{t.objectTables}</h3>
                {result.sourceCrossCheck === 'disagreement' ? (
                  <p className="text-muted-foreground">{t.objectSourcesDisagreed}</p>
                ) : (
                  <>
                    {result.sourceCrossCheck === 'unavailable' && (
                      <p className="text-muted-foreground">{t.objectSourcesUnverified}</p>
                    )}
                    {result.tables.length ? (
                      <ul className="list-inside list-disc">
                        {result.tables.map((table, index) => (
                          <li key={`${table}-${index}`}>{table}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">{t.objectNoSources}</p>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
        {sessionObjects.length > 0 && <ObjectDependencyPanel views={sessionObjects} t={t} />}
      </QueryInputPanel>
    </div>
  );
}
