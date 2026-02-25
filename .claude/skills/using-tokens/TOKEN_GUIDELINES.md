# FPL Token Usage Guidelines

Comprehensive decision trees and guidelines for selecting the right design tokens from `@figma/fpl-tokens` when building interfaces and components.

## Core Principles

1. **Always use semantic tokens** (`--color-*`) over base ramps (`--ramp-*`)
2. **Use the spacing scale tokens whenever possible** (`--spacer-*`) and don't hardcode px values
3. **Test all theme/mode combinations** (at minimum: design light/dark)
4. **Respect accessibility guidelines** (especially with tertiary colors and disabled states)
5. **Follow established patterns** (check existing components for consistency)

---

## Color schema overview

In order to create a predictable way to describe a specific color, we’ve created a naming convention that chains together a set of parameters in a specific order. 

| Type | Description |
|------|-------------|
| Type | This is our only required parameter, and specifies what is the type of thing we want to color? Our four types are bg, text, icon, and border. |
| UI element | For special elements that typically need to be always dark, we add an optional “UI element” modifier. These are toolbar, menu, and tooltip. (In the process of deprecating) |
| Color role | Colors in our UI have specific meaning, so we’ve organized hues around how they are used, rather than the hue itself. For example, our default accent color is |brand, which may shift based on mode. |
| Prominence | To create hierarchy and adjust visual emphasis, bg, text, and icon support -secondary and -tertiary. Similarly, borders come in two flavors — “default” for a border that acts as a divider, and -strong for border used as the outline around a more prominent element (like a text input). |
| Interaction | Used for interaction states such as hover and pressed/active. |

Note that tokens that don't follow are more specialized and most likely apply to the "canvas/fullscreen" feature surface.

---

## Color Type Guide

Symantic tokens commonly apply a type after the `--color-*` prefix that specifies the inteded scope or application of that color. For example `--color-text` should only apply to text colors. Most common types: text, icon, border, bg (background).

---

## Color Role Guide

To make it easy to apply hues, we use *color roles* that map consistent *meaning* to specific hues.

For example, "red text" could be `color-text-danger`, and a "red background" could be `color-bg-danger`.

| Role | Description |
|------|-------------|
| `-brand` | Our default accent color, which may shift between themes or modes |
| `-selected` | Highlight colors applied for selection states, or a border around a focused element. |
| `-disabled` | For inactive text, icons, and component backgrounds and borders. |
| `-component` | Purple text, icons, borders and backgrounds used to represent Figma's "component" product primitive and features connected to components (like variants). |
| `-assistive` | Pink indicators where Figma is assisting users in some way (for example, in autolayout). |
| `-handoff` | Green indicators where Figma is representing development features when not in "dev-mode" theme like "ready for dev" |
| `-danger` | Red indicators when there is an error/invalid state, or something a user should urgently attend to. |
| `-measure` | Red lines / labels used for guides and measurements on the canvas. |
| `-warning` | Yellow indicators used to warn a user about a potential problem, such as a missing font. |
| `-success` | Green indicators used for confirmation, approval, or when a task has completed. |
| `-info` | Light blue / purple fills for non-blocking informational banners that don't require immediate action. |
| `-inverse` | Dark grey / white fills used for elements that need to be "the opposite of the background color". |
| `-elevated` | Surface/background colors used for elevated elements like tootips, menus, toolbars and popovers. |

---

## Text Colors

Here's more in depth about how to apply color styles to text, with common cases.

### Basic Text Colors

| Token | Description |
|-------|-------------|
| `color-text` | Our default text color for most titles, tabs, and body text. |
| `color-text-secondary` | Our secondary text color for inactive tabs, labels, timestamps, and other text that needs to be "lighter" in order to create hierarchy. |
| `color-text-tertiary` | Our tertiary text color primarily used for placeholder text (for example in a search input), or for hierarchy below secondary text. Note that text at this level is below our color contrast threshold, and may not be readable to all users. Contrast does improve in enhanced contrast mode (light-ec, dark-ec) |
| `color-text-disabled` | Truly disabled text that a user cannot interact with. (This is visually identical to -tertiary) |

### Tinted Text Colors

These represent some of the common visual states, and can be chained with the above -secondary and -tertiary modifiers.

| Token | Description |
|-------|-------------|
| `color-text-brand` | Primary accent text color used to represent interactive elements like links |
| `color-text-danger` | Red text used to alert users about an error. |
| `color-text-warning` | Yellow text used to warn users about a potential problem. |
| `color-text-success` | Green text used for confirmation, and approval. |
| `color-text-assistive` | Pink text used when Figma is assisting you in some way (ex: in auto layout). |

### Text Against Background Colors

| Token | Description |
|-------|-------------|
| `color-text-on*` | When presenting text against a "background with a fill color" (for example, a brand background in our "Share" button), we add "-onbrand" (`color-text-onbrand`), or the corresponding bg color role. This helps us guarantee we're using a contrasting text color against an arbitrary background (such as flipping to black text against yellow -warning backgrounds). This also format also applies to icons.|

