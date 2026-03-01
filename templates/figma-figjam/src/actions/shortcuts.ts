/**
 * Declarative keyboard shortcut → action name bindings.
 *
 * Key format: modifier prefixes + key name, joined with "+".
 * Modifiers: "Mod" (Cmd on Mac, Ctrl elsewhere), "Shift", "Alt".
 * Key names: lowercase letter or special key name (Backspace, Delete, etc.)
 *
 * Examples: "v", "Mod+a", "Shift+Mod+z", "Backspace"
 */
export const SHORTCUT_MAP: Record<string, string> = {
  // Tool shortcuts
  v: 'tool.move',
  f: 'tool.frame',
  r: 'tool.rectangle',
  o: 'tool.ellipse',
  t: 'tool.text',
  p: 'tool.pen',
  h: 'tool.hand',
  c: 'tool.comment',
  l: 'tool.line',

  // Selection
  'Mod+a': 'select-all',
  Escape: 'deselect',

  // Editing
  Enter: 'enter-point-edit',
  Backspace: 'delete',
  Delete: 'delete',

  // Quick actions
  'Mod+k': 'quick-actions',

  // Clipboard
  'Mod+c': 'copy',
  'Mod+v': 'paste',
  'Mod+x': 'cut',

  // Undo / redo
  'Mod+z': 'undo',
  'Shift+Mod+z': 'redo',

  // Zoom
  'Mod+=': 'zoom-in',
  'Mod+-': 'zoom-out',
  1: 'zoom-to-fit',
  'Shift+1': 'zoom-to-fit',
  'Shift+0': 'zoom-to-100',
  'Mod+0': 'zoom-to-100',

};

/**
 * Convert a KeyboardEvent into the shortcut string format used by SHORTCUT_MAP.
 */
export function eventToShortcut(e: KeyboardEvent): string {
  const parts: string[] = [];

  if (e.shiftKey) parts.push('Shift');
  // Mod = Cmd on Mac, Ctrl elsewhere
  if (e.metaKey || e.ctrlKey) parts.push('Mod');
  if (e.altKey) parts.push('Alt');

  const key = normalizeKey(e.key);
  // Don't add modifier keys themselves as the key part
  if (!['Shift', 'Control', 'Meta', 'Alt'].includes(e.key)) {
    parts.push(key);
  }

  return parts.join('+');
}

function normalizeKey(key: string): string {
  // Single letters → lowercase
  if (key.length === 1) return key.toLowerCase();
  return key;
}
