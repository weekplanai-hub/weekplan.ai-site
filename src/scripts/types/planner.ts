export interface PlannerItem {
  dow: number;
  title: string;
  imageUrl: string;
  color?: string | null;
}

export interface PlannerStateSnapshot {
  planId: string | null;
  items: PlannerItem[];
}

export interface RecipePayload {
  day?: string;
  title?: string;
  image?: string;
  minutes?: number;
  tags?: string[];
  ingredients?: string[];
  instructions?: string[];
  nutrition?: {
    kcal?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
  };
}
