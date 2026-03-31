/* ------------------------------------------------------------------ */
/*  Streaming scene graph action parser                                */
/* ------------------------------------------------------------------ */

/** Fields that must be arrays on scene nodes. */
const ARRAY_FIELDS = new Set(['fills', 'strokes', 'effects', 'children', 'strokeDashPattern', 'paths']);

/** Fields whose values should be numeric node IDs (not strings). */
const NODE_ID_FIELDS = new Set(['nodeId', 'pointIndex']);

/**
 * Recursively coerce nodeId/pointIndex string values to numbers inside objects.
 * Needed because the AI sends string IDs but the scene graph expects numbers.
 */
function coerceNodeIds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(coerceNodeIds);
  if (typeof value === 'object' && value !== null) {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (NODE_ID_FIELDS.has(k) && typeof v === 'string') {
        const num = Number(v);
        result[k] = Number.isNaN(num) ? v : num;
      } else {
        result[k] = coerceNodeIds(v);
      }
    }
    return result;
  }
  return value;
}

/**
 * Sanitize AI-generated node props to prevent runtime errors.
 * Ensures array fields are arrays, coerces nested nodeId strings to numbers,
 * and strips undefined values.
 */
export function sanitizeProps(props: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue;
    if (ARRAY_FIELDS.has(key) && !Array.isArray(value)) {
      result[key] = typeof value === 'object' ? [value] : [];
    } else {
      result[key] = coerceNodeIds(value) as unknown;
    }
  }
  return result;
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
/*  SceneGraphActionParser                                              */
/* ------------------------------------------------------------------ */

export interface SceneGraphParserCallbacks {
  onText: (text: string) => void;
  /** Called with accumulated pending text on each feed(), enabling progressive UI updates. */
  onTextDelta?: (pendingText: string) => void;
  onReasoning: (content: string) => void;
  onReasoningDelta: (delta: string) => void;
  onCreateNode: (nodeType: string, parentId: string, props: Record<string, unknown>) => string;
  onUpdateNode: (nodeId: string, updates: Record<string, unknown>) => void;
  onDeleteNode: (nodeId: string) => void;
  onReparentNode: (nodeId: string, newParentId: string, index: number) => void;
  /** Duplicate a node and its entire subtree. Returns new top-level node IDs and an old→new ID mapping for all cloned descendants. */
  onDuplicateNode?: (nodeId: string) => { newIds: string[]; idMap: Map<string, string> };
}

const ACTION_OPEN_RE = /<action\s+([^>]*?)(?:\/>|>)/;
const ACTION_CLOSE_RE = /<\/action>/;

type ParserState =
  | { mode: 'text' }
  | { mode: 'reasoning'; content: string };

export class SceneGraphActionParser {
  private buffer = '';
  private state: ParserState = { mode: 'text' };
  private pendingText = '';
  private callbacks: SceneGraphParserCallbacks;
  private aliasMap: Map<string, string> = new Map();

  constructor(callbacks: SceneGraphParserCallbacks) {
    this.callbacks = callbacks;
  }

  feed(delta: string): void {
    this.buffer += delta;
    this.process();
    // Emit pending text delta for progressive UI updates
    if (this.pendingText.trim() && this.callbacks.onTextDelta) {
      this.callbacks.onTextDelta(this.pendingText);
    }
  }

  flush(): void {
    if (this.pendingText.trim()) {
      this.callbacks.onText(this.pendingText.trim());
      this.pendingText = '';
    }
    if (this.state.mode === 'reasoning') {
      this.callbacks.onReasoning(this.state.content);
      this.state = { mode: 'text' };
    }
  }

  /**
   * Resolve `$alias` references in a string using the alias map.
   */
  private resolveAliases(value: string): string {
    // First try $alias syntax (e.g. "$myRect")
    const resolved = value.replace(/\$([a-zA-Z0-9_]+)/g, (_match, alias: string) => {
      return this.aliasMap.get(alias) ?? _match;
    });
    // If no $alias matched, check if the entire value is a bare ID in the map
    // (e.g. after duplicate-node, original child IDs map to their new copies)
    if (resolved === value && this.aliasMap.has(value)) {
      return this.aliasMap.get(value)!;
    }
    return resolved;
  }