### Text on Canvas or Image

Oftentimes we need to present text against user defined content, like on a canvas, or on top of a preview. In these cases, we have text colors defined that will always appear the same way.

| Token | Description |
|-------|-------------|
| `color-textonlightcanvas` | Used for text on top of a background that is greater than 50% lightness. |
| `color-textonlightcanvassecondary` | Secondary text on light canvas. |
| `color-textondarkcanvas` | Used for text on top of a background that is less than or equal to 50% lightness. |
| `color-textondarkcanvassecondary` | Secondary text on dark canvas. |

### Text Color Decision Tree

```
┌─ "What text color should I use?"
│
├─ Is this PRIMARY content users should read?
│  └─ YES
│     ├─ On standard background → --color-text
│     └─ On branded/colored background → --color-text-on*
│        └─ Examples: --color-text-onbrand, --color-text-ondanger
│
├─ Is this SUPPORTING/CONTEXTUAL information?
│  └─ YES
│     ├─ On standard background → --color-text-secondary
│     └─ On branded/colored background → --color-text-on*-secondary
│     └─ Examples: Labels, captions, timestamps
│
├─ Is this DECORATIVE or OPTIONAL to comprehension?
│  └─ YES → --color-text-tertiary
│     ├─ ⚠️  WARNING: Below WCAG contrast threshold
│     ├─ Use for: Placeholder text, decorative labels
│     └─ NEVER use for: Critical info, errors, required fields
│
├─ Is this an INTERACTIVE element (link)?
│  └─ YES → --color-text-brand
│     └─ Automatically adapts to current theme
│
└─ Is this DISABLED?
   └─ YES → --color-text-disabled
      ├─ ⚠️  WARNING: Below WCAG contrast threshold
      └─ Only use for: Disabled form labels, disabled button text
```

**Quick Reference:**
- **Primary text**: `--color-text` (default for all body text)
- **Secondary text**: `--color-text-secondary` (supporting info)
- **Tertiary text**: `--color-text-tertiary` (decorative only, low contrast)
- **Brand/links**: `--color-text-brand` (interactive elements)
- **On colored backgrounds**: `--color-text-onbrand`, `--color-text-ondanger`, etc.
- **Disabled**: `--color-text-disabled`

---

## Icon Colors

Here's how we apply color to most of our icons.

### Basic Icon Colors

| Token | Description |
|-------|-------------|
| `color-icon` | Our default icon color. |
| `color-icon-secondary` | Our secondary icon color for inactive elements that need to be "lighter" in order to create hierarchy. |
| `color-icon-tertiary` | Our tertiary icon color primarily used for carets. |
| `color-icon-disabled` | Truly disabled icons that a user cannot interact with. (This is visually identical to -tertiary) |

### Tinted Icon Colors

| Token | Description |
|-------|-------------|
| `color-icon-brand` | Blue or purple icon used for things like links. |
| `color-icon-danger` | Red icons used to alert users about an error. |
| `color-icons-warning` | Yellow icons used to warn users about a potential problem. |
| `color-icons-success` | Green icons used for confirmation, and approval. |
| `color-icon-assistive` | Pink icons used when Figma is assisting you in some way. |

### Icons Against Background Colors

| Token | Description |
|-------|-------------|
| `color-icon-onbrand` | When icons appear against a "background with a fill color" (for example, a brand background in our "Share" button), we add "-onbrand", or the corresponding bg color role. |

### Icons on Canvas or Image

Sometimes we need to present icons against user defined content, like on a canvas, or on top of a preview.

| Token | Description |
|-------|-------------|
| `color-icononlightcanvas` | Used for icons on top of a background that is greater than 50% lightness. |
| `color-iconondarkcanvas` | Used for icons on top of a background that is less than or equal to 50% lightness. |

### Icon Color Decision Tree

```
┌─ "What icon color should I use?"
│
├─ Icons follow the same hierarchy as text:
│
├─ PRIMARY icons (main actions, important indicators)
│  └─ --color-icon
│     └─ Use with: Primary actions, main navigation
│
├─ SUPPORTING icons (secondary actions, context)
│  └─ --color-icon-secondary
│     └─ Use with: Supplementary info, less critical actions
│
├─ DECORATIVE icons (optional visual elements)
│  └─ --color-icon-tertiary
│     ├─ ⚠️  WARNING: Low contrast
│     └─ Use sparingly for non-critical decorative elements
│
├─ INTERACTIVE/BRANDED icons
│  └─ --color-icon-brand
│     └─ Use with: Primary brand actions, links
│
└─ DISABLED icons
   └─ --color-icon-disabled
      └─ Use with: Disabled buttons, inactive states
```

