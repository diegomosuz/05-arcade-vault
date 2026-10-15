export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type CoverClass =
  | "cover-bricks"
  | "cover-tetro"
  | "cover-snake"
  | "cover-glot"
  | "cover-invaders"
  | "cover-rocas"
  | "cover-rana"
  | "cover-duelo";

// El catálogo vive en la tabla `games` de Supabase (lib/db/games.ts).
export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: CoverClass;
  color: "cyan" | "magenta" | "yellow" | "green";
  ranked: boolean; // acepta puntuaciones reales
  best: number; // 0 si no hay partidas (viene de game_stats)
  plays: number; // viene de game_stats
};

export const CATS: ("TODOS" | Category)[] = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];
