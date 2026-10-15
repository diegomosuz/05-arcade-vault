import type { Metadata } from "next";
import { HallOfFame } from "@/components/hall-of-fame";
import { getGames } from "@/lib/db/games";
import { getLeaderboards } from "@/lib/db/leaderboard";

export const metadata: Metadata = {
  title: "Salón de la Fama · Arcade Vault",
  description: "Los mejores jugadores de cada juego del vault.",
};

export default async function SalonPage() {
  const [games, boards] = await Promise.all([getGames(), getLeaderboards()]);
  return <HallOfFame games={games} boards={boards} />;
}
