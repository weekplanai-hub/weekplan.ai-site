import '../styles-imports';
import '../../styles/preferences.css';

import type { PostgrestError } from '@supabase/supabase-js';

import { createEl, qs } from '../core/dom';
import { cloneState, initialState, toExportObject } from '../features/preferences/state';
import { PRESETS, TOPICS } from '../features/preferences/presets';
import { addPresetIfMissing, isTopicSet, toggleArrayValue } from '../features/preferences/logic';
import type { PreferencesState, TopicId } from '../types/preferences';
import { getSupabase } from '../services/supabaseClient';

interface QuickDialogRefs {
  dialog: HTMLDialogElement;
  sheet: HTMLElement;
  step1: HTMLElement;
  step2: HTMLElement;
  next: HTMLButtonElement;
  back: HTMLButtonElement;
  closeButtons: HTMLButtonElement[];
  createBtn: HTMLButtonElement;
  openHubBtn: HTMLButtonElement;
  preview: HTMLElement;
  servings: HTMLSelectElement;
  units: HTMLSelectElement;
  note: HTMLTextAreaElement;
  checkboxes: HTMLInputElement[];
}

interface HubDialogRefs {
  dialog: HTMLDialogElement;
  sheet: HTMLElement;
  tiles: HTMLElement;
  panel: HTMLElement;
  preview: HTMLElement;
  finishBtn: HTMLButtonElement;
  backBtn: HTMLButtonElement;
  closeButtons: HTMLButtonElement[];
}

type MealOption = 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'desserts';

interface DevPanelHandle {
  syncFromState(): void;
}

const MEAL_OPTIONS: MealOption[] = ['breakfast', 'lunch', 'dinner', 'snacks', 'desserts'];

const state: PreferencesState = cloneState(initialState);

const PREFS_SETUP_HINT =
  'Supabase prefs table missing. Run supabase/prefs.sql from the repo README.';

type PostgrestLikeError = PostgrestError & { details?: string };

function isPostgrestError(err: unknown): err is PostgrestLikeError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'message' in err &&
    typeof (err as { message?: unknown }).message === 'string'
  );
}

function isMissingPrefsTable(err: PostgrestLikeError | Error): boolean {
  const code = 'code' in err ? String((err as { code?: unknown }).code ?? '') : '';
  const message =
    typeof err.message === 'string' ? err.message.toLowerCase() : String(err.message ?? '').toLowerCase();
  const details = 'details' in err ? String((err as { details?: unknown }).details ?? '').toLowerCase() : '';
  return (
    code === '42P01' ||
    message.includes('relation') && message.includes('prefs') ||
    details.includes('prefs table') ||
    details.includes('relation "prefs"')
  );
}

function describeSupabaseError(err: unknown, fallback: string): string {
  if (isPostgrestError(err)) {
    if (isMissingPrefsTable(err)) {
      return PREFS_SETUP_HINT;
    }
    return err.message || fallback;
  }
  if (err instanceof Error) {
    if (isMissingPrefsTable(err)) {
      return PREFS_SETUP_HINT;
    }
    return err.message || fallback;
  }
  return fallback;
}

function buildHero(openQuick: () => void): HTMLElement {
  const hero = createEl('section', { className: 'preferences-hero' });
  const card = createEl('div', { className: 'hero-card card' });
  card.append(
    createEl('h1', { text: 'Ready to eat smarter?' }),
    createEl('p', {
      text: 'Start med en note eller velg noen preferanser. Det er raskt å komme i gang.',
    })
  );
  const button = createEl('button', { className: 'btn btn-primary', text: 'Get started' });
  button.type = 'button';
  button.addEventListener('click', openQuick);
  card.append(button);
  hero.append(card);
  return hero;
}

