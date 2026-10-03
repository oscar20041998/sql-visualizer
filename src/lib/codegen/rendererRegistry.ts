import type { CodeRenderer } from './model';
import { renderDto, renderEntity } from './javaJpaRenderer';

export type RendererTarget =
  | 'java:jpa-hibernate'
  | 'csharp:ef-core'
  | 'python:sqlalchemy'
  | 'typescript:typeorm'
  | 'go:gorm'
  | 'kotlin:jpa';

const javaJpaRenderer: CodeRenderer = {
  render(model, classification, options) {
    if (classification.recommendedOutput === 'dto' && model.selectShape) {
      return renderDto(model, options);
    }
    if (classification.recommendedOutput !== 'entity' || model.tables.length !== 1) {
      return {
        source: '',
        fileName: '',
        className: null,
        outputType: null,
        diagnostics: [
          {
            severity: 'error',
            code: 'unsupported-render-shape',
            message: 'The Java/JPA Entity renderer requires one classified table definition.',
            sourceSpan: null,
          },
        ],
        assumptions: [],
      };
    }
    return renderEntity(model.tables[0], options);
  },
};

export class RendererRegistry {
  private readonly renderers = new Map<RendererTarget, CodeRenderer>([
    ['java:jpa-hibernate', javaJpaRenderer],
  ]);

  resolve(target: RendererTarget): CodeRenderer | null {
    return this.renderers.get(target) ?? null;
  }

  register(target: RendererTarget, renderer: CodeRenderer): void {
    this.renderers.set(target, renderer);
  }
}