**Quick Reference:**
- **Primary icons**: `--color-icon`
- **Secondary icons**: `--color-icon-secondary`
- **Decorative icons**: `--color-icon-tertiary` (low contrast)
- **Interactive icons**: `--color-icon-brand`
- **Disabled icons**: `--color-icon-disabled`

---

## Background Colors

These are common background colors you might be looking for.

### Creating Hierarchy

| Token | Description |
|-------|-------------|
| `color-bg` | Our default background color. |
| `color-bg-secondary` | Our secondary background color for most containers. Never use for large container backgrounds. Used for smaller element backgrounds like chips or inputs in order to separate it from the default background |
| `color-bg-tertiary` | Our tertiary background color for containers that need to sit within a secondary background. |

### Common Interaction States

| Token | Description |
|-------|-------------|
| `color-bg-hover` | A light grey hover fill color behind icons, and selectable elements. |
| `color-bg-selected` | A light blue selected fill color for selected elements. |
| `color-bg-disabled` | A light grey background fill color for elements that are not interactive (for example, a disabled button). Note, in these cases we tweak any text or icons to use `color-text-ondisabled`, or `color-icon-ondisabled`. |

### Common Hues

Most often, our common hues will be used with the (default) background color, a -hover state, and a -secondary background color that can be used for containers that sit on top.

Note, when using text or icons on top of a tinted bg, we should typically use the -on version of a token (ex: color-text-ondanger).

| Token | Description |
|-------|-------------|
| `color-bg-brand` | Brand accent fill colors for backgrounds like a primary button. |
| `color-bg-danger` | Red fill color behind destructive buttons, and error banners. |
| `color-bg-warning` | Yellow fill color for warning banners. |
| `color-bg-success` | Green fill color for confirmation banners and buttons. |
| `color-bg-assistive` | Pink fill color for assistive UI. |

### Tertiary Backgrounds

We also have -tertiary versions of these background colors, which are intended to be the "lightest" version of a hue. These are designed to work with our default color-text and color-icon colors.

### Background Color Decision Tree

```
┌─ "What background color should I use?"
│
├─ Is this the MAIN canvas/page background?
│  └─ YES → --color-bg
│     └─ The primary surface color
│
├─ Is this a LAYERED element on top of main background?
│  └─ YES → --color-bg
│     └─ Examples: Cards, panels, dropdown menus, modals
│     └─ Note: Uses same token as main background for flat design
│
├─ Is this a NESTED layer (card within a panel)?
│  └─ YES → --color-bg-secondary
│     └─ Creates additional depth hierarchy
│     └─ Examples: Nested card, input field on a card
│
├─ Is this a SUBTLE emphasis or hover state?
│  └─ YES → --color-bg-secondary
│     └─ Examples: Row hover states, subtle highlighting
│
├─ Is this a BRANDED/PRIMARY interactive element?
│  └─ YES → --color-bg-brand
│     └─ Examples: Primary buttons, selected states
│     └─ MUST use with: --color-text-onbrand for text
│
├─ Is this a TERTIARY/SUBTLE background?
│  └─ YES → --color-bg-tertiary
│     └─ Examples: Disabled states, very subtle backgrounds
│
└─ Is this DISABLED?
   └─ YES → --color-bg-disabled
      └─ For disabled interactive elements
```

**Quick Reference:**
- **Main canvas**: `--color-bg`
- **Cards/panels**: `--color-bg`
- **Nested elements**: `--color-bg-secondary`
- **Primary buttons**: `--color-bg-brand` + `--color-text-onbrand`
- **Hover states**: `--color-bg-secondary`
- **Disabled**: `--color-bg-disabled`

---

## Border Colors

These are the most common border colors we frequently use.

### Default Borders

We typically use borders in two different ways.

| Token | Description |
|-------|-------------|
| `color-border` | Most commonly, we use borders as a divider between sections, or around inputs. |
| `color-border-strong` | Sometimes, we need a much darker border color that we can use for secondary button outline style. |

### Selection Borders

| Token | Description |
|-------|-------------|
| `color-border-selected` | This is the default blue border color we use for focused / selected inputs. |
| `color-border-selected-strong` | When presenting a selected border against an already selected background, we sometimes need to increase the prominence of the selected border. |

### Border Color Decision Tree

```
┌─ "What border color should I use?"
│
├─ Is this a SUBTLE border (dividers, inactive inputs)?
│  └─ YES → --color-border
│     └─ Examples: Table borders, inactive form fields, dividers
│     └─ Default border for most components
│
├─ Is this a PROMINENT/STRONG border?
│  └─ YES → --color-border-strong
│     └─ Examples: Card borders when emphasis is needed
│     └─ Higher contrast than --color-border
│
├─ Is this an ACTIVE/FOCUSED state?
│  └─ YES → --color-border-selected
│     └─ Examples: Focused inputs, selected items
│     └─ Pattern: 1px outline, 1px offset
│
├─ Is this a BRANDED border?
│  └─ YES → --color-border-brand
│     └─ Examples: Brand-colored focus rings
│     └─ Use sparingly for emphasis
│
└─ Is this DISABLED?
   └─ YES → --color-border-disabled
      └─ For disabled form fields and buttons
```

