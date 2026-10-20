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
  create: (assets: GameAssets) => GameEngine;
};
