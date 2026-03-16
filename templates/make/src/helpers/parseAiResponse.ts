/* ------------------------------------------------------------------ */
/*  Streaming AI response parser                                       */
/* ------------------------------------------------------------------ */

export interface GeneratedFile {
  fileName: string;
  code: string;
}

export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  content?: string;
}

/* ------------------------------------------------------------------ */
/*  Simple markdown → HTML conversion for chat messages                 */
/* ------------------------------------------------------------------ */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Converts basic markdown to HTML for chat display.
 * IMPORTANT: escapeHtml MUST run first — the output is used with dangerouslySetInnerHTML.
 */
export function renderMarkdown(text: string): string {
  return escapeHtml(text)
    // Code blocks (```...```)
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // Inline code (`...`)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold (**...**)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic (*...*)
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    // Line breaks
    .replace(/\n/g, '<br/>');
}

/* ------------------------------------------------------------------ */
/*  StreamingActionParser                                               */
/* ------------------------------------------------------------------ */

export interface ParserCallbacks {
  onText: (text: string) => void;
  onReasoning: (content: string) => void;
  onReasoningDelta: (delta: string) => void;
  onTodo: (tasks: string[]) => void;
  onWriteFileStart: (fileName: string) => void;
  onWriteFileDelta: (fileName: string, code: string) => void;
  onWriteFileEnd: (fileName: string, code: string) => void;
  onViewFile: (fileName: string) => void;
}

const ACTION_OPEN_RE = /<action\s+([^>]*?)(?:\/>|>)/;
const ACTION_CLOSE_RE = /<\/action>/;

type ParserState =
  | { mode: 'text' }
  | { mode: 'reasoning'; content: string }
  | { mode: 'write-file'; fileName: string; code: string };

export class StreamingActionParser {
  private buffer = '';
  private state: ParserState = { mode: 'text' };
  private pendingText = '';
  private callbacks: ParserCallbacks;

  constructor(callbacks: ParserCallbacks) {
    this.callbacks = callbacks;
  }

  feed(delta: string): void {
    this.buffer += delta;
    this.process();
  }

  flush(): void {
    if (this.pendingText.trim()) {
      this.callbacks.onText(this.pendingText.trim());
      this.pendingText = '';
    }
    if (this.state.mode === 'reasoning') {
      this.callbacks.onReasoning(this.state.content);
      this.state = { mode: 'text' };
    } else if (this.state.mode === 'write-file') {
      this.callbacks.onWriteFileEnd(this.state.fileName, this.state.code);
      this.state = { mode: 'text' };
    }
  }

