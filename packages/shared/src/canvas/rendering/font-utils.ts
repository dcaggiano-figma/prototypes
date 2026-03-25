/** CSS generic font family keywords that must NOT be quoted. */
const CSS_GENERIC_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'math',
  'emoji',
  'fangsong',
])

/** Well-known system fonts that don't need Google Fonts loading. */
const SYSTEM_FONTS = new Set([
  'arial',
  'georgia',
  'times new roman',
  'courier new',
  'verdana',
  'helvetica',
  'helvetica neue',
  'tahoma',
  'trebuchet ms',
  'impact',
  'sf pro text',
  'sf pro display',
  'sf pro rounded',
  'sf mono',
  'segoe ui',
  'lucida grande',
  'geneva',
  'inter', // Pre-loaded via static <link> in index.html
])

/** Fallback font options for when Local Font Access API is unavailable. */
const FONT_OPTIONS = [
  // Sans-serif
  { value: 'Inter', label: 'Inter', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { value: 'Roboto', label: 'Roboto', category: 'sans-serif', weights: [100, 300, 400, 500, 700, 900] },
  { value: 'Open Sans', label: 'Open Sans', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800] },
  { value: 'Lato', label: 'Lato', category: 'sans-serif', weights: [100, 300, 400, 700, 900] },
  { value: 'Poppins', label: 'Poppins', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { value: 'DM Sans', label: 'DM Sans', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { value: 'Nunito', label: 'Nunito', category: 'sans-serif', weights: [200, 300, 400, 500, 600, 700, 800, 900] },
  // Serif
  { value: 'Georgia', label: 'Georgia', category: 'serif', weights: [400, 700] },
  { value: 'Playfair Display', label: 'Playfair Display', category: 'serif', weights: [400, 500, 600, 700, 800, 900] },
  { value: 'Merriweather', label: 'Merriweather', category: 'serif', weights: [300, 400, 700, 900] },
  { value: 'Lora', label: 'Lora', category: 'serif', weights: [400, 500, 600, 700] },
  { value: 'EB Garamond', label: 'EB Garamond', category: 'serif', weights: [400, 500, 600, 700, 800] },
  // Monospace
  { value: 'monospace', label: 'Monospace', category: 'monospace', weights: [400, 700] },
  { value: 'DM Mono', label: 'DM Mono', category: 'monospace', weights: [300, 400, 500] },
  { value: 'JetBrains Mono', label: 'JetBrains Mono', category: 'monospace', weights: [100, 200, 300, 400, 500, 600, 700, 800] },
  { value: 'Fira Code', label: 'Fira Code', category: 'monospace', weights: [300, 400, 500, 600, 700] },
  { value: 'Source Code Pro', label: 'Source Code Pro', category: 'monospace', weights: [200, 300, 400, 500, 600, 700, 800, 900] },
  // Display
  { value: 'Oswald', label: 'Oswald', category: 'display', weights: [200, 300, 400, 500, 600, 700] },
  { value: 'Montserrat', label: 'Montserrat', category: 'display', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
] as const

/** Look up available weights for a font from the FONT_OPTIONS list. */
function getFontOptionWeights(family: string): number[] | null {
  const entry = FONT_OPTIONS.find((f) => f.value === family)
  return entry ? [...entry.weights] : null
}

/**
 * Format a fontFamily string for use in CSS.
 * Generic families are left unquoted; named fonts are quoted.
 */
function formatFontFamily(fontFamily: string): string {
  const trimmed = fontFamily.trim()
  if (CSS_GENERIC_FAMILIES.has(trimmed.toLowerCase())) {
    return trimmed.toLowerCase()
  }
  return `"${trimmed}"`
}

/**
 * Check whether a font family is a known system font or CSS generic.
 * Used by the Google Fonts loader to skip fonts that don't need loading.
 */
function isSystemOrGenericFont(fontFamily: string): boolean {
  const lower = fontFamily.trim().toLowerCase()
  return CSS_GENERIC_FAMILIES.has(lower) || SYSTEM_FONTS.has(lower)
}

export { CSS_GENERIC_FAMILIES, FONT_OPTIONS, SYSTEM_FONTS, formatFontFamily, getFontOptionWeights, isSystemOrGenericFont }
