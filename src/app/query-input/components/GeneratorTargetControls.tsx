'use client';

import type { CodeGenerationOptions } from '@/lib/codegen/model';

interface GeneratorTargetControlsProps {
  options: CodeGenerationOptions;
  onChange: (changes: Partial<CodeGenerationOptions>) => void;
  t: Record<string, string>;
}

export function GeneratorTargetControls({ options, onChange, t }: GeneratorTargetControlsProps) {
  const plannedTargets = [
    ['csharp:ef-core', t.generatorPlannedCsharp],
    ['python:sqlalchemy', t.generatorPlannedPython],
    ['typescript:typeorm', t.generatorPlannedTypescript],
    ['go:gorm', t.generatorPlannedGo],
    ['kotlin:jpa', t.generatorPlannedKotlin],
  ] as const;

  return (
    <fieldset className="grid grid-cols-1 gap-3 border-0 p-0 sm:grid-cols-2 lg:grid-cols-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        {t.generatorLanguage}
        <select
          aria-label={t.generatorLanguage}
          value="java"
          onChange={(event) => {
            if (event.target.value === 'java') onChange({ language: 'java' });
          }}
          className="select-control"
        >
          <option value="java">{t.generatorJavaJpa}</option>
          {plannedTargets.map(([value, label]) => (
            <option key={value} value={value} disabled>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        {t.generatorFramework}
        <select
          aria-label={t.generatorFramework}
          value={options.framework}
          onChange={() => onChange({ framework: 'jpa-hibernate' })}
          className="select-control"
        >
          <option value="jpa-hibernate">{t.generatorFrameworkJpa}</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        {t.generatorOutputType}
        <select
          aria-label={t.generatorOutputType}
          value={options.outputType}
          onChange={(event) =>
            onChange({ outputType: event.target.value as CodeGenerationOptions['outputType'] })
          }
          className="select-control"
        >
          <option value="auto">{t.generatorAuto}</option>
          <option value="entity">{t.generatorEntity}</option>
          <option value="dto">{t.generatorDto}</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        {t.generatorNamingStrategy}
        <select
          aria-label={t.generatorNamingStrategy}
          value={options.namingStrategy}
          onChange={(event) =>
            onChange({ namingStrategy: event.target.value as CodeGenerationOptions['namingStrategy'] })
          }
          className="select-control"
        >
          <option value="camelCase">{t.generatorNamingCamelCase}</option>
          <option value="pascalCase">{t.generatorNamingPascalCase}</option>
          <option value="preserve">{t.generatorNamingPreserve}</option>
        </select>
      </label>

      <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="checkbox-control"
          checked={options.useLombok}
          onChange={(event) => onChange({ useLombok: event.target.checked })}
        />
        {t.generatorLombok}
      </label>
      <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="checkbox-control"
          checked={options.includeRelationships}
          onChange={(event) => onChange({ includeRelationships: event.target.checked })}
        />
        {t.generatorRelationships}
      </label>
      <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="checkbox-control"
          checked={options.validationAnnotations}
          onChange={(event) => onChange({ validationAnnotations: event.target.checked })}
        />
        {t.generatorValidation}
      </label>
      <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="checkbox-control"
          checked={options.generateMyBatisMapper}
          onChange={(event) => onChange({ generateMyBatisMapper: event.target.checked })}
        />
        {t.generatorMyBatisMapper}
      </label>
    </fieldset>
  );
}