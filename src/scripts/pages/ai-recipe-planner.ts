import '../styles-imports';
import '../../styles/recipe.css';

import { createEl, qs } from '../core/dom';
import { saveLocal, loadLocal } from '../core/storage';
import { buildPrompt, type RecipeGeneratorInput } from '../features/recipes/prompt';
import { callChatModel, parseJsonFromModel, type Provider } from '../features/recipes/model';
import type { RecipePayload } from '../types/planner';

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1200&auto=format&fit=crop';
const DAYS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];
const KEY_STORAGE = 'weekplan_api_key';

interface UIRefs {
  provider: HTMLSelectElement;
  apiKey: HTMLInputElement;
  model: HTMLInputElement;
  saveKey: HTMLButtonElement;
  loadKey: HTMLButtonElement;
  generate: HTMLButtonElement;
  status: HTMLElement;
  grid: HTMLElement;
  prefs: {
    allergens: HTMLInputElement;
    diet: HTMLSelectElement;
    maxMins: HTMLInputElement;
    cuisines: HTMLInputElement;
    servings: HTMLInputElement;
  };
}

function buildLayout(): { header: HTMLElement; main: HTMLElement; footer: HTMLElement; refs: UIRefs } {
  const header = createEl('header', { className: 'page-header' });
  const nav = createEl('nav', { className: 'container' });
  const brand = createEl('a', { className: 'brand', text: 'Weekplan' });
  brand.appendChild(createEl('span', { text: '.ai' }));
  brand.setAttribute('href', '/');
  const plannerLink = createEl('a', { className: 'btn btn-secondary', text: 'Til ukeplan', attrs: { href: '/weekplan.html' } });
  nav.append(brand, plannerLink);
  header.appendChild(nav);

  const main = createEl('main', { className: 'generator' });

  const configCard = createEl('section', { className: 'card' });
  configCard.append(createEl('h2', { text: 'AI Oppskriftsgenerator' }));
  configCard.append(
    createEl('p', {
      className: 'muted',
      text: 'Lim inn API-nøkkel (OpenRouter eller OpenAI), velg modell, fyll inn preferanser og generer 7 oppskrifter klare for ukeplanen.',
    })
  );

  const provider = createEl('select');
  ['openrouter', 'openai'].forEach((value) => {
    const option = createEl('option', { text: value === 'openrouter' ? 'OpenRouter' : 'OpenAI' });
    option.value = value;
    provider.appendChild(option);
  });
  const apiKey = createEl('input', { attrs: { type: 'password', placeholder: 'Lim inn API-nøkkel' } });
  const model = createEl('input', {
    attrs: { type: 'text', value: 'nvidia/nemotron-nano-9b-v2:free', placeholder: 'Modell (f.eks. gpt-4o-mini)' },
  });

  const formGrid = createEl('div', { className: 'controls-grid' });
  formGrid.append(
    createField('Provider', provider),
    createField('API-nøkkel', apiKey),
    createField('Modell', model)
  );

  const keyActions = createEl('div', { className: 'hero-actions' });
  const saveKey = createEl('button', { className: 'btn btn-secondary', text: 'Lagre nøkkel' });
  saveKey.type = 'button';
  const loadKey = createEl('button', { className: 'btn btn-ghost', text: 'Hent nøkkel' });
  loadKey.type = 'button';
  keyActions.append(saveKey, loadKey);

  configCard.append(formGrid, keyActions);

  const prefsCard = createEl('section', { className: 'card' });
  prefsCard.append(createEl('h3', { text: 'Preferanser' }));
  const allergens = createEl('input', { attrs: { type: 'text', placeholder: 'gluten, melk, nøtter' } });
  const diet = createEl('select');
  [
    { value: '', label: 'Ingen spesifikk' },
    { value: 'Vegetar', label: 'Vegetar' },
    { value: 'Vegan', label: 'Vegan' },
    { value: 'Høyt protein', label: 'Høyt protein' },
    { value: 'Lavt budsjett', label: 'Lavt budsjett' },
    { value: 'Rask (≤20 min)', label: 'Rask (≤20 min)' },
  ].forEach(({ value, label }) => {
    const option = createEl('option', { text: label });
    option.value = value;
    diet.appendChild(option);
  });
  const maxMins = createEl('input', { attrs: { type: 'number', min: '10', step: '5', value: '30' } });
  const cuisines = createEl('input', { attrs: { type: 'text', placeholder: 'italiensk, asiatisk, norsk' } });
  const servings = createEl('input', { attrs: { type: 'number', min: '1', value: '2' } });

  const prefsGrid = createEl('div', { className: 'controls-grid' });
  prefsGrid.append(
    createField('Allergener (komma)', allergens),
    createField('Kosthold', diet),
    createField('Maks tid (min)', maxMins),
    createField('Kjøkken/smak', cuisines),
    createField('Porsjoner', servings)
  );

  const generate = createEl('button', { className: 'btn btn-primary', text: 'Generer 7 oppskrifter' });
  generate.type = 'button';
  const status = createEl('div', { className: 'status', text: 'Klar' });
  const controlsRow = createEl('div', { className: 'hero-actions' });
  controlsRow.append(generate, status);

  prefsCard.append(prefsGrid, controlsRow);

  const resultCard = createEl('section', { className: 'card' });
  resultCard.append(createEl('h3', { text: 'Resultat' }));
  const grid = createEl('div', { className: 'result-grid' });
  resultCard.append(grid);

  main.append(configCard, prefsCard, resultCard);

  const footer = createEl('footer', { className: 'footer' });
  footer.appendChild(createEl('div', { className: 'container', text: `© ${new Date().getFullYear()} Weekplan.ai` }));

  return {
    header,
    main,
    footer,
    refs: {
      provider,
      apiKey,
      model,
      saveKey,
      loadKey,
      generate,
      status,
      grid,
      prefs: { allergens, diet, maxMins, cuisines, servings },
    },
  };
}

