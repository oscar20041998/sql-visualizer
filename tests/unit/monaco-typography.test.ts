import { afterEach, expect, it, vi } from 'vitest';
import { prepareMonacoTypography } from '@/lib/monacoTypography';

afterEach(() => {
  document.documentElement.style.removeProperty('--font-mono');
});

it('resolves the editor font and remeasures after fonts finish loading', async () => {
  let finishLoading!: () => void;
  const ready = new Promise<void>((resolve) => {
    finishLoading = resolve;
  });
  const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts');
  Object.defineProperty(document, 'fonts', { configurable: true, value: { ready } });
  document.documentElement.style.setProperty('--font-mono', '"JetBrains Mono", monospace');
  const updateOptions = vi.fn();
  const remeasureFonts = vi.fn();

  try {
    prepareMonacoTypography({ updateOptions }, { editor: { remeasureFonts } });
    expect(updateOptions).toHaveBeenCalledWith({ fontFamily: '"JetBrains Mono", monospace' });
    expect(remeasureFonts).not.toHaveBeenCalled();
    finishLoading();
    await ready;
    expect(remeasureFonts).toHaveBeenCalledOnce();
  } finally {
    if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts);
    else Reflect.deleteProperty(document, 'fonts');
  }
});
