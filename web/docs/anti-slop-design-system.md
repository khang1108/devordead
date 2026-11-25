# DevOrDead — Anti-Slop Design System & Round 2 Overhaul Spec

> **Authority**: Mandatory visual, typographic, layout, 3D, and copy specification for Round 2 across `/` (Landing Page) and `/app/` (15-Screen React Web App).
> **Grounded in**: `design-taste-frontend` (`SKILL.md`, `system.md`, `cards.md`, `layout-v4.md`, `copy.md`, `copy-tells.md`, `motion.md`) + live Playwright MCP 1440×900 visual benchmarks (`linear.app`, `attio.com`, `vercel.com`, `figma.com`) and visual forensics of our Round 1 UI (`scratch/design-refs/curr-*.png`).
> **Non-Negotiable Contract**: 100% of functional requirements (`UC01–UC18`, `BR1–BR4`, `NFR01–NFR10`), routes, `ui.jsx` component exports/props, `app.css` utility class names, and `landing-spec.md` DOM/timeline contracts MUST remain intact.

---

## 1. Visual Forensics: Why Round 1 Read as "AI-Slop"

All reference and diagnostic screenshots at `1440×900` are stored in:
`/home/phuckhang/.gemini/antigravity/brain/5c629b24-7c58-49dc-a568-ea03dc5cc809/scratch/design-refs/`

### 1.1 Benchmark Traits Studied (`ref-linear*.png`, `ref-attio*.png`, `ref-vercel.png`, `ref-figma.png`)
*(Note: Pinterest `/search/pins/` served an unauthenticated login modal in headless Chromium (`ref-pinterest-*.png`); per safety policy we did not bypass login walls and instead captured full `1440×900` viewports directly from the canonical Pinterest/design-taste SaaS benchmarks: Linear, Attio, Vercel, and Figma.)*

1. **93–96% Calm Neutral Canvas (`system.md`)**:
   - **Attio (`ref-attio.png`, `ref-attio-scroll.png`)**: Pure neutral ground, crisp near-black ink (`#111418`), **solid near-black primary CTA** (`Start for free`), flat `1px` `rgba(17,20,24,0.08)` hairlines, and a zero-shadow 1px hairline ledger grid for logos/stats. Color appears on `< 2%` of pixels (tiny status micro-dots and real brand marks).
   - **Vercel (`ref-vercel.png`)**: Generous open negative space, sentence-case geometric sans (`Agentic Infrastructure`) at weight `500/600` with tight `-0.035em` tracking, solid ink CTA (`Deploy now`), and **one** calm, matte sculptural 3D form (the black prism with soft studio contact shadow) — zero wireframe cages, zero neon pulses.
   - **Linear (`ref-linear.png`, `ref-linear-scroll.png`)**: Sentence-case headlines with a muted grey second sentence (`<h2>A new species of product tool. <span class="muted">Purpose-built for modern teams...</span></h2>`), a quiet sidebar (`Pulse`, `Inbox`, `My Issues`, `Reviews`) with **zero `01..08` mono numbering**, **zero nested portal boxes**, monochrome `1.5px` stroke icons, and flat hairline-divided rows.
   - **Figma (`ref-figma.png`)**: Solid black primary CTA, sentence-case display copy, zero tracked uppercase mono eyebrows, and a clean 32px pause disc in the corner of looping visuals.

### 1.2 Exact AI-Slop Anti-Patterns Diagnosed in Our Round 1 UI (`curr-*.png`)
1. **Screaming Wide ALL-CAPS `Unbounded` Everywhere (`curr-app-dashboard.png`, `curr-app-problems.png`, `curr-app-report.png`, `curr-landing-bento.png`, `curr-landing-pricing.png`)**:
   - Daily productivity screens scream `CHÀO NGUYỄN MINH ANH`, `NGÂN HÀNG BÀI TẬP`, `BÁO CÁO NĂNG LỰC`, `INDEXING TRONG POSTGRESQL`, `5 ngày` in heavy extended `Unbounded 800/900`. Inside software UI this reads like an arcade/energy-drink poster, never Linear or Attio.
2. **Tracked Uppercase Monospace Eyebrow & Pill Disease (`[copy-eyebrows]`, `curr-app-dashboard.png`, `curr-app-problems.png`, `curr-app-editor.png`)**:
   - `DashboardScreen` alone rendered **24+ tracked uppercase monospace tags/badges** (`01 — TỔNG QUAN`, `• MỤC TIÊU · ACME TECH`, `RADAR ĐA DIỆN · 5 TRỤC`, `WK-47`, `AC 79%`, `RUBRIC`, `5 / 9D`, `VOICE · UC05`, etc.).
   - `ProblemEditorScreen` (`curr-app-editor.png`) rendered a mono spec line AND immediately repeated the exact same 7 tokens as uppercase grey pills (`DOCKER CGROUPS V2`, `1 VCPU`, `256 MB RAM`, `50 MB /TMP`, `NETWORK=NONE`, `READ-ONLY ROOTFS`, `TIMEOUT 3S`) 40px below it.
3. **Rainbow Pastel Washes & Glowing Red Buttons (`curr-app-dashboard.png`, `curr-app-report.png`, `curr-landing-pricing.png`)**:
   - Baby-blue radial gradients inside white cards, baby-blue drenched report headers (`#E3F2FA`), green/yellow/blue/red pastel candy pills on every table row, and glowing tomato-red CTA shadows (`--shadow-btn-accent`) + `PHỔ BIẾN NHẤT` ("Most popular" — flagged in `copy-tells.md`) red borders.
4. **3-to-4-Level Nested Boxes (`cards.md` "Two levels, never three")**:
   - `curr-landing-bento.png`: `.bento-card` → `.sandbox-pipeline` box → `.pipe-node` box → `.pipe-chip` box (**4 nested boxes!**), plus the section overflows `900px` and slices the bottom cards at the viewport edge.
   - `curr-app-report.png`: `Card` → bordered pastel `ScoreDialCard` → bordered pastel `Badge` (3 levels) + 3 chunky SVG donut rings.
   - `curr-app-problems.png`: `Card` → individual grey bordered boxes around every single bullet in `Ràng buộc kỹ thuật`.
   - `curr-app-roadmap.png`: `Card` → gridded `.rm-atc-stage` box → shadowed `.rm-hub` white card + blue `.rm-hub-inspector` box, and below it red-left-bordered cards containing nested grey `VÌ SAO ĐỀ XUẤT` boxes.
