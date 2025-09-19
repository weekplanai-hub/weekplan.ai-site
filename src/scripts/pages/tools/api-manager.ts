import '../../styles-imports';
import '../../../styles/api-manager.css';

import { createEl, qs } from '../../core/dom';
import { saveLocal, loadLocal } from '../../core/storage';
import { callChatModel } from '../../features/recipes/model';

const KEY_STORAGE = 'weekplan_api_keys';
const FAV_STORAGE = 'weekplan_api_favorites';

type Provider = 'openrouter' | 'openai' | 'gemini' | 'grok';

interface StoredKeys {
  [provider: string]: string;
}

interface Favorite {
  provider: Provider;
  model: string;
}

interface ToolState {
  provider: Provider;
  apiKey: string;
  model: string;
  favorites: Favorite[];
  freeOnly: boolean;
}

const state: ToolState = {
  provider: 'openrouter',
  apiKey: '',
  model: 'nvidia/nemotron-nano-9b-v2:free',
  favorites: [],
  freeOnly: true,
};

function loadKeys(): StoredKeys {
  try {
    const raw = loadLocal(KEY_STORAGE);
    return raw ? (JSON.parse(raw) as StoredKeys) : {};
  } catch (error) {
    console.warn('Unable to parse key storage', error);
    return {};
  }
}

function persistKeys(keys: StoredKeys): void {
  saveLocal(KEY_STORAGE, JSON.stringify(keys));
}

function loadFavorites(): Favorite[] {
  try {
    const raw = loadLocal(FAV_STORAGE);
    return raw ? (JSON.parse(raw) as Favorite[]) : [];
  } catch (error) {
    console.warn('Unable to parse favorites', error);
    return [];
  }
}

function persistFavorites(favorites: Favorite[]): void {
  saveLocal(FAV_STORAGE, JSON.stringify(favorites));
}

