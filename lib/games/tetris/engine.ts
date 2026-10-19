// Motor de Tetris portado de references/started-games/03-tetris/game.js.
// No usa window, document ni requestAnimationFrame: el bucle y los listeners
// viven en components/games/game-canvas.tsx.

import type { GameEngine, GameSnapshot, GameStatus } from "../types";

export const WIDTH = 800;
export const HEIGHT = 600;

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const BOARD_X = 250; // (800 - 300) / 2; el tablero ocupa x 250–550, y 0–600
const NEXT_X = 580; // panel «NEXT» de 120×120, a la derecha del tablero
const NEXT_Y = 40;

// Valores del tema oscuro de style.css (el canvas no lee CSS del documento).
const BG_COLOR = "#0f0f17";
const PANEL_COLOR = "#1a1a25";
const BORDER_COLOR = "#2a2a3a";
const GRID_COLOR = "#22222e";

const LINE_SCORES = [0, 100, 300, 500, 800];
const COLORS = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - pale blue
  "#ffb74d", // L - orange
  "#9e9e9e", // N - tuerca (gris metálico)
];
const PIECES: (number[][] | null)[] = [
  null,
  [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
  [[2, 2], [2, 2]], // O
  [[0, 3, 0], [3, 3, 3], [0, 0, 0]], // T
  [[0, 4, 4], [4, 4, 0], [0, 0, 0]], // S
  [[5, 5, 0], [0, 5, 5], [0, 0, 0]], // Z
  [[6, 0, 0], [6, 6, 6], [0, 0, 0]], // J
  [[0, 0, 7], [7, 7, 7], [0, 0, 0]], // L
  [[8, 8, 8], [8, 0, 8], [8, 8, 8]], // N (tuerca)
];

const REPEAT_DELAY = 0.17; // s hasta la primera repetición de ← → ↓
const REPEAT_INTERVAL = 0.05; // s entre repeticiones

type Piece = { type: number; shape: number[][]; x: number; y: number };

// ── Utils ─────────────────────────────────────────────────────────────────────
function createBoard(): number[][] {
  return Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
}

function randomPiece(): Piece {
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = PIECES[type]!.map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

function rotateCW(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const result = Array.from({ length: cols }, () =>
    new Array<number>(rows).fill(0),
  );
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}

// Dibuja un bloque con su brillo superior; (x, y) en celdas, origen ya trasladado.
function drawBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colorIndex: number,
  size: number,
  alpha = 1,
) {
  if (!colorIndex) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = COLORS[colorIndex]!;
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  ctx.fillStyle = "rgba(255,255,255,0.12)"; // highlight
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  ctx.globalAlpha = 1;
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.fillStyle = PANEL_COLOR;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = BORDER_COLOR;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

// Intervalo de caída en segundos: 1 s en nivel 1, -0,09 s por nivel, mínimo 0,1 s.
const dropIntervalFor = (level: number) =>
  Math.max(0.1, 1 - (level - 1) * 0.09);

// ── Juego ─────────────────────────────────────────────────────────────────────
export function createTetris(): GameEngine {
  let board: number[][];
  let current: Piece;
  let next: Piece;
  let score: number;
  let lines: number;
  let level: number;
  let status: GameStatus;
  let dropAccum: number;
  let dropInterval: number;
  // Teclas pulsadas (para el flanco) y, en ← → ↓, segundos hasta la próxima repetición.
  let held: Record<string, boolean>;
  let repeatIn: Record<string, number>;
  let horizontal: string | null; // ← o → vigente: manda la última pulsada

  function collide(shape: number[][], ox: number, oy: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = ox + c;
        const ny = oy + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  function tryRotate() {
    const rotated = rotateCW(current.shape);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!collide(rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }

  function merge() {
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          board[current.y + r][current.x + c] = current.shape[r][c];
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((v) => v !== 0)) {
        board.splice(r, 1);
        board.unshift(new Array<number>(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      lines += cleared;
      // El multiplicador es el nivel anterior a recalcularlo con las líneas nuevas.
      score += (LINE_SCORES[cleared] || 0) * level;
      level = Math.floor(lines / 10) + 1;
      dropInterval = dropIntervalFor(level);
    }
  }

  function ghostY(): number {
    let gy = current.y;
    while (!collide(current.shape, current.x, gy + 1)) gy++;
    return gy;
  }

  function hardDrop() {
    const gy = ghostY();
    score += (gy - current.y) * 2;
    current.y = gy;
    lockPiece();
  }

  function softDrop() {
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      score += 1;
    } else {
      lockPiece();
    }
  }

  function moveHorizontal(code: string) {
    const dx = code === "ArrowLeft" ? -1 : 1;
    if (!collide(current.shape, current.x + dx, current.y)) current.x += dx;
  }

  function lockPiece() {
    merge();
    clearLines();
    spawn();
  }

  function spawn() {
    current = next;
    next = randomPiece();
    if (collide(current.shape, current.x, current.y)) status = "gameover";
  }

  function reset() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    status = "playing";
    dropAccum = 0;
    dropInterval = dropIntervalFor(level);
    held = {};
    repeatIn = {};
    horizontal = null;
    next = randomPiece();
    spawn();
  }

  const isOver = () => status === "gameover";

  function repeat(code: string, dt: number, act: () => void) {
    repeatIn[code] -= dt;
    while (repeatIn[code] <= 0 && !isOver()) {
      act();
      repeatIn[code] += REPEAT_INTERVAL;
    }
  }

  function update(dt: number) {
    if (isOver()) return;

    if (horizontal && held[horizontal]) {
      const code = horizontal;
      repeat(code, dt, () => moveHorizontal(code));
    }
    if (held.ArrowDown) repeat("ArrowDown", dt, softDrop);
    if (isOver()) return;

    // La caída automática no da puntos.
    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) current.y++;
      else lockPiece();
    }
  }

  function setKey(code: string, down: boolean) {
    if (isOver()) return;
    const wasDown = !!held[code];
    held[code] = down;

    if (!down) {
      repeatIn[code] = 0;
      // Soltar la tecla vigente cede el mando a la otra si sigue pulsada.
      if (code === horizontal) {
        const other = code === "ArrowLeft" ? "ArrowRight" : "ArrowLeft";
        horizontal = held[other] ? other : null;
        if (horizontal) repeatIn[horizontal] = REPEAT_DELAY;
      }
      return;
    }
    if (wasDown) return; // sin repetición del navegador: el motor repite solo

    switch (code) {
      case "ArrowLeft":
      case "ArrowRight":
        horizontal = code;
        repeatIn[code] = REPEAT_DELAY;
        moveHorizontal(code);
        break;
      case "ArrowDown":
        repeatIn[code] = REPEAT_DELAY;
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate();
        break;
      case "Space":
        hardDrop();
        break;
    }
  }

  function drawGrid(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BLOCK, 0);
      ctx.lineTo(c * BLOCK, ROWS * BLOCK);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BLOCK);
      ctx.lineTo(COLS * BLOCK, r * BLOCK);
      ctx.stroke();
    }
  }

  function drawNext(ctx: CanvasRenderingContext2D) {
    const shape = next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        drawBlock(ctx, offX + c, offY + r, shape[r][c], BLOCK);
  }

  function draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // tablero
    drawPanel(ctx, BOARD_X, 0, COLS * BLOCK, ROWS * BLOCK);
    ctx.save();
    ctx.translate(BOARD_X, 0);
    drawGrid(ctx);
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) drawBlock(ctx, c, r, board[r][c], BLOCK);

    // fantasma (al terminar solo queda la pieza que no cupo)
    if (!isOver()) {
      const gy = ghostY();
      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);
    }

    // pieza actual
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
    ctx.restore();

    // panel NEXT
    ctx.fillStyle = "#6c6c82";
    ctx.font = "12px monospace";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("NEXT", NEXT_X, NEXT_Y - 10);
    drawPanel(ctx, NEXT_X, NEXT_Y, 4 * BLOCK, 4 * BLOCK);
    ctx.save();
    ctx.translate(NEXT_X, NEXT_Y);
    drawNext(ctx);
    ctx.restore();
  }

  function snapshot(): GameSnapshot {
    return { score, status, hud: { lines, level } };
  }

  reset();
  return { update, draw, snapshot, setKey, reset };
}
