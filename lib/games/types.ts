import type { SkinId } from "./skins";

export type GameStatus = "playing" | "dead" | "gameover";

export type GameSnapshot = {
  score: number;
  status: GameStatus;
  hud: Record<string, number>; // rocas: { lives, level }; caida: { lines, level }
};

export type GameEngine = {
  update(dt: number): void; // segundos, ya limitado a 0.05
  draw(ctx: CanvasRenderingContext2D): void;
  snapshot(): GameSnapshot;
  setKey(code: string, down: boolean): void; // KeyboardEvent.code
  reset(): void;
};

export type GameAssets = Record<string, HTMLImageElement>; // solo las que cargaron

export type GameDefinition = {
  id: string; // = games.id
  width: number;
  height: number;
  keys: string[];
  controlsLabel: string;
  ariaLabel: string;
  hud: { key: string; label: string; format?: "int" | "pad2" | "hearts" }[];
  assets?: Record<string, string>; // nombre → URL bajo /public
  // Skins visuales disponibles (ver lib/games/skins.ts). Opcional solo mientras
  // se migran los juegos: un juego registrado sin los 3 skins incumple el contrato.
  skins?: readonly SkinId[];
  // El motor lee la paleta del skin al crearse; los juegos sin skins lo ignoran.
  create: (assets: GameAssets, skin: SkinId) => GameEngine;
};
