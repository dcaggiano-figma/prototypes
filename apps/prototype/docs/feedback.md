# Feedback queue

Items are picked up at natural points — between milestones or when touching
related code. Format:

```
### FB-{n}: {short title} `[ ]`
**Milestone**: M{n} (or "general")
**Priority**: P0 (blocker) | P1 (before next milestone) | P2 (when convenient)
{description}
```

Status: `[ ]` open, `[x]` resolved.

---

### FB-1: Remove dot grid canvas background `[x]`
**Milestone**: M4a
**Priority**: P1
The dot grid background is a FigJam feature, not Figma Design. The canvas
background should be a flat solid color (Figma uses `#f5f5f5` / a neutral
light gray with no pattern).

### FB-2: Prevent browser zoom on pinch gesture `[x]`
**Milestone**: M4a
**Priority**: P0
Pinch-to-zoom on the trackpad is zooming the browser window instead of (or in
addition to) zooming the canvas viewport. Add a top-level `wheel` event
listener with `{ passive: false }` that calls `preventDefault()` when
`e.ctrlKey` is true (trackpad pinch events report as ctrl+wheel). This should
be on the `document` or `body` level to catch events before the browser's
native zoom kicks in.

### FB-3: Use FPL ScrubbableInputs in properties panel `[x]`
**Milestone**: M6
**Priority**: P1
The numeric inputs in the right sidebar properties panel (X, Y, W, H, rotation,
opacity, corner radius, stroke weight, fill/stroke opacity) are currently plain
`<input>` elements. Replace them with FPL `ScrubbableInput` components from
`@figma/fpl-components` for the proper Figma-style scrub-to-adjust behavior and
visual consistency.

### FB-4: Properties panel should not scroll horizontally `[x]`
**Milestone**: M6
**Priority**: P1
The right sidebar properties panel is horizontally scrollable, which it should
not be. All content should fit within the fixed 260px sidebar width. Ensure
`overflow-x: hidden` or constrain children so nothing overflows horizontally.

### FB-5: Use FPL ScrollContainer for all scrollable areas `[x]`
**Milestone**: general
**Priority**: P1
All scrollable regions (left sidebar layers list, right sidebar properties
panel) should use the FPL `ScrollContainer` component from `@figma/fpl-components`
instead of raw `overflow-auto`. This gives Figma-style thin scrollbars and
consistent scroll behavior.

### FB-6: Use FPL Tabs for Design/Prototype tabs `[x]`
**Milestone**: M6
**Priority**: P2
The Design/Prototype tab switcher in the right sidebar header is currently
custom `<button>` elements. Replace with the FPL `Tabs` component from
`@figma/fpl-components` for proper tab semantics, keyboard navigation, and visual
consistency with Figma's design system.

### FB-7: Show pixel grid at 400%+ zoom `[x]`
**Milestone**: M4a
**Priority**: P2
When the viewport zoom level reaches 400% or higher, render a 1px pixel grid
over the canvas background. This matches Figma's behavior — faint lines at
every world-space pixel boundary help with pixel-perfect alignment. The grid
should be drawn on the canvas background layer (CSS or a background `<canvas>`)
and only appear when `scale >= 4`. Lines should be very subtle (e.g. light gray
at ~10% opacity).

### FB-8: Use FPL Select for all dropdowns `[x]`
**Milestone**: M6
**Priority**: P1
The stroke position dropdown in the properties panel uses a native `<select>`
element. Replace all `<select>` elements with the FPL `Select` component from
`@figma/fpl-components` for consistent styling and behavior with Figma's design
system.

### FB-9: Action dispatch system with global keyboard shortcuts `[x]`
**Milestone**: general
**Priority**: P1
Create a centralized action system with two parts:

1. **Action registry**: A singleton that maps action names (strings like
   `"select-all"`, `"delete"`, `"zoom-to-fit"`, `"tool.move"`) to handler
   functions. Components register/unregister handlers via a hook like
   `useAction("delete", handler)`. Multiple handlers per action are fine
   (last-registered wins, or a priority system).

