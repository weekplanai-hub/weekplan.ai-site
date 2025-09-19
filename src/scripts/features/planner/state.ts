import type { PlannerItem, PlannerStateSnapshot } from '../../types/planner';
import { DEFAULT_IMAGE } from './constants';

export class PlannerStore {
  private planId: string | null = null;
  private items: Map<number, PlannerItem> = new Map();

  load(snapshot: PlannerStateSnapshot): void {
    this.planId = snapshot.planId;
    this.items = new Map(snapshot.items.map((item) => [item.dow, item]));
  }

  reset(): void {
    this.planId = null;
    this.items.clear();
  }

  getPlanId(): string | null {
    return this.planId;
  }

  setPlanId(id: string): void {
    this.planId = id;
  }

  setItem(dow: number, patch: Partial<PlannerItem>): void {
    const previous = this.items.get(dow);
    const next: PlannerItem = {
      dow,
      title: patch.title ?? previous?.title ?? '(empty)',
      imageUrl: patch.imageUrl ?? previous?.imageUrl ?? DEFAULT_IMAGE,
      color: patch.color ?? previous?.color ?? undefined,
    };
    this.items.set(dow, next);
  }

  removeItem(dow: number): void {
    this.items.delete(dow);
  }

  swap(a: number, b: number): void {
    const first = this.items.get(a);
    const second = this.items.get(b);
    if (first) {
      this.items.set(b, { ...first, dow: b });
    } else {
      this.items.delete(b);
    }
    if (second) {
      this.items.set(a, { ...second, dow: a });
    } else {
      this.items.delete(a);
    }
  }

  getItems(): PlannerItem[] {
    return Array.from({ length: 7 }, (_, index) => {
      return this.items.get(index) ?? {
        dow: index,
        title: '(empty)',
        imageUrl: DEFAULT_IMAGE,
        color: undefined,
      };
    });
  }

  snapshot(): PlannerStateSnapshot {
    return {
      planId: this.planId,
      items: Array.from(this.items.values()).sort((a, b) => a.dow - b.dow),
    };
  }

  findFirstEmpty(): number | null {
    for (let i = 0; i < 7; i += 1) {
      if (!this.items.has(i)) {
        return i;
      }
    }
    return null;
  }
}
