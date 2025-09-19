import '../styles-imports';
import '../../styles/landing.css';

import { createEl, qs } from '../core/dom';

const rotatingPhrases = ['gluten-free', 'family-friendly', 'high-protein', 'budget-wise'];

function buildHero(): HTMLElement {
  const section = createEl('section', { className: 'hero' });
  const wrap = createEl('div', { className: 'container hero-content' });

  const copy = createEl('div');
  const heading = createEl('h1', { text: 'Allergy-smart meal plans in minutes' });
  const highlight = createEl('span', { className: 'badge', text: rotatingPhrases[0] });
  highlight.setAttribute('data-rotate', 'true');
  heading.appendChild(createEl('span', { className: 'visually-hidden', text: ' — ' }));
  copy.append(
    heading,
    createEl('p', {
      text: 'Tell us your allergies and goals, then let AI craft a balanced dinner plan. Drag, edit, and save to keep everyone fed and happy.',
    }),
    createButtons(),
    createBadges()
  );

  const visual = createEl('div', { className: 'hero-visual' });
  const heroImage = createEl('img', {
    attrs: {
      src: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?q=80&w=1200&auto=format&fit=crop',
      alt: 'Planner dashboard preview',
    },
  });
  const floating = createEl('div', { className: 'card-floating' });
  floating.append(
    createEl('strong', { text: 'Plan smarter' }),
    createEl('ul', {
      html: [
        'Auto-swap ingredients by allergy',
        'Keep prep time under 30 min',
        'Sync to Supabase for every device',
      ]
        .map((item) => `<li>${item}</li>`)
        .join(''),
    })
  );

  visual.append(heroImage, floating);
  wrap.append(copy, visual);
  section.appendChild(wrap);
  heading.appendChild(document.createTextNode(' for '));
  heading.appendChild(highlight);
  return section;
}

function createButtons(): HTMLElement {
  const actions = createEl('div', { className: 'hero-actions' });
  actions.append(
    createEl('a', { className: 'btn btn-primary', text: 'Open planner', attrs: { href: '/weekplan.html' } }),
    createEl('a', { className: 'btn btn-secondary', text: 'Try recipe AI', attrs: { href: '/ai-recipe-planner.html' } })
  );
  return actions;
}

function createBadges(): HTMLElement {
  const list = createEl('div', { className: 'hero-badges' });
  ['Nut & gluten aware', 'LLM-powered', 'Save to Supabase', 'Responsive'].forEach((item) => {
    list.appendChild(createEl('span', { className: 'badge', text: item }));
  });
  return list;
}

function buildFeatures(): HTMLElement {
  const section = createEl('section');
  const wrap = createEl('div', { className: 'container' });
  wrap.append(
    createEl('h2', { className: 'section-title', text: 'Designed for household harmony' }),
    createEl('p', {
      className: 'section-subtitle',
      text: 'Speedy planning for parents, athletes, and anyone juggling allergies or macros.',
    })
  );

  const grid = createEl('div', { className: 'grid features-grid' });
  const cards: Array<{ icon: string; title: string; body: string }> = [
    { icon: '🧠', title: 'AI that listens', body: 'Combine allergies, diets, macros, and custom notes to generate a full week of dinners.' },
    { icon: '🍽️', title: 'Drag, drop, done', body: 'Reorder meals, edit details, and save instantly across devices with Supabase sync.' },
    { icon: '⏱️', title: 'Under 30 minutes', body: 'Cap cook time globally or per meal. Perfect for busy weeknights and tired parents.' },
    { icon: '📋', title: 'Shareable prompts', body: 'Export your preferences JSON or recipes directly to the planner when inspiration strikes.' },
  ];

  cards.forEach(({ icon, title, body }) => {
    const card = createEl('article', { className: 'feature-card' });
    card.append(createEl('span', { text: icon }), createEl('h3', { text: title }), createEl('p', { text: body }));
    grid.appendChild(card);
  });

  wrap.appendChild(grid);
  section.appendChild(wrap);
  return section;
}

function buildIntegrations(): HTMLElement {
  const section = createEl('section');
  const wrap = createEl('div', { className: 'container integrations' });
  const supabaseCard = createEl('article', { className: 'integration-card' });
  supabaseCard.append(
    createEl('header', {
      html: '<h3>Supabase-ready</h3><span class="badge">Auth + storage</span>',
    }),
    createEl('p', { text: 'Deploy instantly with Supabase Auth + Postgres for persistent plans and user profiles.' }),
    createEl('ul', {
      html: ['Email login', 'Row-level security ready', 'Works on the free tier'].map((item) => `<li>${item}</li>`).join(''),
    })
  );

  const aiCard = createEl('article', { className: 'integration-card' });
  aiCard.append(
    createEl('header', {
      html: '<h3>Bring your own API key</h3><span class="badge">OpenRouter / OpenAI</span>',
    }),
    createEl('p', { text: 'Use any chat-completion provider to generate balanced 7-day menus that respect every allergy.' }),
    createEl('ul', {
      html: ['Prompt tuned in Norwegian', 'JSON structured output', 'Send dishes straight to planner'].map((item) => `<li>${item}</li>`).join(''),
    })
  );

  wrap.append(supabaseCard, aiCard);
  section.appendChild(wrap);
  return section;
}

function buildFooter(): HTMLElement {
  const footer = createEl('footer');
  const wrap = createEl('div', { className: 'container' });
  const year = new Date().getFullYear();
  wrap.append(
    createEl('span', { text: `© ${year} Weekplan.ai` }),
    createEl('a', { text: 'Planner →', attrs: { href: '/weekplan.html' } })
  );
  footer.appendChild(wrap);
  return footer;
}

function rotateBadge(): void {
  const badge = document.querySelector('[data-rotate]');
  if (!(badge instanceof HTMLElement)) return;
  let index = 1;
  window.setInterval(() => {
    badge.textContent = rotatingPhrases[index % rotatingPhrases.length];
    index += 1;
  }, 2800);
}

function mount(): void {
  const app = qs<HTMLDivElement>('#app');
  const main = createEl('main');
  main.append(buildHero(), buildFeatures(), buildIntegrations());
  app.append(main, buildFooter());
  rotateBadge();
}

mount();