2. **Keyboard shortcut map**: A declarative binding from key combos to action
   names (e.g. `{ "Mod+A": "select-all", "Backspace": "delete", "V":
   "tool.move" }`). A single top-level keydown listener dispatches the
   matching action. Skips dispatch when focus is in a text input.

This replaces the ad-hoc `keydown` listeners scattered across components (e.g.
tool shortcuts in `bottom-toolbar.tsx`) and gives a single place to see/manage
all shortcuts. Wire into `<Providers>` or `<App>`.

### FB-10: Left sidebar missing top-left icons `[x]` (superseded by FB-57)
**Milestone**: M9
**Priority**: P2
The north star shows a hamburger/settings icon and a component icon in the
top-left corner of the left sidebar, above the "Untitled" file name. Add these
icons to match the target layout.

### FB-11: Left sidebar missing File/Assets tabs `[x]`
**Milestone**: M9
**Priority**: P2
The north star has "File" and "Assets" tabs with a search icon below the file
header, above the Pages section. Add these tabs to match the target layout.

### FB-12: Pages section missing + button `[x]`
**Milestone**: M9
**Priority**: P2
The "Pages" section header in the north star has a + button on the right side
for adding new pages. Add this icon button.

### FB-13: Layer ordering reversed vs north star `[x]`
**Milestone**: M5
**Priority**: P1
The north star shows Ellipse 1 above Rectangle 1 in the layers panel (topmost
in z-order appears first). Our layers panel shows Rectangle 1 first. Layers
should be listed in reverse scene graph order so visually-on-top nodes appear at
the top of the list, matching Figma's convention.

### FB-14: Properties panel missing alignment buttons `[x]`
**Milestone**: M6
**Priority**: P2
The north star Position section has an "Alignment" sub-header with 6 alignment
buttons (3 horizontal + 3 vertical). Add these to match the target.

### FB-15: Properties panel missing sub-labels `[x]`
**Milestone**: M6
**Priority**: P2
The north star uses sub-labels within sections: "Alignment", "Position",
"Rotation" within the Position section; "Dimensions" within Layout; "Opacity"
and "Corner radius" within Appearance. Add these labels to match the visual
hierarchy.

### FB-16: Appearance section missing header icons `[x]`
**Milestone**: M6
**Priority**: P2
The north star Appearance section header has eye (visibility) and blend mode
icons on the right side. Add these to match.

### FB-17: Fill/Stroke sections missing action icons `[x]`
**Milestone**: M6
**Priority**: P2
The north star Fill and Stroke section headers have settings (gear) and + icons
on the right. Each fill/stroke row has an eye (visibility) toggle and a minus
(remove) button. Add these action icons to match.

### FB-18: Missing top-right header (avatar, play, share) `[x]`
**Milestone**: M9
**Priority**: P2
The north star has a top-right area with the user avatar (colored circle with
initial), a play/preview button, and a blue "Share" button. This needs its own
region in the layout, likely above the right sidebar.

### FB-19: Toolbar missing chevron dropdowns `[x]` (superseded by FB-46)
**Milestone**: M8
**Priority**: P2
The north star toolbar shows small chevron/dropdown indicators on several tool
buttons (Move, Frame, Ellipse, Component, Pen). These open sub-menus for
selecting shape variants. Add chevron indicators and dropdown menus.

### FB-20: Toolbar missing additional tools `[x]` (superseded by FB-46)
**Milestone**: M8
**Priority**: P2
The north star toolbar has additional tools beyond what we have: boolean
operations icon, a separator, and right-side tools (dev mode, hand tool, etc.).
Add these to match the full toolbar layout.

### FB-21: Properties panel constrain proportions toggle `[x]`
**Milestone**: M6
**Priority**: P2
The north star Layout section has a constrain proportions toggle icon (chain
link) to the right of the W/H inputs. Add this toggle that locks the aspect
ratio when resizing.