**Quick Reference:**
- **Default borders**: `--color-border` (most common)
- **Prominent borders**: `--color-border-strong`
- **Focus/selected**: `--color-border-selected`
- **Branded**: `--color-border-brand`
- **Disabled**: `--color-border-disabled`

**Focus Ring Pattern:**
```css
.element:focus-visible {
  outline: 1px solid var(--color-border-selected);
  outline-offset: 1px;
}
```

---

## Typography Token Decision Trees

### Font Size & Style Selection

```
┌─ "What typography style should I use?"
│
├─ Is this a HERO/MARKETING element?
│  └─ YES → --text-display-*
│     ├─ Font: Whyte (falls back to Inter in browser)
│     ├─ Size: 48px
│     ├─ Use: Landing pages, marketing headers
│     └─ DON'T use: UI chrome, app interfaces
│
├─ Is this a PAGE TITLE or MAJOR SECTION header?
│  └─ YES → --text-heading-large-*
│     ├─ Size: 24px
│     ├─ Use: Page titles, dialog headers
│     └─ DON'T use: Repeated UI elements, data tables
│
├─ Is this a MEDIUM SECTION header?
│  └─ YES → --text-heading-medium-*
│     ├─ Size: ~16-18px (check actual token value)
│     └─ Use: Section headers, large card titles
│
├─ Is this a SMALL SECTION header?
│  └─ YES → --text-heading-small-*
│     ├─ Size: ~14px (check actual token value)
│     └─ Use: Subsection headers, small card titles
│
├─ Is this a CARD TITLE or PANEL HEADER?
│  └─ YES → --text-body-large-strong-*
│     ├─ Size: 13px
│     ├─ Weight: Strong (550)
│     └─ Use: Card headers, sidebar sections
│
├─ Is this a FORM LABEL or TABLE HEADER?
│  └─ YES → --text-body-medium-strong-*
│     ├─ Size: 11px
│     ├─ Weight: Strong (550)
│     └─ Use: Form labels, list headers, table column headers
│
├─ Is this PRIMARY BODY TEXT (DEFAULT)?
│  └─ YES → --text-body-medium-*
│     ├─ Size: 11px
│     ├─ Use: Main content, descriptions, default UI text
│     └─ ⭐ This is your DEFAULT choice for most UI
│
├─ Is this LESS DENSE UI / LONG FORM content?
│  └─ YES → --text-body-large-*
│     ├─ Size: 13px
│     ├─ Use: Comments, forms, paragraph text
│     └─ Good for: Comfortable reading, less-dense interfaces
│
└─ Is this a CAPTION, METADATA, or FINE PRINT?
   └─ YES → --text-body-small-*
      ├─ Size: 9px
      ├─ Use: Timestamps, captions, helper text, footnotes
      └─ DON'T use: Main content (too small)
```

**Text Style Token Pattern:**
Each text style has multiple tokens:
```
--text-body-medium-font-size
--text-body-medium-font-weight
--text-body-medium-line-height
--text-body-medium-letter-spacing
--text-body-medium-strong-font-weight  (for emphasis)
```

**Quick Reference:**
- **Default UI text**: `--text-body-medium-*` (11px) ⭐ Most common
- **Comfortable/form text**: `--text-body-large-*` (13px)
- **Small text**: `--text-body-small-*` (9px)
- **Page titles**: `--text-heading-large-*` (24px)
- **Section headers**: `--text-heading-medium-*` or `--text-heading-small-*`
- **Card titles**: `--text-body-large-strong-*`
- **Labels**: `--text-body-medium-strong-*`

---

### Font Weight Selection

```
┌─ "What font weight should I use?"
│
├─ Using predefined text styles? (Recommended)
│  └─ Use the .strong variant for emphasis
│     ├─ Normal: --text-body-medium-font-weight (450)
│     └─ Strong: --text-body-medium-strong-font-weight (550)
│
└─ Building custom text styles? (Less common)
   ├─ Regular text → --font-weight-default (450)
   └─ Emphasis/headings → --font-weight-strong (550)
   └─ ⚠️  DON'T create custom font-weight values
```

**Quick Reference:**
- **Normal weight**: `--font-weight-default` (450)
- **Strong weight**: `--font-weight-strong` (550)
- **Preferred**: Use text style tokens with `-strong` variants

---

### Font Family Selection

