import { beforeEach, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import GuidelineContent from '@/app/guideline/components/GuidelineContent';
import ScoreWeightTable from '@/components/ui/ScoreWeightTable';
import { DEFAULT_SETTINGS, useAppStore } from '@/lib/store';
import {
  GUIDELINE_ACCENTS_DARK,
  GUIDELINE_ACCENTS_LIGHT,
  getGuidelineAccent,
} from '@/app/common/colorConstant';
import { resetTestStorage } from '../utils/test-setup';

/**
 * The guideline page paints section icons, quick-nav pills, sidebar shortcut tiles and the score
 * table's category headers from a hardcoded neon palette. Those shades were tuned for the dark
 * `--card` surface; in light mode the same values are used as *text* on white, so they glare and
 * fall well under the contrast floor. The accents must therefore follow the active theme.
 */

/** The light-mode card surface the accents are painted on (`--card` under `.light`). */
const LIGHT_CARD = '#ffffff';

function parseColor(value: string): [number, number, number] {
  const hex = value.trim().replace('#', '');
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (raw: number) => {
    const c = raw / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(parseColor(foreground));
  const b = relativeLuminance(parseColor(background));
  const [lighter, darker] = a > b ? [a, b] : [b, a];
  return (lighter + 0.05) / (darker + 0.05);
}

/** Every colour the component tree paints inline, normalised back to `#rrggbb`. */
function inlineColors(container: HTMLElement): string[] {
  const colors: string[] = [];
  container.querySelectorAll<HTMLElement>('[style]').forEach((el) => {
    for (const value of Array.from(el.style)) {
      const raw = el.style.getPropertyValue(value).trim().toLowerCase();
      // jsdom normalises inline hex to `rgb()` (and collapses alpha), so accept both notations.
      if (raw.startsWith('#')) {
        colors.push(raw.length === 7 ? raw : toHex(parseColor(raw)));
        continue;
      }
      const rgb = raw.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
      if (rgb) colors.push(toHex([Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]));
    }
  });
  return colors;
}

beforeEach(() => {
  resetTestStorage();
  useAppStore.setState({ settings: { ...DEFAULT_SETTINGS } });
});

describe('guideline accents follow the active theme', () => {
  it('resolves the dark neon shades only in dark mode', () => {
    for (const [name, dark] of Object.entries(GUIDELINE_ACCENTS_DARK)) {
      expect(getGuidelineAccent(name as keyof typeof GUIDELINE_ACCENTS_DARK, 'dark')).toBe(dark);
      expect(getGuidelineAccent(name as keyof typeof GUIDELINE_ACCENTS_DARK, 'light')).not.toBe(
        dark
      );
    }
  });

  it('paints the dark palette when the dark theme is active', () => {
    useAppStore.setState({ settings: { ...DEFAULT_SETTINGS, theme: 'dark' } });
    const { container } = render(<GuidelineContent />);

    const colors = inlineColors(container);
    expect(colors).toContain(GUIDELINE_ACCENTS_DARK.cyan);
    expect(colors).toContain(GUIDELINE_ACCENTS_DARK.violet);
  });

  it('never paints a dark neon shade as a colour in light mode', () => {
    useAppStore.setState({ settings: { ...DEFAULT_SETTINGS, theme: 'light' } });
    const { container } = render(<GuidelineContent />);

    const leaked = Object.values(GUIDELINE_ACCENTS_DARK).filter((dark) =>
      inlineColors(container).includes(dark)
    );
    expect(leaked).toEqual([]);
  });

  it('renders the score table category headers with light-mode accents in light mode', () => {
    useAppStore.setState({ settings: { ...DEFAULT_SETTINGS, theme: 'light' } });
    const { container } = render(<ScoreWeightTable />);

    const colors = inlineColors(container);
    expect(colors).toContain(GUIDELINE_ACCENTS_LIGHT.cyan);
    expect(colors).not.toContain(GUIDELINE_ACCENTS_DARK.cyan);
  });

  it('keeps every light accent readable on the light card surface', () => {
    for (const [name, light] of Object.entries(GUIDELINE_ACCENTS_LIGHT)) {
      // These accents are used for 12px bold labels, so the AA 4.5:1 text floor applies.
      expect(
        contrastRatio(light, LIGHT_CARD),
        `${name} (${light}) is not readable on the light card surface`
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});
