import type { Metadata } from "next";
import { Library } from "@/components/library";

export const metadata: Metadata = {
  title: "Biblioteca · Arcade Vault",
  description: "Explora el catálogo de juegos arcade y compite por la puntuación más alta.",
};

export default function Home() {
  return <Library />;
}