function buildQuickDialog(): QuickDialogRefs {
  const dialog = document.createElement('dialog');
  dialog.className = 'dialog';
  const sheet = createEl('div', { className: 'dialog-sheet' });
  const header = createEl('div', { className: 'dialog-header' });
  const title = createEl('div', { className: 'dialog-title', text: 'Before we get started…' });
  const close = createEl('button', { className: 'btn btn-secondary', text: 'Close' });
  close.type = 'button';
  header.append(title, close);

  const body = createEl('div', { className: 'dialog-body' });
  const step1 = createEl('section', { className: 'quick-grid two show', attrs: { 'data-step': '1' } });
  step1.append(
    createField('Servings per recipe', ((): HTMLElement => {
      const select = document.createElement('select');
      ['1', '2', '3', '4', '5', '6'].forEach((value) => {
        const option = createEl('option', { text: value });
        option.value = value;
        if (value === String(state.mealRules.servingsPerRecipe)) {
          option.selected = true;
        }
        select.appendChild(option);
      });
      select.id = 'pref-servings';
      return select;
    })()),
    createField('Units', ((): HTMLElement => {
      const select = document.createElement('select');
      const options = [
        { value: 'metric', label: 'Metric (g, ml)' },
        { value: 'us', label: 'US (cups, oz)' },
      ];
      options.forEach(({ value, label }) => {
        const option = createEl('option', { text: label });
        option.value = value;
        if (value === state.meta.units) option.selected = true;
        select.appendChild(option);
      });
      select.id = 'pref-units';
      return select;
    })())
  );

  const step2 = createEl('section', { className: 'quick-grid hidden', attrs: { 'data-step': '2' } });
  const note = document.createElement('textarea');
  note.className = 'note-area';
  note.placeholder = 'Fortell planleggeren om mål, ingredienser å unngå, kjøkken, tidsgrenser…';
  const noteField = createField('Custom instructions (optional)', note);
  step2.append(noteField);

  const checksWrap = createEl('div', { className: 'checkbox-grid' });
  const options = [
    { value: 'save_time', label: 'Save time' },
    { value: 'weight_loss', label: 'Weight loss' },
    { value: 'muscle_gain', label: 'Muscle gain' },
    { value: 'vegetarian', label: 'Vegetarian focus' },
    { value: 'budget_friendly', label: 'Budget friendly' },
  ];
  const checkboxes: HTMLInputElement[] = [];
  options.forEach(({ value, label }) => {
    const wrapper = createEl('label', { className: 'checkbox-tile' });
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = value;
    wrapper.append(input, document.createTextNode(label));
    checksWrap.appendChild(wrapper);
    checkboxes.push(input);
  });
  step2.append(createField('Quick suggestions', checksWrap));

  const preview = createEl('div', { className: 'json-preview', text: '{ }' });
  const previewDetails = document.createElement('details');
  previewDetails.className = 'details-toggle';
  const summary = createEl('summary', { text: 'JSON preview' });
  previewDetails.append(summary, preview);
  step2.append(previewDetails);

  body.append(step1, step2);

  const footer = createEl('div', { className: 'dialog-actions' });
  const next = createEl('button', { className: 'btn btn-primary', text: 'Continue' });
  next.type = 'button';
  const back = createEl('button', { className: 'btn btn-secondary', text: 'Back' });
  back.type = 'button';
  back.classList.add('hidden');
  const openHubBtn = createEl('button', { className: 'btn btn-secondary', text: 'Open advanced hub' });
  openHubBtn.type = 'button';
  const createBtn = createEl('button', { className: 'btn btn-primary', text: 'Create plan' });
  createBtn.type = 'button';
  createBtn.classList.add('hidden');
  footer.append(back, openHubBtn, next, createBtn);

  sheet.append(header, body, footer);
  dialog.appendChild(sheet);
  document.body.appendChild(dialog);

  return {
    dialog,
    sheet,
    step1,
    step2,
    next,
    back,
    closeButtons: [close],
    createBtn,
    openHubBtn,
    preview,
    servings: qs<HTMLSelectElement>('#pref-servings', step1),
    units: qs<HTMLSelectElement>('#pref-units', step1),
    note,
    checkboxes,
  };
}

