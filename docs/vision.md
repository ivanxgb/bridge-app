# bridge-app — Visión de Diseño

## Qué es bridge-app

Una webapp mobile-first que reemplaza Termius. Te conectás a tus sesiones tmux desde el navegador con una UI táctil amigable. El caso de uso principal es "estoy en el celular y necesito ver/controlar mis sesiones de tmux en la VPS".

**Core loop:** Login → ver sidebar con sesiones tmux → click en una → ver terminales funcionando con xterm.js → toolbar táctil para teclas que no están en el teclado mobile.

## Audiencia & contexto

- **Usuario único (vos)** pero con multi-user soportado para futuro
- Dispositivos: celular (60%), tablet (25%), desktop (15%)
- Modo oscuro siempre (es una terminal)
- Conexión: HTTPS + WebSocket sobre la misma VPS donde corre tmux
- Input: toque + teclado físico si está disponible (tablet con keyboard case)

## Stack visual

- **Runtime:** React 19 + Tailwind CSS v4
- **Routing:** TanStack Router (type-safe, con lazy loading)
- **Server state:** TanStack Query (fetch + cache + auto-refetch de sesiones tmux)
- **Terminal:** @xterm/xterm + @xterm/addon-fit + @xterm/addon-webgl + @xterm/addon-web-links
- **Paleta:** GitHub dark mode colors — `#0d1117` bg, `#161b22` surfaces, `#30363d` borders, `#c9d1d9` text, `#58a6ff` accent, `#3fb950` success, `#f85149` danger

## Rutas y vistas

### `/login`
- Vista mínima, sin chrome. Solo un formulario centrado con username + password + botón "Sign in"
- Fondo oscuro sólido
- Sin sidebar ni topbar
- Transición rápida → dashboard al autenticar

### `/sessions` (Dashboard)
- **Layout desktop (≥1024px):** Sidebar izquierda fija 280px + content area principal
- **Layout tablet (768-1023px):** Sidebar overlay colapsable que se abre con hamburger o swipe
- **Layout mobile (<768px):** Full-screen, sidebar es un drawer que se abre con swipe desde la izquierda

**Sidebar content:**
- Header: "bridge-app" o logo, icono de usuario con dropdown (logout)
- Lista de sesiones tmux (scrollable):
  - Cada item muestra: nombre de sesión, cantidad de ventanas, indicador verde si está attached
  - Items expandibles — al expandir muestra ventanas y panes anidados
  - Active state visible (sesión seleccionada resaltada con borde/accent)
- Botón "+" para crear nueva sesión (modal o inline input)
- Footer sutil con versión

**Main content cuando no hay sesión seleccionada:**
- Estado vacío: icono de terminal, texto "Select a session from the sidebar"
- Si no hay sesiones tmux: "No tmux sessions running. Create one to get started."

### `/sessions/$sessionId` (Detalle de sesión)
- **Top area:** Tabs de ventanas (window tabs horizontales, scrollables horizontalmente en mobile)
- **Main area:** Grid de panes según el layout de tmux (si un window tiene 2 panes verticales, mostrar 2 TerminalView uno al lado del otro, etc.)
- **TerminalView:** instancia de xterm.js conectada por WebSocket al pane específico
- **Mobile toolbar:** barra fija abajo con botones táctiles para [Esc] [Tab] [Ctrl] [Alt] [C-b] [▲][▼][◀][▶]

## Sistema de componentes

### Componentes de Layout
| Componente | Props | Descripción |
|---|---|---|
| `AppShell` | `children` | Layout principal con sidebar + main. Maneja responsive breakpoints |
| `TopBar` | — | Barra superior con user menu. Solo visible en desktop/tablet |
| `Sidebar` | `open`, `onClose` | Panel lateral con lista de sesiones. Drawer en mobile, fixed en desktop |

### Componentes de Sesión
| Componente | Props | Descripción |
|---|---|---|
| `SessionList` | `sessions`, `activeId`, `onSelect` | Lista de sesiones con estados: loading, empty, error, data |
| `SessionCard` | `session`, `active`, `onClick` | Card expandible con nombre, ventanas, indicadores |
| `WindowTabs` | `windows`, `activeId`, `onSelect` | Tabs horizontales para cambiar de ventana |
| `PaneGrid` | `panes`, `layout` | Grid responsivo de panes según layout de tmux |
| `CreateSessionButton` | — | FAB o botón en sidebar para crear sesión |

