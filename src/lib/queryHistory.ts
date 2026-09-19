// Shared shape for the query history feature, used by both the /api/history route (which
// persists it to an Excel workbook on disk) and the client-side panel/fetch wrappers.
import type { SqlDialect } from './sql/sqlAnalyzer';

/** One saved query, kept for the history panel's semantic search. */
export interface QueryHistoryEntry {
  id: string;
  sql: string;
  dialect: SqlDialect;
  createdAt: number;
  tableCount: number;
  joinCount: number;
  complexityLevel?: string;
  /** Absent until the background embedding call resolves. */
  embedding?: number[];
  /** Which provider produced `embedding` — vectors from different models are not comparable. */
  embeddingModel?: string;
}

/** Oldest entries are dropped past this size so the workbook never grows unbounded. */
export const MAX_QUERY_HISTORY_ENTRIES = 50;