### FB-22: Wrap toolbar in FPL ToolbarPrimitive `[x]`
**Milestone**: M8
**Priority**: P1
The bottom toolbar should be wrapped in an FPL `ToolbarPrimitive` component from
`@figma/fpl-components` so it acts as a single tab stop and uses arrow keys to shift
focus between tool buttons. This gives proper toolbar keyboard navigation
semantics per WAI-ARIA toolbar pattern.

### FB-23: Default scene should be Figma logo in a frame `[x]`
**Milestone**: general
**Priority**: P1
Replace the current demo scene (a blue rectangle and peach ellipse) with the
Figma logo built from scene graph primitives, wrapped in a Frame node. The logo
is composed of overlapping rounded rectangles and ellipses in Figma's brand
colors (red, orange, green, purple, blue). This makes the default state more
visually impressive and demonstrates frame/child hierarchy.

### FB-24: Pull in @figma/fpl-tailwind-config `[x]`
**Milestone**: general
**Priority**: P1
Use the shared `@figma/fpl-tailwind-config` package from `fpl/foundations/tailwind-config`
as the Tailwind CSS configuration for protofig. This ensures we're using the
canonical FPL design tokens (colors, spacing, radius, etc.) and keeps the app
consistent with other FPL apps. Add it as a dependency and wire it into the
Tailwind/Vite config.

### FB-25: Tailwind ESLint rules for design system tokens `[x]`
**Milestone**: general
**Priority**: P2
Set up Tailwind ESLint rules to ensure we're only ever using tokens from the FPL
design system in our utility classes. This prevents ad-hoc color values, spacing,
and other arbitrary values from creeping in. Should be configured after FB-24
(@figma/fpl-tailwind-config) is wired up so the allowed values match the token set.

### FB-26: Use Figma's favicon `[x]`
**Milestone**: general
**Priority**: P2
Replace the default React Router / Vite favicon with Figma's favicon so the
browser tab looks authentic. Use the same `.ico` or `.svg` that Figma serves
at `https://www.figma.com/favicon.ico`.

### FB-27: Pinch-to-zoom sometimes zooms the browser instead of the canvas `[x]`
**Milestone**: M4a
**Priority**: P1
Occasionally pinch-to-zoom zooms the entire browser page instead of the canvas
viewport. Once it happens, the only fix is a full page refresh. Suspect this is
related to Vite HMR — when a React component hot-reloads, the `useEffect`
cleanup in `<App>` removes the `wheel` event listener with `{ passive: false }`,
and if the new listener isn't re-attached quickly enough (or at all due to an
HMR edge case), the browser's native zoom takes over. Investigate whether the
listener should be moved outside React (e.g. a plain `<script>` in
`index.html` or a module side-effect) so it survives hot reloads.

### FB-28: Selection handles should only be at corners `[x]`
**Milestone**: M7
**Priority**: P1
The selection overlay currently draws resize handles at all 8 positions (4
corners + 4 edge midpoints). Figma only shows handles at the 4 corners. Remove
the midpoint handles from the selection overlay canvas drawing code.

### FB-29: Resizable sidebars with FPL ResizeHandle `[x]`
**Milestone**: M9
**Priority**: P2
Both the left and right sidebars should be resizable by dragging their inner
edge. Use the FPL `ResizeHandle` component from `@figma/fpl-components` for the drag
affordance. Create a reusable `ResizablePanel` component that wraps a sidebar
and manages the drag state, clamping width between a min and max. The `<App>`
grid should use CSS custom properties (or state) for column widths so
`ResizablePanel` can update them. Default widths remain 240px (left) and 260px
(right).

### FB-30: Visual fidelity pass — match actual Figma styles `[x]`
**Milestone**: M9
**Priority**: P1
The overall styling (spacing, font sizes, section headers, sidebar chrome,
toolbar, etc.) is noticeably different from real Figma. Improve the feedback
loop by using the Playwright MCP to navigate to `https://www.figma.com` (or a
local Figma file), take screenshots of specific UI regions (left sidebar, right
sidebar, toolbar), and extract computed CSS values (font-size, padding, gap,
colors, border-radius, heights) from real Figma elements. Use those exact values
to update protofig's components region-by-region until each panel closely
matches. Approach: open Figma in one tab and protofig in another, screenshot
matching regions side-by-side, and diff.

