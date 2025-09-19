import '../styles-imports';
import '../../styles/planner.css';

import { createEl, qs } from '../core/dom';
import { PlannerStore } from '../features/planner/state';
import { PlannerModal } from '../features/planner/modal';
import { renderPlannerGrid } from '../features/planner/render';
import { attachDrag } from '../features/planner/drag';
import { applyDemoPlan } from '../features/planner/demoPlan';
import { getSupabase, ensureProfile } from '../services/supabaseClient';
import { loadPlan, savePlan } from '../features/planner/supabaseSync';
import type { PlannerItem, RecipePayload } from '../types/planner';
import { showToast } from '../features/planner/toast';

interface AuthView {
  root: HTMLElement;
  email: HTMLInputElement;
  password: HTMLInputElement;
  submit: HTMLButtonElement;
  status: HTMLElement;
}

interface PlannerView {
  root: HTMLElement;
  grid: HTMLElement;
  saveButton: HTMLButtonElement;
  demoButton: HTMLButtonElement;
  emptyState: HTMLElement;
}

function createAuthView(): AuthView {
  const card = createEl('section', { className: 'auth-card card' });
  card.append(
    createEl('h1', { text: 'Sign in to your planner' }),
    createEl('p', {
      text: 'Use email + password. Accounts are created automatically on first sign-in.',
      className: 'muted',
    })
  );

  const form = createEl('div', { className: 'auth-form' });
  const emailLabel = createEl('label', { text: 'Email' });
  const emailInput = createEl('input', { attrs: { type: 'email', placeholder: 'you@example.com' } });
  const passwordLabel = createEl('label', { text: 'Password' });
  const passwordInput = createEl('input', { attrs: { type: 'password', placeholder: 'At least 6 characters' } });
  const submit = createEl('button', { className: 'btn btn-primary', text: 'Continue' });
  submit.type = 'button';
  const status = createEl('div', { className: 'auth-status' });

  form.append(emailLabel, emailInput, passwordLabel, passwordInput, submit, status);
  card.append(form);

  return {
    root: card,
    email: emailInput,
    password: passwordInput,
    submit,
    status,
  };
}

function createPlannerView(): PlannerView {
  const layout = createEl('section', { className: 'planner-layout' });
  const sidebar = createEl('aside', { className: 'sidebar-card card' });
  sidebar.append(
    createEl('h2', { text: 'Your week at a glance' }),
    createEl('p', { text: 'Drag & drop to reorder days, edit recipes, or import new dishes from the AI recipe generator.' })
  );
  const actions = createEl('div', { className: 'plan-actions' });
  const saveButton = createEl('button', { className: 'btn btn-primary', text: 'Save to Supabase' });
  saveButton.type = 'button';
  const demoButton = createEl('button', { className: 'btn btn-secondary', text: 'Generate demo plan' });
  demoButton.type = 'button';
  actions.append(saveButton, demoButton);
  sidebar.append(actions);

  const gridWrap = createEl('div', { className: 'card' });
  gridWrap.append(createEl('h3', { text: 'Week overview' }));
  const emptyState = createEl('p', {
    className: 'muted',
    text: 'Loading your plan…',
  });
  const grid = createEl('div', { className: 'day-grid' });
  gridWrap.append(emptyState, grid);

  layout.append(sidebar, gridWrap);

  return {
    root: layout,
    grid,
    saveButton,
    demoButton,
    emptyState,
  };
}

function createNavbar(logoutButton: HTMLButtonElement): HTMLElement {
  const nav = createEl('header', { className: 'navbar' });
  const inner = createEl('div', { className: 'navbar-inner' });
  const brand = createEl('a', { className: 'brand', text: 'Weekplan' });
  const accent = createEl('span', { text: '.ai' });
  brand.append(accent);
  brand.setAttribute('href', '/');

  const navActions = createEl('div', { className: 'nav-actions' });
  const recipeLink = createEl('a', {
    className: 'btn btn-secondary',
    text: 'AI recipes',
    attrs: { href: '/ai-recipe-planner.html' },
  });
  const preferencesLink = createEl('a', {
    className: 'btn btn-secondary',
    text: 'Preferences',
    attrs: { href: '/preferences.html' },
  });
  logoutButton.classList.add('btn', 'btn-ghost');
  logoutButton.type = 'button';
  logoutButton.textContent = 'Sign out';
  logoutButton.classList.add('hidden');

  navActions.append(recipeLink, preferencesLink, logoutButton);
  inner.append(brand, navActions);
  nav.append(inner);
  return nav;
}