function createField(label: string, control: HTMLElement): HTMLElement {
  const wrapper = createEl('div');
  wrapper.append(createEl('label', { text: label }), control);
  return wrapper;
}

function setStatus(statusEl: HTMLElement, message: string, tone: 'idle' | 'loading' | 'ok' | 'error'): void {
  statusEl.textContent = message;
  statusEl.classList.remove('loading', 'ok', 'error');
  if (tone !== 'idle') {
    statusEl.classList.add(tone);
  }
}

function extractPrefs(refs: UIRefs['prefs']): RecipeGeneratorInput {
  return {
    allergens: refs.allergens.value.trim(),
    diet: refs.diet.value,
    maxMins: Number(refs.maxMins.value) || 30,
    cuisines: refs.cuisines.value.trim(),
    servings: Number(refs.servings.value) || 2,
  };
}

function ensureRecipes(data: unknown): RecipePayload[] {
  if (!data || typeof data !== 'object' || !('week' in data)) {
    throw new Error('Fant ingen oppskrifter i svaret.');
  }
  const week = (data as { week: unknown }).week;
  if (!Array.isArray(week) || week.length === 0) {
    throw new Error('Oppskriftlisten er tom.');
  }
  return week as RecipePayload[];
}

function renderRecipes(container: HTMLElement, recipes: RecipePayload[]): void {
  container.innerHTML = '';
  recipes.forEach((recipe, index) => {
    const card = createEl('article', { className: 'recipe-card' });
    const header = createEl('header');
    const heading = createEl('strong', {
      text: `${recipe.day ?? DAYS[index] ?? ''} — ${recipe.title ?? 'Uten tittel'}`.trim(),
    });
    const pills = createEl('div', { className: 'pills' });
    if (recipe.minutes) pills.appendChild(createEl('span', { className: 'pill', text: `${recipe.minutes} min` }));
    if (recipe?.nutrition?.kcal) pills.appendChild(createEl('span', { className: 'pill', text: `${recipe.nutrition.kcal} kcal` }));
    header.append(heading, pills);

    const image = createEl('img', {
      attrs: {
        src: recipe.image && recipe.image.startsWith('http') ? recipe.image : PLACEHOLDER_IMAGE,
        alt: recipe.title ?? 'Oppskrift',
      },
    });

    const tags = createEl('div', { className: 'pills' });
    (recipe.tags ?? []).forEach((tag) => tags.appendChild(createEl('span', { className: 'pill', text: tag })));

    const ingredients = createEl('details');
    ingredients.appendChild(createEl('summary', { text: 'Ingredienser' }));
    const ingList = createEl('ul');
    (recipe.ingredients ?? []).forEach((item) => ingList.appendChild(createEl('li', { text: item })));
    ingredients.appendChild(ingList);

    const steps = createEl('details');
    steps.appendChild(createEl('summary', { text: 'Fremgangsmåte' }));
    const stepList = createEl('ol');
    (recipe.instructions ?? []).forEach((item) => stepList.appendChild(createEl('li', { text: item })));
    steps.appendChild(stepList);

    const footer = createEl('footer');
    const copyBtn = createEl('button', { className: 'btn btn-secondary', text: 'Kopier JSON' });
    copyBtn.type = 'button';
    const useBtn = createEl('button', { className: 'btn btn-primary', text: 'Bruk i ukeplan' });
    useBtn.type = 'button';
    footer.append(copyBtn, useBtn);

    card.append(header, image, tags, ingredients, steps, footer);
    container.appendChild(card);

    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(JSON.stringify(recipe, null, 2));
      copyBtn.textContent = 'Kopiert!';
      window.setTimeout(() => (copyBtn.textContent = 'Kopier JSON'), 1200);
    });

    useBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent<RecipePayload>('recipe:selected', { detail: recipe }));
      useBtn.textContent = 'Sendt ✓';
      window.setTimeout(() => (useBtn.textContent = 'Bruk i ukeplan'), 1200);
    });
  });
}

