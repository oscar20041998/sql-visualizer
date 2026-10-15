export function conditionPreview(condition: string | undefined, limit = 40): string {
  if (!condition) return '';
  if (condition.length <= limit) return condition;
  return `${condition.slice(0, limit)}...`;
}

export function formatEndpoint(name: string, alias?: string): string {
  return alias ? `${name} (${alias})` : name;
}

export function themeBackground(theme: 'light' | 'dark'): string {
  return theme === 'light' ? '#f8fafc' : '#1a1f2e';
}

export interface ImageExportResult {
  ok: boolean;
  markup?: string;
  filename: string;
  messageKey?: 'graphImageExportFailed';
}

export function prepareImageExport(
  svgMarkup: string | null,
  theme: 'light' | 'dark',
  visibleIds: string[]
): ImageExportResult {
  if (!svgMarkup || !svgMarkup.includes('<svg')) {
    return {
      ok: false,
      filename: 'relationship-graph.svg',
      messageKey: 'graphImageExportFailed',
    };
  }

  const background = themeBackground(theme);
  const stamped = svgMarkup.includes('data-visible-ids')
    ? svgMarkup
    : svgMarkup.replace('<svg', `<svg data-visible-ids="${visibleIds.join(',')}"`);
  const withBackground = stamped.includes('data-export-background')
    ? stamped
    : stamped.replace(
        '>',
        `><rect data-export-background="true" width="100%" height="100%" fill="${background}"/>`
      );

  return {
    ok: true,
    markup: withBackground,
    filename: 'relationship-graph.svg',
  };
}