function buildHubDialog(): HubDialogRefs {
  const dialog = document.createElement('dialog');
  dialog.className = 'dialog';
  const sheet = createEl('div', { className: 'dialog-sheet' });
  const header = createEl('div', { className: 'dialog-header' });
  const title = createEl('div', { className: 'dialog-title', text: 'Tweak what matters' });
  const backBtn = createEl('button', { className: 'backlink', text: '← Back to quick start' });
  backBtn.type = 'button';
  const close = createEl('button', { className: 'btn btn-secondary', text: 'Close' });
  close.type = 'button';
  header.append(title, backBtn, close);

  const body = createEl('div', { className: 'dialog-body' });
  const intro = createEl('p', {
    className: 'muted',
    text: 'Velg et tema. Sett én preferanse eller gå gjennom alle steg.',
  });
  const tiles = createEl('div', { className: 'tiles-grid' });
  const panel = createEl('div', { className: 'panel', attrs: { hidden: 'true' } });

  const preview = createEl('div', { className: 'json-preview', text: '{ }' });
  const previewDetails = document.createElement('details');
  previewDetails.className = 'details-toggle';
  previewDetails.append(createEl('summary', { text: 'JSON preview' }), preview);

  body.append(intro, tiles, panel);

  const footer = createEl('div', { className: 'dialog-actions' });
  const finishBtn = createEl('button', { className: 'btn btn-primary', text: 'Done for now' });
  finishBtn.type = 'button';
  footer.append(finishBtn);

  sheet.append(header, body, footer, previewDetails);
  dialog.appendChild(sheet);
  document.body.appendChild(dialog);

  return {
    dialog,
    sheet,
    tiles,
    panel,
    preview,
    finishBtn,
    backBtn,
    closeButtons: [close],
  };
}