```
┌─ "What font family should I use?"
│
├─ Most UI elements? (99% of cases)
│  └─ --font-family-default (Inter)
│     └─ This is your default choice
│
├─ Code snippets, file paths, API responses?
│  └─ --font-family-mono (Roboto Mono)
│     └─ Use: Code blocks, terminal output, technical content
│
└─ Marketing/hero content (Figma only)?
   └─ --text-display-font-family (Whyte)
      ├─ ⚠️  Only renders correctly in Figma
      └─ Consider using --font-family-default for web apps
```

**Quick Reference:**
- **Default UI**: `--font-family-default` (Inter)
- **Code/technical**: `--font-family-mono` (Roboto Mono)
- **Display/marketing**: `--text-display-font-family` (Whyte, Figma only)

---

## Spacing Token Decision Trees

### Padding, Margin, and Gap

```
┌─ "What spacing should I use?"
│
├─ MINIMAL spacing (very tight components)
│  └─ --spacer-1 (4px / 0.25rem)
│     └─ Use: Chips, tags, compact buttons (vertical padding)
│     └─ Use: Icon padding, badge padding
│     └─ Use: Gap between two ghost (without background or border) buttons/icon buttons (horizontal)
│
├─ TIGHT spacing
│  └─ --spacer-2 (8px / 0.5rem)
│     └─ Use: Small buttons (horizontal padding)
│     └─ Use: List item padding, tight cards
│     └─ Use: Form field padding (horizontal)
│     └─ Use: Gap between two filled buttons (horizontal)
│
├─ IN-BETWEEN spacing
│  └─ --spacer-2-5 (12px / 0.75rem)
│     └─ Use: Compact list items, small card padding
│     └─ Use: When 8px is too tight and 16px too loose
│
├─ STANDARD spacing (BASE UNIT) ⭐
│  └─ --spacer-3 (16px / 1rem)
│     └─ Use: Standard cards
│     └─ Use: Form field margins, layout gaps
│     └─ ⭐ This is your go-to spacing value
│
├─ MEDIUM spacing
│  └─ --spacer-4 (24px / 1.5rem)
│     └─ Use: Section padding, modal padding
│     └─ Use: Card spacing between sections
│     └─ Use: Component height for medium-sized elements
│
├─ LARGE spacing
│  └─ --spacer-5 (32px / 2rem)
│     └─ Use: Page sections, major layout divisions
│     └─ Use: Large component heights
│
└─ EXTRA-LARGE spacing
   └─ --spacer-6 (40px / 2.5rem)
      └─ Use: Hero sections, major page divisions
      └─ Use: Maximum spacing between major sections
```

**Spacing Scale:**
- `--spacer-1`: 4px (0.25rem)
- `--spacer-2`: 8px (0.5rem)
- `--spacer-2-5`: 12px (0.75rem)
- `--spacer-3`: 16px (1rem) ⭐ Default
- `--spacer-4`: 24px (1.5rem)
- `--spacer-5`: 32px (2rem)
- `--spacer-6`: 40px (2.5rem)

---

### Component Spacing Patterns

**Button:**
```css
padding: var(--spacer-1) var(--spacer-2);
/* Vertical: tight (4px), Horizontal: small (8px) */
```

**Large Button:**
```css
padding: var(--spacer-2) var(--spacer-3);
/* Vertical: small (8px), Horizontal: standard (16px) */
```

**Form Field:**
```css
padding: var(--spacer-1) var(--spacer-2);
margin-bottom: var(--spacer-3);
/* Internal padding tight, external margin standard */
```

**Card:**
```css
padding: var(--spacer-3);
gap: var(--spacer-3);
/* Standard padding and gap between child elements */
```

**Modal:**
```css
padding: var(--spacer-4);
gap: var(--spacer-4);
/* Medium padding for larger containers */
```

**List Item:**
```css
padding: var(--spacer-2) var(--spacer-3);
gap: var(--spacer-2);
/* Vertical: tight (8px), Horizontal: standard (16px) */
```

**Page Section:**
```css
padding: var(--spacer-5) 0;
/* Large spacing between page sections */
```

---

### Target Sizes for Components

```
┌─ "How tall/wide should this component be?"
│
├─ SMALL non-interactive elements (badges, chips)
│  └─ --spacer-3 (16px)
│     └─ Minimum size for non-interactive elements
│
├─ MEDIUM interactive elements (DEFAULT)
│  └─ --spacer-4 (24px)
│     └─ Standard button height, input height
│     └─ Minimum recommended touch target
│
└─ LARGE interactive elements
   └─ --spacer-5 (32px)
      └─ Large buttons, prominent inputs
      └─ More comfortable touch targets
```

**Quick Reference:**
- **Small non-interactive**: 16px (`--spacer-3`)
- **Medium interactive**: 24px (`--spacer-4`) ⭐ Default
- **Large interactive**: 32px (`--spacer-5`)

---

## Border Radius Decision Trees

### Corner Rounding

