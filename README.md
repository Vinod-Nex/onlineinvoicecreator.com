# Online Invoice Creator (`onlineinvoicecreator.com`)

> A fast, privacy-first, 100% free, and watermark-free online invoice & receipt maker with a modern Revolut-inspired fintech aesthetic. Built with Astro, TypeScript, and modern standards.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: `v22.0.0` or higher (verified with Node `v24.x`). If you use [nvm](https://github.com/nvm-sh/nvm), run:
  ```bash
  nvm use
  ```
- **npm**: `v10.x` or higher

### 1. Installation
Install all dependencies including Astro, sitemap integration, ESLint, Prettier, and TypeScript:
```bash
npm install
```

### 2. Local Development
Start the local Astro development server:
```bash
npm run dev
```
The application will be live at `http://localhost:4321`.

To run the dev server in the background:
```bash
npx astro dev --background
```
(Manage with `npx astro dev stop`, `npx astro dev status`, and `npx astro dev logs`).

---

## 🛠️ Code Quality & Verification

| Command | Action |
| :--- | :--- |
| `npm run check` | Run Astro and TypeScript strict type-checking (`astro check`) |
| `npm run lint` | Run ESLint across all `.astro`, `.ts`, and `.js` files |
| `npm run lint:fix` | Automatically fix ESLint issues |
| `npm run format` | Format the entire codebase using Prettier with Astro plugin |
| `npm run format:check` | Check code formatting compliance without modifying files |

---

## 📦 Production Build & Preview

### Build
Generate the production-ready static site bundle in `./dist`:
```bash
npm run build
```
This produces optimized static HTML, CSS, JS, and automatic XML sitemaps (`dist/sitemap-index.xml`, `dist/sitemap-0.xml`) with compressed HTML output.

### Preview
Test the production build locally before deploying:
```bash
npm run preview
```
Serves the contents of `./dist/` at `http://localhost:4321`.

---

## 🌐 Deployment Commands

Because `output: 'static'` is configured, `onlineinvoicecreator.com` can be deployed to any static host or edge CDN with zero server maintenance.

### Option A: Cloudflare Pages (Recommended)
- **Framework Preset**: Astro
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Node.js Version**: Set environment variable `NODE_VERSION=22`

Deploy via Cloudflare Wrangler CLI:
```bash
npx wrangler pages deploy dist --project-name=onlineinvoicecreator
```

### Option B: Vercel
- **Build command**: `npm run build`
- **Output Directory**: `dist`

Deploy via Vercel CLI:
```bash
npx vercel --prod
```

### Option C: Netlify
- **Build command**: `npm run build`
- **Publish directory**: `dist`

Deploy via Netlify CLI:
```bash
npx netlify deploy --prod --dir=dist
```

---

## 📁 Project Folder Layout

```text
onlineinvoicecreator.com/
├── public/                # Static public assets (favicons, manifest, robot.txt)
├── src/
│   ├── assets/            # Embedded vector assets, logos, and icons
│   ├── components/        # Reusable UI components (InvoiceCanvas, LineItems, Controls)
│   ├── data/              # Static datasets (currencies, tax presets, country lists)
│   ├── layouts/           # Page layouts (Layout.astro, DocumentLayout.astro)
│   ├── lib/               # Pure functions, calculation engine, currency formatters
│   ├── pages/             # Route pages matching docs/site-map.md (strictly no trailing slashes)
│   └── styles/            # Global styles and design system tokens (global.css)
├── docs/
│   ├── competitor-notes.md# Phase 1: Benchmark teardown & 15 ranked features
│   └── site-map.md        # Phase 2: Single source of truth for IA & link topology
├── astro.config.mjs       # Astro configuration (static, trailingSlash: 'never', sitemap)
├── tsconfig.json          # TypeScript strict mode with @aliases
├── eslint.config.mjs      # ESLint flat configuration (Astro & TS)
├── .prettierrc.mjs        # Prettier formatting rules with Astro plugin
├── .editorconfig          # Cross-editor indentation & formatting standard
├── .nvmrc                 # Node version pin (22)
└── package.json           # Project manifest, scripts, and dependencies
```

---

## 🎨 Design System

All styles adhere strictly to `DESIGN.md`:
- **Primary Color**: Cobalt-Violet (`#494fdf`), Bright (`#4f55f1`), Deep (`#3a40c4`)
- **Typography**: Display headlines in `Aeonik Pro`, body and numerical tables in `Inter` (`font-variant-numeric: tabular-nums`).
- **Surfaces**: Crisp white cards (`#ffffff`) over soft canvas (`#f4f4f4`) with subtle hairlines (`#e2e2e7`). Full dark mode support.
- **Zero Ads & Zero Watermarks**: Clean, utility-first user experience.