### FB-31: Section labels should not be ALL CAPS `[x]`
**Milestone**: general
**Priority**: P1
Section headers like "PAGES", "LAYERS", "POSITION", "LAYOUT", "APPEARANCE",
"FILL", "STROKE", "EFFECTS", "EXPORT" are rendered in `uppercase` via the
Tailwind class. Real Figma uses sentence case (e.g. "Pages", "Layers",
"Position"). Remove the `uppercase` and `tracking-wide` classes from the
`SectionHeader` and `PropertySection` components in both `left-sidebar.tsx` and
`right-sidebar.tsx`.

### FB-32: Selection outline doesn't update when changing position in properties panel `[x]`
**Milestone**: M7
**Priority**: P1
When a node is selected and you change its X or Y position via the right
sidebar properties panel, the canvas rendering updates (the node moves) but
the selection overlay (blue outline + resize handles) stays in the old
position. The overlay should re-render whenever the selected node's geometry
changes.

### FB-33: No-selection state should show canvas background controls `[x]`
**Milestone**: M9
**Priority**: P2
When nothing is selected, the right sidebar currently shows a plain
"No selection" message. Real Figma shows a "Page" header with a background
color picker (swatch + hex input), a "Local variables" button, and a
"Local styles" button. Replace the empty state with these controls to match
Figma's behavior. The background color picker can be wired to the canvas
background color (currently hardcoded `#f5f5f5`).

### FB-34: Right sidebar header layout — avatar should be left-aligned `[x]`
**Milestone**: M9
**Priority**: P1
The top row of the right sidebar header (avatar, play, share) currently has
`justify-end` so everything is right-aligned. In real Figma the avatar is
left-aligned and the play + share buttons are right-aligned with a spacer
between them. Change the layout to put the avatar first with `mr-auto` (or
use `justify-between` with a wrapper) so the avatar sits on the left and the
action buttons sit on the right.

### FB-35: Layer row selection background should be 24px tall with md rounding `[x]`
**Milestone**: M5
**Priority**: P1
Layer rows in the left sidebar are correctly 32px tall overall, but the
visible selected/hover background highlight should only be 24px tall (centered
within the 32px row) with `rounded-md` rounding. Currently the background
fills the full 32px row height. Separate the outer row height from the inner
highlight area — e.g. use an inner wrapper or padding so the colored
background is 24px with `rounded-md`.

### FB-36: Drag to move selected nodes on canvas `[x]`
**Milestone**: M7
**Priority**: P1
Clicking a node on the canvas selects it, but there's no way to drag it to a
new position. When the Move tool is active and the user clicks and drags a
selected node, its X/Y position should update in real-time as the mouse moves.
This requires tracking mousedown → mousemove → mouseup on the canvas,
converting screen-space deltas to world-space via the viewport transform, and
calling `store.updateNode(id, { x, y })` on each mousemove. The selection
overlay should follow the node as it moves (related to FB-32).

### FB-37: Add main menu button to top-left of left sidebar `[x]`
**Milestone**: M9
**Priority**: P2
The north star shows a hamburger/main menu icon button in the top-left corner
of the left sidebar, above or beside the "Untitled" file name. Add an icon
button (e.g. `Icon16Menu` or similar from `@figma/fpl-icons`) to the left of the
file header for the main menu. It doesn't need to open anything yet — just
the visual affordance.

### FB-38: Selection outlines and hit targets wrong for nested (child) nodes `[x]`
**Milestone**: M7
**Priority**: P0
Nodes that are children of a Frame render at the correct position on canvas
(the canvas renderer applies parent transforms), but the selection overlay
and hit-test system use only the node's own `x`/`y` values without
accumulating ancestor offsets. This means selection outlines and click targets
appear at the wrong location for any node nested inside a frame. Both the
selection overlay drawing code (`selection/overlay.tsx`) and the hit-test
function (`selection/hit-test.ts`) need to compute world-space bounds by
walking up the parent chain and summing ancestor positions. The drag system
in `canvas-area.tsx` may also need adjustment.

