import { forwardRef, Fragment, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import clsx from 'clsx';

export type SyntaxLanguage = 'jsx' | 'css' | 'json' | 'plain';

export interface PreProps extends Omit<ComponentPropsWithoutRef<'pre'>, 'children'> {
  children: ReactNode;
  syntax?: SyntaxLanguage;
  lineNumbers?: boolean;
}

type Token = { text: string; className?: string };

function tokenizeJsx(code: string): Token[] {
  const tokens: Token[] = [];
  // Alternation groups (order matters — first match wins):
  //   1. Line comments:   //...
  //   2. Block comments:  /*...*/
  //   3. Double-quoted strings
  //   4. Single-quoted strings
  //   5. Template literals
  //   6. Keywords (function, const, return, etc.)
  //   7. JSX opening/closing tags: <Component or </div
  //   8. JSX tag closers: /> or >
  //   9. Numeric literals
  const comments = /\/\/.*$|\/\*[\s\S]*?\*\//;
  const strings = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/;
  const keywords =
    /\b(?:function|const|let|var|return|import|export|from|default|if|else|for|while|switch|case|break|continue|new|typeof|instanceof|in|of|class|extends|async|await|try|catch|finally|throw|yield|void|delete|null|undefined|true|false)\b/;
  const jsxTags = /<\/?[A-Za-z][A-Za-z0-9.]*/;
  const jsxClose = /\/?>/;
  const numbers = /\b\d+(?:\.\d+)?\b/;
  const regex = new RegExp(
    `(${comments.source}|${strings.source}|${keywords.source}|${jsxTags.source}|${jsxClose.source}|${numbers.source})`,
    'gm',
  );
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: code.slice(lastIndex, match.index) });
    }
    const m = match[0];
    let className: string | undefined;
    if (m.startsWith('//') || m.startsWith('/*')) {
      className = 'text-text-tertiary';
    } else if (m.startsWith('"') || m.startsWith("'") || m.startsWith('`')) {
      className = 'text-text-success';
    } else if (m.startsWith('<') || m === '/>' || m === '>') {
      className = 'text-text-brand';
    } else if (/^\d/.test(m)) {
      className = 'text-text-warning';
    } else if (
      /^(?:function|const|let|var|return|import|export|from|default|if|else|for|while|switch|case|break|continue|new|typeof|instanceof|in|of|class|extends|async|await|try|catch|finally|throw|yield|void|delete|null|undefined|true|false)$/.test(
        m,
      )
    ) {
      className = 'text-text-component';
    }
    tokens.push({ text: m, className });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < code.length) {
    tokens.push({ text: code.slice(lastIndex) });
  }
  return tokens;
}

function tokenizeCss(code: string): Token[] {
  const tokens: Token[] = [];
  const regex =
    /(\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[a-zA-Z-]+(?=\s*:)|:\s*[^;{}]+|[.#]?[a-zA-Z_][\w-]*(?=\s*[{,])|\b\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|s|ms)?\b)/gm;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: code.slice(lastIndex, match.index) });
    }
    const m = match[0];
    let className: string | undefined;
    if (m.startsWith('/*')) {
      className = 'text-text-tertiary';
    } else if (m.startsWith('"') || m.startsWith("'")) {
      className = 'text-text-success';
    } else if (m.startsWith(':')) {
      className = 'text-text-success';
    } else if (/^[.#]/.test(m)) {
      className = 'text-text-component';
    } else if (/^[a-zA-Z-]+$/.test(m)) {
      className = 'text-text-brand';
    }
    tokens.push({ text: m, className });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < code.length) {
    tokens.push({ text: code.slice(lastIndex) });
  }
  return tokens;
}

function tokenizeJson(code: string): Token[] {
  const tokens: Token[] = [];
  const regex =
    /("(?:[^"\\]|\\.)*")\s*(?=:)|("(?:[^"\\]|\\.)*")|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: code.slice(lastIndex, match.index) });
    }
    const m = match[0];
    if (match[1]) {
      // Key (string before colon)
      tokens.push({ text: match[1], className: 'text-text-brand' });
    } else if (match[2]) {
      // String value
      tokens.push({ text: match[2], className: 'text-text-success' });
    } else if (match[3]) {
      // true, false, null
      tokens.push({ text: m, className: 'text-text-warning' });
    } else if (match[4]) {
      // Number
      tokens.push({ text: m, className: 'text-text-warning' });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < code.length) {
    tokens.push({ text: code.slice(lastIndex) });
  }
  return tokens;
}

function tokenize(code: string, syntax: SyntaxLanguage): Token[] {
  if (syntax === 'plain') return [{ text: code }];

  const tokenizers: Record<string, (code: string) => Token[]> = {
    jsx: tokenizeJsx,
    css: tokenizeCss,
    json: tokenizeJson,
  };

  return (tokenizers[syntax] ?? (() => [{ text: code }]))(code);
}

export const Pre = forwardRef<HTMLPreElement, PreProps>(function Pre(
  { syntax = 'plain', lineNumbers = false, children, className, ...rest },
  ref,
) {
  const highlighted =
    syntax !== 'plain' && typeof children === 'string'
      ? tokenize(children, syntax).map((token, i) =>
          token.className ? (
            <span key={i} className={token.className}>
              {token.text}
            </span>
          ) : (
            token.text
          ),
        )
      : children;

  if (!lineNumbers) {
    return (
      <pre
        ref={ref}
        className={clsx(
          'bg-bg-secondary rounded-lg p-3 overflow-x-auto text-codeSm leading-relaxed',
          className,
        )}
        {...rest}
      >
        <code>{highlighted}</code>
      </pre>
    );
  }

  // Line numbers require string children to split into lines
  if (typeof children !== 'string') {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Pre: lineNumbers requires string children. Received non-string; falling back to unnumbered display.');
    }
    return (
      <pre
        ref={ref}
        className={clsx(
          'bg-bg-secondary rounded-lg p-3 overflow-x-auto text-codeSm leading-relaxed',
          className,
        )}
        {...rest}
      >
        <code>{highlighted}</code>
      </pre>
    );
  }

  // Split into lines for the numbered layout
  const lines = children.split('\n');
  const gutterWidth = String(lines.length).length;

  // Tokenize each line individually so gutter and code stay aligned
  const tokenizedLines =
    syntax !== 'plain'
      ? lines.map((line) => tokenize(line, syntax))
      : lines.map((line) => [{ text: line }] as Token[]);

  return (
    <pre
      ref={ref}
      className={clsx(
        'bg-bg-secondary rounded-lg p-3 overflow-x-auto text-codeSm leading-relaxed',
        className,
      )}
      {...rest}
    >
      <code
        className="grid"
        style={{ gridTemplateColumns: 'auto 1fr' }}
      >
        {tokenizedLines.map((tokens, lineIdx) => (
          <Fragment key={lineIdx}>
            <span
              className="select-none text-text-tertiary text-right pr-3 mr-3 border-r border-border"
              style={{ minWidth: `${gutterWidth + 1}ch` }}
            >
              {lineIdx + 1}
            </span>
            <span>
              {tokens.map((token, ti) =>
                token.className ? (
                  <span key={ti} className={token.className}>
                    {token.text}
                  </span>
                ) : (
                  token.text
                ),
              )}
            </span>
          </Fragment>
        ))}
      </code>
    </pre>
  );
});
