export interface BadgeCategory {
  id: number;
  key: string;
  name: string | null;
}

export interface BadgeDifficulty {
  id: number;
  key: string;
  name: string | null;
  points: number;
}

export interface BadgeCountry {
  id: string;
  name: string;
}

export interface Badge {
  id: number;
  name: string;
  description: string;
  image_path: string | null;
  points: number;
  category_id: number;
  difficulty_id: number;
  target_value: string | null;
  start_date: string | null;
  end_date: string | null;
  repeatable: boolean;
  premium: boolean;
  category: BadgeCategory;
  difficulty: BadgeDifficulty;
  countries: BadgeCountry[];
}

export interface BadgeUpdates {
  availableChallenges: Badge[];
}
