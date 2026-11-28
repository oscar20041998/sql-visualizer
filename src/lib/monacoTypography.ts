/** Shared editor settings; the font stack is defined with the other typography tokens. */
export const monacoTypography = {
  fontFamily: 'var(--font-mono)',
  fontSize: 14,
  lineHeight: 22,
  fontLigatures: false,
};

export function prepareMonacoTypography(
  editor: { updateOptions: (options: { fontFamily: string }) => void },
  monaco: { editor: { remeasureFonts: () => void } }
) {
  // Monaco also uses canvas for its minimap, where CSS variables cannot be resolved.
  const fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim();
  if (fontFamily) editor.updateOptions({ fontFamily });
  void document.fonts.ready.then(() => monaco.editor.remeasureFonts());
}