```
┌─ "What border radius should I use?"
│
├─ SHARP corners (no rounding)
│  └─ --radius-none (0)
│     └─ Use: Tables, data grids, technical interfaces, edge to edge panels/surfaces
│     └─ Use: When joining adjacent elements seamlessly
│
├─ SUBTLE rounding
│  └─ --radius-small (2px / 0.125rem)
│     └─ Use: Small elements (≤16px height)
│     └─ Use: Subtle non-interactive UI elements
│     └─ Examples: Small badges, tight chips
│
├─ STANDARD rounding (DEFAULT) ⭐
│  └─ --radius-medium (5px / 0.3125rem)
│     └─ Use: Buttons, inputs, standard components
│     └─ Use: Cards, panels, most UI components
│     └─ ⭐ This is your default choice
│
├─ HEAVY rounding
│  └─ --radius-large (13px / 0.8125rem)
│     └─ Use: Large cards, modals, windows
│     └─ Use: Prominent decorative elements
│     └─ Examples: Feature cards, dialog boxes
│
└─ PILLS/CIRCLES
   └─ --radius-full (9999px)
      └─ Use: Circular avatars, status badges
      └─ Use: Pill-shaped buttons, tags
      └─ Works for both true circles and pill shapes
```

**Radius Scale:**
- `--radius-none`: 0
- `--radius-small`: 2px (for small components)
- `--radius-medium`: 5px ⭐ Default
- `--radius-large`: 13px (for large containers)
- `--radius-full`: 9999px (circles/pills)

**Component Guidelines:**
- **Height ≤ 16px**: Use `--radius-small` (2px)
- **Height 17-40px**: Use `--radius-medium` (5px)
- **Height > 40px or large containers**: Use `--radius-large` (13px)
- **Circular elements**: Use `--radius-full`

---

## Theme and Mode Selection

### Available Themes

```
data-theme="design" (DEFAULT) ⭐
└─ Default Figma Design product theme
└─ Use: General design tools, prototyping interfaces
└─ Fallback if no theme specified

data-theme="figjam"
└─ Collaborative whiteboarding UI
└─ Use: Brainstorming/collaboration features
└─ Brighter, more playful color palette

data-theme="devmode"
└─ Developer-focused features
└─ Use: Code inspection, handoff tools
└─ Technical, development-oriented styling

data-theme="buzz"
data-theme="draw"
data-theme="make"
data-theme="sites"
data-theme="slides"
└─ Product-specific themes
└─ Use: When building for specific Figma products
```

### Available Modes

```
data-mode="light" (DEFAULT) ⭐
└─ Standard light appearance
└─ Use: Default mode for most users

data-mode="dark"
└─ Dark appearance
└─ Use: User-selected dark mode preference
└─ Automatic token color adjustments

data-mode="light-ec"
└─ Light with enhanced contrast
└─ Use: Accessibility - users needing higher contrast
└─ WCAG AAA compliant

data-mode="dark-ec"
└─ Dark with enhanced contrast
└─ Use: Accessibility - high contrast in dark mode
└─ WCAG AAA compliant
```

### Setting Theme/Mode

**React Example:**
```tsx
useEffect(() => {
  document.documentElement.setAttribute('data-theme', 'design');
  document.documentElement.setAttribute('data-mode', 'light');
}, []);
```

**Vanilla JavaScript:**
```javascript
// Set theme
document.documentElement.setAttribute('data-theme', 'design');

// Set mode
document.documentElement.setAttribute('data-mode', 'light');
```

**Respect User Preferences:**
```javascript
// Detect dark mode preference
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
document.documentElement.setAttribute('data-mode', prefersDark ? 'dark' : 'light');

// Detect high contrast preference
const prefersContrast = window.matchMedia('(prefers-contrast: more)').matches;
if (prefersContrast) {
  document.documentElement.setAttribute('data-mode', prefersDark ? 'dark-ec' : 'light-ec');
}
```

---

## Common Component Patterns

### Standard Button
```css
.button {
  /* Spacing */
  padding: var(--spacer-1) var(--spacer-2);

  /* Colors */
  background: var(--color-bg-brand);
  color: var(--color-text-onbrand);
  border: none;

  /* Shape */
  border-radius: var(--radius-medium);

  /* Typography */
  font-size: var(--text-body-medium-font-size);
  font-weight: var(--font-weight-strong);
  line-height: var(--text-body-medium-line-height);

  /* States */
  cursor: pointer;
}

.button:hover {
  /* Add hover state styling if needed */
}

.button:focus-visible {
  outline: 1px solid var(--color-border-selected);
  outline-offset: 1px;
}
```

### Secondary Button
```css
.button-secondary {
  padding: var(--spacer-1) var(--spacer-2);
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-medium);
  font-size: var(--text-body-medium-font-size);
  font-weight: var(--font-weight-strong);
}
```

