import { useEffect } from 'react';

/**
 * Draws any Mermaid diagram found inside a rendered documentation article.
 *
 * `marked` knows nothing about Mermaid: a ```mermaid fence comes out as an ordinary `<pre><code>`
 * block, which is exactly why the diagrams used to display as raw syntax. This tags those blocks so
 * Mermaid's own `run()` replaces them with generated SVG.
 *
 * The article HTML arrives via `dangerouslySetInnerHTML`, so the DOM is walked in an effect after
 * that insertion rather than by re-parsing the Markdown. Mermaid is imported dynamically, keeping
 * it out of the initial bundle — the documentation shell never needs it.
 */
export default function MermaidDiagramRenderer() {
  useEffect(() => {
    const root = document.querySelector('[data-documentation-article]');
    if (!root) return;

    // `marked` emits `<pre><code class="language-mermaid">`; Mermaid's `run()` looks for the
    // `mermaid` class, so the code element is tagged. The source stays as textContent until then.
    const blocks = Array.from(root.querySelectorAll<HTMLElement>('code.language-mermaid'));
    if (blocks.length === 0) return;

    for (const block of blocks) block.classList.add('mermaid');

    let cancelled = false;

    void (async () => {
      const { default: mermaid } = await import('mermaid');
      if (cancelled) return;

      mermaid.initialize({
        startOnLoad: false,
        // Match the documentation theme rather than Mermaid's default blue-on-white.
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'neutral',
        // The diagram source is repo-controlled Markdown, not user input.
        securityLevel: 'strict',
      });

      try {
        await mermaid.run({ nodes: blocks as unknown as HTMLElement[] });
      } catch (error) {
        // Mermaid leaves unparseable blocks as their original text and reports the failure, so a
        // bad diagram degrades to readable source instead of blanking the page.
        console.error('[documentation] Mermaid diagram failed to render:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
