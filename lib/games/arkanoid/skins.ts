import type { SkinId } from "../skins";

// Paleta de Bloque Buster. Solo afecta al dibujo: el motor la lee en draw(),
// así que colisiones, niveles y puntuación no dependen del skin.
export type ArkanoidBlockColor =
  | "red"
  | "yellow"
  | "cyan"
  | "magenta"
  | "hotpink"
  | "green"
  | "gray";

export type ArkanoidPalette = {
  background: string;
  blocks: Record<ArkanoidBlockColor, string>;
  stripe: string; // franja superior de cada bloque
  paddle: string;
  ball: string;
  glow: number; // shadowBlur en px; 0 = sin glow
};

export const ARKANOID_SKINS: Record<SkinId, ArkanoidPalette> = {
  // Colores exactos del motor original.
  classic: {
    background: "#000",
    blocks: {
      red: "#ef4444",
      yellow: "#facc15",
      cyan: "#22d3ee",
      magenta: "#d946ef",
      hotpink: "#ff69b4",
      green: "#4ade80",
      gray: "#9ca3af",
    },
    stripe: "rgba(255, 255, 255, 0.35)",
    paddle: "#e5e7eb",
    ball: "#ffffff",
    glow: 0,
  },
  // Tokens de app/globals.css sobre --bg, con glow moderado.
  neon: {
    background: "#0a0a0f",
    blocks: {
      red: "#ff4d4d",
      yellow: "#f5ff00",
      cyan: "#00f5ff",
      magenta: "#ff006e",
      hotpink: "#ff5fa8",
      green: "#00ff88",
      gray: "#b8b8c8",
    },
    stripe: "rgba(255, 255, 255, 0.25)",
    paddle: "#00f5ff",
    ball: "#f5ff00",
    glow: 8,
  },
  // Paleta limitada tipo 8 bits (PICO-8), plana y sin glow.
  retro: {
    background: "#1d2b53",
    blocks: {
      red: "#ff6b6b",
      yellow: "#ffec27",
      cyan: "#29adff",
      magenta: "#b794ff",
      hotpink: "#ff77a8",
      green: "#00e436",
      gray: "#c2c3c7",
    },
    stripe: "rgba(255, 255, 255, 0)",
    paddle: "#ffa300",
    ball: "#fff1e8",
    glow: 0,
  },
};
