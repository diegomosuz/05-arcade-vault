import type { Metadata } from "next";
import { Activity } from "@/components/home/activity";
import { FinalCta } from "@/components/home/final-cta";
import { Features } from "@/components/home/features";
import { GamesPreview } from "@/components/home/games-preview";
import { Hero } from "@/components/home/hero";
import { Pricing } from "@/components/home/pricing";
import { Stats } from "@/components/home/stats";
import { getGames } from "@/lib/db/games";

export const metadata: Metadata = {
  title: "Inicio · Arcade Vault",
  description:
    "Juega clásicos arcade gratis en tu navegador y compite por la puntuación más alta.",
};

export default async function Home() {
  const games = await getGames();
  return (
    <div className="home fade-in">
      <Hero />
      <Features />
      <GamesPreview games={games} />
      <Stats />
      <Activity />
      <Pricing />
      <FinalCta />
    </div>
  );
}
