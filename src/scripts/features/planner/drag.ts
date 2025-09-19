export function attachDrag(cards: HTMLElement[], onSwap: (from: number, to: number) => void): void {
  let dragged: HTMLElement | null = null;

  cards.forEach((card) => {
    card.draggable = true;

    card.addEventListener('dragstart', (event) => {
      const target = event.target as HTMLElement;
      if (target.closest('button, a, input')) {
        event.preventDefault();
        return;
      }
      dragged = card;
      card.classList.add('dragging');
      try {
        event.dataTransfer?.setData('text/plain', card.dataset.dow ?? '');
      } catch (error) {
        console.debug('dragstart setData failed', error);
      }
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      dragged = null;
    });

    card.addEventListener('dragover', (event) => {
      event.preventDefault();
    });

    card.addEventListener('drop', (event) => {
      event.preventDefault();
      if (!dragged || dragged === card) {
        return;
      }
      const from = Number(dragged.dataset.dow ?? -1);
      const to = Number(card.dataset.dow ?? -1);
      if (Number.isFinite(from) && Number.isFinite(to)) {
        onSwap(from, to);
      }
    });
  });
}