function buildDeveloperPanel(
  container: HTMLElement,
  quickRefs: QuickDialogRefs,
  onStateChange: () => void
): DevPanelHandle {
  const section = createEl('section', {
    className: 'dev-wrap',
    attrs: { 'aria-label': 'Developer utilities' },
  });
  const heading = createEl('h2', { className: 'dev-title', text: 'Developer utilities' });
  const note = createEl('p', {
    className: 'dev-note muted',
    text: 'Sync demo preferences with Supabase to test database persistence.',
  });
  const grid = createEl('div', { className: 'dev-grid' });

  const card = createEl('div', { className: 'dev-card' });
  card.append(
    createEl('h3', { text: 'Supabase quick prefs' }),
    createEl('p', {
      className: 'muted',
      text: 'Save the servings count and meal toggles for quick demos.',
    })
  );

  const counter = createEl('div', { className: 'dev-counter' });
  const minus = createEl('button', {
    className: 'dev-circle',
    text: '−',
    attrs: { type: 'button', 'aria-label': 'Decrease servings' },
  }) as HTMLButtonElement;
  const value = createEl('span', { className: 'dev-value', text: '2' });
  const plus = createEl('button', {
    className: 'dev-circle',
    text: '+',
    attrs: { type: 'button', 'aria-label': 'Increase servings' },
  }) as HTMLButtonElement;
  counter.append(minus, value, plus);
  card.append(counter);

  const mealsWrap = createEl('div', { className: 'dev-meals' });
  const mealButtons = new Map<MealOption, HTMLButtonElement>();
  MEAL_OPTIONS.forEach((meal) => {
    const btn = createEl('button', {
      className: 'dev-meal',
      text: meal.charAt(0).toUpperCase() + meal.slice(1),
      attrs: { type: 'button' },
    }) as HTMLButtonElement;
    btn.dataset.meal = meal;
    btn.addEventListener('click', () => {
      toggleMeal(meal);
    });
    mealsWrap.appendChild(btn);
    mealButtons.set(meal, btn);
  });
  card.append(mealsWrap);

  const actions = createEl('div', { className: 'dev-actions' });
  const saveBtn = createEl('button', {
    className: 'btn btn-primary',
    text: 'Save to Supabase',
    attrs: { type: 'button' },
  }) as HTMLButtonElement;
  const loadBtn = createEl('button', {
    className: 'btn btn-secondary',
    text: 'Load latest row',
    attrs: { type: 'button' },
  }) as HTMLButtonElement;
  actions.append(saveBtn, loadBtn);
  card.append(actions);

  const outputs = createEl('div', { className: 'dev-outputs' });
  const peopleOutput = document.createElement('input');
  peopleOutput.readOnly = true;
  peopleOutput.placeholder = 'people';
  const mealsOutput = document.createElement('input');
  mealsOutput.readOnly = true;
  mealsOutput.placeholder = 'meals (comma-separated)';
  outputs.append(peopleOutput, mealsOutput);
  card.append(outputs);

  const status = createEl('p', {
    className: 'dev-status muted',
    text: 'Supabase ready when configured.',
  });
  status.setAttribute('data-status', 'idle');
  card.append(status);

  grid.append(card);
  section.append(heading, note, grid);
  container.appendChild(section);

  const servingValues = Array.from(quickRefs.servings.options)
    .map((option) => Number(option.value))
    .filter((value) => Number.isFinite(value));
  const minServings = Math.min(...servingValues, 1);
  const maxServings = Math.max(...servingValues, 6);

  const devState = {
    people: Number.isFinite(state.mealRules.servingsPerRecipe)
      ? Math.round(state.mealRules.servingsPerRecipe)
      : 2,
    meals: new Set<MealOption>(['breakfast', 'lunch', 'dinner']),
  };

  const setStatus = (mode: 'idle' | 'loading' | 'ok' | 'error', message: string): void => {
    status.dataset.status = mode;
    status.textContent = message;
    status.classList.toggle('muted', mode === 'idle');
  };

  const clampServings = (value: number): number => {
    if (!Number.isFinite(value)) return minServings;
    return Math.min(maxServings, Math.max(minServings, Math.round(value)));
  };

  const ensureMeals = (): void => {
    if (devState.meals.size === 0) {
      devState.meals.add('dinner');
    }
  };

  const applyMealsFromState = (): void => {
    const focus = state.mealRules.focusMeals;
    if (typeof focus === 'string' && MEAL_OPTIONS.includes(focus as MealOption)) {
      devState.meals = new Set<MealOption>([focus as MealOption]);
    }
    ensureMeals();
  };

  const applyState = (emit = true): void => {
    devState.people = clampServings(devState.people);
    ensureMeals();
    value.textContent = String(devState.people);
    mealButtons.forEach((btn, meal) => {
      btn.classList.toggle('active', devState.meals.has(meal));
    });
    peopleOutput.value = String(devState.people);
    mealsOutput.value = Array.from(devState.meals).join(', ');
    quickRefs.servings.value = String(devState.people);
    state.mealRules.servingsPerRecipe = devState.people;
    const [firstMeal] = devState.meals;
    state.mealRules.focusMeals = firstMeal ?? 'dinner';
    if (emit) {
      onStateChange();
    }
  };

  const toggleMeal = (meal: MealOption): void => {
    if (devState.meals.has(meal)) {
      if (devState.meals.size === 1) {
        return;
      }
      devState.meals.delete(meal);
    } else {
      devState.meals.add(meal);
    }
    applyState(true);
  };

  minus.addEventListener('click', () => {
    devState.people = clampServings(devState.people - 1);
    applyState(true);
  });

  plus.addEventListener('click', () => {
    devState.people = clampServings(devState.people + 1);
    applyState(true);
  });

  saveBtn.addEventListener('click', async () => {
    setStatus('loading', 'Saving to Supabase…');
    const client = getSupabase();
    if (!client) {
      setStatus('error', 'Supabase client unavailable. Check keys.');
      return;
    }
    try {
      const { error } = await client.from('prefs').insert([
        { people: devState.people, meals: Array.from(devState.meals) },
      ]);
      if (error) throw error;
      setStatus('ok', 'Saved current preferences ✅');
    } catch (err) {
      setStatus('error', describeSupabaseError(err, 'Save failed.'));
    }
  });

  loadBtn.addEventListener('click', async () => {
    setStatus('loading', 'Loading latest row…');
    const client = getSupabase();
    if (!client) {
      setStatus('error', 'Supabase client unavailable. Check keys.');
      return;
    }
    try {
      const { data, error } = await client.from('prefs').select('*').order('id', { ascending: false }).limit(1);
      if (error) throw error;
      if (!data || data.length === 0) {
        setStatus('error', 'No rows found in prefs table.');
        return;
      }
      const row = data[0] as { people?: unknown; meals?: unknown };
      if (typeof row.people === 'number' && Number.isFinite(row.people)) {
        devState.people = clampServings(row.people);
      }
      if (Array.isArray(row.meals)) {
        const cleaned = row.meals
          .filter((meal): meal is MealOption => typeof meal === 'string' && MEAL_OPTIONS.includes(meal as MealOption));
        if (cleaned.length) {
          devState.meals = new Set<MealOption>(cleaned);
        }
      }
      applyState(true);
      setStatus('ok', 'Imported latest preferences ✅');
    } catch (err) {
      setStatus('error', describeSupabaseError(err, 'Import failed.'));
    }
  });

  const syncFromState = (): void => {
    devState.people = clampServings(state.mealRules.servingsPerRecipe);
    applyMealsFromState();
    applyState(false);
  };

  applyMealsFromState();
  applyState(false);

  return { syncFromState };
}

