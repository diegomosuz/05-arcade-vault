import { cacheLife, cacheTag } from "next/cache";
import type { Category, CoverClass, Game } from "@/lib/games";
import { createPublicClient } from "@/lib/supabase/public";

// Catálogo con estadísticas reales. Se invalida con la etiqueta `scores` al guardar una marca.
export async function getGames(): Promise<Game[]> {
  "use cache";
  cacheTag("games", "scores");
  cacheLife("minutes");

  const supabase = createPublicClient();
  const [games, stats] = await Promise.all([
    supabase.from("games").select("*").order("position"),
    supabase.from("game_stats").select("game_id, best_score, plays"),
  ]);
  if (games.error) throw games.error;
  if (stats.error) throw stats.error;

  const byGame = new Map(stats.data.map((s) => [s.game_id, s]));
  return games.data.map((g) => {
    const s = byGame.get(g.id);
    return {
      id: g.id,
      title: g.title,
      short: g.short,
      long: g.long,
      // Los check constraints de la tabla garantizan estos valores.
      cat: g.cat as Category,
      cover: g.cover as CoverClass,
      color: g.color as Game["color"],
      ranked: g.ranked,
      best: s?.best_score ?? 0,
      plays: s?.plays ?? 0,
    };
  });
}

export async function getGame(id: string): Promise<Game | undefined> {
  const games = await getGames();
  return games.find((g) => g.id === id);
}