5. **Sidebar Overflow Clipping & Clutter (`curr-app-dashboard.png` .. `curr-app-roadmap.png`)**:
   - Top-left brand row overflows `242px` and **visibly clips `TRANG CHỦ ↗` into `TRANG C`** against the right border on every app screen! Plus `CỔNG ỨNG VIÊN` sits inside a double-nested grey box, and nav links carry noisy `01..08` mono prefixes and thick baby-blue active bars.
6. **Busy Sci-Fi Wireframe / Warty Blob 3D Clutter (`curr-app-dashboard.png`, `curr-landing-ai.png`, `curr-landing-code.png`)**:
   - `curr-app-dashboard.png`: A dark-navy WebGL wireframe icosahedron crystal cage inside a candidate overview page, with pill buttons slicing Vietnamese words in half (`Cấu · 72%`, `Thuật · 58%`, `Cơ · 64%`, `Giao · 55%`).
   - `curr-landing-ai.png`: High-amplitude Simplex noise turned the AI Orb into a **lumpy, crinkled sci-fi brain/jellyfish** surrounded by 4 Saturn rings, 3 colored wireframe orbits, and starry space dust.
   - `curr-landing-code.png`: Three giant grey tombstones with bright neon-mint bricks (`codeWall.js`) collide directly behind the `LUYỆN ĐẾN KHI ACCEPTED` headline on the left.

---

## 2. Color & Surface Discipline (`system.md` 92–95% Neutral Rule)

### 2.1 Core Principle
- **92–95% of every viewport MUST be calm neutral** (`--bg`, `--surface`, `--surface-2`, `--ink`, `--ink-2`, `--line`).
- **Zero blurred drop-shadows at rest** on cards, stat strips, buttons, inputs, chips, or badges. Containment is achieved via **1 step of surface contrast** (`#FFFFFF` on `#F6F7F8` / `#F7F7F5`) + **`1px` crisp hairlines** (`rgba(17, 20, 24, 0.08)`).
- **Primary buttons are crisp near-black ink (`#111418`)** with `#FFFFFF` text — matching Linear, Attio, Vercel, and Figma.
- **Brand Sky (`#2484B5`) & Coral Accent (`#EB3F33`) occupy `< 3%` of any screen**: reserved strictly for the `||` logo mark, single active progress/route line, live microphone recording indicator, `< 5:00` hard-stop timer alert, and 6px semantic status dots. **Never** drench card backgrounds or headers in baby-blue or pastel red.
- **Zero violet/purple/lavender** anywhere in CSS, SVG, Monaco, or GLSL (`OKLCH` 270°–330° strictly banned).

### 2.2 Exact Token Mapping for `web/app/src/styles/tokens.css` (`app-shell-3d`)
Keep every variable name 100% intact so no screen breaks, but update values to the neutral studio system:

```css
:root {
  /* 93% Calm Neutral Studio Surfaces */
  --bg: #F6F7F8;                      /* Cool architectural paper ground */
  --surface: #FFFFFF;                 /* Flat card / table / workspace surface */
  --surface-2: #F0F2F5;               /* Subtle recessed control / hover tint */
  --surface-3: #E6E9EF;               /* Active neutral tint */

  /* Crisp Near-Black Ink Hierarchy (WCAG AAA/AA verified, zero muddy navy tint) */
  --ink: #111418;                     /* Primary ink — 18.1:1 on white */
  --ink-2: #525866;                   /* Secondary text & labels — 6.9:1 on white */
  --ink-3: #8A909E;                   /* Placeholders, disabled, subtle metadata */

  /* 1px Hairline System */
  --line: rgba(17, 20, 24, 0.085);    /* Primary card, table & divider hairline (#E4E6EA) */
  --line-subtle: rgba(17, 20, 24, 0.05); /* Intra-card row separator (#F0F1F4) */
  --line-strong: rgba(17, 20, 24, 0.16); /* Hover border & input focus-ready edge */

  /* Restrained Sky Technical Signal (< 3% screen area) */
  --brand: #2484B5;
  --brand-strong: #1B6B94;
  --brand-text: #1B6B94;              /* ≥ 5.7:1 on white */
  --brand-soft: rgba(36, 132, 181, 0.08);
  --brand-soft-hover: rgba(36, 132, 181, 0.13);
  --brand-on-dark: #7CC4E8;
  --brand-border: rgba(36, 132, 181, 0.22);

  /* Restrained Coral Signal (Logo ||, live rec dot, <5m timer, destructive error) */
  --accent: #E03E32;
  --accent-hover: #C83227;
  --accent-text: #C42B20;             /* ≥ 5.6:1 on white */
  --accent-soft: rgba(224, 62, 50, 0.07);
  --accent-border: rgba(224, 62, 50, 0.22);

  /* Quiet Semantic Status */
  --success: #16794C;
  --success-soft: rgba(22, 121, 76, 0.07);
  --success-border: rgba(22, 121, 76, 0.20);
  --warning: #9A5B00;
  --warning-fill: #D97706;
  --warning-soft: rgba(217, 119, 6, 0.08);
  --warning-border: rgba(154, 91, 0, 0.20);

  /* Dark Studio & IDE Surfaces (Neutral Obsidian-Slate, NOT saturated teal) */
  --bg-dark: #111418;
  --bg-dark-2: #171B21;
  --bg-dark-3: #222730;
  --on-dark: #F6F7F8;
  --code-bg: #111418;
  --code-border: rgba(255, 255, 255, 0.09);
  --code-ink: #E5E9F0;

  /* Crisp Software Radii (`data-radius="soft"` / Linear scale) */
  --r-sm: 6px;
  --r-md: 8px;
  --r-lg: 12px;                       /* Down from puffy 16px */
  --r-pill: 999px;

  /* Typography — Sentence-Case Modern SaaS Stack (100% Vietnamese glyph coverage) */
  --font-display: "Plus Jakarta Sans", "Be Vietnam Pro", system-ui, -apple-system, sans-serif;
  --font-body: "Be Vietnam Pro", system-ui, -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;

  /* ZERO Rest Drop-Shadows (`cards.md` rule) */
  --shadow-xs: none;
  --shadow-1: none;
  --shadow-card: none;
  --shadow-card-hover: 0 4px 16px -4px rgba(17, 20, 24, 0.06);
  --shadow-2: 0 12px 36px -8px rgba(17, 20, 24, 0.16); /* Dialogs / mobile drawer only */
  --shadow-btn-primary: none;
  --shadow-btn-accent: none;
  --focus: 0 0 0 2px var(--bg), 0 0 0 4px var(--ink);

  /* Motion */
  --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);

  /* Clean Linear-Width Sidebar */
  --sidebar-w: 228px;
}
```

