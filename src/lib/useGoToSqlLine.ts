'use client';

import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';

/** Navigates to the Query Input page's Smart Editor tab and reveals/highlights a specific line of the analyzed SQL. */
export function useGoToSqlLine() {
  const router = useRouter();
  const analysisResult = useAppStore((s) => s.analysisResult);
  const setPendingEditorJump = useAppStore((s) => s.setPendingEditorJump);

  return (line: number) => {
    if (!analysisResult) return;
    setPendingEditorJump({ sql: analysisResult.rawSql, line });
    router.push('/query-input');
  };
}
