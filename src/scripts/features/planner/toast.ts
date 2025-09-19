import { createEl } from '../../core/dom';

let activeToast: HTMLElement | null = null;
let hideTimer: number | null = null;

export function showToast(message: string, duration = 2600): void {
  if (activeToast) {
    activeToast.remove();
  }
  if (hideTimer) {
    window.clearTimeout(hideTimer);
  }

  activeToast = createEl('div', {
    className: 'recipe-toast',
    text: message,
  });
  document.body.appendChild(activeToast);

  hideTimer = window.setTimeout(() => {
    activeToast?.remove();
    activeToast = null;
    hideTimer = null;
  }, duration);
}