function buildLayout(): void {
  const app = qs<HTMLDivElement>('#app');
  app.className = 'app';

  const header = createEl('header', { className: 'api-header' });
  const inner = createEl('div', { className: 'inner' });
  const brand = createEl('div', { className: 'brand', text: '🤖 API Manager' });
  const backLink = createEl('a', { className: 'btn btn-secondary', text: '← Home', attrs: { href: '/' } });
  inner.append(brand, backLink);
  header.append(inner);

  const main = createEl('main', { className: 'api-main' });

  const configPanel = createEl('section', { className: 'panel' });
  configPanel.append(createPanelHeader('API configuration', 'Set up provider, key and model'));

  const providerSelect = document.createElement('select');
  [
    { value: 'openrouter', label: 'OpenRouter' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'gemini', label: 'Gemini' },
    { value: 'grok', label: 'Grok' },
  ].forEach(({ value, label }) => {
    const option = createEl('option', { text: label });
    option.value = value;
    providerSelect.appendChild(option);
  });
  const apiKeyInput = createEl('input', { attrs: { type: 'password', placeholder: 'API key' } });
  const saveKeyBtn = createEl('button', { className: 'btn btn-primary', text: 'Save key' });
  saveKeyBtn.type = 'button';

  const modelSelect = createEl('select');
  modelSelect.appendChild(createEl('option', { text: state.model, attrs: { value: state.model } }));
  const modelInput = createEl('input', { attrs: { type: 'text', placeholder: 'Model (e.g. gpt-4o-mini)' } });
  const refreshBtn = createEl('button', { className: 'btn btn-secondary', text: 'Refresh models' });
  refreshBtn.type = 'button';
  const freeOnlyToggle = createEl('label', { className: 'row' });
  const freeCheckbox = document.createElement('input');
  freeCheckbox.type = 'checkbox';
  freeCheckbox.checked = state.freeOnly;
  freeOnlyToggle.append(freeCheckbox, document.createTextNode('FREE only'));

  const favoritesWrap = createEl('div', { className: 'chips' });

  const status = createEl('div', { className: 'status', text: 'Ready' });

  const formGrid = createEl('div', { className: 'form-grid three' });
  formGrid.append(createField('Provider', providerSelect), createField('API key', apiKeyInput), saveKeyBtn);

  const modelGrid = createEl('div', { className: 'form-grid three' });
  modelGrid.append(createField('Model', modelSelect), refreshBtn, freeOnlyToggle);

  const genericModelField = createField('Model (manual input)', modelInput);
  genericModelField.classList.add('hidden');

  configPanel.append(formGrid, modelGrid, genericModelField, createField('Favorites', favoritesWrap), status);

  const playground = createEl('section', { className: 'panel' });
  playground.append(createPanelHeader('Prompt playground', 'Send a quick test request to your chosen provider'));
  const systemInput = createEl('textarea', { attrs: { placeholder: 'System prompt (optional)' } });
  systemInput.value = 'You are a helpful assistant that replies in Norwegian.';
  const userInput = createEl('textarea', { attrs: { placeholder: 'User prompt' } });
  userInput.value = 'Lag en ukemeny med tre raske middager.';
  const sendBtn = createEl('button', { className: 'btn btn-primary', text: 'Send request' });
  sendBtn.type = 'button';
  const output = createEl('div', { className: 'output empty', text: 'Awaiting response…' });

  playground.append(createField('System prompt', systemInput), createField('User prompt', userInput), sendBtn, output);

  const addFavoriteBtn = createEl('button', { className: 'btn btn-secondary', text: '☆ Favorite current model' });
  addFavoriteBtn.type = 'button';
  configPanel.append(addFavoriteBtn);

  main.append(configPanel, playground);
  app.append(header, main);

  const storedKeys = loadKeys();
  const favorites = loadFavorites();
  state.favorites = favorites;
  const storedKey = storedKeys[state.provider];
  if (storedKey) {
    state.apiKey = storedKey;
    apiKeyInput.value = storedKey;
  }

  function syncFavorites(): void {
    favoritesWrap.innerHTML = '';
    if (state.favorites.length === 0) {
      favoritesWrap.appendChild(createEl('span', { className: 'muted', text: 'No favorites yet' }));
      return;
    }
    state.favorites.forEach((fav) => {
      const chip = createEl('button', { className: 'chip', text: `${fav.provider} • ${fav.model}` });
      chip.type = 'button';
      chip.addEventListener('click', () => {
        state.provider = fav.provider;
        providerSelect.value = fav.provider;
        state.model = fav.model;
        modelInput.value = fav.model;
        modelSelect.innerHTML = '';
        modelSelect.appendChild(createEl('option', { text: fav.model, attrs: { value: fav.model } }));
        updateModelVisibility();
      });
      const removeBtn = createEl('button', { text: '×' });
      removeBtn.type = 'button';
      removeBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        state.favorites = state.favorites.filter((f) => !(f.provider === fav.provider && f.model === fav.model));
        persistFavorites(state.favorites);
        syncFavorites();
      });
      chip.appendChild(removeBtn);
      favoritesWrap.appendChild(chip);
    });
  }

  function updateModelVisibility(): void {
    const isOpenRouter = state.provider === 'openrouter';
    modelGrid.classList.toggle('hidden', !isOpenRouter);
    genericModelField.classList.toggle('hidden', isOpenRouter);
    if (!isOpenRouter) {
      modelInput.value = state.model;
    }
  }

  providerSelect.addEventListener('change', () => {
    state.provider = providerSelect.value as Provider;
    const keys = loadKeys();
    const key = keys[state.provider];
    state.apiKey = key ?? '';
    apiKeyInput.value = state.apiKey;
    updateModelVisibility();
    status.textContent = `Provider switched to ${state.provider}`;
  });

  saveKeyBtn.addEventListener('click', () => {
    if (!apiKeyInput.value.trim()) {
      status.textContent = 'API key is empty';
      status.classList.add('error');
      return;
    }
    const keys = loadKeys();
    keys[state.provider] = apiKeyInput.value.trim();
    state.apiKey = keys[state.provider];
    persistKeys(keys);
    status.textContent = 'Key saved';
    status.classList.remove('error');
    status.classList.add('ok');
  });

  refreshBtn.addEventListener('click', async () => {
    if (state.provider !== 'openrouter') {
      status.textContent = 'Model list only supported for OpenRouter';
      status.classList.add('error');
      return;
    }
    status.textContent = 'Fetching models…';
    status.classList.add('loading');
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models');
      const data = await response.json();
      const models: Array<{ id: string; pricing?: { prompt?: string; completion?: string } }> = data.data || [];
      modelSelect.innerHTML = '';
      models
        .filter((model) => {
          if (!state.freeOnly) return true;
          const promptCost = model.pricing?.prompt ?? '';
          return promptCost === 'FREE' || promptCost === '';
        })
        .slice(0, 200)
        .forEach((model) => {
          const option = createEl('option', { text: model.id });
          option.value = model.id;
          modelSelect.appendChild(option);
        });
      status.textContent = `Loaded ${modelSelect.options.length} models`;
      status.classList.remove('loading', 'error');
      status.classList.add('ok');
    } catch (error) {
      console.error(error);
      status.textContent = 'Failed to load OpenRouter models';
      status.classList.remove('loading');
      status.classList.add('error');
    }
  });

  freeCheckbox.addEventListener('change', () => {
    state.freeOnly = freeCheckbox.checked;
  });

  modelSelect.addEventListener('change', () => {
    state.model = modelSelect.value;
  });

  modelInput.addEventListener('input', () => {
    state.model = modelInput.value.trim();
  });

  sendBtn.addEventListener('click', async () => {
    const modelName = state.provider === 'openrouter' ? modelSelect.value : modelInput.value.trim();
    if (!modelName) {
      status.textContent = 'Model is required';
      status.classList.add('error');
      return;
    }
    if (!apiKeyInput.value.trim()) {
      status.textContent = 'API key is required';
      status.classList.add('error');
      return;
    }
    if (!['openrouter', 'openai'].includes(state.provider)) {
      status.textContent = 'Sample requests are supported for OpenRouter and OpenAI';
      status.classList.add('error');
      return;
    }
    status.textContent = 'Sending request…';
    status.classList.add('loading');
    output.classList.remove('empty');
    output.textContent = '';

    try {
      const text = await callChatModel({
        provider: state.provider as 'openrouter' | 'openai',
        apiKey: apiKeyInput.value.trim(),
        model: modelName,
        prompt: `${systemInput.value.trim() ? systemInput.value.trim() + '\n\n' : ''}${userInput.value.trim()}`,
      });
      output.textContent = text || '(empty response)';
      status.textContent = 'Request complete';
      status.classList.remove('loading', 'error');
      status.classList.add('ok');
    } catch (error) {
      console.error(error);
      output.textContent = 'Request failed. See console for details.';
      status.textContent = error instanceof Error ? error.message : 'Request failed';
      status.classList.remove('loading');
      status.classList.add('error');
    }
  });

  addFavoriteBtn.addEventListener('click', () => {
    const modelName = state.provider === 'openrouter' ? modelSelect.value : modelInput.value.trim();
    if (!modelName) {
      status.textContent = 'Model required to favorite';
      status.classList.add('error');
      return;
    }
    if (!state.favorites.find((fav) => fav.provider === state.provider && fav.model === modelName)) {
      state.favorites.push({ provider: state.provider, model: modelName });
      persistFavorites(state.favorites);
      syncFavorites();
      status.textContent = 'Added to favorites';
      status.classList.add('ok');
    }
  });

  syncFavorites();
  updateModelVisibility();
}

function createPanelHeader(title: string, subtitle: string): HTMLElement {
  const header = createEl('header');
  const h2 = createEl('h2', { text: title });
  const span = createEl('span', { className: 'muted', text: subtitle });
  header.append(h2, span);
  return header;
}

function createField(label: string, control: HTMLElement): HTMLElement {
  const wrapper = createEl('div', { className: 'row' });
  wrapper.append(createEl('label', { text: label }), control);
  return wrapper;
}

buildLayout();