  private process(): void {
    // Keep processing as long as we find actionable content
    let safety = 0;
    while (safety < 1000) {
      safety += 1;

      if (this.state.mode === 'text') {
        // Look for an <action tag
        const match = ACTION_OPEN_RE.exec(this.buffer);
        if (!match) {
          // No action tag found yet — accumulate as pending text
          // But keep a small tail in case a partial <action is forming
          const ltIdx = this.buffer.lastIndexOf('<');
          if (ltIdx >= 0 && ltIdx > this.buffer.length - 50) {
            // Possible partial tag — emit text before it, keep the rest
            const safe = this.buffer.slice(0, ltIdx);
            if (safe.trim()) {
              this.pendingText += safe;
            }
            this.buffer = this.buffer.slice(ltIdx);
          } else {
            if (this.buffer.trim()) {
              this.pendingText += this.buffer;
            }
            this.buffer = '';
          }
          return;
        }

        // Emit any text before the action
        const textBefore = this.buffer.slice(0, match.index);
        if (textBefore.trim()) {
          this.pendingText += textBefore;
          this.callbacks.onText(this.pendingText.trim());
          this.pendingText = '';
        } else if (this.pendingText.trim()) {
          this.callbacks.onText(this.pendingText.trim());
          this.pendingText = '';
        }

        const fullTag = match[0];
        const isSelfClosing = fullTag.endsWith('/>');
        this.buffer = this.buffer.slice(match.index + fullTag.length);

        // Parse attributes from the full tag (more robust than just match[1])
        const attrs = this.parseAttrs(fullTag);
        const actionType = attrs.type;

        if (actionType === 'todo') {
          // Try parseAttrs first, then fallback regex on the raw tag
          let tasksStr = attrs.tasks;
          if (!tasksStr) {
            // Fallback: extract JSON array directly from the tag string
            const fallback = /tasks\s*=\s*['"](\[[\s\S]*?\])['"]/.exec(fullTag);
            if (fallback) {
              tasksStr = fallback[1];
            }
          }
          if (tasksStr) {
            try {
              const tasks = JSON.parse(tasksStr) as string[];
              this.callbacks.onTodo(tasks);
            } catch {
              // Skip malformed todo
            }
          }
          // If this wasn't self-closing, consume up to </action>
          if (!isSelfClosing) {
            const closeMatch = ACTION_CLOSE_RE.exec(this.buffer);
            if (closeMatch) {
              this.buffer = this.buffer.slice(closeMatch.index + closeMatch[0].length);
            }
          }
          continue;
        }

        if (actionType === 'view-file' && isSelfClosing) {
          this.callbacks.onViewFile(attrs.fileName || attrs.filename || 'unknown');
          continue;
        }

        if (actionType === 'reasoning' && !isSelfClosing) {
          this.state = { mode: 'reasoning', content: '' };
          continue;
        }

        if (actionType === 'write-file' && !isSelfClosing) {
          const fileName = attrs.fileName || attrs.filename || 'file.txt';
          this.state = { mode: 'write-file', fileName, code: '' };
          this.callbacks.onWriteFileStart(fileName);
          continue;
        }

        // Unknown action type — skip
        continue;
      }

      if (this.state.mode === 'reasoning') {
        const closeMatch = ACTION_CLOSE_RE.exec(this.buffer);
        if (!closeMatch) {
          // Accumulate content
          const ltIdx = this.buffer.lastIndexOf('<');
          if (ltIdx >= 0 && ltIdx > this.buffer.length - 15) {
            this.state.content += this.buffer.slice(0, ltIdx);
            this.callbacks.onReasoningDelta(this.buffer.slice(0, ltIdx));
            this.buffer = this.buffer.slice(ltIdx);
          } else {
            this.state.content += this.buffer;
            this.callbacks.onReasoningDelta(this.buffer);
            this.buffer = '';
          }
          return;
        }
        this.state.content += this.buffer.slice(0, closeMatch.index);
        this.callbacks.onReasoning(this.state.content.trim());
        this.buffer = this.buffer.slice(closeMatch.index + closeMatch[0].length);
        this.state = { mode: 'text' };
        continue;
      }

      if (this.state.mode === 'write-file') {
        const closeMatch = ACTION_CLOSE_RE.exec(this.buffer);
        if (!closeMatch) {
          // Accumulate code and emit delta
          const ltIdx = this.buffer.lastIndexOf('<');
          if (ltIdx >= 0 && ltIdx > this.buffer.length - 15) {
            this.state.code += this.buffer.slice(0, ltIdx);
            this.callbacks.onWriteFileDelta(this.state.fileName, this.state.code);
            this.buffer = this.buffer.slice(ltIdx);
          } else {
            this.state.code += this.buffer;
            this.callbacks.onWriteFileDelta(this.state.fileName, this.state.code);
            this.buffer = '';
          }
          return;
        }
        this.state.code += this.buffer.slice(0, closeMatch.index);
        const finalCode = this.state.code.trim();
        this.callbacks.onWriteFileEnd(this.state.fileName, finalCode);
        this.buffer = this.buffer.slice(closeMatch.index + closeMatch[0].length);
        this.state = { mode: 'text' };
        continue;
      }

      return;
    }
  }

  /**
   * Robust attribute parser that handles nested quotes in attribute values.
   * For tasks='["a", "b"]', the outer quotes are single and inner are double.
   * For tasks="[&quot;a&quot;]" or similar edge cases.
   */
  private parseAttrs(tag: string): Record<string, string> {
    const result: Record<string, string> = {};

    // Strategy: find key= then determine quote type, then find matching close quote
    // that isn't inside a JSON structure
    const attrStart = tag.indexOf(' ');
    if (attrStart < 0) return result;

    let pos = attrStart;
    const str = tag.replace(/\/?>$/, ''); // strip closing

    while (pos < str.length) {
      // Skip whitespace
      while (pos < str.length && /\s/.test(str[pos])) pos++;
      if (pos >= str.length) break;

      // Read key
      const keyStart = pos;
      while (pos < str.length && str[pos] !== '=' && !/\s/.test(str[pos])) pos++;
      const key = str.slice(keyStart, pos);
      if (!key) break;

      // Skip = and whitespace
      while (pos < str.length && (str[pos] === '=' || /\s/.test(str[pos]))) pos++;
      if (pos >= str.length) break;

      // Read value
      const quote = str[pos];
      if (quote !== '"' && quote !== "'") {
        // Unquoted value — read until whitespace
        const valStart = pos;
        while (pos < str.length && !/\s/.test(str[pos])) pos++;
        result[key] = str.slice(valStart, pos);
        continue;
      }

      // Quoted value — find the matching close quote
      // For JSON-containing attributes, we need to track bracket depth
      pos++; // skip opening quote
      let depth = 0;
      const valStart = pos;
      while (pos < str.length) {
        const ch = str[pos];
        if (ch === '[') depth++;
        else if (ch === ']') depth--;
        else if (ch === quote && depth === 0) break;
        pos++;
      }
      result[key] = str.slice(valStart, pos);
      pos++; // skip closing quote
    }

    return result;
  }
}

/* ------------------------------------------------------------------ */
/*  Post-processing utilities                                          */
/* ------------------------------------------------------------------ */

export function parseGeneratedFiles(response: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const re = /<action\s+type=["']write-file["']\s+fileName=["']([^"']+)["'][^>]*>([\s\S]*?)<\/action>/g;
  let m = re.exec(response);
  while (m !== null) {
    files.push({ fileName: m[1], code: m[2].trim() });
    m = re.exec(response);
  }
  return files;
}

export function buildFileTree(files: GeneratedFile[]): FileNode[] {
  const root: FileNode[] = [];

  for (const file of files) {
    const parts = file.fileName.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isFile = i === parts.length - 1;

      if (isFile) {
        current.push({
          name,
          type: 'file',
          content: file.code,
        });
      } else {
        let folder = current.find((n) => n.name === name && n.type === 'folder');
        if (!folder) {
          folder = { name, type: 'folder', children: [] };
          current.push(folder);
        }
        current = folder.children!;
      }
    }
  }

  return root;
}

export function getPreviewHtml(files: GeneratedFile[]): string | null {
  const preview = files.find((f) => f.fileName === 'preview.html');
  return preview?.code ?? null;
}