  /**
   * Parse a JSON string attribute value, resolving aliases before parsing.
   */
  private parseJsonAttr(raw: string): Record<string, unknown> {
    try {
      return JSON.parse(this.resolveAliases(raw)) as Record<string, unknown>;
    } catch {
      return {};
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
          // No action tag found yet — accumulate as pending text.
          // Keep everything from the last `<` onwards, since action tags
          // with JSON props can be very long (500+ chars) and arrive
          // across many streaming chunks.
          const ltIdx = this.buffer.lastIndexOf('<');
          if (ltIdx >= 0) {
            const tail = this.buffer.slice(ltIdx);
            // Only keep if it looks like it could be an <action tag forming
            if (tail.startsWith('<a') || tail.startsWith('<A') || tail === '<') {
              const safe = this.buffer.slice(0, ltIdx);
              if (safe.trim()) {
                this.pendingText += safe;
              }
              this.buffer = tail;
            } else {
              // Not an action tag — flush everything
              if (this.buffer.trim()) {
                this.pendingText += this.buffer;
              }
              this.buffer = '';
            }
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

        // Parse attributes from the full tag
        const attrs = this.parseAttrs(fullTag);
        const actionType = attrs.type;

        if (actionType === 'reasoning' && !isSelfClosing) {
          this.state = { mode: 'reasoning', content: '' };
          continue;
        }

        if (actionType === 'create-node' && isSelfClosing) {
          const nodeType = attrs.nodeType || 'FRAME';
          const parentId = this.resolveAliases(attrs.parent || '');
          const props = sanitizeProps(attrs.props ? this.parseJsonAttr(attrs.props) : {});
          const realId = this.callbacks.onCreateNode(nodeType, parentId, props);
          if (attrs.name) {
            this.aliasMap.set(attrs.name, realId);
          }
          continue;
        }

        if (actionType === 'update-node' && isSelfClosing) {
          const nodeId = this.resolveAliases(attrs.nodeId || '');
          const updates = sanitizeProps(attrs.updates ? this.parseJsonAttr(attrs.updates) : {});
          this.callbacks.onUpdateNode(nodeId, updates);
          continue;
        }

        if (actionType === 'delete-node' && isSelfClosing) {
          const nodeId = this.resolveAliases(attrs.nodeId || '');
          this.callbacks.onDeleteNode(nodeId);
          continue;
        }

        if (actionType === 'reparent-node' && isSelfClosing) {
          const nodeId = this.resolveAliases(attrs.nodeId || '');
          const newParentId = this.resolveAliases(attrs.newParent || '');
          const index = parseInt(attrs.index || '0', 10);
          this.callbacks.onReparentNode(nodeId, newParentId, index);
          continue;
        }

        if (actionType === 'duplicate-node' && isSelfClosing) {
          const nodeId = this.resolveAliases(attrs.nodeId || attrs.sourceId || '');
          if (this.callbacks.onDuplicateNode) {
            const { newIds, idMap } = this.callbacks.onDuplicateNode(nodeId);
            if (attrs.name && newIds.length > 0) {
              this.aliasMap.set(attrs.name, newIds[0]);
            }
            // Register all old→new ID mappings so the AI can reference
            // original child IDs and have them resolve to the duplicated copies
            for (const [oldId, newId] of idMap) {
              this.aliasMap.set(oldId, newId);
            }
          }
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

      return;
    }
  }

  /**
   * Robust attribute parser that handles nested quotes in attribute values.
   * For props='{"x":100}', the outer quotes are single and inner are double.
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
        else if (ch === '{') depth++;
        else if (ch === '}') depth--;
        else if (ch === quote && depth === 0) break;
        pos++;
      }
      result[key] = str.slice(valStart, pos);
      pos++; // skip closing quote
    }

    return result;
  }
}
