# Bridge App — Visual Architecture & Design System

## Intent

**Human**: Developer on mobile, managing VPS tmux sessions. Previously using Termius but frustrated with scroll handling and session management.

**Must accomplish**: Quickly access tmux sessions, view terminal output, send commands, manage windows/panes — all from a touch interface.

**Feel**: Professional terminal emulator with session management, not a dashboard showing terminals. Dense, functional, command-oriented. Like opening a native terminal app, not a web app.

---

## Domain Exploration

### Product Domain
Terminal multiplexing, remote server administration, command-line workflows. The world of SSH, tmux/screen, REPL environments, infrastructure monitoring.

**Concepts from this world**:
- Terminal emulator (xterm, alacritty, kitty aesthetics)
- Multiplexer hierarchy: session → window → pane
- ANSI color palette (not material design colors)
- Status lines and powerline prompts
- Monospace typography for code/output
- Cursor styles (block, bar, underline)
- Scrollback buffers
- Key sequences (Ctrl+C, Ctrl+Z, tmux prefix)

### Color World
Physical spaces where this product lives:
- Server rooms: cool grays, indicator LEDs (green=active, amber=warning, red=error)
- Terminal emulators: deep blacks (#0a0a0a), phosphor greens, cyan prompts
- Code editors: syntax highlighting colors (blue keywords, orange strings, green comments)
- Network diagrams: connection lines in muted blues/grays
- Status dashboards: traffic lights (red/yellow/green) but desaturated for dark mode

**Actual colors that exist in this domain**:
- Terminal black: #0a0a0a to #1a1a1a
- ANSI green: #00ff00 (too bright) → desaturated: #3fb950
- ANSI cyan: #00ffff → #58a6ff
- ANSI yellow: #ffff00 → #d29922
- ANSI red: #ff0000 → #f85149
- Status gray: #30363d (tmux status line)
- Inactive text: #8b949e (grayed out commands)

### Signature Element
**Mobile modifier toolbar**: A floating toolbar with Ctrl, Alt, Esc, Tab, arrow keys, and tmux prefix (Ctrl+B). This element is unique to terminal management on mobile — no other product category has this. It should feel like a physical keyboard overlay, not a web UI component.

### Defaults to Reject
1. **Generic dashboard layout** (sidebar + cards + breadcrumbs) → Replace with: full-screen terminal view with collapsible session drawer
2. **Material Design aesthetic** (rounded corners, shadows, floating cards) → Replace with: flat terminal aesthetic, minimal borders, background color shifts for hierarchy
3. **Large padding and breathing room** → Replace with: dense layout like real terminals, 4px base unit
4. **Gradient backgrounds** → Replace with: flat colors, subtle noise texture optional
5. **Rounded buttons** → Replace with: sharp or minimal radius (2px max)

---

## Visual Architecture

### Layout Philosophy
Bridge app is a **terminal emulator first**, not a dashboard. The terminal should dominate the viewport. Session management is secondary — accessible but not always visible.

**Desktop (≥1024px)**:
```
┌─────────────────────────────────────────┐
│ Sidebar (280px)  │  Terminal Area        │
│ - Sessions list  │  - Active pane        │
│ - Windows        │  - xterm.js           │
│ - Quick actions  │  - Full height        │
└─────────────────────────────────────────┘
```

**Tablet (768-1023px)**:
```
┌─────────────────────────────────────────┐
│ [≡] Session: dev              [user ▼]  │
├─────────────────────────────────────────┤
│                                         │
│  Terminal Area (full width)             │
│                                         │
└─────────────────────────────────────────┘
```
Sidebar becomes overlay drawer, triggered by hamburger icon.

**Mobile (<768px)**:
```
┌─────────────────────────────────────────┐
│ [≡] dev:main                  [•••]     │
├─────────────────────────────────────────┤
│                                         │
│                                         │
│  Terminal Area (full screen)            │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│ [Esc][Tab][Ctrl][Alt][C-b][↑][↓][←][→] │
└─────────────────────────────────────────┘
```
- Full-screen terminal (maximize vertical space)
- Mobile toolbar fixed at bottom (44px height)
- Top bar minimal (session name + menu)
- Sidebar as full-screen drawer

### Information Hierarchy

**Level 1 (Always visible)**:
- Active terminal pane
- Mobile toolbar (on mobile)
- Current session/window name (top bar)

**Level 2 (Accessible, not always visible)**:
- Session list (drawer)
- Window tabs (horizontal scroll below top bar on desktop)
- Pane indicators (if multiple panes in window)

**Level 3 (On-demand)**:
- Create new session/window
- Settings/preferences
- User menu

### Spacing System

Base unit: **4px** (terminal density)

```
Spacing scale:
--space-1: 4px   (icon gaps, tight padding)
--space-2: 8px   (button padding, list item spacing)
--space-3: 12px  (card padding, section gaps)
--space-4: 16px  (major section separation)
--space-5: 24px  (page margins on mobile)
--space-6: 32px  (page margins on desktop)
```

**Terminal-specific spacing**:
- Terminal padding: 8px (space-2)
- Between terminal panes: 2px (hairline gap)
- Toolbar button padding: 12px 8px (space-3 space-2)
- List item height: 36px (space-3 * 3)

### Border Radius Scale

Sharp aesthetic, minimal rounding:

```
--radius-sm: 2px   (buttons, inputs)
--radius-md: 4px   (cards, modals)
--radius-lg: 8px   (drawer corners, mobile only)
```

**Never use**: Large radius (12px+), pill shapes, circular buttons (except avatars).

---

## Design System

### Color Tokens

```css
/* Background hierarchy (darkest to lightest) */
--bg-canvas: #0d1117;           /* Page background */
--bg-surface: #161b22;          /* Cards, sidebar, drawers */
--bg-surface-raised: #1c2128;   /* Dropdowns, modals */
--bg-surface-overlay: #2d333b;  /* Tooltips, mobile toolbar */

/* Border hierarchy */
--border-default: #30363d;      /* Standard borders */
--border-muted: #21262d;        /* Subtle separators */
--border-subtle: rgba(240, 246, 252, 0.1);  /* Very subtle */

/* Text hierarchy */
--fg-default: #c9d1d9;          /* Primary text */
--fg-muted: #8b949e;            /* Secondary text */
--fg-subtle: #6e7681;           /* Tertiary/disabled */
--fg-on-emphasis: #ffffff;      /* Text on colored backgrounds */

/* Semantic colors (ANSI-inspired) */
--accent-primary: #58a6ff;      /* Cyan/blue - links, active states */
--accent-secondary: #79c0ff;    /* Lighter blue - hover */
--success: #3fb950;             /* Green - attached sessions, success */
--success-muted: #238636;       /* Darker green - backgrounds */
--warning: #d29922;             /* Yellow/amber - warnings */
--danger: #f85149;              /* Red - errors, destructive */
--danger-muted: #da3633;        /* Darker red - backgrounds */

/* Terminal-specific */
--terminal-bg: #0d1117;         /* xterm.js background */
--terminal-fg: #c9d1d9;         /* xterm.js foreground */
--terminal-cursor: #58a6ff;     /* Cursor color */
--terminal-selection: rgba(88, 166, 255, 0.3);  /* Selection */

/* Interactive states */
--hover-bg: rgba(110, 118, 129, 0.1);
--active-bg: rgba(110, 118, 129, 0.2);
--focus-ring: rgba(88, 166, 255, 0.4);
```

**Why these colors**: Sourced from ANSI terminal palette and GitHub's dark mode (which itself is terminal-inspired). The cyan/blue accent (#58a6ff) is the classic "cyan" from ANSI, desaturated for dark mode. Green (#3fb950) is the classic "green" for success/active states.

### Typography

**Font families**:
```css
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'Liberation Mono', monospace;
```

**Type scale** (base 14px, 1.25 ratio for terminal density):
```css
--text-xs: 11px;      /* Captions, badges */
--text-sm: 12px;      /* Secondary text, list items */
--text-base: 14px;    /* Body text, inputs */
--text-lg: 16px;      /* Subheadings */
--text-xl: 18px;      /* Page titles */
--text-2xl: 24px;     /* Hero numbers (session count) */
```

**Font weights**:
- Regular (400): Body text
- Medium (500): Buttons, labels, list items
- Semibold (600): Headings, emphasis

**Line heights**:
- Tight (1.25): Headings, single-line UI
- Normal (1.5): Body text, descriptions
- Relaxed (1.75): Long-form text (rare in this app)

**Monospace usage**:
- Terminal output (xterm.js): 14px desktop, 13px mobile
- Code snippets, command names: 13px
- Session/window names: 13px mono for technical feel

### Border & Depth System

**Border approach**: Minimal borders, rely on background color shifts.

```css
/* Border weights */
--border-width-hairline: 1px;   /* Standard */
--border-width-thick: 2px;      /* Focus rings, active states */

/* Usage */
border: 1px solid var(--border-default);  /* Cards, inputs */
border-bottom: 1px solid var(--border-muted);  /* List separators */
border-left: 2px solid var(--accent-primary);  /* Active session indicator */
```

**Depth strategy**: Background color shifts, not shadows.

```
Elevation 0 (canvas): --bg-canvas
Elevation 1 (surface): --bg-surface
Elevation 2 (raised): --bg-surface-raised
Elevation 3 (overlay): --bg-surface-overlay
```

**No box-shadows** except for:
- Mobile toolbar (to separate from terminal): `0 -2px 8px rgba(0,0,0,0.3)`
- Dropdowns (rare): `0 4px 12px rgba(0,0,0,0.4)`

### Component States

**Interactive elements** (buttons, list items, tabs):

```css
/* Default */
background: transparent;
color: var(--fg-default);
border: 1px solid var(--border-default);

/* Hover */
background: var(--hover-bg);

/* Active (pressed) */
background: var(--active-bg);

/* Focus */
outline: 2px solid var(--focus-ring);
outline-offset: 2px;

/* Disabled */
opacity: 0.5;
cursor: not-allowed;
```

**Data states** (for SessionList, WindowTabs, etc.):

1. **Loading**: Skeleton rows (gray rectangles) or spinner
2. **Empty**: Icon + message + CTA button
3. **Error**: Red border + error message + retry button
4. **Data**: Normal rendering

---

## Component Guide

### 1. LoginForm

**Purpose**: Minimal authentication screen.

**Layout**:
- Centered vertically and horizontally
- Max width 320px
- No sidebar, no top bar

**Structure**:
```
[App logo/name] (24px, mono, centered)

[Username input] (full width, 40px height)
[Password input] (full width, 40px height)

[Sign in button] (full width, 40px height, accent color)

[Error message] (if present, danger color, 12px)
```

**Tokens**:
- Background: `--bg-canvas`
- Input background: `--bg-surface`
- Input border: `--border-default`
- Button background: `--accent-primary`
- Button text: `--fg-on-emphasis`

**Implementation notes**:
- Inputs have 2px radius
- Focus ring: `--focus-ring`
- Error state: inputs get `--danger` border
- Button has no hover state on mobile (touch device)

### 2. AppShell

**Purpose**: Main layout container with responsive sidebar.

**Desktop (≥1024px)**:
```css
display: grid;
grid-template-columns: 280px 1fr;
height: 100vh;
overflow: hidden;
```

**Tablet (768-1023px)**:
```css
/* Sidebar is overlay drawer */
position: relative;
height: 100vh;
/* Sidebar: position: fixed, left: 0, transform: translateX(-100%) when closed */
```

**Mobile (<768px)**:
```css
/* Full-screen, sidebar is drawer */
flex-direction: column;
height: 100vh;
height: 100dvh; /* Dynamic viewport for mobile browsers */
```

**Sidebar width**: 280px (desktop), 260px (tablet drawer)

**Sidebar background**: `--bg-surface` (slightly lighter than canvas)

**Sidebar border**: `border-right: 1px solid var(--border-default)`

### 3. SessionList

**Purpose**: Scrollable list of tmux sessions in sidebar.

**Structure**:
```
[Sidebar header]
  [App name] [User menu icon]

[Session items] (scrollable)
  [Session 1] (active)
  [Session 2]
  [Session 3]

[Create session button] (fixed at bottom)
```

**Session item**:
```
┌─────────────────────────────┐
│ ● dev                    3w │  ← Name (mono) + window count
│   attached                    │  ← Status (muted text)
└─────────────────────────────┘
```

- Height: 48px
- Padding: 12px
- Background: transparent (default), `--active-bg` (selected)
- Left border: 2px `--accent-primary` when active
- Status dot: 8px circle, `--success` if attached, `--fg-muted` if detached
- Window count: right-aligned, muted text

**Create session button**:
- Fixed at bottom of sidebar
- Full width, 40px height
- Icon (+) + "New session" text
- Background: `--bg-surface-raised`

**States**:
- Loading: 3 skeleton rows (gray rectangles)
- Empty: "No sessions" + "Create your first session" button
- Error: Red border + "Failed to load sessions" + retry

### 4. WindowTabs

**Purpose**: Horizontal tabs for windows within a session.

**Desktop layout**:
```
┌─────────────────────────────────────────┐
│ [Window 1] [Window 2] [Window 3]        │
├─────────────────────────────────────────┤
│ Terminal area                            │
└─────────────────────────────────────────┘
```

**Mobile layout** (horizontal scroll):
```
┌─────────────────────────────────────────┐
│ [Win 1] [Win 2] [Win 3] [Win 4] →      │
├─────────────────────────────────────────┤
│ Terminal area                            │
└─────────────────────────────────────────┘
```

**Tab structure**:
```
┌──────────────────┐
│ main          [x]│  ← Name + close icon (on hover)
└──────────────────┘
```

- Height: 36px
- Padding: 8px 16px
- Font: mono, 13px
- Background: transparent (inactive), `--bg-surface` (active)
- Border: `border-bottom: 2px solid var(--accent-primary)` when active
- Close icon: 16px, appears on hover (desktop) or long-press (mobile)

**Container**:
- Background: `--bg-canvas`
- Border-bottom: `1px solid var(--border-default)`
- Overflow-x: auto (mobile), visible (desktop)

**States**:
- Loading: 2 skeleton tabs
- Empty: Single "default" tab (can't be closed)
- Error: N/A (windows always exist if session exists)

### 5. PaneGrid

**Purpose**: Display multiple panes within a window.

**Layout logic**:
- 1 pane: full width, full height
- 2 panes: 50/50 split (horizontal or vertical based on tmux layout)
- 3+ panes: grid (2 columns, wrap)

**Desktop**:
```
2 panes (vertical split):
┌──────────────────┬──────────────────┐
│                  │                  │
│   Pane 1         │   Pane 2         │
│                  │                  │
└──────────────────┴──────────────────┘

2 panes (horizontal split):
┌─────────────────────────────────────┐
│                                     │
│   Pane 1                            │
│                                     │
├─────────────────────────────────────┤
│                                     │
│   Pane 2                            │
│                                     │
└─────────────────────────────────────┘
```

**Mobile**:
- Single pane visible at a time (full screen)
- Tab bar at top to switch panes (if multiple)

**Pane separator**:
- Width: 2px
- Background: `--border-default`
- Not draggable (read-only layout)

**Pane header** (if multiple panes):
```
┌─────────────────────────────────────┐
│ Pane 1: bash              [maximize]│
├─────────────────────────────────────┤
│ Terminal                             │
└─────────────────────────────────────┘
```
- Height: 28px
- Background: `--bg-surface`
- Font: mono, 12px
- Maximize icon: expands pane to full screen

### 6. TerminalView

**Purpose**: xterm.js instance with WebSocket connection.

**Structure**:
```
┌─────────────────────────────────────┐
│                                     │
│  xterm.js terminal                  │
│  (fills container)                  │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

**Container**:
- Background: `--terminal-bg`
- Padding: 8px
- Border: none (or 1px `--border-default` if in grid)
- Touch-action: `none` (disable pinch-zoom on terminal)

**xterm.js theme**:
```javascript
{
  background: '#0d1117',
  foreground: '#c9d1d9',
  cursor: '#58a6ff',
  cursorAccent: '#0d1117',
  selectionBackground: 'rgba(88, 166, 255, 0.3)',
  black: '#0d1117',
  red: '#f85149',
  green: '#3fb950',
  yellow: '#d29922',
  blue: '#58a6ff',
  magenta: '#bc8cff',
  cyan: '#39c5cf',
  white: '#c9d1d9',
  brightBlack: '#484f58',
  brightRed: '#ff7b72',
  brightGreen: '#7ee787',
  brightYellow: '#e3b341',
  brightBlue: '#79c0ff',
  brightMagenta: '#d2a8ff',
  brightCyan: '#56d4dd',
  brightWhite: '#ffffff'
}
```

**Font**:
- Family: `--font-mono`
- Size: 14px (desktop), 13px (mobile)
- Line height: 1.2

**Scrollbar**:
- Custom styled (not browser default)
- Width: 6px
- Track: transparent
- Thumb: `--border-default`, rounded
- Thumb hover: `--fg-muted`

**Resize handling**:
- FitAddon: auto-resize to container
- Debounce: 100ms
- Send resize event to backend via WebSocket

**States**:
- Connecting: "Connecting..." overlay
- Connected: Normal terminal
- Disconnected: "Disconnected" overlay + reconnect button
- Error: Red overlay + error message + retry

### 7. MobileToolbar

**Purpose**: Floating keyboard overlay for mobile terminal control.

**Layout**:
```
┌─────────────────────────────────────────┐
│ [Esc][Tab][Ctrl][Alt][C-b][↑][↓][←][→] │
└─────────────────────────────────────────┘
```

**Structure**:
- Fixed at bottom, above mobile keyboard
- Height: 44px
- Background: `--bg-surface-overlay`
- Box-shadow: `0 -2px 8px rgba(0,0,0,0.3)` (to separate from terminal)
- Z-index: 1000 (above terminal)

**Buttons**:
- Min width: 44px (touch target)
- Height: 36px (leaves 4px padding top/bottom)
- Padding: 8px
- Font: mono, 13px, medium weight
- Background: `--bg-surface-raised`
- Border: 1px solid `--border-default`
- Border-radius: 2px

**Button states**:
- Default: `--bg-surface-raised`
- Pressed: `--active-bg`
- Sticky (Ctrl/Alt held): `--accent-primary` background, white text

**Sticky modifier logic**:
- Tap Ctrl → enters sticky mode (highlighted)
- Next key press → sends Ctrl+key, exits sticky mode
- Tap Ctrl again → exits sticky mode without sending

**Responsive button layout**:
- Portrait: All 9 buttons in single row, scrollable if needed
- Landscape: All 9 buttons fit without scroll

**Hide/show**:
- Auto-hide when mobile keyboard opens (detect via `visualViewport` API)
- Show when keyboard closes
- Manual toggle: long-press terminal → "Hide toolbar" option

### 8. Button Component

**Variants**:

**Primary** (accent):
```css
background: var(--accent-primary);
color: var(--fg-on-emphasis);
border: none;
/* Hover */
background: var(--accent-secondary);
```

**Secondary** (outline):
```css
background: transparent;
color: var(--fg-default);
border: 1px solid var(--border-default);
/* Hover */
background: var(--hover-bg);
```

**Danger**:
```css
background: var(--danger-muted);
color: var(--fg-on-emphasis);
border: none;
/* Hover */
background: var(--danger);
```

**Ghost** (minimal):
```css
background: transparent;
color: var(--fg-muted);
border: none;
/* Hover */
background: var(--hover-bg);
color: var(--fg-default);
```

**Sizes**:
- Small: height 28px, padding 4px 12px, font 12px
- Medium: height 36px, padding 8px 16px, font 14px
- Large: height 40px, padding 12px 20px, font 14px

**Border-radius**: 2px (sharp)

### 9. Input Component

**Structure**:
```
[Label] (optional, 12px, muted)
[Input field]
[Helper text] (optional, 12px, muted or danger)
```

**Input field**:
- Height: 40px
- Padding: 8px 12px
- Background: `--bg-surface`
- Border: 1px solid `--border-default`
- Border-radius: 2px
- Font: 14px

**States**:
- Default: `--border-default`
- Focus: `--border-default` + focus ring (`--focus-ring`)
- Error: `--danger` border
- Disabled: opacity 0.5

**Placeholder**: `--fg-subtle`

### 10. Modal Component

**Structure**:
```
┌─────────────────────────────────────┐
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Modal title            [x]    │  │
│  ├───────────────────────────────┤  │
│  │                               │  │
│  │ Modal content                 │  │
│  │                               │  │
│  ├───────────────────────────────┤  │
│  │        [Cancel] [Confirm]     │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

**Overlay**:
- Background: `rgba(0, 0, 0, 0.5)`
- Backdrop-filter: blur(4px) (optional, modern browsers)

**Modal container**:
- Max-width: 400px (desktop), 90% (mobile)
- Background: `--bg-surface-raised`
- Border: 1px solid `--border-default`
- Border-radius: 4px
- Box-shadow: `0 4px 12px rgba(0,0,0,0.4)`

**Header**:
- Padding: 16px
- Border-bottom: 1px solid `--border-muted`
- Title: 16px, semibold
- Close icon: 20px, right-aligned

**Content**:
- Padding: 16px

**Footer**:
- Padding: 16px
- Border-top: 1px solid `--border-muted`
- Buttons: right-aligned, 8px gap

---

## Implementation Notes

### Tailwind CSS v4 Setup

In `web/src/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-canvas: #0d1117;
  --color-surface: #161b22;
  --color-surface-raised: #1c2128;
  --color-surface-overlay: #2d333b;
  
  --color-border-default: #30363d;
  --color-border-muted: #21262d;
  
  --color-text-default: #c9d1d9;
  --color-text-muted: #8b949e;
  --color-text-subtle: #6e7681;
  
  --color-accent: #58a6ff;
  --color-accent-hover: #79c0ff;
  --color-success: #3fb950;
  --color-warning: #d29922;
  --color-danger: #f85149;
  
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
}
```

### Component File Structure

```
web/src/components/
├── auth/
│   ├── LoginForm.tsx
│   └── ProtectedRoute.tsx
├── layout/
│   ├── AppShell.tsx
│   ├── TopBar.tsx
│   └── Sidebar.tsx
├── session/
│   ├── SessionList.tsx
│   ├── SessionCard.tsx
│   ├── WindowTabs.tsx
│   ├── PaneGrid.tsx
│   └── CreateSessionButton.tsx
├── terminal/
│   ├── TerminalView.tsx
│   ├── TerminalTabs.tsx
│   └── MobileToolbar.tsx
└── ui/
    ├── Button.tsx
    ├── Input.tsx
    ├── Modal.tsx
    └── Spinner.tsx
```

### Key Interactions

1. **Session selection**: Click session in sidebar → update route to `/sessions/:id` → load windows → auto-select first window → show panes
2. **Window switching**: Click tab → update route to `/sessions/:id?window=:windowId` → load panes for that window
3. **Terminal focus**: Tap terminal → focus xterm.js → show mobile toolbar (if hidden)
4. **Mobile toolbar**: Tap modifier (Ctrl/Alt) → sticky mode → tap key → send key combo → exit sticky
5. **Sidebar drawer (mobile)**: Swipe right from left edge OR tap hamburger → open drawer → tap outside OR swipe left → close

### Animation & Transitions

```css
/* Fast micro-interactions */
--transition-fast: 100ms ease;

/* Standard transitions */
--transition-base: 150ms ease;

/* Drawer/modal animations */
--transition-slow: 200ms ease;

/* Sidebar drawer */
transform: translateX(-100%);
transition: transform var(--transition-slow);
/* Open state */
transform: translateX(0);

/* Modal */
opacity: 0;
transform: scale(0.95);
transition: opacity var(--transition-slow), transform var(--transition-slow);
/* Open state */
opacity: 1;
transform: scale(1);
```

### Accessibility

- All interactive elements have `:focus-visible` styles
- Touch targets minimum 44x44px
- Color contrast ratio ≥ 4.5:1 for text
- ARIA labels for icon-only buttons
- Keyboard navigation for desktop (Tab, Enter, Esc)
- Screen reader announcements for state changes (e.g., "Session created")

### Performance

- Lazy load TerminalView (code splitting)
- Virtualize session list if >50 sessions
- Debounce terminal resize events (100ms)
- Use `will-change: transform` for drawer animations
- Preload fonts (JetBrains Mono) in `<head>`

---

## Design Decisions Log

**Why no shadows?**
Terminal emulators are flat. Shadows imply depth/material design, which conflicts with the terminal aesthetic. Background color shifts provide hierarchy without shadows.

**Why sharp corners (2px radius)?**
Terminals are sharp. Kitty, Alacritty, iTerm2 all use sharp or minimal rounding. Large radius feels "app-like" not "terminal-like".

**Why dense spacing (4px base)?**
Real terminals are dense. Users want maximum content visibility. Generous padding wastes screen real estate, especially on mobile.

**Why ANSI colors?**
The product IS a terminal tool. Using ANSI-inspired colors (cyan accent, green success, red danger) reinforces the domain and feels authentic.

**Why monospace for session names?**
Session names are technical identifiers (like file names or command names). Monospace signals "this is code/technical" and improves readability for mixed-case names.

**Why mobile toolbar instead of gestures?**
Gestures are discoverable but slow. A toolbar with explicit Ctrl/Alt/Esc buttons is faster and more reliable for terminal workflows. Power users need speed.

**Why no breadcrumbs?**
The navigation is shallow: session → window → pane. Breadcrumbs add visual noise without value. Top bar shows current context sufficiently.