### Componentes de Terminal
| Componente | Props | Descripción |
|---|---|---|
| `TerminalView` | `sessionId`, `windowId`, `paneId`, `token` | Instancia de xterm.js + WebSocket. Maneja ciclo de vida |
| `TerminalTabs` | `terminals` | Múltiples terminales en tabs (si el usuario abre varios panes) |
| `MobileToolbar` | `onKey`, `visible` | Barra táctil fija abajo. Solo en mobile |

### Componentes de Auth
| Componente | Props | Descripción |
|---|---|---|
| `LoginForm` | — | Formulario de login auto-contenido |
| `ProtectedRoute` | `children` | Redirect a /login si no hay token |

### Componentes UI base
- `Button` — variant: primary, danger, ghost. Size: sm, md
- `Input` — con label, error state, focus ring
- `Modal` — overlay + panel centrado, close on escape/backdrop
- `Spinner` — SVG animado, 16px default
- `Toast` — notificaciones efímeras (éxito al crear sesión, error al fallar tmux)

## Design tokens (Tailwind v4)

Definir en `globals.css` con `@theme`:
- `--color-bg-primary: #0d1117`
- `--color-bg-secondary: #161b22`
- `--color-border: #30363d`
- `--color-text-primary: #c9d1d9`
- `--color-text-secondary: #8b949e`
- `--color-accent: #58a6ff`
- `--color-success: #3fb950`
- `--color-danger: #f85149`
- `--font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace`
- `--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`

## Estados por componente

Cada componente que carga datos debe contemplar:
1. **Loading** — skeleton/spinner mientras se resuelve la query/WS
2. **Empty** — estado vacío con CTA (ej: "No sessions" + botón crear)
3. **Error** — mensaje de error + botón retry
4. **Data** — los datos renderizados normalmente

## Interacciones touch clave (mobile)

1. **Sidebar drawer:** swipe right desde el borde izquierdo abre el sidebar. Swipe left o tap fuera lo cierra. También botón hamburger en top-left.
2. **MobileToolbar:** 
   - Barra fija en el bottom, altura ~44px
   - Botones con mínimo 44x44px touch target
   - Long-press en Ctrl/Alt → "sticky mode" (el botón queda presionado visualmente hasta que se toca de nuevo)
   - Swipe up en la toolbar → revela fila extendida con `/`, `:`, `-`, `Space`, `Enter`
3. **Window tabs:** scroll horizontal nativo con `overflow-x: auto`, snap points opcionales
4. **Terminal focus:** tap en cualquier parte del terminal para enfocar (y mostrar toolbar si está oculta)
5. **Pinch-to-zoom:** deshabilitado en el terminal (`touch-action: none` en el contenedor de xterm.js)

## Tema

- **Dark mode only.** No hay light mode ni toggle. Esto es una terminal.
- **xterm.js theme:** fondo `#0d1117`, foreground `#c9d1d9`, cursor `#58a6ff` (bar), selection `#58a6ff44`
- **Font terminal:** JetBrains Mono 13px (mobile), 14px (desktop)
- **Scrollbar terminal:** sutil, 6px, `#30363d` track, `#484f58` thumb
- **Transiciones:** 150ms ease para hover/active states, 200ms ease para modales/drawers

## Lo que NO necesita diseño (por ahora)

- Pantalla de registro (solo seed por CLI)
- Multi-tenant / organización selector
- Temas customizables
- Drag & drop de panes
- File upload/download
- Chat o colaboración

## Entregables esperados

1. **Design system en Tailwind v4:** tokens, colores, tipografía, spacing, border-radius
2. **Componentes base:** Button, Input, Modal, Spinner con todas las variantes y estados
3. **Layout responsive:** AppShell que funcione en los 3 breakpoints
4. **MobileToolbar:** estilizado y con estados visuales (normal, hover/active, sticky-enabled)
5. **TerminalView skeleton:** wrapper para xterm.js con su scrollbar y resize
6. **LoginForm:** centrado, accesible, con estados de error
