import { clearChildren, createEl } from '../../core/dom';
import type { PlannerItem } from '../../types/planner';
import { DAYS, DEFAULT_IMAGE } from './constants';

interface RenderOptions {
  container: HTMLElement;
  items: PlannerItem[];
  onEdit: (dow: number) => void;
}

export function renderPlannerGrid(options: RenderOptions): HTMLElement[] {
  const { container, items, onEdit } = options;
  clearChildren(container);

  return items.map((item, index) => {
    const card = createEl('article', {
      className: 'planner-card',
      attrs: { 'data-dow': index.toString() },
    });

    if (item.color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(item.color)) {
      card.style.background = item.color;
    } else {
      card.style.background = '';
    }

    const header = createEl('div', { className: 'card-header' });
    const label = createEl('strong', { text: DAYS[index] });
    const editButton = createEl('button', {
      className: 'btn btn-secondary',
      text: 'Edit',
    });
    editButton.type = 'button';
    editButton.addEventListener('click', (event) => {
      event.stopPropagation();
      onEdit(index);
    });
    header.append(label, editButton);

    const image = createEl('img', {
      className: 'card-image',
      attrs: {
        src: item.imageUrl || DEFAULT_IMAGE,
        alt: item.title ? `${item.title} illustration` : 'Recipe',
      },
    });

    const body = createEl('div', { className: 'card-body' });
    const title = createEl('h3', { text: item.title || '(empty)' });
    if (!item.title || item.title === '(empty)') {
      title.classList.add('card-empty');
    }
    body.append(title);

    card.append(header, image, body);
    container.appendChild(card);
    return card;
  });
}
