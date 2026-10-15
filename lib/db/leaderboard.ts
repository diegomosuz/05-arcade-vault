import { cacheLife, cacheTag } from "next/cache";
import { formatDate } from "@/lib/dates";
import { createPublicClient } from "@/lib/supabase/public";

export const LEADERBOARD_SIZE = 12;

export type LeaderboardRow = {
  rank: number;
  name: string;
  score: number;
  date: string; // dd/mm/aaaa
};

// Top 12 de cada juego (la mejor marca de cada jugador), indexado por `game_id`.
export async function getLeaderboards(): Promise<Record<string, LeaderboardRow[]>> {
  "use cache";
  cacheTag("scores");
  cacheLife("minutes");

  const { data, error } = await createPublicClient()
    .from("leaderboard")
    .select("game_id, username, best_score, achieved_at, rank")
    .lte("rank", LEADERBOARD_SIZE)
    .order("game_id")
    .order("rank");
  if (error) throw error;

  const boards: Record<string, LeaderboardRow[]> = {};
  for (const r of data) {
    if (!r.game_id || !r.username || r.best_score === null || r.rank === null || !r.achieved_at) continue;
    (boards[r.game_id] ??= []).push({
      rank: r.rank,
      name: r.username,
      score: r.best_score,
      date: formatDate(r.achieved_at),
    });
  }
  return boards;
}
