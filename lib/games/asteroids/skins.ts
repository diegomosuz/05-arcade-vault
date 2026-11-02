import type { SkinId } from "../skins";

// Paleta de Rocas. Solo afecta al dibujo: el motor la lee en draw() y nunca
// en update(), así que reglas, colisiones y puntuación no dependen del skin.
export type AsteroidsPalette = {
  background: string; // relleno del canvas
  ship: string; // contorno de la nave
  thrust: string; // llama del propulsor
  bullet: string; // relleno de las balas
  bulletShape: "round" | "square"; // misma posición y radio, solo cambia la forma
  asteroid: string; // contorno de los asteroides
  powerUp: string; // rombo y texto «3x» del power-up
  particleRgb: string; // "r,g,b": el alfa lo pone la vida de cada partícula
  glow: number; // shadowBlur en px; 0 = sin glow (no toca el contexto)
};

export const ASTEROIDS_SKINS: Record<SkinId, AsteroidsPalette> = {
  // Colores exactos del motor original (vectorial blanco sobre negro).
  classic: {
    background: "#000",
    ship: "#fff",
    thrust: "rgba(255, 130, 0, 0.85)",
    bullet: "#fff",
    bulletShape: "round",
    asteroid: "#fff",
    powerUp: "#0ff",
    particleRgb: "255,255,255",
    glow: 0,
  },
  // Tokens de app/globals.css sobre --bg, con glow moderado.
  neon: {
    background: "#0a0a0f", // --bg
    ship: "#00f5ff", // --cyan
    thrust: "rgba(245, 255, 0, 0.85)", // --yellow
    bullet: "#f5ff00", // --yellow
    bulletShape: "round",
    asteroid: "#ff006e", // --magenta
    powerUp: "#00ff88", // --green
    particleRgb: "255,0,110", // --magenta
    glow: 8,
  },
  // Paleta limitada de 16 colores tipo 8 bits (PICO-8), plana y sin glow.
  retro: {
    background: "#1d2b53", // azul noche
    ship: "#ffec27", // amarillo
    thrust: "#ffa300", // naranja
    bullet: "#ff77a8", // rosa
    bulletShape: "square",
    asteroid: "#c2c3c7", // gris claro
    powerUp: "#00e436", // verde
    particleRgb: "255,163,0", // naranja
    glow: 0,
  },
};