### Input Field
```css
.input {
  /* Spacing */
  padding: var(--spacer-1) var(--spacer-2);

  /* Colors */
  background: var(--color-bg-secondary);
  color: var(--color-text);
  border: 1px solid var(--color-border);

  /* Shape */
  border-radius: var(--radius-medium);

  /* Typography */
  font-size: var(--text-body-medium-font-size);
  font-family: var(--font-family-default);
}

.input::placeholder {
  color: var(--color-text-tertiary);
}

.input:focus {
  outline: 1px solid var(--color-border-selected);
  outline-offset: 1px;
  border-color: transparent; /* or keep border */
}
```

### Card Container
```css
.card {
  /* Spacing */
  padding: var(--spacer-3);
  gap: var(--spacer-3); /* if using flexbox/grid */

  /* Colors */
  background: var(--color-bg);
  border: 1px solid var(--color-border);

  /* Shape */
  border-radius: var(--radius-large);
}
```

### Modal/Dialog
```css
.modal {
  /* Spacing */
  padding: var(--spacer-4);
  gap: var(--spacer-4);

  /* Colors */
  background: var(--color-bg);
  border: 1px solid var(--color-border-strong);

  /* Shape */
  border-radius: var(--radius-large);

  /* Shadow (if available as token) */
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}
```

### List Item
```css
.list-item {
  /* Spacing */
  padding: var(--spacer-2) var(--spacer-3);
  gap: var(--spacer-2);

  /* Colors */
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);

  /* Typography */
  font-size: var(--text-body-medium-font-size);
}

.list-item:hover {
  background: var(--color-bg-secondary);
}
```

### Text Hierarchy Example
```css
/* Page Title */
.page-title {
  font-size: var(--text-heading-large-font-size);
  font-weight: var(--text-heading-large-font-weight);
  line-height: var(--text-heading-large-line-height);
  color: var(--color-text);
  margin-bottom: var(--spacer-4);
}

/* Section Header */
.section-header {
  font-size: var(--text-heading-medium-font-size);
  font-weight: var(--text-heading-medium-font-weight);
  color: var(--color-text);
  margin-bottom: var(--spacer-3);
}

/* Card Title */
.card-title {
  font-size: var(--text-body-large-font-size);
  font-weight: var(--text-body-large-strong-font-weight);
  color: var(--color-text);
  margin-bottom: var(--spacer-2);
}

/* Body Text */
.body-text {
  font-size: var(--text-body-medium-font-size);
  font-weight: var(--text-body-medium-font-weight);
  line-height: var(--text-body-medium-line-height);
  color: var(--color-text);
}

/* Supporting Text */
.supporting-text {
  font-size: var(--text-body-medium-font-size);
  color: var(--color-text-secondary);
}

/* Caption */
.caption {
  font-size: var(--text-body-small-font-size);
  color: var(--color-text-secondary);
}
```

---

## Anti-Patterns and Common Mistakes

### ❌ Using Base Color Ramps Directly

**BAD:**
```css
.component {
  color: var(--ramp-black-800);
  background: var(--ramp-white-1000);
}
```

**GOOD:**
```css
.component {
  color: var(--color-text);
  background: var(--color-bg);
}
```

**Why:** Base ramps don't respond to theme/mode changes. Semantic tokens adapt automatically.

---

### ❌ Hardcoding Spacing Values

**BAD:**
```css
.component {
  padding: 14px;
  margin-bottom: 18px;
  gap: 10px;
}
```

**GOOD:**
```css
.component {
  padding: var(--spacer-3);
  margin-bottom: var(--spacer-4);
  gap: var(--spacer-2-5);
}
```

**Why:** Hardcoded values break visual consistency and are harder to maintain. Use the spacing scale.

---

### ❌ Creating Custom Font Weights

**BAD:**
```css
.component {
  font-weight: 475;
  font-weight: 625;
}
```

**GOOD:**
```css
.component {
  font-weight: var(--font-weight-default); /* 450 */
}

.component-emphasis {
  font-weight: var(--font-weight-strong); /* 550 */
}
```

**Why:** Custom weights may not be available in the font and break type hierarchy. Stick to defined tokens.

---

### ❌ Mixing Semantic Levels Incorrectly

**BAD:**
```css
.card {
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border-brand); /* ← Wrong level */
}
```

**GOOD:**
```css
.card {
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border); /* ← Matches background level */
}
```

**Why:** Mixing levels creates visual inconsistency. Keep semantic levels aligned.

---

### ❌ Using Tertiary Colors for Critical Content

**BAD:**
```css
.error-message {
  color: var(--color-text-tertiary); /* ← Below contrast threshold */
}

.required-label {
  color: var(--color-text-tertiary); /* ← Can't be read */
}
```

**GOOD:**
```css
.error-message {
  color: var(--color-text); /* Or semantic error color */
}

.required-label {
  color: var(--color-text);
}
```

**Why:** Tertiary colors don't meet WCAG contrast requirements and may be unreadable for critical information.

---

