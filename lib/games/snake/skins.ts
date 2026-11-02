import type { SkinId } from "../skins";

// Paleta de Serpentina. Solo afecta al dibujo: el motor la lee en draw(), así
// que movimiento, colisiones y puntuación no dependen del skin. Las frutas
// son un sprite atlas y conservan sus colores en los tres skins.
export type SnakePalette = {
  background: string;
  grid: string;
  body: string;
  head: string;
  eye: string;
  fruitFallback: string; // círculo si el atlas no ha cargado
  glow: number; // shadowBlur en px; 0 = sin glow
};

export const SNAKE_SKINS: Record<SkinId, SnakePalette> = {
  // Colores exactos del motor original.
  classic: {
    background: "#0a0a12",
    grid: "rgba(255, 255, 255, 0.04)",
    body: "#00ff88",
    head: "#b6ffd9",
    eye: "#0a0a12",
    fruitFallback: "#ff4d6d",
    glow: 0,
  },
  // Tokens de app/globals.css sobre --bg, con glow moderado.
  neon: {
    background: "#0a0a0f",
    grid: "rgba(0, 245, 255, 0.08)",
    body: "#ff006e",
    head: "#00f5ff",
    eye: "#0a0a0f",
    fruitFallback: "#f5ff00",
    glow: 8,
  },
  // Verde fósforo CRT, plano y sin glow.
  retro: {
    background: "#0b1f0b",
    grid: "rgba(0, 228, 54, 0.10)",
    body: "#00b32c",
    head: "#9bff9b",
    eye: "#0b1f0b",
    fruitFallback: "#ff004d",
    glow: 0,
  },
};
