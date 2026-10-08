import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GAMES, getGame } from "@/lib/games";
import { GamePlayer } from "@/components/game-player";

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export async function generateMetadata({ params }: PageProps<"/juegos/[id]/jugar">): Promise<Metadata> {
  const { id } = await params;
  const game = getGame(id);
  if (!game) return { title: "Juego no encontrado · Arcade Vault" };
  return {
    title: `${game.title} · Jugar · Arcade Vault`,
    description: game.short,
  };
}

export default function PlayPage({ params }: PageProps<"/juegos/[id]/jugar">) {
  // `params` se lee dentro de Suspense para que el shell estático no dependa de la URL.
  return (
    <Suspense fallback={null}>
      <Player params={params} />
    </Suspense>
  );
}

async function Player({ params }: { params: PageProps<"/juegos/[id]/jugar">["params"] }) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) notFound();

  return <GamePlayer id={game.id} title={game.title} />;
}