### ❌ Forgetting Theme/Mode Attributes

**BAD:**
```javascript
// Themes won't work - wrong element
document.body.setAttribute('data-theme', 'figjam');
```

**GOOD:**
```javascript
// Correct element
document.documentElement.setAttribute('data-theme', 'figjam');
```

**Why:** CSS selectors target `:root` (html element), not body. Theme changes won't apply otherwise.

---

### ❌ Not Testing All Modes

**BAD:**
```css
/* Only tested in light mode */
.component {
  color: var(--color-text);
  background: var(--color-bg);
}
```

**GOOD:**
```css
/* Same tokens, but TESTED in all modes */
.component {
  color: var(--color-text);
  background: var(--color-bg);
}
/* Verify in: light, dark, light-ec, dark-ec */
```

**Why:** Tokens have different values per mode. Always test your component in all relevant modes to ensure readability and contrast.

---

## Accessibility Guidelines

### Color Contrast Requirements

✅ **Safe for all content:**
- `--color-text` / `--color-text-secondary`
- Meet WCAG AA on all backgrounds
- Use for essential content

⚠️ **Use with caution:**
- `--color-text-tertiary`
- Below WCAG AA threshold
- Only use for: Placeholder text, disabled labels
- NEVER use for: Critical info, errors, required fields

🏆 **Enhanced Contrast Modes:**
- `data-mode="light-ec"` or `data-mode="dark-ec"`
- WCAG AAA compliant
- Provide when user needs higher contrast

### Best Practices

**1. Don't rely on color alone**

❌ BAD:
```html
<span style="color: red;">Error</span>
```

✅ GOOD:
```html
<span class="error">
  <IconError /> Error: Invalid input
</span>
```

**2. Provide sufficient color contrast**
- Use contrast checker tools during development
- Test in both light and dark modes
- Verify with enhanced contrast modes
- Aim for WCAG AA minimum (4.5:1 for text)

**3. Support user preferences**
```javascript
// Respect system preferences
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const prefersContrast = window.matchMedia('(prefers-contrast: more)').matches;

if (prefersContrast) {
  document.documentElement.setAttribute('data-mode', prefersDark ? 'dark-ec' : 'light-ec');
} else {
  document.documentElement.setAttribute('data-mode', prefersDark ? 'dark' : 'light');
}
```

**4. Make interactive elements obvious**
```css
/* Add visual affordances beyond color */
.link {
  color: var(--color-text-brand);
  text-decoration: underline; /* ← Additional indicator */
}

.button:focus-visible {
  outline: 1px solid var(--color-border-selected);
  outline-offset: 1px;
  /* Clear focus indicator for keyboard users */
}

.button:hover {
  /* Provide hover state for mouse users */
  background: var(--color-bg-secondary);
}
```

**5. Ensure minimum touch targets**
- Minimum: 24px × 24px (`--spacer-4`)
- Recommended: 32px × 32px (`--spacer-5`) for primary actions
- Use `--spacer-4` for component heights by default

---

## Token Workflow

### When Building a New Component

1. **Start with component patterns** (see above)
2. **Choose semantic tokens** (not base ramps)
3. **Test all themes/modes** (at minimum: design light/dark)
4. **Verify accessibility** (contrast, interactive states)
5. **Check responsive behavior** (font sizes, spacing)

### When You Encounter Hardcoded Values

1. **Identify the value type**: Color, spacing, size, font?
2. **Consult decision trees**: Find the appropriate token
3. **Replace with token**: Update CSS to use `var(--token-name)`
4. **Test in multiple modes**: Verify it works across themes
5. **Check accessibility**: Ensure contrast is maintained

### When Debugging Token Issues

1. **Inspect element** in browser DevTools
2. **Check computed styles** for CSS custom properties
3. **Verify theme/mode attributes** on `<html>` element:
   ```html
   <html data-theme="design" data-mode="light">
   ```
4. **Look for token value** in the Styles panel
5. **Check if token exists** by searching FPL documentation
6. **Verify import order** (tokens CSS should be loaded first)

---

## Quick Decision Framework

When in doubt, use this framework:

1. **Is this a common component?** → Use established patterns above
2. **Is this text?** → Start with `--color-text` and adjust hierarchy
3. **Is this a background?** → Start with `--color-bg`
4. **Is this spacing?** → Default to `--spacer-3` (16px)
5. **Is this a border?** → Default to `--color-border`
6. **Is this text styling?** → Default to `--text-body-medium-*`

**When stuck between two tokens**, consider:
- **Visual hierarchy**: Primary vs secondary vs tertiary
- **Semantic meaning**: What does this represent? What is it's role?
- **Context**: Where is this used? (card, page, modal, etc.)
- **User needs**: Accessibility, readability, usability

---

**Last Updated:** 2026-01-29
**Version:** 1.0.0

For questions or clarifications, consult the FPL documentation or ask for guidance using this skill.