function mountApp(): void {
  const app = qs<HTMLDivElement>('#app');
  const shell = createEl('div', { className: 'app-shell' });
  const logoutButton = createEl('button');
  const navbar = createNavbar(logoutButton);
  const authView = createAuthView();
  const plannerView = createPlannerView();

  shell.append(navbar, authView.root, plannerView.root);
  app.appendChild(shell);

  plannerView.root.classList.add('hidden');

  const store = new PlannerStore();
  const modal = new PlannerModal({
    onSave: (dow, patch) => {
      store.setItem(dow, patch);
      renderPlanner();
    },
    onDelete: (dow) => {
      store.removeItem(dow);
      renderPlanner();
    },
  });

  const supabase = getSupabase();

  function toggleViews(isAuthenticated: boolean, email?: string | null): void {
    if (isAuthenticated) {
      authView.root.classList.add('hidden');
      plannerView.root.classList.remove('hidden');
      logoutButton.classList.remove('hidden');
      if (email) {
        logoutButton.textContent = `Sign out (${email})`;
      }
    } else {
      authView.root.classList.remove('hidden');
      plannerView.root.classList.add('hidden');
      logoutButton.classList.add('hidden');
      authView.status.textContent = '';
      store.reset();
      renderPlanner();
    }
  }

  async function renderPlanner(): Promise<void> {
    const items = store.getItems();
    const hasRealItems = store.snapshot().items.length > 0;
    if (!hasRealItems) {
      plannerView.emptyState.textContent = 'No recipes yet. Generate a plan or add recipes from the AI tool.';
      plannerView.emptyState.classList.remove('hidden');
    } else {
      plannerView.emptyState.classList.add('hidden');
    }
    const cards = renderPlannerGrid({
      container: plannerView.grid,
      items,
      onEdit: (dow) => {
        const item = store.getItems()[dow];
        modal.show(dow, item as PlannerItem);
      },
    });
    attachDrag(cards, (from, to) => {
      store.swap(from, to);
      renderPlanner();
    });
  }

  async function hydrateSession(): Promise<void> {
    if (!supabase) {
      plannerView.emptyState.textContent = 'Supabase credentials missing. Update WEEKPLAN_CONFIG or Vite env vars.';
      plannerView.emptyState.classList.remove('hidden');
      authView.submit.disabled = true;
      return;
    }

    const { data } = await supabase.auth.getSession();
    const sessionUser = data.session?.user ?? null;
    toggleViews(Boolean(sessionUser), sessionUser?.email ?? null);
    if (sessionUser) {
      await ensureProfile(sessionUser);
      plannerView.emptyState.textContent = 'Loading your plan…';
      await loadPlan(supabase, store);
      renderPlanner();
    } else {
      plannerView.emptyState.textContent = 'Sign in to load your plan.';
      renderPlanner();
    }
  }

  authView.submit.addEventListener('click', async () => {
    if (!supabase) return;
    const email = authView.email.value.trim();
    const password = authView.password.value;
    if (!email || !password) {
      authView.status.textContent = 'Enter email and password to continue.';
      return;
    }
    authView.submit.disabled = true;
    authView.status.textContent = 'Signing in…';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        authView.status.textContent = signUpError.message;
      } else {
        authView.status.textContent = 'Account created. Check your inbox if email confirmation is required.';
      }
    } else {
      authView.status.textContent = '';
    }
    authView.submit.disabled = false;
  });

  logoutButton.addEventListener('click', async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  });

  plannerView.demoButton.addEventListener('click', () => {
    applyDemoPlan(store);
    renderPlanner();
  });

  plannerView.saveButton.addEventListener('click', async () => {
    if (!supabase) {
      alert('Supabase is not configured for this environment.');
      return;
    }
    const ok = await savePlan(supabase, store);
    if (ok) {
      showToast('Plan saved ✓');
    } else {
      alert('Unable to save plan. Check console for details.');
    }
  });

  window.addEventListener('recipe:selected', (event: Event) => {
    const detail = (event as CustomEvent<RecipePayload>).detail;
    if (!detail) return;
    const emptyDow = store.findFirstEmpty();
    let targetDow = emptyDow;
    if (targetDow == null) {
      const promptValue = window.prompt('Which day (0=Monday … 6=Sunday)?', '0');
      if (promptValue == null) return;
      const parsed = Number(promptValue);
      if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 6) {
        targetDow = parsed;
      } else {
        return;
      }
    }
    store.setItem(targetDow, {
      title: detail.title ?? detail.day ?? 'Recipe',
      imageUrl: detail.image ?? '',
    });
    renderPlanner();
    showToast('Recipe imported from generator');
  });

  if (supabase) {
    supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      toggleViews(Boolean(user), user?.email ?? null);
      if (user) {
        await ensureProfile(user);
        plannerView.emptyState.textContent = 'Loading your plan…';
        await loadPlan(supabase, store);
        renderPlanner();
      } else {
        plannerView.emptyState.textContent = 'Sign in to load your plan.';
      }
    });
  }

  hydrateSession();
  renderPlanner();
}

mountApp();