async function handleGenerate(refs: UIRefs): Promise<void> {
  const { provider, apiKey, model, status, prefs, generate, grid } = refs;
  const input = extractPrefs(prefs);
  if (!apiKey.value.trim()) {
    setStatus(status, 'Mangler API-nøkkel', 'error');
    return;
  }
  if (!model.value.trim()) {
    setStatus(status, 'Mangler modellnavn', 'error');
    return;
  }

  const prompt = buildPrompt(input);
  generate.disabled = true;
  setStatus(status, 'Genererer …', 'loading');
  grid.innerHTML = '';

  try {
    const responseText = await callChatModel({
      provider: provider.value as Provider,
      apiKey: apiKey.value.trim(),
      model: model.value.trim(),
      prompt,
    });
    const parsed = parseJsonFromModel(responseText);
    const recipes = ensureRecipes(parsed);
    renderRecipes(grid, recipes);
    setStatus(status, `OK — ${recipes.length} retter generert`, 'ok');
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Ukjent feil ved generering';
    setStatus(status, message, 'error');
    grid.innerHTML = '<p class="muted">Ingen oppskrifter generert</p>';
  } finally {
    generate.disabled = false;
  }
}

function mount(): void {
  const app = qs<HTMLDivElement>('#app');
  const { header, main, footer, refs } = buildLayout();
  app.append(header, main, footer);

  refs.saveKey.addEventListener('click', () => {
    if (!refs.apiKey.value.trim()) {
      setStatus(refs.status, 'Tom nøkkel – ingenting lagret', 'error');
      return;
    }
    saveLocal(KEY_STORAGE, refs.apiKey.value.trim());
    setStatus(refs.status, 'Nøkkel lagret lokalt', 'ok');
  });

  refs.loadKey.addEventListener('click', () => {
    const stored = loadLocal(KEY_STORAGE);
    if (stored) {
      refs.apiKey.value = stored;
      setStatus(refs.status, 'Nøkkel hentet', 'ok');
    } else {
      setStatus(refs.status, 'Fant ingen nøkkel lagret', 'error');
    }
  });

  refs.generate.addEventListener('click', () => {
    handleGenerate(refs);
  });
}

mount();
