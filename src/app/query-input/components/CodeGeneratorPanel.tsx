'use client';

import { useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { Clipboard, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import type {
  CodeGenerationOptions,
  GenerationDiagnostic,
  SqlClassification,
  SqlDialect,
} from '@/lib/codegen/model';
import type { GeneratedCode } from '@/lib/codegen/model';
import { classifySql } from '@/lib/codegen/classifySql';
import { parseSql } from '@/lib/codegen/parseSql';
import { RendererRegistry } from '@/lib/codegen/rendererRegistry';
import { GeneratorTargetControls } from './GeneratorTargetControls';

interface CodeGeneratorPanelProps {
  dialect: SqlDialect;
  t: Record<string, string>;
  initialSql?: string;
}

const INITIAL_OPTIONS: CodeGenerationOptions = {
  language: 'java',
  framework: 'jpa-hibernate',
  outputType: 'auto',
  namingStrategy: 'camelCase',
  includeRelationships: true,
  useLombok: false,
  validationAnnotations: false,
  generateMyBatisMapper: false,
};

export function CodeGeneratorPanel(_props: CodeGeneratorPanelProps) {
  const { dialect, t, initialSql = '' } = _props;
  const sql = useAppStore((state) => state.codeGeneratorSql);
  const setSql = useAppStore((state) => state.setCodeGeneratorSql);
  const theme = useAppStore((state) => state.settings.theme);
  const [options, setOptions] = useState<CodeGenerationOptions>(INITIAL_OPTIONS);
  const [diagnostics, setDiagnostics] = useState<GenerationDiagnostic[]>([]);
  const [classificationResult, setClassificationResult] = useState<SqlClassification | null>(null);
  const [generated, setGenerated] = useState<GeneratedCode | null>(null);
  const [selectedOutputFileIndex, setSelectedOutputFileIndex] = useState(0);
  const generatedFiles = generated
    ? [
        { fileName: generated.fileName, source: generated.source },
        ...(generated.additionalFiles ?? []),
      ]
    : [];
  const selectedOutputFile = generatedFiles[selectedOutputFileIndex] ?? generatedFiles[0];

  const generate = () => {
    const model = parseSql(sql, dialect);
    const classification = classifySql(model);
    setClassificationResult(classification);
    if (model.parseStatus !== 'parsed' || classification.recommendedOutput === 'none') {
      setGenerated(null);
      setSelectedOutputFileIndex(0);
      setDiagnostics(
        model.diagnostics.length > 0
          ? model.diagnostics
          : [
              {
                severity: 'error',
                code: 'generation-unavailable',
                message: classification.reasons.join(' '),
                sourceSpan: null,
              },
            ]
      );
      return;
    }

    const rendered = new RendererRegistry()
      .resolve('java:jpa-hibernate')
      ?.render(model, classification, options);
    setGenerated(rendered ?? null);
    setSelectedOutputFileIndex(0);
    setDiagnostics(rendered?.diagnostics ?? []);
  };

  const reset = () => {
    setSql(initialSql);
    setOptions(INITIAL_OPTIONS);
    setDiagnostics([]);
    setClassificationResult(null);
    setGenerated(null);
    setSelectedOutputFileIndex(0);
  };

  const copySource = async () => {
    if (!selectedOutputFile) return;
    try {
      await navigator.clipboard.writeText(selectedOutputFile.source);
      toast.success(t.generatorCopied, { duration: 2000 });
    } catch {
      toast.error(t.generatorCopyFailed, { duration: 3000 });
    }
  };

  const downloadSource = () => {
    if (!selectedOutputFile) return;
    const url = URL.createObjectURL(
      new Blob([selectedOutputFile.source], { type: 'text/x-java;charset=utf-8' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedOutputFile.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url);
    toast.success(t.generatorDownloaded, { duration: 2000 });
  };

  return (
    <section className="space-y-4">
      <GeneratorTargetControls
        options={options}
        onChange={(changes) => setOptions((current) => ({ ...current, ...changes }))}
        t={t}
      />
      <label className="flex flex-col gap-2 text-sm font-medium">
        {t.generatorSqlInput}
        <textarea
          aria-label={t.generatorSqlInput}
          value={sql}
          onChange={(event) => setSql(event.target.value)}
          spellCheck={false}
          className="min-h-72 w-full resize-y scrollbar-thin rounded border border-border bg-background p-3 font-mono text-sm text-foreground"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={generate}
          className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          {generated ? t.generatorRegenerate : t.generatorGenerate}
        </button>
        {generated && (
          <button
            type="button"
            onClick={reset}
            className="rounded border border-border px-4 py-2 text-sm font-medium text-foreground"
          >
            {t.generatorReset}
          </button>
        )}
      </div>
      {classificationResult && (
        <section
          aria-label={t.generatorClassification}
          className="space-y-1 rounded border border-border p-3"
        >
          <h2 className="text-sm font-semibold">{t.generatorClassification}</h2>
          <p className="text-sm">
            {t.generatorClassifiedAs}:{' '}
            {t[`generatorClass_${classificationResult.kind}`] ?? classificationResult.kind}
          </p>
          <p className="text-sm">
            {t.generatorRecommendedOutput}:{' '}
            {classificationResult.recommendedOutput === 'none'
              ? t.generatorNoOutput
              : classificationResult.recommendedOutput === 'entity'
                ? t.generatorEntity
                : t.generatorDto}
          </p>
          {classificationResult.requiresUserChoice && (
            <p className="text-sm">{t.generatorChoiceRequired}</p>
          )}
          <ul className="list-inside list-disc text-sm">
            {classificationResult.reasons.map((reason, index) => (
              <li key={`${index}-${reason}`}>{reason}</li>
            ))}
          </ul>
        </section>
      )}
      {generated?.source && (
        <section className="overflow-hidden rounded border border-border">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <h2 className="text-sm font-semibold">{t.generatorGeneratedCode}</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copySource}
                className="inline-flex items-center gap-2 rounded border border-border px-3 py-2 text-sm"
              >
                <Clipboard size={14} aria-hidden />
                {t.generatorCopy}
              </button>
              <button
                type="button"
                onClick={downloadSource}
                className="inline-flex items-center gap-2 rounded border border-border px-3 py-2 text-sm"
              >
                <Download size={14} aria-hidden />
                {t.generatorDownload}
              </button>
            </div>
          </div>
          {generatedFiles.length > 1 && (
            <div
              role="tablist"
              aria-label={t.generatorOutputFiles}
              className="flex gap-1 border-b border-border px-2 py-1"
            >
              {generatedFiles.map((file, index) => (
                <button
                  key={file.fileName}
                  type="button"
                  role="tab"
                  aria-selected={index === selectedOutputFileIndex}
                  onClick={() => setSelectedOutputFileIndex(index)}
                  className={`rounded px-3 py-1.5 text-sm ${index === selectedOutputFileIndex ? 'bg-muted font-semibold text-foreground' : 'text-muted-foreground hover:bg-muted/60'}`}
                >
                  {file.fileName}
                </button>
              ))}
            </div>
          )}
          <MonacoEditor
            height="360px"
            language="java"
            theme={theme === 'dark' ? 'vs-dark' : 'vs'}
            value={selectedOutputFile?.source ?? generated.source}
            options={{
              ariaLabel: t.generatorGeneratedCode,
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
            }}
          />
        </section>
      )}
      {diagnostics.length > 0 && (
        <section
          aria-label={t.generatorDiagnostics}
          className="space-y-2 rounded border border-border p-3"
        >
          <h2 className="text-sm font-semibold">{t.generatorDiagnostics}</h2>
          <ul className="list-inside list-disc space-y-1 text-sm">
            {diagnostics.map((item, index) => (
              <li key={`${item.code}-${index}`}>{item.message}</li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
