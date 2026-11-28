export function conditionPreview(condition: string | undefined, limit = 40): string {
  if (!condition) return '';
  if (condition.length <= limit) return condition;
  return `${condition.slice(0, limit)}...`;
}

export function formatEndpoint(name: string, alias?: string): string {
  return alias ? `${name} (${alias})` : name;
}

export function themeBackground(theme: 'light' | 'dark'): string {
  return theme === 'light' ? '#f8fafc' : '#0f172a';
}

export const GRAPH_IMAGE_FILENAME = 'relationship-graph.png';
const PADDING = 80;
const MAX_DIMENSION = 16384;
const MAX_AREA = 64 * 1024 * 1024;

export async function exportGraphImage(
  viewport: HTMLElement | null,
  zoom: number,
  theme: 'light' | 'dark'
): Promise<Blob> {
  if (!viewport || !Number.isFinite(zoom) || zoom <= 0) {
    throw new Error('Graph viewport is not ready');
  }

  const nodes = viewport.querySelectorAll('.react-flow__node');
  if (!nodes.length) throw new Error('Graph has no visible nodes');

  const origin = viewport.getBoundingClientRect();
  const elements = viewport.querySelectorAll(
    '.react-flow__node, .react-flow__edge-path, .react-flow__edgelabel-renderer > div'
  );
  const bounds = Array.from(elements, (element) => element.getBoundingClientRect()).reduce(
    (result, rect) => ({
      left: Math.min(result.left, (rect.left - origin.left) / zoom),
      top: Math.min(result.top, (rect.top - origin.top) / zoom),
      right: Math.max(result.right, (rect.right - origin.left) / zoom),
      bottom: Math.max(result.bottom, (rect.bottom - origin.top) / zoom),
    }),
    { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }
  );
  const width = Math.ceil(bounds.right - bounds.left + PADDING * 2);
  const height = Math.ceil(bounds.bottom - bounds.top + PADDING * 2);
  if (
    !Number.isFinite(width) || !Number.isFinite(height) ||
    width <= PADDING * 2 || height <= PADDING * 2 ||
    width > MAX_DIMENSION || height > MAX_DIMENSION || width * height > MAX_AREA
  ) {
    throw new Error('Graph is too large or has invalid dimensions for PNG export');
  }

  const blob = await toBlob(viewport, {
    width,
    height,
    pixelRatio: 1,
    skipAutoScale: true,
    backgroundColor: themeBackground(theme),
    fontEmbedCSS: '',
    style: {
      transform: `translate(${PADDING - bounds.left}px, ${PADDING - bounds.top}px) scale(1)`,
      transformOrigin: '0 0',
    },
  });
  if (!blob || blob.type !== 'image/png' || blob.size === 0) {
    throw new Error('PNG rendering failed');
  }
  return blob;
}
import { toBlob } from 'html-to-image';

