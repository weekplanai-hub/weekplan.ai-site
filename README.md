# Weekplan.ai

AI-powered weekly meal planner and recipe generator.  
Built with **HTML/CSS/JS (frontend)** + **Supabase (backend)** and hosted on **GitHub Pages**.

---

## 🚀 Setup

1. **Deploy**
   - Enable GitHub Pages → source = `main` branch → root folder.
   - Ensure `CNAME` file contains: `weekplan.ai`

2. **DNS**
   - Point `weekplan.ai` to GitHub Pages:
     - 4 × A records (`185.199.108–111.153`)
     - CNAME `www` → `<youruser>.github.io`

3. **Supabase**
   - Create free project at [supabase.com](https://supabase.com)
   - Enable Email/Password Auth
   - Run SQL schema to create:
     - `profiles`
     - `plans`
     - `plan_items`
     - `recipes`
   - Copy Project URL + Anon Key → paste into `supabase.js`

4. **Test**
   - Open `https://weekplan.ai`
   - Sign up → Generate plan → Drag/Drop → Save → Refresh to confirm data persists

---

## 📁 Files Overview

| File | Purpose |
|------|---------|
| `index.html` | Landing / sales page |
| `styles.css` | Shared styling (light/dark ready) |
| `weekplan.html` | Main planner UI (auth-gated) |
| `weekplan.js` | Planner logic (drag/drop, save/load) |
| `supabase.js` | Client init with project URL + anon key |
| `ai-recipe-planner.html` | Standalone AI recipe generator |
| `tools/api-manager.html` | API key + model playground |
| `assets/` | Placeholder images (hero, features, recipes) |
| `CNAME` | Custom domain mapping |

---

## 🛠 Future Work

- Google OAuth (Supabase Auth)
- User recipe library + favorites
- Grocery list & PDF export
- AI-generated shopping lists
- Mobile PWA support
