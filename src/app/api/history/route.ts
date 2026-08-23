// Server-side persistence for query history: an Excel workbook on local disk instead of the
// browser's localStorage, so saved queries survive clearing site data and are inspectable with
// any spreadsheet tool. Fine for this app's single-user, locally-run usage; there is no
// concurrent-write locking, which a multi-user deployment would need.
import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { MAX_QUERY_HISTORY_ENTRIES, type QueryHistoryEntry } from '@/lib/queryHistory';
import type { SqlDialect } from '@/lib/sql/sqlAnalyzer';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'query-history.xlsx');
const SHEET_NAME = 'History';

/** Flat row shape a spreadsheet cell can hold; `embedding` is JSON-encoded since cells can't hold arrays. */
interface HistoryRow {
  id: string;
  sql: string;
  dialect: string;
  createdAt: number;
  tableCount: number;
  joinCount: number;
  complexityLevel: string;
  embeddingModel: string;
  embedding: string;
}

function toRow(entry: QueryHistoryEntry): HistoryRow {
  return {
    id: entry.id,
    sql: entry.sql,
    dialect: entry.dialect,
    createdAt: entry.createdAt,
    tableCount: entry.tableCount,
    joinCount: entry.joinCount,
    complexityLevel: entry.complexityLevel ?? '',
    embeddingModel: entry.embeddingModel ?? '',
    embedding: entry.embedding ? JSON.stringify(entry.embedding) : '',
  };
}

function fromRow(row: HistoryRow): QueryHistoryEntry {
  let embedding: number[] | undefined;
  if (row.embedding) {
    try {
      const parsed = JSON.parse(row.embedding);
      if (Array.isArray(parsed)) embedding = parsed;
    } catch {
      embedding = undefined;
    }
  }
  return {
    id: String(row.id),
    sql: String(row.sql ?? ''),
    dialect: (row.dialect as SqlDialect) || 'mysql',
    createdAt: Number(row.createdAt) || Date.now(),
    tableCount: Number(row.tableCount) || 0,
    joinCount: Number(row.joinCount) || 0,
    complexityLevel: row.complexityLevel || undefined,
    embedding,
    embeddingModel: row.embeddingModel || undefined,
  };
}

function readEntries(): QueryHistoryEntry[] {
  if (!fs.existsSync(FILE_PATH)) return [];
  try {
    const workbook = XLSX.readFile(FILE_PATH);
    const sheet = workbook.Sheets[SHEET_NAME] ?? workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return [];
    const rows = XLSX.utils.sheet_to_json<HistoryRow>(sheet);
    return rows.map(fromRow);
  } catch (error) {
    console.error('[api/history] Failed to read query-history.xlsx', error);
    return [];
  }
}

function writeEntries(entries: QueryHistoryEntry[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const worksheet = XLSX.utils.json_to_sheet(entries.map(toRow));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, SHEET_NAME);
  XLSX.writeFile(workbook, FILE_PATH);
}

export async function GET() {
  return NextResponse.json({ entries: readEntries() });
}

interface AddEntryBody {
  entry?: {
    sql?: unknown;
    dialect?: unknown;
    tableCount?: unknown;
    joinCount?: unknown;
    complexityLevel?: unknown;
  };
}

export async function POST(request: Request) {
  let body: AddEntryBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const sql = typeof body.entry?.sql === 'string' ? body.entry.sql.trim() : '';
  if (!sql) return NextResponse.json({ error: 'entry.sql is required.' }, { status: 400 });
  const dialect = typeof body.entry?.dialect === 'string' ? body.entry.dialect : 'mysql';

  const created: QueryHistoryEntry = {
    id: `qh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sql,
    dialect: dialect as SqlDialect,
    createdAt: Date.now(),
    tableCount: Number(body.entry?.tableCount) || 0,
    joinCount: Number(body.entry?.joinCount) || 0,
    complexityLevel: typeof body.entry?.complexityLevel === 'string' ? body.entry.complexityLevel : undefined,
  };

  // Re-saving the same query just refreshes it to the top instead of duplicating it.
  const existing = readEntries().filter((item) => item.sql.trim() !== sql);
  writeEntries([created, ...existing].slice(0, MAX_QUERY_HISTORY_ENTRIES));

  return NextResponse.json({ entry: created });
}

interface UpdateEmbeddingBody {
  id?: unknown;
  embedding?: unknown;
  embeddingModel?: unknown;
}

export async function PATCH(request: Request) {
  let body: UpdateEmbeddingBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });
  if (!Array.isArray(body.embedding) || !body.embedding.every((v) => typeof v === 'number')) {
    return NextResponse.json({ error: 'embedding must be an array of numbers.' }, { status: 400 });
  }
  const embeddingModel = typeof body.embeddingModel === 'string' ? body.embeddingModel : undefined;

  const entries = readEntries();
  const index = entries.findIndex((item) => item.id === id);
  if (index === -1) return NextResponse.json({ error: 'No entry with that id.' }, { status: 404 });

  entries[index] = { ...entries[index], embedding: body.embedding, embeddingModel };
  writeEntries(entries);
  return NextResponse.json({ entry: entries[index] });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('all') === 'true') {
    writeEntries([]);
    return NextResponse.json({ ok: true });
  }

  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id or all=true query param is required.' }, { status: 400 });

  writeEntries(readEntries().filter((item) => item.id !== id));
  return NextResponse.json({ ok: true });
}
