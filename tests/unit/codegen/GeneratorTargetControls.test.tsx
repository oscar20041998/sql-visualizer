import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CodeGenerationOptions } from '@/lib/codegen/model';
import { GeneratorTargetControls } from '@/app/query-input/components/GeneratorTargetControls';

const labels: Record<string, string> = {
  generatorLanguage: 'Language',
  generatorFramework: 'Framework',
  generatorOutputType: 'Output type',
  generatorNamingStrategy: 'Naming strategy',
  generatorLombok: 'Use Lombok',
  generatorMyBatisMapper: 'Generate MyBatis @Mapper interface',
  generatorRelationships: 'Include relationships',
  generatorValidation: 'Validation annotations',
  generatorAuto: 'Auto',
  generatorEntity: 'Entity',
  generatorDto: 'DTO / Projection',
  generatorJavaJpa: 'Java / JPA',
  generatorPlannedCsharp: 'C# / EF Core (planned)',
  generatorPlannedPython: 'Python / SQLAlchemy (planned)',
  generatorPlannedTypescript: 'TypeScript / TypeORM (planned)',
  generatorPlannedGo: 'Go / GORM (planned)',
  generatorPlannedKotlin: 'Kotlin / JPA (planned)',
  generatorNamingCamelCase: 'camelCase',
  generatorNamingPascalCase: 'PascalCase',
  generatorNamingPreserve: 'Preserve SQL names',
};

const initialOptions: CodeGenerationOptions = {
  language: 'java',
  framework: 'jpa-hibernate',
  outputType: 'auto',
  namingStrategy: 'camelCase',
  includeRelationships: true,
  useLombok: false,
  validationAnnotations: false,
  generateMyBatisMapper: false,
};

describe('GeneratorTargetControls', () => {
  it('exposes generation options and planned targets', () => {
    const onChange = vi.fn();
    render(
      <GeneratorTargetControls options={initialOptions} onChange={onChange} t={labels} />
    );

    expect(screen.getByRole('combobox', { name: 'Language' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'C# / EF Core (planned)' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Framework' })).toHaveValue('jpa-hibernate');
    expect(screen.getByRole('combobox', { name: 'Output type' })).toHaveValue('auto');

    fireEvent.change(screen.getByRole('combobox', { name: 'Naming strategy' }), {
      target: { value: 'pascalCase' },
    });
    expect(onChange).toHaveBeenCalledWith({ namingStrategy: 'pascalCase' });

    fireEvent.change(screen.getByRole('combobox', { name: 'Output type' }), {
      target: { value: 'dto' },
    });
    expect(onChange).toHaveBeenCalledWith({ outputType: 'dto' });

    fireEvent.click(screen.getByRole('checkbox', { name: 'Use Lombok' }));
    expect(onChange).toHaveBeenCalledWith({ useLombok: true });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include relationships' }));
    expect(onChange).toHaveBeenCalledWith({ includeRelationships: false });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Validation annotations' }));
    expect(onChange).toHaveBeenCalledWith({ validationAnnotations: true });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Generate MyBatis @Mapper interface' }));
    expect(onChange).toHaveBeenCalledWith({ generateMyBatisMapper: true });
  });
});
