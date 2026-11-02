import type { SkinId } from "../skins";

// Paleta de Ranaria (Frogger). Solo afecta al dibujo: el motor la lee en draw(),
// así que movimiento, colisiones y puntuación no dependen del skin.
// Modo oscuro: fondos con luminancia ≤ 10 % y elementos jugables/HUD con
// contraste ≥ 4,5:1 frente a su fondo. La rana lleva contorno oscuro
// (frogOutline) para separarse de troncos y tortugas en cualquier skin.
export type RanariaPalette = {
  goalBg: string; // seto de la fila de metas (fondo del HUD del canvas)
  goalSlot: string; // boca destino
  goalBorder: string;
  water: string;
  waterLine: string;
  safe: string; // inicio y franja intermedia
  road: string;
  roadLine: string;
  cars: string[]; // variantes de color de coche
  carWindow: string;
  wheel: string;
  truckBody: string;
  truckCab: string;
  log: string;
  logLine: string;
  turtle: string;
  turtleShell: string;
  frog: string;
  frogDark: string;
  frogOutline: string;
  frogEye: string;
  frogPupil: string;
  death: string;
  hud: string;
  timeOk: string;
  timeWarn: string;
  timeBad: string;
  glow: number; // shadowBlur en px (solo rana y bocas); 0 = sin glow
};

export const RANARIA_SKINS: Record<SkinId, RanariaPalette> = {
  // Guiño al arcade: rana verde, troncos marrones, tortugas rojas, coches de colores.
  classic: {
    goalBg: "#145c22",
    goalSlot: "#082e10",
    goalBorder: "#f2c21b",
    water: "#0b1d4d",
    waterLine: "rgba(120, 170, 255, 0.18)",
    safe: "#0a2a10",
    road: "#0a0a0a",
    roadLine: "rgba(255, 255, 255, 0.35)",
    cars: ["#e63946", "#f4d03f", "#3a86ff"],
    carWindow: "#cfe8ff",
    wheel: "#111111",
    truckBody: "#8d99a6",
    truckCab: "#d9dde2",
    log: "#c4843f",
    logLine: "#6b3f17",
    turtle: "#ff5a3c",
    turtleShell: "#a8261c",
    frog: "#52ff4a",
    frogDark: "#25b81f",
    frogOutline: "#06210a",
    frogEye: "#f4f4f4",
    frogPupil: "#101010",
    death: "#ff5252",
    hud: "#f4f4f4",
    timeOk: "#37d64a",
    timeWarn: "#f2c21b",
    timeBad: "#ff5252",
    glow: 0,
  },
  // Tokens de app/globals.css (cyan/magenta/yellow) sobre casi negro, glow moderado.
  neon: {
    goalBg: "#0a2a1a",
    goalSlot: "#05110c",
    goalBorder: "#f5ff00",
    water: "#050a2e",
    waterLine: "rgba(0, 245, 255, 0.14)",
    safe: "#1a0a2e",
    road: "#0a0a0f",
    roadLine: "rgba(0, 245, 255, 0.35)",
    cars: ["#ff006e", "#f5ff00", "#00f5ff"],
    carWindow: "#0a0a0f",
    wheel: "#050508",
    truckBody: "#c04dff",
    truckCab: "#00f5ff",
    log: "#ff7a00",
    logLine: "#8a3d00",
    turtle: "#00f5ff",
    turtleShell: "#00737a",
    frog: "#7dff3a",
    frogDark: "#3fbf00",
    frogOutline: "#0a0a0f",
    frogEye: "#f4f4f4",
    frogPupil: "#0a0a0f",
    death: "#ff006e",
    hud: "#00f5ff",
    timeOk: "#00ff88",
    timeWarn: "#f5ff00",
    timeBad: "#ff006e",
    glow: 8,
  },
  // Fósforo verde CRT con acento rojo de peligro; colores planos, sin glow.
  retro: {
    goalBg: "#0f3a12",
    goalSlot: "#071c09",
    goalBorder: "#9bff9b",
    water: "#062208",
    waterLine: "rgba(0, 228, 54, 0.14)",
    safe: "#0b1f0b",
    road: "#04100a",
    roadLine: "rgba(0, 228, 54, 0.30)",
    cars: ["#00b32c", "#00e436", "#6fd86f"],
    carWindow: "#071c09",
    wheel: "#030a04",
    truckBody: "#00a82a",
    truckCab: "#9bff9b",
    log: "#4fa34f",
    logLine: "#23602a",
    turtle: "#00e436",
    turtleShell: "#00861f",
    frog: "#d6ffd6",
    frogDark: "#7bd67b",
    frogOutline: "#031005",
    frogEye: "#0b1f0b",
    frogPupil: "#d6ffd6",
    death: "#ff3366",
    hud: "#9bff9b",
    timeOk: "#00e436",
    timeWarn: "#c8ff00",
    timeBad: "#ff3366",
    glow: 0,
  },
};
