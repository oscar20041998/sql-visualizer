import React from 'react';

const CODE_FENCE_RE = /```(\w+)?\n?([\s\S]*?)```/g;

function renderInlineMarkdown(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const markdownToken = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = markdownToken.exec(text))) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const token = match[0];
    const tokenKey = `${keyPrefix}-${key++}`;
    if (token.startsWith('**')) {
      parts.push(
        <strong key={tokenKey} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`')) {
      parts.push(
        <code
          key={tokenKey}
          className="rounded bg-background/70 px-1 py-0.5 font-mono text-[0.85em] text-primary"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else {
      parts.push(<em key={tokenKey}>{token.slice(1, -1)}</em>);
    }
    lastIndex = markdownToken.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function MarkdownText({ content }: { content: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed text-foreground">
      {content.split('\n').map((line, index) => {
        const heading = /^(#{1,6})\s+(.+)$/.exec(line);
        if (heading) {
          const headingClass =
            heading[1].length === 1 ? 'text-base' : heading[1].length === 2 ? 'text-sm' : 'text-xs';
          return (
            <p key={index} className={`${headingClass} font-semibold text-primary`}>
              {renderInlineMarkdown(heading[2], `heading-${index}`)}
            </p>
          );
        }
        return line ? (
          <p key={index}>{renderInlineMarkdown(line, `line-${index}`)}</p>
        ) : (
          <div key={index} className="h-1" />
        );
      })}
    </div>
  );
}

export function AiMessageContent({ content }: { content: string }) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  CODE_FENCE_RE.lastIndex = 0;

  while ((match = CODE_FENCE_RE.exec(content))) {
    if (match.index > lastIndex) {
      parts.push(
        <div key={key++}>
          <MarkdownText content={content.slice(lastIndex, match.index)} />
        </div>
      );
    }
    parts.push(
      <pre
        key={key++}
        className="overflow-x-auto rounded-lg border border-border bg-background/60 p-3 text-xs font-mono leading-relaxed text-foreground scrollbar-thin"
      >
        <code>{match[2]}</code>
      </pre>
    );
    lastIndex = CODE_FENCE_RE.lastIndex;
  }
  if (lastIndex < content.length) {
    parts.push(<MarkdownText key={key++} content={content.slice(lastIndex)} />);
  }
  return <div className="space-y-2">{parts}</div>;
}
