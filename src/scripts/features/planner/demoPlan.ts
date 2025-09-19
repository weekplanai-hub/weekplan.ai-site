import { DAYS } from './constants';
import type { PlannerStore } from './state';

const DEMO_TITLES = [
  'Coconut Lentil Curry',
  'Chicken & Quinoa Bowls',
  'Veggie Pasta (GF)',
  'Salmon Traybake',
  'Chickpea Tabbouleh',
  'Turkey Lettuce Wraps',
  'Roasted Cauli Bowls',
];

const DEMO_IMAGES = [
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1512058564366-18510be2db19?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1617196037304-9a851b1cfa2c?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506086679525-9d3a8e4d1f04?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1543352634-11a8e2d3d6c4?q=80&w=800&auto=format&fit=crop',
];

export function applyDemoPlan(store: PlannerStore): void {
  DAYS.forEach((_, index) => {
    store.setItem(index, {
      title: DEMO_TITLES[index % DEMO_TITLES.length],
      imageUrl: DEMO_IMAGES[index % DEMO_IMAGES.length],
      color: undefined,
    });
  });
}
