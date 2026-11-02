// Contrato de skins: solo visuales. Un skin nunca cambia reglas, puntuación,
// física ni estado del juego; la misma partida da el mismo resultado con
// cualquiera de ellos.

export type SkinId = "classic" | "neon" | "retro";

export const DEFAULT_SKIN: SkinId = "classic";

export const SKINS: readonly { id: SkinId; label: string }[] = [
  { id: "classic", label: "Clásico" },
  { id: "neon", label: "Neón" },
  { id: "retro", label: "Retro" },
];

export const SKIN_IDS: readonly SkinId[] = SKINS.map((s) => s.id);

export function isSkinId(value: unknown): value is SkinId {
  return typeof value === "string" && SKIN_IDS.includes(value as SkinId);
}
