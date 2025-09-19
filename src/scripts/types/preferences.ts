export interface PreferencesState {
  profileVersion: number;
  quickNote: string;
  goals: string[];
  dietary: {
    dietStyle: string;
    allergies: string[];
    intolerances: string[];
    avoid: string[];
    mustInclude: string[];
  };
  taste: {
    cuisines: string[];
    spiceTolerance: number;
    allowDesserts: boolean;
    proteinPrefs: string[];
  };
  mealRules: {
    focusMeals: string;
    servingsPerRecipe: number;
    leftoversPolicy: string;
    timePerDinnerMin: number;
    varietyLevel: number;
  };
  skillBudget: {
    skillLevel: string;
    budgetLevel: string;
    equipment: string[];
  };
  meta: {
    device: string;
    savedAt: string | null;
    units: 'metric' | 'us';
  };
}

export type TopicId =
  | 'goals'
  | 'diet'
  | 'allergies'
  | 'avoid'
  | 'must'
  | 'time'
  | 'variety'
  | 'skill'
  | 'budget'
  | 'leftovers'
  | 'servings'
  | 'cuisines'
  | 'spice'
  | 'dessert'
  | 'proteins'
  | 'equipment';

export interface TopicDefinition {
  id: TopicId;
  label: string;
  emoji: string;
}
