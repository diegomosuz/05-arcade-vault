import type { Metadata } from "next";
import { HallOfFame } from "@/components/hall-of-fame";

export const metadata: Metadata = {
  title: "Salón de la Fama · Arcade Vault",
  description: "Los mejores jugadores de cada juego del vault.",
};

export default function SalonPage() {
  return <HallOfFame />;
}
