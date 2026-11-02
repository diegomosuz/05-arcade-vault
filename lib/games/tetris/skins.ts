import type { SkinId } from "../skins";

// Paleta de Caída. Solo afecta al dibujo: el motor la lee en draw(), así que
// reglas, puntuación y piezas no dependen del skin.
export type TetrisPalette = {
  background: string;
  panel: string;
  border: string;
  grid: string;
  label: string; // texto «NEXT»
  highlight: string; // brillo superior de cada bloque
  pieces: (string | null)[]; // índice = tipo de pieza (1–8); 0 sin uso
  glow: number; // shadowBlur en px; 0 = sin glow
};

export const TETRIS_SKINS: Record<SkinId, TetrisPalette> = {
  // Colores exactos del motor original.
  classic: {
    background: "#0f0f17",
    panel: "#1a1a25",
    border: "#2a2a3a",
    grid: "#22222e",
    label: "#6c6c82",
    highlight: "rgba(255,255,255,0.12)",
    pieces: [
      null,
      "#4dd0e1", // I
      "#ffd54f", // O
      "#ba68c8", // T
      "#81c784", // S
      "#e57373", // Z
      "#90caf9", // J
      "#ffb74d", // L
      "#9e9e9e", // N
    ],
    glow: 0,
  },
  // Tokens de app/globals.css sobre --bg, con glow moderado.
  neon: {
    background: "#0a0a0f",
    panel: "#101018",
    border: "#00f5ff",
    grid: "#1a1a26",
    label: "#00f5ff",
    highlight: "rgba(255,255,255,0.18)",
    pieces: [
      null,
      "#00f5ff", // I cyan
      "#f5ff00", // O yellow
      "#ff006e", // T magenta
      "#00ff88", // S green
      "#ff4d4d", // Z rojo
      "#5c7cff", // J azul
      "#ff9a00", // L naranja
      "#c8c8d8", // N
    ],
    glow: 8,
  },
  // Paleta limitada tipo 8 bits (PICO-8), plana y sin glow.
  retro: {
    background: "#1d2b53",
    panel: "#000000",
    border: "#83769c",
    grid: "#1d2b53",
    label: "#c2c3c7",
    highlight: "rgba(255,255,255,0)",
    pieces: [
      null,
      "#29adff", // I
      "#ffec27", // O
      "#ff77a8", // T
      "#00e436", // S
      "#ff004d", // Z
      "#83769c", // J
      "#ffa300", // L
      "#c2c3c7", // N
    ],
    glow: 0,
  },
};
