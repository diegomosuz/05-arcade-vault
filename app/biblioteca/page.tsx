import type { Metadata } from "next";
import { Library } from "@/components/library";
import { getGames } from "@/lib/db/games";

export const metadata: Metadata = {
  title: "Biblioteca · Arcade Vault",
  description:
    "Explora el catálogo de juegos arcade y compite por la puntuación más alta.",
};

export default async function BibliotecaPage() {
  const games = await getGames();
  return <Library games={games} />;
}