### FB-39: Properties panel text icons should be in 24x24px boxes `[x]`
**Milestone**: M6
**Priority**: P1
The text-based icons in the properties panel `ScrubbableInput` fields (X, Y,
W, H, R, %, Wt) are just raw `<span>` elements. They should be wrapped in a
24x24px box for consistent sizing and alignment. Create a `CharIcon` helper
component that renders a character in a centered 24x24px container and use it
in the `NumericField` component's `ScrubbableInput.Icon` slot.

### FB-40: Main menu with Preferences > Theme submenu `[x]`
**Milestone**: M9
**Priority**: P2
Use FPL's `MenuV2` component to add a menu to the hamburger/main menu icon
button in the left sidebar `FileHeader`. The menu should contain a
"Preferences" item with a "Theme" submenu offering Light, Dark, and System
options. Wire the menu trigger to the existing `IconButton` in `FileHeader`.
The menu doesn't need to do anything yet — just render the correct structure
with `MenuV2`.

### FB-41: Theme switching (Light / Dark / System) `[x]`
**Milestone**: M9
**Priority**: P2
Wire the Light/Dark/System theme options from the main menu (FB-40) to
actually update the app's theme. Use FPL's `ThemeProvider` to control the
active theme. Store the user's preference (light/dark/system) in React state
(or localStorage for persistence across reloads). When "System" is selected,
follow the OS `prefers-color-scheme` media query. The theme preference should
be managed in a provider so it's accessible app-wide.

