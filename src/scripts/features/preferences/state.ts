import type { PreferencesState } from '../../types/preferences';

export const initialState: PreferencesState = {
  profileVersion: 1,
  quickNote: '',
  goals: [],
  dietary: {
    dietStyle: 'omnivore',
    allergies: [],
    intolerances: [],
    avoid: [],
    mustInclude: [],
  },
  taste: {
    cuisines: [],
    spiceTolerance: 5,
    allowDesserts: true,
    proteinPrefs: [],
  },
  mealRules: {
    focusMeals: 'dinner',
    servingsPerRecipe: 2,
    leftoversPolicy: 'none',
    timePerDinnerMin: 30,
    varietyLevel: 7,
  },
  skillBudget: {
    skillLevel: 'beginner',
    budgetLevel: 'medium',
    equipment: [],
  },
  meta: {
    device: 'web',
    savedAt: null,
    units: 'metric',
  },
};

export function cloneState(state: PreferencesState): PreferencesState {
  return {
    profileVersion: state.profileVersion,
    quickNote: state.quickNote,
    goals: [...state.goals],
    dietary: {
      dietStyle: state.dietary.dietStyle,
      allergies: [...state.dietary.allergies],
      intolerances: [...state.dietary.intolerances],
      avoid: [...state.dietary.avoid],
      mustInclude: [...state.dietary.mustInclude],
    },
    taste: {
      cuisines: [...state.taste.cuisines],
      spiceTolerance: state.taste.spiceTolerance,
      allowDesserts: state.taste.allowDesserts,
      proteinPrefs: [...state.taste.proteinPrefs],
    },
    mealRules: {
      focusMeals: state.mealRules.focusMeals,
      servingsPerRecipe: state.mealRules.servingsPerRecipe,
      leftoversPolicy: state.mealRules.leftoversPolicy,
      timePerDinnerMin: state.mealRules.timePerDinnerMin,
      varietyLevel: state.mealRules.varietyLevel,
    },
    skillBudget: {
      skillLevel: state.skillBudget.skillLevel,
      budgetLevel: state.skillBudget.budgetLevel,
      equipment: [...state.skillBudget.equipment],
    },
    meta: {
      device: state.meta.device,
      savedAt: state.meta.savedAt,
      units: state.meta.units,
    },
  };
}

export function toExportObject(state: PreferencesState): PreferencesState {
  return {
    ...cloneState(state),
    meta: {
      ...state.meta,
      savedAt: new Date().toISOString(),
    },
  };
}