### 2.3 Exact Token Mapping for Landing `web/src/styles/base.css` (`landing-ui`)
- Keep all 6 `html[data-palette="..."]` blocks (`sky`, `mono`, `blueprint`, `terminal`, `coral`, `forest`) working, with `sky` as default:
  - In `html[data-palette="sky"]`: set `--bg: #FBFBF9` (warm gallery paper so the 3D white `#FFFFFF` CV & Offer sheet visibly pops off the ground with crisp studio contrast!), `--bg-dark: #111418`, `--ink: #111418`, `--ink-2: #525866`, `--ink-3: #8A909E`, `--line: rgba(17, 20, 24, 0.09)`, `--surface: #FFFFFF`, `--brand: #2484B5`, `--accent: #E03E32`, `--accent-ink: #FFFFFF`, `--accent-text: #111418`, `--accent-display: #525866` (so second-half display lines read like Linear's calm muted run-on rather than screaming cyan/red!).
  - Replace `--font-display` in `base.css` with `"Plus Jakarta Sans", "Be Vietnam Pro", system-ui, sans-serif` (load `Plus Jakarta Sans:wght@500;600;700` in `web/index.html` and `web/app/index.html`; remove `Unbounded` or keep unused fallback only).
  - Primary header & hero CTAs (`.btn--header`, `.btn--accent`, `.scene-button--primary`, Pro plan CTA): fill with crisp `var(--ink)` (`#111418`, text `var(--surface)` `#FFFFFF`, on dark theme `#FBFBF9` text `#111418`), **zero colored glow `box-shadow`**!

---

## 3. Typography Overhaul (`system.md` Sentence-Case Rule)

### 3.1 Hard Bans
1. **BAN `text-transform: uppercase`** on headings (`h1`, `h2`, `h3`, `.t-display-xl`, `.t-display-l`, `.scene-title`), table headers (`.table th`), card headers (`.card__title`), form labels, badges (`.badge`), and sidebar group titles (`.sidebar__title`).
2. **BAN `Unbounded`** on all UI text, numbers, card titles, and headings.
3. **BAN tracked monospace eyebrows above every card and section**:
   - `JetBrains Mono` (`.t-mono`, `.t-code`) is restricted **strictly** to: source code, file names (`two_sum.py`), CLI/Docker flags (`network=none`, `256 MB`), live timers (`29:42`), numeric IDs (`#001`, `#r-2211`), and `RuleTag` codes (`BR2`, `NFR01`).
   - Remove `text-transform: uppercase; letter-spacing: 0.08em;` from `.t-mono` in `app.css`! Set `.t-mono` to `font: 500 12px/1.45 var(--font-mono); letter-spacing: 0; text-transform: none; font-variant-numeric: tabular-nums;`.

### 3.2 Exact Type Scale
| Element / Class | Font Family | Weight / Size / Line-Height | Tracking & Case | Color |
|---|---|---|---|---|
| Landing Hero / Scene Title (`.scene-title`) | `--font-display` (`Plus Jakarta Sans`) | `600 clamp(36px, 4.4vw, 60px) / 1.06` | `-0.035em`, **Sentence case** | `--ink` (2nd sentence `.accent-text` / `.muted` in `--ink-2`) |
| Landing Section `h2` (`.after h2`) | `--font-display` | `600 clamp(28px, 3vw, 40px) / 1.12` | `-0.03em`, **Sentence case** | `--ink` |
| App Login Hero (`.t-display-xl`) | `--font-display` | `600 clamp(28px, 2.8vw, 36px) / 1.12` | `-0.03em`, **Sentence case** | `--on-dark` |
| App Page Title `h1` (`.t-display-l`) | `--font-display` | `600 clamp(22px, 1.9vw, 26px) / 1.2` | `-0.025em`, **Sentence case** | `--ink` |
| Section / Modal Heading (`.t-heading-m`) | `--font-display` | `600 17px / 1.35` | `-0.018em`, **Sentence case** | `--ink` |
| Row / Item Title (`.t-heading-s`) | `--font-body` (`Be Vietnam Pro`) | `600 15px / 1.45` | `-0.01em`, **Sentence case** | `--ink` |
| Body Copy (`.t-body-m`) | `--font-body` | `400 15px / 1.6` | `0`, Sentence case | `--ink` (landing cards: `16px/1.55`) |
| Secondary Copy (`.t-body-s`) | `--font-body` | `400 13.5px / 1.55` | `0`, Sentence case | `--ink-2` |
| Labels, Card Heads, Table `th`, Eyebrows | `--font-body` | `500 13px / 1.4` | `-0.005em`, **Sentence case** | `--ink-2` |
| KPI / Score Numerals (`.t-number`) | `--font-display` | `600 28px / 1.1` | `-0.03em`, `tabular-nums` | `--ink` |
| Code / Timers / Technical Specs (`.t-mono`, `.t-code`) | `--font-mono` (`JetBrains Mono`) | `400–500 12.5px / 1.6` | `0`, `tabular-nums`, natural case | `--ink-2` / `--code-ink` |

### 3.3 Quiet Badge & `RuleTag` Styling (`app.css`)
- **`.badge`**:
  - `font: 500 12px/1.35 var(--font-body); letter-spacing: 0; text-transform: none; padding: 2px 8px; border-radius: 6px;`
  - Default surface for ALL tones (`neutral`, `brand`, `success`, `warning`, `danger`): **quiet neutral/white chip** (`background: var(--surface-2); border: 1px solid var(--line); color: var(--ink);`) with a crisp **6px colored dot** (`::before` or `.badge__dot`) indicating semantic state (`brand` → `#2484B5`, `success` → `#16794C`, `warning` → `#D97706`, `danger` → `#E03E32`, `neutral` → `#8A909E`). Zero candy-colored pill fills!
- **`.rule-tag`** (`BR1–BR4`, `NFR01–NFR10`):
  - Quiet, authoritative monochrome engineering chip:
    `background: transparent; border: 1px solid var(--line); border-radius: 6px; padding: 2px 8px; box-shadow: none; font: 500 12px/1.35 var(--font-body); color: var(--ink-2);`
  - `.rule-tag__code`: `font: 600 11.5px/1 var(--font-mono); color: var(--ink); background: var(--surface-2); padding: 2px 5px; border-radius: 4px;` (NO heavy inverted black block!).
- **`PageHeader` Eyebrow (`ui.jsx` / `app.css`)**:
  - Keep the `eyebrow` prop working for compatibility, but convert `"04 — BÀI TẬP LẬP TRÌNH"` or `"01 — TỔNG QUAN"` visually (or in screen props + CSS) to quiet `13px/500` sentence-case `--ink-2` without loud blue mono tracking (`color: var(--ink-2); font: 500 12.5px/1.4 var(--font-body); text-transform: none; letter-spacing: 0;`), and format `PageHeader` `title` in crisp sentence case!

---

## 4. Card, Sidebar, Table & Layout De-Cluttering (`cards.md` + `layout-v4.md`)

### 4.1 "Two Levels, Never Three" (`cards.md`)
- **Level 1**: Page ground (`--bg`: `#F6F7F8` in App, `#FBFBF9` on Landing).
- **Level 2**: Flat container (`.card`, `background: #FFFFFF`, `border: 1px solid var(--line)`, `border-radius: 12px`, `padding: 20px–24px`, `box-shadow: none`).
- **STRICT BAN ON LEVEL 3**: Inside a `.card`, **NEVER** place bordered sub-cards, grey pill-boxes around list items, or tinted inner banners!
  - Use **`.rows` (1px horizontal hairline dividers: `border-top: 1px solid var(--line-subtle); padding: 12px 0;`)** for lists, practice links, roadmap items, constraints, rubric scores, and session history.
  - Use a single **`1px` vertical or horizontal split line** (`border-left: 1px solid var(--line)` / `border-top: 1px solid var(--line)`) inside a flush `.card` when separating two panes (master-detail or score breakdown).

### 4.2 Unified Bordered Stat Ledger (Replaces 4 Floating Stat Cards)
- Instead of 4 separate floating cards with fake decorative sparkbars:
  - Render stats inside **one unified 1px-bordered strip** (`background: var(--surface); border: 1px solid var(--line); border-radius: 12px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); overflow: hidden;`) where columns 2–4 have `border-left: 1px solid var(--line-subtle);` and `padding: 18px 20px;`.
  - Each cell holds **3 clean lines only**: `13px` sentence-case label (`Phiên đã luyện`), `28px` tabular number (`12`), `13px` quiet delta (`+3 so với tuần trước` in `--ink-2` or `--success`). **Delete all decorative sparkbars and fake telemetry codes (`WK-47`, `AC 79%`, `RUBRIC`, `5 / 9D`).**

### 4.3 Linear / Attio App Sidebar (`228px`, Seamless Ground, Zero Clipping)
- **Fix the `TRANG C` clipping bug**:
  - Set `--sidebar-w: 228px`.
  - Sidebar background: `var(--bg)` (`#F6F7F8` — **same as canvas ground**, NOT `#FFFFFF`, separated from `.main` by `border-right: 1px solid var(--line)`), matching Linear and Attio!
  - Top row: `Logo` on left + compact icon-only or `↗` quiet link (`title="Về trang giới thiệu"`) `28×28px` so it **never** overflows `228px`!
  - Portal Switcher (`Ứng viên` / `Quản trị`): Remove the outer `.sidebar__portal` bordered box and `CỔNG ỨNG VIÊN` header! Render ONLY a sleek, compact 2-pill `30px`-tall segmented control (`Ứng viên` | `Quản trị`) directly under the brand row.
  - Navigation items:
    - Group labels (`Luyện tập`, `Phỏng vấn`, `Tài khoản`): `12px/500 var(--font-body)`, sentence case, `color: var(--ink-3)`, `padding: 0 10px 4px`.
    - **Remove `01`..`08` mono prefixes** (replace `.nav-item__idx` with clean `15×15` `1.5px`-stroke monochrome SVG icons, or hide `.nav-item__idx`).
    - `.nav-item`: `min-height: 36px` on desktop (`44px` on `≤1024px` mobile drawer), `padding: 6px 10px`, `border-radius: 7px`, `font: 500 13.5px/1.3 var(--font-body)`, `color: var(--ink-2)`.
    - `.nav-item.is-active`: `background: rgba(17, 20, 24, 0.06); color: var(--ink); font-weight: 600;` — **remove `.nav-item::before` thick blue bar and baby-blue wash!**
  - Footer profile: flat hairline top (`border-top: 1px solid var(--line)`), clean inline row (monochrome `#111418` avatar circle + name/role + signout icon), **no inner grey card border**.

### 4.4 Clean Flat Data Tables (`.table`)
- `.table th`: `background: transparent` (remove grey block header!), `border-bottom: 1px solid var(--line)`, `padding: 10px 16px`, `font: 500 12.5px/1.4 var(--font-body)`, `text-transform: none`, `letter-spacing: 0`, `color: var(--ink-2)`.
- `.table td`: `padding: 12px 16px`, `border-bottom: 1px solid var(--line-subtle)`, `font-size: 14px`, `color: var(--ink)`.
- Selected row (`tr[aria-selected="true"] td`): `background: var(--surface-2)` (NOT bright baby-blue `#E3F2FA`!), with `box-shadow: inset 2px 0 0 var(--ink)` on the first cell.

### 4.5 Landing Page One-Section-Per-Screen & Equal Edges (`layout-v4.md`)
- Consistent `--page-gutter: clamp(24px, 5vw, 80px)` and `max-width: 1280px` across `.site-header`, all 8 `.scene` overlays, `#architecture`, `#pricing`, `#faq`, and `.site-footer`.
- `.site-header`: flat opaque `var(--bg)` (`#FBFBF9`, `#111418` on dark scene) with `1px solid var(--line)` bottom hairline (`system.md` Nav rule: no glass pill clutter; plain text link `Bản mẫu ứng dụng` + single solid `#111418` CTA `Bắt đầu miễn phí`).
- `#architecture` and `#pricing`: sized and padded cleanly so no card is sliced at the bottom of a `1440×900` viewport, `60–80 words` of prose max per screen, and **max 2 levels of boxes** inside every feature card!

---

## 5. Calm Studio 3D Direction (Apple / Teenage Engineering / Vercel Aesthetic)

1. **Ban Sci-Fi Wireframe Cages & Busy HUDs in Productivity Screens**:
   - **`DashboardScreen.jsx` (`app-practice`)**: **DELETE `CompetencyPolyhedronCard` and the `three` import from `DashboardScreen.jsx` completely!** A candidate dashboard is a calm workspace, not a spaceship cockpit. Show full, untruncated competency progress cleanly in the flat ledger card.
2. **Calm Sculptural Studio Diorama on Login (`ThreeHeroScene.jsx` — `app-shell-3d`)**:
   - On `#111418` studio dark slate: replace the busy neon isometric grid, traffic-light fake code windows, and 6-color dots with a **serene, minimal architectural sculpture** — a crisp matte warm-white origami paper plane (`#F7F7F5`) banking gently over 3 quiet matte anodized-slate/ceramic stepped plinths (`#1A1E24` / `#232830`) with soft directional studio rim lighting and one delicate subtle flight arc. Zero baked canvas text windows, zero traffic-light dots, zero radar rings.
3. **Calm Matte-Pearl / Acoustic Glass AI Orb (`Room.jsx` in `app-rooms` & `orb.js` in `three-world`)**:
   - Cut vertex noise displacement by **80%** (`idleAmp: 0.010`, `speakAmp: 0.032` low-frequency harmonic breathing — **never** crinkled or warty!).
   - Material feel: smooth, tactile **matte-ceramic / frosted-pearl sphere** (`cards.md` line 283) softly lit from top-left (`#F0F4F8` pearl highlight → `#2484B5` subtle sky subsurface scatter → `#111418` calm shadow), shifting gently to emerald (`#16794C`) when listening.
   - **Strip orbital clutter**: remove starry particle dust, remove multiple colored wireframe gyroscopes, and remove multi-band Saturn rings — keep **at most 1 whisper-thin hairline ring** (`opacity: 0.16`).
4. **Landing Scrollytelling 3D World (`world.js`, `codeWall.js`, `flightMap.js`, `textures.js` — `three-world`)**:
   - `world.js`: Match `sky` palette ground `#FBFBF9` seamlessly (`toneMapped: false` ground plane) so the crisp `#FFFFFF` paper plane casts a soft, natural gallery shadow (`opacity: 0.08`).
   - `codeWall.js`: Eliminate the 3 giant grey tombstones with bright neon-mint bricks that collided with the left headline in `curr-landing-code.png`! Replace or reposition into a **calm, compact matte ceramic/frosted-aluminum architectural frame** shifted cleanly to center-right/center-back (clear of the left text column!), using restrained monochrome token bars (`#E4E6EA` / `#9AA1AE`) that quietly step to muted emerald (`#16794C`) on pass, with zero glowing laser scanbars.
   - `flightMap.js`: Architectural drafting aesthetic on paper — fine matte graphite dashed lines (`#8A909E`), crisp ink active path (`#111418` / `#2484B5` without bloomy sci-fi halo flares), and clean minimal cylindrical ceramic waypoint pins.
   - `textures.js`: Re-typeset the A4 CV (`Nguyễn Minh Anh`) and Offer Letter using `"Plus Jakarta Sans"` + `"Be Vietnam Pro"` in clean Swiss editorial sentence-case layout: remove the thick dual-color top bar, remove the decorative corner dot-matrix, remove `Unbounded 900` uppercase headers, and use crisp `1px` hairline rules.

---

## 6. Worker-by-Worker Action Checklist (Round 2)

### Worker 1: `app-shell-3d`
**Owned files ONLY**: `web/app/index.html`, `web/app/src/styles/tokens.css`, `web/app/src/styles/app.css`, `web/app/src/components/ui.jsx`, `web/app/src/components/AppShell.jsx`, `web/app/src/components/Logo.jsx`, `web/app/src/components/ThreeHeroScene.jsx`, `web/app/src/screens/LoginScreen.jsx` & `.css`, `web/app/src/screens/ProfileScreen.jsx` & `.css`.
- [ ] **`web/app/index.html`**: Load `Plus Jakarta Sans:wght@500;600;700` + `Be Vietnam Pro:wght@400;500;600` + `JetBrains Mono:wght@400;500` from Google Fonts (`display=swap`); update `<meta name="theme-color" content="#F6F7F8" />`.
- [ ] **`tokens.css`**: Apply the exact Section 2.2 neutral studio token block (`--bg: #F6F7F8`, `--ink: #111418`, `--shadow-card: none`, `--r-lg: 12px`, `--sidebar-w: 228px`, zero rest shadows). Keep 100% of variable names intact.
- [ ] **`app.css` & `ui.jsx`**:
  - Keep ALL exported component names & prop signatures (`Button`, `Badge`, `Card`, `CardHead`, `Eyebrow`, `PageHeader`, `StatCard`, `Field`, `Segmented`, `Chip`, `Toggle`, `Tabs`, `ProgressBar`, `Callout`, `RuleTag`) and utility classes intact.
  - Convert `.t-display-xl`, `.t-display-l`, `.t-heading-m`, `.t-number` to `Plus Jakarta Sans` weight `600`, **sentence case** (`text-transform: none`), tight tracking (`-0.025em` to `-0.03em`).
  - Convert `.card__title`, `.page-header__eyebrow`, `.stat__label`, `.table th` to `500 13px/1.4 var(--font-body)` **sentence case** (`text-transform: none`, `letter-spacing: 0`, `color: var(--ink-2)`). Remove `text-transform: uppercase; letter-spacing: 0.08em;` from `.t-mono`.
  - Style both `.btn--primary` and `.btn--accent` as crisp `#111418` fill (`color: #FFFFFF`, zero drop-shadow, hover `#222730`, active `scale(0.985)`).
  - Restyle `.badge` to neutral/white `1px` hairline chip + `6px` semantic dot (always render the dot or subtle tinted border, zero pastel candy fills, sentence case `12px/500`). Restyle `.rule-tag` as a quiet monochrome `1px` chip.
  - Restyle `.table` (`th` transparent ground + bottom `1px` hairline; selected row `var(--surface-2)` + `2px` inset ink bar) and `.callout` (flat `var(--surface)` or `var(--surface-2)` with `1px solid var(--line)` and a crisp `3px` left semantic border instead of full pastel background wash!).
- [ ] **`AppShell.jsx` & `Logo.jsx`**:
  - Fix the `TRANG C` overflow clipping bug! Sidebar `228px` on `var(--bg)` (`#F6F7F8`), compact `28×28` `↗` home icon button beside `Logo` (`Plus Jakarta Sans` 700 tight wordmark `Dev||Dead` with subtle coral `||`), flat 2-pill `Ứng viên | Quản trị` switch (no outer `.sidebar__portal` box, no `CỔNG ỨNG VIÊN` label), sentence-case group headers, clean nav rows without `01..08` mono numbers, subtle `rgba(17,20,24,0.06)` active state, flat footer profile row.
- [ ] **`ThreeHeroScene.jsx` & `LoginScreen.*` (UC01)**:
  - Simplify `ThreeHeroScene.jsx` into a calm studio sculptural origami paper plane + minimal matte architectural plinths on `#111418` (remove fake canvas code cards, traffic-light dots, and busy isometric grid; keep full GPU `dispose()` + reduced-motion SVG fallback).
  - `LoginScreen`: Sentence-case left headline (`Tốt nghiệp rồi. Giờ là phỏng vấn.`), clean hairline-separated value list (no 3 pill-boxes), flat/hairline right auth panel, inline subtle demo presets (`Điền mẫu`, `Sai mật khẩu (E2)`, `Trùng email (E1)`) without a dashed box. Keep all UC01 flows (`wrongpass`, `taken@email.com`, Google/GitHub OAuth, `/admin/taxonomy` link).
- [ ] **`ProfileScreen.*` (UC02, UC03)**:
  - Sentence-case header (`Hồ sơ mục tiêu`), clean 2-column flat `1px` cards, hairline `.rows` for extracted skills (`Khớp CV` / `Thiếu trong CV` with quiet dot badges, no nested pastel boxes). Keep all file validation (`≤ 5MB` `.pdf`/`.docx`), JD analysis, manual skill add (A1), and `RuleTag NFR04`.

---

### Worker 2: `app-practice`
**Owned files ONLY**: `DashboardScreen.*`, `KnowledgeScreen.*`, `ProblemsScreen.*`, `InterviewSetupScreen.*`, `ReportScreen.*`, `RoadmapScreen.*`, `AdminTaxonomyScreen.*`, `AdminModerationScreen.*`.
- [ ] **All 8 screens**: Convert ALL `PageHeader` titles, eyebrows, card titles, badges, and section labels to **sentence case** (e.g., `Tổng quan` / `Chào Nguyễn Minh Anh`, `Kho tri thức`, `Ngân hàng bài tập`, `Cấu hình phiên phỏng vấn`, `Báo cáo năng lực`, `Lộ trình học thích ứng`, `Danh mục tri thức`, `Kiểm duyệt nội dung`). Strip redundant ALL-CAPS mono tags!
- [ ] **`DashboardScreen.*` (UC02, UC15)**:
  - **DELETE `CompetencyPolyhedronCard` and the `three` import completely!**
  - Top row: clean flat header (`Chào Nguyễn Minh Anh`, concise sentence-case subtitle with target role `Backend · Fresher` & `12 ngày tới phỏng vấn`, quiet inline metadata text, primary `#111418` button `Bắt đầu phỏng vấn` → `/interview/setup`). Zero radial blue gradient wash!
  - Stat row: **one unified 4-column `1px`-bordered stat ledger strip** (`1px` vertical dividers between cells) — **delete `statTelemetry` sparkbars and `WK-47` / `AC 79%` / `RUBRIC` / `5 / 9D` codes**.
  - Middle & bottom pairs: flat `1px` cards using **hairline `.rows`** inside (`border-bottom: 1px solid var(--line-subtle)`), **zero inner bordered boxes** around practice links, roadmap items, or recent reports! Keep `< 40%` warning indicator + `%` text on `System Design (31%)`, `Gián đoạn` status on interrupted report, and all links (`/knowledge`, `/practice/voice`, `/problems/001`, `/interview/setup`, `/roadmap`, `/reports/:id`).
- [ ] **`KnowledgeScreen.*` (UC04)**:
  - Clean inline toolbar (search + filter chips, no heavy double-boxed bar). Clean master-detail 2-pane split (`Domain → Topic` WAI-ARIA tree on left with quiet `JD` dot badge; flat topic detail on right with sentence-case title, clean tabular stats strip, hairline competency rows with `4px`-tall `ProgressBar`, E1 empty state, and `RuleTag BR4`). Delete the decorative SVG radial dial!
- [ ] **`ProblemsScreen.*` (UC07)**:
  - Clean single-row filter bar; flat hairline table where `Chủ đề` and `Vai trò` are plain crisp text (`Hash map`, `Backend` — NOT grey pills!), `Độ khó` and `Trạng thái` use quiet dot+text badges.
  - Right preview pane: **remove grey boxes around constraints** (render as clean typographic list), clean dark `code-block` for stdio examples without extra wrapper header bars, `Đã duyệt · {approvedAt}` quiet footer, `Làm bài` CTA → `/problems/:id`.
- [ ] **`InterviewSetupScreen.*` (UC10)**:
  - Clean 2-option radio cards (`HR — Behavioral` vs `Technical & Live Coding`) with `1px` border (`1.5px solid var(--ink)` when selected, **delete `ModePipelineDiagram` pulsing pills!**).
  - Clean flat sections for Duration (`15/30/45 phút`), Difficulty, CV/JD `Toggle`, and Hardware Check (`Kiểm tra micro` + E2 callout + `Giả lập micro sẵn sàng (demo)` + Web Audio test tone).
  - Right summary card: flat `kv` hairline rows, quiet `BR1 · Hard-stop` callout, locked primary CTA until mic ready.
- [ ] **`ReportScreen.*` (UC14, UC16)**:
  - Left session list: clean hairline rows inside one flat card (no nested blue boxes!).
  - Right report header: **remove baby-blue background wash** — clean white `1px` header with metadata.
  - `BR2` Independent Dual-Scoring: replace the 3 pastel-bordered sub-cards and chunky SVG donut rings with a **unified 3-column `1px` hairline ledger** (`Tổng quan 7.2/10`, `Tính đúng của mã 8.0/10 · 4/5 test đạt`, `Lập luận 6.4/10`) with clean `4px` linear bars and `<RuleTag code="BR2">Chấm độc lập</RuleTag>`.
  - Keep competency table, 3-column hairline summary (`Điểm mạnh`, `Cần cải thiện`, `Đề xuất`), `Tabs` (`Transcript`, `Snapshot mã`, `Kết quả test` w/ Test 5 `TLE`), and full UC16 re-evaluation form (E1, E2, A1, A2).
- [ ] **`RoadmapScreen.*` (UC15)**:
  - Replace the double-boxed gridded ATC card + red-bordered item cards with: (1) a clean minimal **horizontal 4-step progress stepper** (`Nền tảng` → `Cấu trúc dữ liệu` → `Thuật toán` → `System Design`) on a flat white surface connected by a `1px` line (solid `--ink`/`--brand` for done, current dot, dashed for todo) + single hairline-divided active stage summary line; (2) `Tabs` filter + a **single flat `1px`-bordered list container** of hairline-divided `.rows` where each item shows priority dot badge, title, concise inline `Vì sao đề xuất:` text (no nested grey box!), and `Bắt đầu →` link.
- [ ] **`AdminTaxonomyScreen.*` (UC17) & `AdminModerationScreen.*` (UC18)**:
  - Apply the same Linear curator aesthetic: flat `1px` panes, sentence-case headers, hairline queue/tree rows (no nested cards inside lists), preserving 100% of tree keyboard navigation, CRUD/reorder/disable (`Đã ẩn`), E1/E2 guards, `taxonomyLog`, `BR4` notice, AI regenerate (A1), and processed history.

---

### Worker 3: `app-rooms`
**Owned files ONLY**: `Room.jsx`, `room.css`, `Waveform.jsx`, `CodeEditor.jsx`, `lib/sandbox.js`, `InterviewRoom.css`, `VoicePracticeScreen.*`, `ProblemEditorScreen.*`, `HrInterviewScreen.jsx`, `TechInterviewScreen.jsx`, `SessionEndedScreen.jsx`.
- [ ] **`Room.jsx` & `room.css`**:
  - Overhaul `AiAvatar` GLSL shader to the **Calm Matte-Pearl / Acoustic Sphere** (Section 5.3): reduce noise displacement amplitude by ~80% (`0.010` idle, `0.032` speaking) so it is silky-smooth and spherical (never warty/lumpy), remove dual busy wireframe rings (keep at most 1 whisper-thin `opacity: 0.16` ring), keep full GPU `dispose()` & CSS fallback.
  - Restyle `RoomTopBar` to a clean `52px` flat `#FFFFFF` header with `1px` bottom hairline, sentence-case session title, tabular `JetBrains Mono` countdown pill (neutral at rest, amber warn, coral danger `< 5:00`), quiet `Tua đến hết giờ (demo BR1)` ghost button, and clean `Kết thúc` button.
  - Restyle `TranscriptList` into clean flat editorial turns (no heavy chat-bubble boxes inside boxes; speaker label in `12px/600` + `14.5px` readable text separated by `1px` subtle hairlines or clean vertical spacing).
- [ ] **`Waveform.jsx` & `VoicePracticeScreen.*` (UC05, UC06)**:
  - Replace the 5 separate bordered question cards at top with a **compact single-row 1–5 step bar** inside one `1px` strip.
  - Replace the giant heavy dark-navy recording block (`curr-app-voice.png`) with a **calm, light studio recording surface** (`#FFFFFF` card with a clean `#F6F7F8` hairline waveform well, crisp `#111418` tabular `00:00` timer, solid `#111418` `Bắt đầu ghi âm` button with a tiny `7px` `#E03E32` rec dot, and quiet `NFR01 ≤ 2,5s` tag).
  - Sentence-case all headings (`Indexing trong PostgreSQL`, `Đánh giá & phản hồi`); keep full TTS, record/stop, rubric ✓/!, and follow-up question flows.
- [ ] **`ProblemEditorScreen.*`, `CodeEditor.jsx`, `sandbox.js` (UC08, UC09)**:
  - Keep `.pe__toolbar` strictly single-row (`flex-wrap: nowrap` on desktop `1280px` & `1440px`, zero wrapping of `Submit`!).
  - Left problem pane: remove grey boxes around constraints and remove the baby-blue `.pe__tip` box (use clean hairline sections).
  - Bottom Sandbox pane (`curr-app-editor.png`): **DELETE the 7 redundant uppercase grey pills** (`DOCKER CGROUPS V2`..`TIMEOUT 3S`) that duplicated the line above! Render one crisp `12px` mono spec bar (`cgroups v2 · 1 vCPU · 256 MB RAM · network=none · ro-rootfs · timeout 3s`) + `RuleTag BR3` & `NFR02`, clean inline step progress, and flat hairline test rows (`ms`, `MB`, verdict dot badge).
  - Update `CodeEditor.jsx` theme background to neutral `#111418` (`#171B21` gutter/line highlight) so it matches `--code-bg` instead of deep teal-blue, keeping zero purple tokens.
- [ ] **`HrInterviewScreen.jsx` (UC11), `TechInterviewScreen.jsx` (UC12), `SessionEndedScreen.jsx` (UC13), `InterviewRoom.css`**:
  - Clean split-pane IDE/interview studio with `1px` hairlines instead of nested cards-in-cards; sentence-case labels; interactive `S · T · A · R` checklist rows with hairline dividers; dual `BR2` trackers in `TechInterviewScreen`; clean editorial `SessionEndedScreen` snapshot certificate (remove emoji `🔒` in ALL-CAPS banner → use clean SVG lock icon + sentence-case `Phiên đã đóng · Snapshot nguyên vẹn (BR1)`).

---

### Worker 4: `landing-ui`
**Owned files ONLY**: `web/index.html`, `web/src/styles/base.css`, `web/src/styles/scenes.css`, `web/src/fx/**`, `web/src/scenes/**`.
- [ ] **Preserve 100% of `landing-spec.md` contracts**: `#story > .stage > #webgl + #overlay > 8 .scene[data-scene="hero|fold|roadmap|code|ai|hr|clouds|offer"]`, `#pricing`, `#faq`, `.site-footer`, `scenes/index.js` exports, pure-`t` reversible `update(t)`, and all 6 `data-palette` themes (`sky` default).
- [ ] **`web/index.html` & `base.css`**:
  - Load `Plus Jakarta Sans:wght@500;600;700` + `Be Vietnam Pro:wght@400;500;600` + `JetBrains Mono:wght@400;500` (replace `Unbounded` in `--font-display`).
  - Set `sky` ground to warm studio paper `#FBFBF9`, `--ink: #111418`, `--bg-dark: #111418`, crisp `#111418` primary CTA buttons, zero rest drop-shadows, and opaque `1px`-bordered `.site-header` (`system.md` Nav rule).
- [ ] **8 Scrollytelling Scene Overlays (`scenes/*.js`, `scenes.css`)**:
  - Convert ALL 8 `.scene-title` headings from screaming `Unbounded 900` ALL-CAPS to **crisp sentence-case `Plus Jakarta Sans 600`** (`letter-spacing: -0.035em`, `line-height: 1.06`) with a Linear-style muted second sentence (`color: var(--ink-2)` on light, `rgba(246,247,248,0.58)` on dark):
    - `hero`: `Tốt nghiệp rồi. <span class="accent-text">Giờ là phỏng vấn.</span>` — keep `.hero-top` unified so index & heading never collide; replace the 3-bordered `.hero-facts` box with a clean borderless hairline ledger row (`≤ 2,5s phản hồi giọng nói · Chấm độc lập mã & lập luận · Docker Sandbox 256 MB`); solid `#111418` primary CTA (`Bắt đầu miễn phí`).
    - `fold`: Clean architectural ghost word `Sẵn sàng.` + flat `1px` editorial note card + clean minimal bottom telemetry line.
    - `roadmap`: `Lộ trình học của riêng bạn.` + 3 clean open hairline rows on the left (no heavy stacked boxes).
    - `code`: `Luyện đến khi <span class="accent-text">Accepted.</span>` — **replace the 3 awkward white stat boxes (`curr-landing-code.png`) with a clean borderless 3-column tabular figure row on the open ground** (`1.200+`, `40+`, `300+` + `*số liệu minh họa`), and flatten the right IDE workbench so `Test 01..06` are clean hairline rows inside the editor window (not 6 separate pill-boxes!).
    - `ai`: `Phỏng vấn kỹ thuật với AI. <span class="accent-text">Bất cứ lúc nào.</span>` — sleek `#171B21` `1px`-bordered voice transcript bar + 4 minimal corner annotations with `1px` hairlines (no noisy uppercase pill clutter).
    - `hr`: `Trả lời phỏng vấn HR. <span class="accent-text">Rõ ràng từng ý.</span>` — clean 4-column `S · T · A · R` hairline architectural grid + smooth pure-`t` prompt ticker.
    - `clouds` & `offer`: Clean sentence-case headings (`Họ đã cất cánh.`, `Offer đầu tiên đang chờ bạn.`), flat `1px` quote cards with `*nội dung minh họa`, crisp `#111418` final CTA (`Bắt đầu luyện ngay`).
- [ ] **Below-the-Fold De-Slop (`#architecture`, `#pricing`, `#faq`, `.site-footer`)**:
  - **Sentence case** on all section headings (`Thiết kế như một phòng phỏng vấn thật.`, `Bảng giá rõ ràng cho từng giai đoạn.`, `Câu hỏi thường gặp.`), delete uppercase tracked eyebrows above `h2` (`copy-tells.md` `[copy-eyebrows]`), keep prose `≤ 75 words` per section!
  - `#architecture`: **Fix the 4-level box-in-box nesting (`curr-landing-bento.png`)!** Each `.bento-card` is a flat `#FFFFFF` `1px` card holding a clean open diagram or flat UI fragment directly (max 2 box levels!), compact enough that the section reads cleanly at `1440×900` without slicing cards at the fold. Style `BR1–BR4` / `NFR01–NFR04` tags as quiet monochrome chips (not red/blue pills).
  - `#pricing`: Remove the red border and floating red `PHỔ BIẾN NHẤT` pill (`copy-tells.md` ban!). Highlight `Pro (99.000đ / tháng)` with a crisp `1.5px solid #111418` border, a quiet monochrome `Khuyên dùng` tag, and a solid `#111418` CTA button (`Free` and `Team / Trường học` use `1px` outline secondary buttons).

---

### Worker 5: `three-world`
**Owned files ONLY**: `web/src/main.js`, `web/src/story/director.js`, `web/src/story/timeline.js`, `web/src/three/**`.
- [ ] **`palette.js` & `world.js`**:
  - Align `sky` 3D palette with the warm gallery paper `#FBFBF9` ground (`#111418` dark studio on `ai`), subtle soft contact shadow (`shadowOpacity: 0.075`), and calm studio lighting (`ACESFilmicToneMapping` exposure `~1.05`) so paper looks tactile, warm, and matte — never grey or clinical.
- [ ] **`textures.js` & `cap.js`**:
  - Redesign `makeCVTexture` and `makeOfferTexture` to **Swiss editorial print craft**: remove the thick two-tone blue/red top stripe, remove the decorative corner dot grid, replace `Unbounded 900` ALL-CAPS headers with `"Plus Jakarta Sans"` / `"Be Vietnam Pro"` sentence-case headings, fine `1px` hairline rules, and restrained monochrome skill tags so the A4 document looks like an executive-grade resume and official offer letter. Refine `cap.js` to matte architectural obsidian (`#181B20`) with a subtle muted-terracotta/gold cord.
- [ ] **`codeWall.js` (Fix Left Headline Collision!)**:
  - In `curr-landing-code.png`, the left slab sat directly behind `LUYỆN ĐẾN KHI ACCEPTED` and used bright neon-mint bars. Narrow/shift the sculptural sandbox assembly slightly right/deeper so the **left 38% of the viewport behind `.code-header` and `.code-stats` stays calm open negative space**, replace glossy slabs + neon-mint bricks with **matte ceramic/anodized-aluminum architectural plates** (`#FFFFFF` / `#EAEDF1`) and restrained slate token reliefs that subtly turn deep emerald (`#16794C`) on pass, and remove the glowing horizontal laser scanbar.
- [ ] **`orb.js` (Fix Lumpy Sci-Fi Blob!)**:
  - Reduce `dispField` vertex displacement amplitude by **~80%** so the AI Core is a **calm, smooth sculptural acoustic pearl/obsidian sphere** (never crinkled or warty!). Remove the starry particle field (`stars`), reduce the 3 colored wireframe gyroscopes + multi-ring disc down to **1–2 ultra-delicate hairline studio rings** (`opacity <= 0.18`), and keep colors strictly neutral pearl `#F0F4F8`, restrained Sky `#2484B5`, and subtle Emerald `#16794C` on `#111418` studio dark (zero purple/violet!).
- [ ] **`flightMap.js`**:
  - Calm architectural drafting lines on `#FBFBF9`: reduce dot-grid & radar-ring contrast by 50%, make unflown routes fine matte graphite dashes, active route a crisp `#111418` / `#2484B5` drafting line without heavy neon bloom flares, and clean minimal cylindrical ceramic waypoint pins. Keep 100% pure-`p` determinism!
