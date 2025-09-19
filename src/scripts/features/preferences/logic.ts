import type { PreferencesState, TopicId } from '../../types/preferences';
import { PRESETS } from './presets';

export function isTopicSet(state: PreferencesState, topic: TopicId): boolean {
  switch (topic) {
    case 'goals':
      return state.goals.length > 0;
    case 'diet':
      return state.dietary.dietStyle !== 'omnivore';
    case 'allergies':
      return state.dietary.allergies.length > 0;
    case 'avoid':
      return state.dietary.avoid.length > 0;
    case 'must':
      return state.dietary.mustInclude.length > 0;
    case 'time':
      return state.mealRules.timePerDinnerMin !== 30;
    case 'variety':
      return state.mealRules.varietyLevel !== 7;
    case 'skill':
      return state.skillBudget.skillLevel !== 'beginner';
    case 'budget':
      return state.skillBudget.budgetLevel !== 'medium';
    case 'leftovers':
      return state.mealRules.leftoversPolicy !== 'none';
    case 'servings':
      return state.mealRules.servingsPerRecipe !== 2;
    case 'cuisines':
      return state.taste.cuisines.length > 0;
    case 'spice':
      return state.taste.spiceTolerance !== 5;
    case 'dessert':
      return state.taste.allowDesserts === false;
    case 'proteins':
      return state.taste.proteinPrefs.length > 0;
    case 'equipment':
      return state.skillBudget.equipment.length > 0;
    default:
      return false;
  }
}

export function toggleArrayValue(list: string[], value: string): void {
  const index = list.indexOf(value);
  if (index >= 0) {
    list.splice(index, 1);
  } else {
    list.push(value);
  }
}

export function addPresetIfMissing(list: string[], preset: readonly string[]): string[] {
  const merged = new Set<string>([...preset, ...list]);
  return Array.from(merged);
}

export function getPresetList(topic: TopicId): string[] {
  switch (topic) {
    case 'goals':
      return PRESETS.goals;
    case 'diet':
      return PRESETS.diets;
    case 'allergies':
      return PRESETS.allergies;
    case 'avoid':
      return PRESETS.avoid;
    case 'must':
      return PRESETS.must;
    case 'cuisines':
      return PRESETS.cuisines;
    case 'proteins':
      return PRESETS.proteins;
    case 'equipment':
      return PRESETS.equipment;
    default:
      return [];
  }
}