### FB-42: Default scene should match Figma logo SVG accurately `[x]`
**Milestone**: general
**Priority**: P2
The default demo scene builds a Figma logo from scene graph primitives, but it
doesn't match the actual Figma logo accurately. Use the exact shapes and colors
from the Figma logo SVG (`public/favicon.svg`) as a reference:
- Red (#FF3737): top-left rounded rect
- Orange (#FF7237): top-right rounded rect
- Purple (#874FFF): middle-left rounded rect
- Blue (#00B6FF): middle-right circle
- Green (#24CB71): bottom-left rounded rect (with full bottom rounding)
Match the proportions and positioning from the SVG viewBox (64x64).

### FB-43: Zoom to fit keyboard shortcut `[x]`
**Milestone**: M4a
**Priority**: P1
Bind the `1` key to a "zoom to fit" action that zooms and pans the canvas
viewport so that all scene graph nodes fit within the visible area with some
padding. The implementation should:
1. Register a `zoom-to-fit` action in the action system
2. Bind the `1` key to it in the keyboard shortcut map
3. Compute the world-space bounding box of all root nodes
4. Calculate the scale and offset needed to center that bounding box in the
   canvas area with ~48px padding on each side
5. Update the viewport state with the new transform

### FB-44: Background color picker doesn't update canvas background `[x]`
**Milestone**: M9
**Priority**: P1
The background color picker in the no-selection state (FB-33) renders a swatch
and hex input but changing the color doesn't actually update the canvas
background. The `bgColor` state in `NoSelectionState` is local and not wired to
anything. It needs to update the canvas container's `background-color` style
(currently hardcoded to `#f5f5f5` in `canvas-area.tsx`). Either lift the
background color into a shared provider/context or pass a callback that updates
the canvas element's style directly.

### FB-45: Show frame names above top-level frames on canvas `[x]`
**Milestone**: M9
**Priority**: P2
In real Figma, top-level Frame nodes display their name above the frame on the
canvas — a small label positioned just above the top-left corner of the frame,
rendered in a muted gray text. This label is part of the canvas chrome (not the
node itself) and scales with the viewport so it remains readable at different
zoom levels. Add these labels for any Frame node at the root of the document
(depth 0). The label should be positioned in world space above the frame and
rendered as part of the canvas renderer or as an overlay element.

### FB-46: Toolbar should match Figma exactly `[x]`
**Milestone**: M9
**Priority**: P1
The toolbar should be a pixel-accurate match to real Figma's toolbar, even if
some buttons are non-functional stubs. This supersedes FB-19 (chevron dropdowns)
and FB-20 (additional tools). Reference a real Figma screenshot to get the exact
set of tools, their icons, grouping, separators, and chevron indicators. The
toolbar should include: Move (with chevron), Scale, Frame (with chevron),
Rectangle (with chevron — rectangle, line, arrow, ellipse, polygon, star,
image/video), Pen (with chevron — pen, pencil), Text, Resources/Components,
Hand tool, and Comment tool. Add separators between logical groups. Buttons
without functionality should still render with correct icons and hover states.

### FB-47: Background row needs opacity and visibility icon `[x]`
**Milestone**: M9
**Priority**: P1
In real Figma's no-selection state, the background color row shows:
swatch + hex input + "100" + "%" + eye icon. Protofig only shows swatch + hex.
Add an opacity numeric field (100%) and visibility toggle eye icon to match.

### FB-48: No-selection sections should be "Styles" and "Export" with + icons `[x]`
**Milestone**: M9
**Priority**: P1
Real Figma's no-selection state shows "Styles" (not "Local styles") with a "+"
icon, and "Export" with a "+" icon. Protofig shows "Local variables" and
"Local styles" without "+" icons, and is missing "Export". Remove
"Local variables", rename "Local styles" to "Styles", add "Export", and add "+"
action icons to both section headers.

### FB-49: Node header should show action icons `[x]`
**Milestone**: M9
**Priority**: P1
In real Figma, the selected node header shows the node name plus 4 action icons
on the right: settings (gear), focus/target, clipboard (duplicate), and "..."
(more options). Protofig only shows the node type icon + name with no actions.
Add these 4 icon buttons to the node header row.

### FB-50: Alignment buttons need separator between groups `[x]`
**Milestone**: M9
**Priority**: P2
Real Figma has a visible separator/gap between the 3 horizontal alignment
buttons and the 3 vertical alignment buttons. Protofig renders all 6 in a
continuous row. Add a small separator (vertical line or 8px gap) between the
third and fourth buttons.

### FB-51: Rotation row should include flip and options icons `[x]`
**Milestone**: M9
**Priority**: P2
In real Figma, the rotation row shows: rotation icon + angle value + "°", then
flip horizontal, flip vertical, and "more transform options" icons. Protofig
only shows the rotation input. Add the flip icons and options button to the
right side of the rotation row.

### FB-52: Constrain proportions icon should be right of W/H `[x]`
**Milestone**: M9
**Priority**: P1
In real Figma, the W and H inputs are side by side in a 2-column grid, and the
constrain proportions icon is to the far RIGHT (after both inputs), not between
them. Protofig places the icon between W and H. Move the constrain icon to the
right of the H input to match: `[W input] [H input] [constrain icon]`.

### FB-53: Opacity and corner radius should be on the same row `[x]`
**Milestone**: M9
**Priority**: P1
In real Figma's Appearance section, opacity and corner radius are on the SAME
row: `[layer swatch] 100% [corner icon] 0 [independent corners icon]`.
Protofig stacks them vertically with sub-labels ("Opacity" then "Corner
radius"). Combine them into a single row layout matching Figma. The layer swatch
in the opacity field shows the node's fill color as a small square.

### FB-54: Remove sub-labels from properties panel `[x]`
**Milestone**: M9
**Priority**: P1
Real Figma does NOT show sub-labels like "Alignment", "Position", "Rotation",
"Dimensions", "Opacity", or "Corner radius" inside property sections. These
were added in FB-15 but they make the UI look different from Figma. The section
headers ("Position", "Layout", "Appearance") are sufficient — the inputs are
self-explanatory with their icon labels. Remove all sub-labels.

### FB-55: Fill/Stroke header icons should be settings + plus `[x]`
**Milestone**: M9
**Priority**: P1
In real Figma, Fill and Stroke section headers show a settings icon (grid/4-dot
icon) and a "+" icon on the right. The "-" (remove) button appears in the ROW
itself (after the eye icon), not in the header. Protofig has "+" and "-" in the
header. Move "-" from header to the row (after eye icon), and add a settings
icon before the "+".

### FB-56: Effects and Export sections need + icons `[x]`
**Milestone**: M9
**Priority**: P2
In real Figma, both "Effects" and "Export" section headers have a "+" icon for
adding new items. Protofig renders these as plain text labels with no action
icons. Add "+" icon buttons to both headers.

### FB-57: Left sidebar needs vertical icon rail `[ ]`
**Milestone**: M9
**Priority**: P2
Real Figma has a narrow vertical icon rail on the far left of the sidebar with
icons for: Figma menu, Pages (file icon), Assets (plus icon), Search, Layers,
Components, and Settings. The currently selected panel is highlighted in blue.
Protofig uses a hamburger menu + tabs instead. Add this icon rail to match
Figma's layout. This supersedes FB-10.

### FB-58: Click-and-drag on unselected node should work immediately `[x]`
**Milestone**: M7
**Priority**: P1
Currently, clicking an unselected node on the canvas selects it but you can't
start dragging in the same gesture — you have to click and release first, then
click and drag. In real Figma, clicking an unselected node and immediately
dragging moves it in one fluid motion. The issue is in `canvas-area.tsx`
`onPointerDown`: when the hit node isn't already selected, it calls
`selection.select(hitId)` but then doesn't populate `dragRef.current.nodeIds`
with the newly selected node (it reads from the still-empty selection). Fix by
including the hit node's ID in the drag nodeIds immediately.

### FB-59: Node dragging is jittery — use transform instead of top/left `[x]`
**Milestone**: M7
**Priority**: P1
Dragging nodes around the canvas is noticeably jittery. Investigate whether
the canvas renderer is positioning nodes with `top`/`left` CSS properties
(which trigger layout) vs `transform: translate()` (which is GPU-composited
and avoids layout). Switch to `transform: translate(x, y)` for node
positioning to get smooth 60fps drag performance. Also ensure the drag handler
uses `requestAnimationFrame` or batches updates efficiently.

### FB-60: Undo/redo stack for scene graph changes `[ ]`
**Milestone**: general
**Priority**: P3 (deferred — not needed for prototype)
Add an undo/redo system for scene graph changes (Cmd+Z / Cmd+Shift+Z). The
initial snapshot-based approach (structuredClone of the entire scene graph before
each mutation) was removed because it's too expensive. The next implementation
should store granular per-field diffs keyed by node ID — only recording the
previous value of each changed field. Keyboard shortcuts are already bound in
`shortcuts.ts` (`Mod+z` → `undo`, `Shift+Mod+z` → `redo`); just register
action handlers when the system is built.

### FB-61: Investigate text-[...px] classes — should use FPL typography tokens `[x]`
**Milestone**: general
**Priority**: P2
Investigated: FPL typography tokens (`text-display`, `text-heading-*`,
`text-body-*`) are semantic composite classes for document-level typography.
They don't provide small UI font sizes (11px, 12px, 13px). The arbitrary
`text-[11px]` values are the correct approach for protofig's sidebar/toolbar UI.

### FB-62: Support SVG paths in scene graph for accurate Figma logo `[x]`
**Milestone**: general
**Priority**: P2
Add a `VECTOR` or `PATH` node type to the scene graph that supports SVG path
data (`d` attribute). Update the canvas renderer to render these as `<svg>`
elements with `<path>` children. Then update the default demo scene to use the
actual Figma logo SVG paths from `public/favicon.svg` instead of approximating
with rectangles and ellipses.

### FB-64: Toolbar should be closer to the bottom of the screen `[x]`
**Milestone**: M9
**Priority**: P1
The bottom toolbar has too much space between it and the bottom edge of the
viewport. Real Figma positions the toolbar much closer to the bottom. Reduce
the `bottom-4` (16px) spacing to match Figma's tighter positioning.

### FB-63: Box selection highlight `[x]`
**Milestone**: M7
**Priority**: P1
When clicking on empty canvas and dragging, draw a selection rectangle (blue
semi-transparent box with a blue border) that follows the cursor. This is the
visual highlight only for now — actual multi-select from the box will be
implemented separately. The rectangle should be drawn in screen space on the
selection overlay canvas.

### FB-65: Canvas overlay should use rAF loop instead of React state `[ ]`
**Milestone**: general
**Priority**: P1
The selection overlay (`selection/overlay.tsx`) and box selection rectangle
(`canvas-area.tsx`) currently drive canvas redraws through React state —
`setDragBox()` triggers re-renders, and the overlay `useEffect` repaints on
every state/store change. This is wasteful and can cause jank during drag
operations. Instead, the overlay canvas should run a persistent
`requestAnimationFrame` loop that reads the current state (selection, viewport,
drag box coordinates) from refs and redraws every frame. The pointer event
handlers in `canvas-area.tsx` should write to mutable refs instead of calling
`setDragBox()`. The rAF loop checks if anything changed since the last frame
and only clears/redraws when needed. This decouples drawing from React's render
cycle entirely.

### FB-66: Pixel grid overlay should be behind toolbar but above canvas `[x]`
**Milestone**: general
**Priority**: P1
The pixel grid overlay div (FB-7) currently has `zIndex: 1`, which puts it above
the canvas content. It should render above the element layer (where shapes are
rendered) but behind the toolbar and other chrome. Ensure the z-index stacking
is: canvas background → rendered shapes → pixel grid → selection overlay →
toolbar / sidebars.

### FB-68: Canvas items are blurry around the edges at non-1x zoom `[x]`
**Milestone**: M4a
**Priority**: P1
Canvas items (shapes, frames, SVG vectors) appear blurry around the edges,
particularly noticeable when zoomed in or out. This is likely caused by the CSS
`matrix()` transform used for viewport zooming — the browser applies
sub-pixel anti-aliasing to the scaled DOM elements, causing soft/blurry edges
instead of crisp pixel-aligned rendering. Possible fixes:
1. Use `will-change: transform` on the world container to promote it to its own
   compositing layer (already set on individual nodes, but may need it on the
   parent too).
2. Add `transform: translateZ(0)` or `backface-visibility: hidden` to force
   GPU compositing which may produce crisper results.
3. Investigate whether rounding the transform's translate values to whole pixels
   (at the current scale) reduces sub-pixel blurriness.
4. Consider using `image-rendering: pixelated` or `image-rendering: crisp-edges`
   on SVG elements at high zoom levels.

### FB-69: Vector icon preview strokes are too small — need non-scaling stroke `[x]`
**Milestone**: general
**Priority**: P1
The `VectorPreviewIcon` component in both sidebars renders a 16x16 SVG with a
viewBox matching the node dimensions (e.g. `0 0 64 64`). The `strokeWidth={1}`
gets scaled down by the viewBox→viewport ratio (64→16 = 0.25px effective stroke),
making the paths nearly invisible. Add `vectorEffect="non-scaling-stroke"` to
the `<path>` elements so the 1px stroke stays 1px in screen space regardless of
the viewBox scaling.

### FB-67: Toolbar should be in its own layer, not a child of the canvas column `[x]`
**Milestone**: general
**Priority**: P1
The bottom toolbar is currently a child of the canvas area's grid cell
(`<div className="relative isolate overflow-hidden">` in `app.tsx`). This means
it moves as the sidebars are resized, since the canvas column shrinks/grows.
In real Figma, the toolbar is absolutely positioned relative to the full
viewport — it stays centered regardless of sidebar widths. Move `<BottomToolbar>`
out of the canvas column and into a separate absolutely-positioned layer that
spans the full viewport width, centered at the bottom. This also prevents it
from being clipped by the canvas area's `overflow-hidden`.
