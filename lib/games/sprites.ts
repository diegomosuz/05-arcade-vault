// Sprites con glow pre-renderizados (SPEC 11).
//
// El `shadowBlur` del canvas 2D es la operación de dibujo más cara y los
// motores la pagaban por elemento y por frame. Aquí se renderiza el elemento
// (con su sombra) una sola vez en un canvas aparte y después solo se copia con
// `drawImage`. Solo visual: no toca reglas, física ni puntuación.

export type GlowSprite = {
  canvas: HTMLCanvasElement;
  pad: number; // margen alrededor del elemento para que quepa la sombra
};

// La sombra gaussiana del canvas tiene σ = shadowBlur / 2 y es despreciable a
// 3σ, así que ese es el margen que hace falta.
export function glowPad(glow: number) {
  return Math.ceil(glow * 1.5);
}

// Crea el sprite de un elemento de w×h px. `paint` dibuja con el origen del
// elemento en (pad, pad). `extra` amplía el margen cuando el dibujo se sale de
// su caja (p. ej. una rana mayor que su casilla). Devuelve null sin DOM (servidor) o sin contexto 2D;
// el motor debe tener entonces un dibujo directo de respaldo.
export function createGlowSprite(
  w: number,
  h: number,
  glow: number,
  paint: (ctx: CanvasRenderingContext2D, pad: number) => void,
  extra = 0,
): GlowSprite | null {
  if (typeof document === "undefined") return null;
  const pad = glowPad(glow) + extra;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(w) + pad * 2;
  canvas.height = Math.ceil(h) + pad * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  paint(ctx, pad);
  return { canvas, pad };
}

// Copia el sprite con la esquina superior izquierda del elemento en (x, y).
export function drawGlowSprite(
  ctx: CanvasRenderingContext2D,
  sprite: GlowSprite,
  x: number,
  y: number,
) {
  ctx.drawImage(sprite.canvas, x - sprite.pad, y - sprite.pad);
}
