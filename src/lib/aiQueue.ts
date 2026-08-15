// Concurrency-limited batching for AI requests.
//
// Ollama serialises requests per model unless OLLAMA_NUM_PARALLEL is raised, so firing N
// requests at once mostly buys queueing overhead and a thundering herd on cancel. This runs a
// bounded number at a time, reports progress per item, and stops early on abort.

export type BatchItemStatus = 'pending' | 'running' | 'done' | 'error' | 'cancelled';

export interface BatchItemState<T, R> {
  item: T;
  index: number;
  status: BatchItemStatus;
  result?: R;
  error?: string;
}

export interface RunBatchOptions<T, R> {
  /** Maximum number of in-flight workers. Clamped to at least 1. */
  concurrency?: number;
  signal?: AbortSignal;
  /** Called on every status transition with a fresh snapshot of all items. */
  onProgress?: (states: BatchItemState<T, R>[]) => void;
}

function isAbortError(error: unknown): boolean {
  return (error as Error)?.name === 'AbortError';
}

/**
 * Runs `worker` over `items` with bounded concurrency. Never rejects: each item's outcome is
 * captured in the returned states so one failing query cannot discard the successful ones.
 */
export async function runBatch<T, R>(
  items: T[],
  worker: (item: T, index: number, signal?: AbortSignal) => Promise<R>,
  options: RunBatchOptions<T, R> = {}
): Promise<BatchItemState<T, R>[]> {
  const { concurrency = 2, signal, onProgress } = options;
  const limit = Math.max(1, Math.floor(concurrency) || 1);

  const states: BatchItemState<T, R>[] = items.map((item, index) => ({
    item,
    index,
    status: 'pending',
  }));

  // Snapshot on every emit so React consumers see a new array reference and re-render.
  const emit = () => onProgress?.(states.map((state) => ({ ...state })));

  if (!items.length) {
    emit();
    return states;
  }

  let cursor = 0;
  let aborted = signal?.aborted ?? false;

  const markRemainingCancelled = () => {
    for (const state of states) {
      if (state.status === 'pending') state.status = 'cancelled';
    }
  };

  if (aborted) {
    markRemainingCancelled();
    emit();
    return states;
  }

  const runNext = async (): Promise<void> => {
    while (!aborted) {
      const index = cursor;
      cursor += 1;
      if (index >= states.length) return;

      const state = states[index];
      state.status = 'running';
      emit();

      try {
        state.result = await worker(state.item, index, signal);
        state.status = 'done';
      } catch (error) {
        if (isAbortError(error) || signal?.aborted) {
          aborted = true;
          state.status = 'cancelled';
          markRemainingCancelled();
        } else {
          state.status = 'error';
          state.error = error instanceof Error ? error.message : String(error);
        }
      }
      emit();
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, states.length) }, runNext));

  if (aborted) {
    markRemainingCancelled();
    emit();
  }

  return states;
}
