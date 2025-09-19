# Weekplan.ai — modern rebuild

A modular Vite + TypeScript rewrite of the Weekplan.ai marketing site, planner UI, AI recipe generator and preference wizard. The new version keeps the original functionality while reorganising the codebase into composable ES modules, shared styling tokens and reusable utilities.

## ✨ Highlights

- **Vite + TypeScript** for fast local development and module-based authoring.
- **Shared design system** via `src/styles/base.css` and page-specific styles.
- **Supabase-ready planner** with modular state management, drag & drop, modal editing and toast notifications.
- **AI recipe generator** that works with OpenRouter or OpenAI and dispatches recipes directly into the planner.
- **Preference builder** rebuilt with accessible dialogs, JSON previews and topic-based editing.
- **API manager tool** to store provider keys, fetch OpenRouter models and run quick prompt tests.

## 🧱 Project structure

```
├── src/
│   ├── index.html                # Landing page
│   ├── weekplan.html             # Planner app
│   ├── ai-recipe-planner.html    # Recipe generator
│   ├── preferences.html          # Preferences wizard
│   ├── tools/api-manager.html    # API utility
│   ├── styles/                   # Base + page specific CSS
│   └── scripts/
│       ├── core/                 # DOM helpers, storage utils, formatters
│       ├── features/             # Feature modules (planner, recipes, preferences)
│       ├── pages/                # Page entry points (TypeScript)
│       └── styles-imports.ts     # Global style import shared across pages
├── public/                       # Static assets (CNAME, icons...)
├── vite.config.ts
├── package.json
└── tsconfig*.json
```

## 🔧 Setup

```bash
npm install
npm run dev    # Starts Vite dev server on http://localhost:5173
npm run build  # Outputs production build into dist/
```

To configure Supabase for the planner, set the following environment variables before running `npm run dev` or `npm run build`:

```
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="public-anon-key"
```

Alternatively, when hosting the built site you can expose a `window.WEEKPLAN_CONFIG` object with `supabaseUrl` and `supabaseAnonKey` properties before loading the planner bundle.

## ✅ Available functionality

- Email/password authentication with Supabase and automatic profile creation.
- Load, edit, drag, save and demo-generate weekly meal plans.
- Import AI-generated recipes into the planner via `CustomEvent`.
- AI recipe generator with local key storage, provider toggle and JSON parsing guard rails.
- Preference wizard with quick-start and advanced hub dialogs that export structured JSON.
- API manager tool for quickly testing prompts and managing favourite model/provider combinations.

## 📄 Licensing

The project contains no proprietary runtime dependencies beyond Supabase and whichever LLM API you connect. All front-end code is MIT friendly; adapt as needed.
