import { notFound } from "next/navigation";
import { GAMES, getGame } from "@/lib/games";
import { GamePlayer } from "@/components/game-player";

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export default async function PlayPage({ params }: PageProps<"/juegos/[id]/jugar">) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) notFound();

  return <GamePlayer id={game.id} title={game.title} />;
}