function updateQuickPreview(refs: QuickDialogRefs, refsHub: HubDialogRefs): void {
  const exported = JSON.stringify(toExportObject(state), null, 2);
  refs.preview.textContent = exported;
  refsHub.preview.textContent = exported;
}

function showStep(refs: QuickDialogRefs, step: 1 | 2): void {
  refs.step1.classList.toggle('hidden', step !== 1);
  refs.step2.classList.toggle('hidden', step !== 2);
  refs.next.classList.toggle('hidden', step !== 1);
  refs.createBtn.classList.toggle('hidden', step !== 2);
  refs.back.classList.toggle('hidden', step !== 2);
}

function buildPreferencesPage(): void {
  const quickRefs = buildQuickDialog();
  const hubRefs = buildHubDialog();

  function openQuick(): void {
    showStep(quickRefs, 1);
    quickRefs.dialog.showModal();
  }

  function openHub(): void {
    quickRefs.dialog.close();
    refreshTiles();
    renderTopicPanel(currentTopic ?? 'goals');
    hubRefs.dialog.showModal();
  }

  const hero = buildHero(openQuick);
  const app = qs<HTMLDivElement>('#app');
  app.append(hero);

  const devPanel = buildDeveloperPanel(app, quickRefs, () => updateQuickPreview(quickRefs, hubRefs));

  quickRefs.next.addEventListener('click', () => {
    showStep(quickRefs, 2);
    updateQuickPreview(quickRefs, hubRefs);
  });

  quickRefs.back.addEventListener('click', () => {
    showStep(quickRefs, 1);
  });

  quickRefs.createBtn.addEventListener('click', () => {
    state.meta.savedAt = new Date().toISOString();
    updateQuickPreview(quickRefs, hubRefs);
    window.alert('Plan ready (demo).');
  });

  quickRefs.openHubBtn.addEventListener('click', openHub);

  quickRefs.closeButtons.forEach((btn) =>
    btn.addEventListener('click', () => {
      quickRefs.dialog.close();
    })
  );

  hubRefs.backBtn.addEventListener('click', () => {
    hubRefs.dialog.close();
    showStep(quickRefs, 2);
    quickRefs.dialog.showModal();
  });

  hubRefs.finishBtn.addEventListener('click', () => {
    state.meta.savedAt = new Date().toISOString();
    updateQuickPreview(quickRefs, hubRefs);
    window.alert('Preferences ready (demo).');
  });

  hubRefs.closeButtons.forEach((btn) =>
    btn.addEventListener('click', () => {
      hubRefs.dialog.close();
    })
  );

  quickRefs.servings.addEventListener('change', () => {
    state.mealRules.servingsPerRecipe = Number(quickRefs.servings.value);
    devPanel.syncFromState();
    updateQuickPreview(quickRefs, hubRefs);
  });

  quickRefs.units.addEventListener('change', () => {
    state.meta.units = quickRefs.units.value as 'metric' | 'us';
    updateQuickPreview(quickRefs, hubRefs);
  });

  quickRefs.note.addEventListener('input', () => {
    state.quickNote = quickRefs.note.value.trim();
    updateQuickPreview(quickRefs, hubRefs);
  });

  quickRefs.checkboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const chosen = quickRefs.checkboxes.filter((cb) => cb.checked).map((cb) => cb.value);
      state.goals = chosen.filter((v) => ['save_time', 'weight_loss', 'muscle_gain'].includes(v));
      state.dietary.dietStyle = chosen.includes('vegetarian') ? 'vegetarian' : 'omnivore';
      state.skillBudget.budgetLevel = chosen.includes('budget_friendly') ? 'low' : 'medium';
      updateQuickPreview(quickRefs, hubRefs);
      refreshTiles();
    });
  });

  let currentTopic: TopicId | null = null;

  function refreshTiles(): void {
    hubRefs.tiles.innerHTML = '';
    TOPICS.forEach((topic) => {
      const button = createEl('button', {
        className: 'tile-button',
        text: `${topic.emoji} ${topic.label}`,
      });
      button.type = 'button';
      if (isTopicSet(state, topic.id)) {
        button.classList.add('set');
      }
      button.addEventListener('click', () => {
        currentTopic = topic.id;
        renderTopicPanel(topic.id);
      });
      hubRefs.tiles.appendChild(button);
    });
  }

  function renderTopicPanel(topic: TopicId): void {
    currentTopic = topic;
    hubRefs.panel.toggleAttribute('hidden', false);
    hubRefs.panel.innerHTML = '';
    hubRefs.panel.appendChild(createEl('strong', { text: TOPICS.find((t) => t.id === topic)?.label ?? topic }));

    const content = createEl('div');

    const addInput = (placeholder: string, target: string[]): void => {
      const input = createEl('input', { attrs: { type: 'text', placeholder } });
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          const value = input.value.trim().toLowerCase();
          if (value && !target.includes(value)) {
            target.push(value);
            input.value = '';
            renderTopicPanel(topic);
            updateQuickPreview(quickRefs, hubRefs);
            refreshTiles();
          }
        }
      });
      content.appendChild(input);
    };

    const renderMultiChips = (values: string[], target: string[]): void => {
      const wrapper = createEl('div', { className: 'chips' });
      values.forEach((value) => {
        const chip = createEl('button', { className: 'chip', text: value });
        chip.type = 'button';
        const active = target.includes(value);
        chip.setAttribute('aria-pressed', String(active));
        chip.addEventListener('click', () => {
          toggleArrayValue(target, value);
          renderTopicPanel(topic);
          updateQuickPreview(quickRefs, hubRefs);
          refreshTiles();
        });
        wrapper.appendChild(chip);
      });
      content.appendChild(wrapper);
    };

    const renderSingleChips = (values: string[], current: string, onSelect: (value: string) => void): void => {
      const wrapper = createEl('div', { className: 'chips' });
      values.forEach((value) => {
        const chip = createEl('button', { className: 'chip', text: value });
        chip.type = 'button';
        chip.setAttribute('aria-pressed', String(current === value));
        chip.addEventListener('click', () => {
          onSelect(value);
          renderTopicPanel(topic);
          updateQuickPreview(quickRefs, hubRefs);
          refreshTiles();
        });
        wrapper.appendChild(chip);
      });
      content.appendChild(wrapper);
    };

    switch (topic) {
      case 'goals':
        renderMultiChips(addPresetIfMissing(state.goals, PRESETS.goals), state.goals);
        addInput('Add goal (Enter)', state.goals);
        break;
      case 'diet':
        renderSingleChips(PRESETS.diets, state.dietary.dietStyle, (value) => {
          state.dietary.dietStyle = value;
        });
        break;
      case 'allergies':
        renderMultiChips(addPresetIfMissing(state.dietary.allergies, PRESETS.allergies), state.dietary.allergies);
        addInput('Add allergy', state.dietary.allergies);
        break;
      case 'avoid':
        renderMultiChips(addPresetIfMissing(state.dietary.avoid, PRESETS.avoid), state.dietary.avoid);
        addInput('Add never-show ingredient', state.dietary.avoid);
        break;
      case 'must':
        renderMultiChips(addPresetIfMissing(state.dietary.mustInclude, PRESETS.must), state.dietary.mustInclude);
        addInput('Add must-include', state.dietary.mustInclude);
        break;
      case 'time':
        renderSingleChips(
          PRESETS.time.map((t) => t.label),
          PRESETS.time.find((t) => t.value === state.mealRules.timePerDinnerMin)?.label ?? '',
          (value) => {
            const match = PRESETS.time.find((t) => t.label === value);
            if (match) {
              state.mealRules.timePerDinnerMin = match.value;
            }
          }
        );
        break;
      case 'variety': {
        const slider = createEl('input', { attrs: { type: 'range', min: '0', max: '10', value: String(state.mealRules.varietyLevel) } });
        const label = createEl('div', { className: 'muted', text: `Variety: ${state.mealRules.varietyLevel}/10` });
        slider.addEventListener('input', () => {
          state.mealRules.varietyLevel = Number(slider.value);
          label.textContent = `Variety: ${slider.value}/10`;
          updateQuickPreview(quickRefs, hubRefs);
        });
        content.append(slider, label);
        break;
      }
      case 'skill':
        renderSingleChips(PRESETS.skill, state.skillBudget.skillLevel, (value) => {
          state.skillBudget.skillLevel = value;
        });
        break;
      case 'budget':
        renderSingleChips(PRESETS.budget, state.skillBudget.budgetLevel, (value) => {
          state.skillBudget.budgetLevel = value;
        });
        break;
      case 'leftovers':
        renderSingleChips(PRESETS.leftovers, state.mealRules.leftoversPolicy, (value) => {
          state.mealRules.leftoversPolicy = value;
        });
        break;
      case 'servings':
        renderSingleChips(PRESETS.servings, String(state.mealRules.servingsPerRecipe), (value) => {
          state.mealRules.servingsPerRecipe = Number(value);
          devPanel.syncFromState();
          updateQuickPreview(quickRefs, hubRefs);
        });
        break;
      case 'cuisines':
        renderMultiChips(addPresetIfMissing(state.taste.cuisines, PRESETS.cuisines), state.taste.cuisines);
        addInput('Add cuisine', state.taste.cuisines);
        break;
      case 'spice': {
        const slider = createEl('input', { attrs: { type: 'range', min: '0', max: '10', value: String(state.taste.spiceTolerance) } });
        const label = createEl('div', { className: 'muted', text: `Spice tolerance: ${state.taste.spiceTolerance}/10` });
        slider.addEventListener('input', () => {
          state.taste.spiceTolerance = Number(slider.value);
          label.textContent = `Spice tolerance: ${slider.value}/10`;
          updateQuickPreview(quickRefs, hubRefs);
        });
        content.append(slider, label);
        break;
      }
      case 'dessert': {
        const toggle = createEl('button', {
          className: 'btn btn-secondary',
          text: state.taste.allowDesserts ? 'Desserts allowed ✓' : 'No desserts',
        });
        toggle.type = 'button';
        toggle.addEventListener('click', () => {
          state.taste.allowDesserts = !state.taste.allowDesserts;
          renderTopicPanel(topic);
          updateQuickPreview(quickRefs, hubRefs);
          refreshTiles();
        });
        content.append(toggle);
        break;
      }
      case 'proteins':
        renderMultiChips(addPresetIfMissing(state.taste.proteinPrefs, PRESETS.proteins), state.taste.proteinPrefs);
        addInput('Add protein', state.taste.proteinPrefs);
        break;
      case 'equipment':
        renderMultiChips(addPresetIfMissing(state.skillBudget.equipment, PRESETS.equipment), state.skillBudget.equipment);
        addInput('Add equipment', state.skillBudget.equipment);
        break;
    }

    hubRefs.panel.appendChild(content);
  }

  refreshTiles();
  updateQuickPreview(quickRefs, hubRefs);
}

function createField(label: string, control: HTMLElement): HTMLElement {
  const wrapper = createEl('div');
  wrapper.append(createEl('label', { text: label }), control);
  return wrapper;
}

buildPreferencesPage();
