export interface RecipeGeneratorInput {
  allergens: string;
  diet: string;
  maxMins: number;
  cuisines: string;
  servings: number;
}

export function buildPrompt(input: RecipeGeneratorInput): string {
  const { allergens, diet, maxMins, cuisines, servings } = input;
  return `Du er en ernærings- og matfagekspert. Lag en 7-dagers middagsliste (én rett per dag) som passer følgende:
- Allergier/intoleranser: ${allergens || 'ingen spesifisert'}
- Kosthold/tema: ${diet || 'valgfritt'}
- Maks tilberedningstid: ${maxMins} minutter
- Kjøkken/smaker: ${cuisines || 'variert'}
- Antall porsjoner: ${servings}

Svar KUN som gyldig JSON i dette skjemaet (ingen forklaring, ingen tekst utenfor JSON):
{
  "week": [
    {
      "day": "Mandag|Tirsdag|...|Søndag",
      "title": "Kort rettnavn",
      "image": "URL eller tom streng",
      "minutes": 20,
      "tags": ["glutenfri","melkefri","nøttefri","vegan","høy-protein"],
      "ingredients": ["200 g kylling","1 ss sitron"],
      "instructions": ["Sett ovnen på 200°C","Bland ...","Stek ..."],
      "nutrition": { "kcal": 520, "protein_g": 35, "carbs_g": 55, "fat_g": 18 }
    }
  ]
}
Sørg for at alle 7 dager er med (Mandag til Søndag) og at minutes ≤ ${maxMins}.
Bruk norske dag- og ingrediensnavn.`.trim();
}
