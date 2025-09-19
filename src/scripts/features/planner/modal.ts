import { createEl } from '../../core/dom';
import type { PlannerItem } from '../../types/planner';

interface ModalCallbacks {
  onSave: (dow: number, patch: Partial<PlannerItem>) => void;
  onDelete: (dow: number) => void;
}

export class PlannerModal {
  private backdrop: HTMLElement;
  private form: HTMLFormElement;
  private titleInput: HTMLInputElement;
  private imageInput: HTMLInputElement;
  private colorInput: HTMLInputElement;
  private deleteButton: HTMLButtonElement;
  private cancelButton: HTMLButtonElement;
  private currentDow: number | null = null;
  private callbacks: ModalCallbacks;

  constructor(callbacks: ModalCallbacks) {
    this.callbacks = callbacks;

    this.backdrop = createEl('div', { className: 'dialog-backdrop hidden' });
    const dialog = createEl('div', { className: 'dialog' });
    const header = createEl('header');
    const heading = createEl('h2', { text: 'Edit recipe' });
    const closeButton = createEl('button', {
      className: 'btn btn-ghost',
      text: 'Close',
    });
    closeButton.type = 'button';
    closeButton.addEventListener('click', () => this.hide());
    header.append(heading, closeButton);

    this.form = createEl('form');

    const titleField = createEl('div');
    titleField.append(createEl('label', { text: 'Title' }));
    this.titleInput = createEl('input');
    this.titleInput.name = 'title';
    this.titleInput.placeholder = 'Recipe title';
    titleField.append(this.titleInput);

    const imageField = createEl('div');
    imageField.append(createEl('label', { text: 'Image URL' }));
    this.imageInput = createEl('input');
    this.imageInput.name = 'image';
    this.imageInput.placeholder = 'https://…';
    imageField.append(this.imageInput);

    const colorField = createEl('div');
    colorField.append(createEl('label', { text: 'Accent color' }));
    this.colorInput = createEl('input', { attrs: { type: 'color', value: '#ffffff' } });
    this.colorInput.name = 'color';
    colorField.append(this.colorInput);

    this.form.append(titleField, imageField, colorField);

    const footer = createEl('footer');
    this.deleteButton = createEl('button', {
      className: 'btn btn-secondary',
      text: 'Remove',
    });
    this.deleteButton.type = 'button';
    this.cancelButton = createEl('button', {
      className: 'btn btn-secondary',
      text: 'Cancel',
    });
    this.cancelButton.type = 'button';
    const saveButton = createEl('button', {
      className: 'btn btn-primary',
      text: 'Save',
    });
    saveButton.type = 'submit';

    footer.append(this.deleteButton, this.cancelButton, saveButton);

    dialog.append(header, this.form, footer);
    this.backdrop.append(dialog);
    document.body.appendChild(this.backdrop);

    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (this.currentDow == null) return;
      const payload: Partial<PlannerItem> = {
        title: this.titleInput.value.trim() || '(empty)',
        imageUrl: this.imageInput.value.trim(),
        color: this.colorInput.value,
      };
      this.callbacks.onSave(this.currentDow, payload);
      this.hide();
    });

    this.deleteButton.addEventListener('click', () => {
      if (this.currentDow == null) return;
      this.callbacks.onDelete(this.currentDow);
      this.hide();
    });

    this.cancelButton.addEventListener('click', () => this.hide());

    this.backdrop.addEventListener('click', (event) => {
      if (event.target === this.backdrop) {
        this.hide();
      }
    });
  }

  show(dow: number, item: PlannerItem): void {
    this.currentDow = dow;
    this.titleInput.value = item.title ?? '';
    this.imageInput.value = item.imageUrl ?? '';
    this.colorInput.value = item.color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(item.color)
      ? item.color
      : '#ffffff';
    this.backdrop.classList.remove('hidden');
    this.titleInput.focus();
  }

  hide(): void {
    this.currentDow = null;
    this.backdrop.classList.add('hidden');
  }
}
