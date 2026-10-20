// Motor de Arkanoid portado de references/started-games/04-arkanoid/game.js y
// levels.js. No usa window, document, Image, Audio ni requestAnimationFrame: el
// bucle y los listeners viven en components/games/game-canvas.tsx.

import type { GameEngine, GameSnapshot, GameStatus } from "../types";

export const WIDTH = 800;
export const HEIGHT = 600;

const PADDLE_SPEED = 400;
const PADDLE_W = 81;
const PADDLE_H = 14;
const PADDLE_Y = 560;
const BALL_SIZE = 16;
const BLOCK_COLS = 10;
const BLOCK_ROWS = 6;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCKS_ORIGIN_X = (WIDTH - BLOCK_COLS * BLOCK_W) / 2; // 80
const BLOCKS_ORIGIN_Y = 80;
const BASE_BALL_VX = 200;
const BASE_BALL_VY = -300;
const BLOCK_SCORE = 10;
const INITIAL_LIVES = 3;

type BlockColor =
  | "red"
  | "yellow"
  | "cyan"
  | "magenta"
  | "hotpink"
  | "green"
  | "gray";

type Block = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  alive: boolean;
};

type LevelBlock = { col: number; row: number; color: BlockColor };

// ── Niveles (mismas reglas que levels.js) ─────────────────────────────────────
function buildLevels(): { speed: number; blocks: LevelBlock[] }[] {
  const rowColors1: BlockColor[] = [
    "red",
    "yellow",
    "cyan",
    "magenta",
    "hotpink",
    "green",
  ];
  const rowColors2: BlockColor[] = [
    "gray",
    "cyan",
    "hotpink",
    "yellow",
    "magenta",
    "green",
  ];
  const rowColors4: BlockColor[] = [
    "cyan",
    "magenta",
    "green",
    "yellow",
    "hotpink",
    "red",
  ];

  const l1: LevelBlock[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++)
      l1.push({ col, row, color: rowColors1[row] });

  const l2: LevelBlock[] = [];
  const pyStart = [4, 3, 2, 1, 0, 0];
  const pyEnd = [5, 6, 7, 8, 9, 9];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = pyStart[row]; col <= pyEnd[row]; col++)
      l2.push({ col, row, color: rowColors2[row] });

  const l3: LevelBlock[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++)
      if ((col + row) % 2 === 0)
        l3.push({ col, row, color: row < 3 ? "yellow" : "magenta" });

  const gaps4 = [
    [2, 5, 8],
    [0, 4, 7, 9],
    [1, 3, 6],
    [2, 5, 8, 9],
    [0, 4, 7],
    [1, 3, 6, 9],
  ];
  const l4: LevelBlock[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++)
      if (!gaps4[row].includes(col))
        l4.push({ col, row, color: rowColors4[row] });

  const l5: LevelBlock[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++) {
      const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
      const isCross = col === 4 || row === 2;
      if (isFrame || isCross)
        l5.push({
          col,
          row,
          color: isCross && !isFrame ? "hotpink" : "cyan",
        });
    }

  return [
    { speed: 1.0, blocks: l1 },
    { speed: 1.1, blocks: l2 },
    { speed: 1.21, blocks: l3 },
    { speed: 1.33, blocks: l4 },
    { speed: 1.46, blocks: l5 },
  ];
}

const LEVELS = buildLevels();

// Colores fijos por nombre (el canvas no usa sprites); franja superior más clara.
const BLOCK_FILL: Record<BlockColor, string> = {
  red: "#ef4444",
  yellow: "#facc15",
  cyan: "#22d3ee",
  magenta: "#d946ef",
  hotpink: "#ff69b4",
  green: "#4ade80",
  gray: "#9ca3af",
};
const PADDLE_COLOR = "#e5e7eb";
const BALL_COLOR = "#ffffff";
const BLOCK_STRIPE = 3;

export function createArkanoid(): GameEngine {
  const paddle = { x: 0, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
  const ball = {
    x: 0,
    y: 0,
    w: BALL_SIZE,
    h: BALL_SIZE,
    vx: BASE_BALL_VX,
    vy: BASE_BALL_VY,
  };
  let blocks: Block[];
  let score: number;
  let lives: number;
  let currentLevel: number;
  let status: GameStatus;
  // Indicador interno: limpiar el nivel 5 pasa a gameover pero no se expone.
  let won: boolean;
  // ← → se leen por estado: mantener la tecla mueve la paleta.
  let left: boolean;
  let right: boolean;

  function initPaddle() {
    paddle.x = (WIDTH - paddle.w) / 2;
  }

  // Une initBall y la parte final de loadLevel del original: deja la bola
  // sobre la paleta, en movimiento, con la velocidad del nivel actual.
  function initBall() {
    const speed = LEVELS[currentLevel - 1].speed;
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * speed;
    ball.vy = BASE_BALL_VY * speed;
  }

  function loadLevel(n: number) {
    currentLevel = n;
    blocks = LEVELS[n - 1].blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    initBall();
  }

  function collideAABB(block: Block): boolean {
    return (
      ball.x < block.x + block.w &&
      ball.x + ball.w > block.x &&
      ball.y < block.y + block.h &&
      ball.y + ball.h > block.y
    );
  }

  function reset() {
    score = 0;
    lives = INITIAL_LIVES;
    status = "playing";
    won = false;
    left = false;
    right = false;
    initPaddle();
    loadLevel(1);
  }

  reset();

  return {
    update(dt) {
      if (status !== "playing") return;
      // Si ambas están pulsadas se cancelan.
      const dir = (right ? 1 : 0) - (left ? 1 : 0);
      paddle.x = Math.max(
        0,
        Math.min(WIDTH - paddle.w, paddle.x + dir * PADDLE_SPEED * dt),
      );

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      // Paredes izquierda, derecha y superior.
      if (ball.x <= 0) {
        ball.x = 0;
        ball.vx = Math.abs(ball.vx);
      }
      if (ball.x + ball.w >= WIDTH) {
        ball.x = WIDTH - ball.w;
        ball.vx = -Math.abs(ball.vx);
      }
      if (ball.y <= 0) {
        ball.y = 0;
        ball.vy = Math.abs(ball.vy);
      }

      // Paleta: solo si la bola baja, con la ventana de 8 px del original.
      if (
        ball.vy > 0 &&
        ball.x + ball.w > paddle.x &&
        ball.x < paddle.x + paddle.w &&
        ball.y + ball.h >= paddle.y &&
        ball.y + ball.h <= paddle.y + paddle.h + 8
      ) {
        ball.y = paddle.y - ball.h;
        ball.vy = -Math.abs(ball.vy);
      }

      // Bloques: se rompe uno solo por fotograma.
      for (const block of blocks) {
        if (!block.alive || !collideAABB(block)) continue;
        block.alive = false;
        score += BLOCK_SCORE;
        ball.vy = -ball.vy;
        if (blocks.every((b) => !b.alive)) {
          if (currentLevel < LEVELS.length) {
            loadLevel(currentLevel + 1);
          } else {
            won = true;
            status = "gameover";
            return;
          }
        }
        break;
      }

      // Bola perdida por el borde inferior.
      if (ball.y > HEIGHT) {
        lives--;
        if (lives <= 0) {
          lives = 0;
          status = "gameover";
        } else {
          initBall();
        }
      }
    },
    draw(ctx) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      for (const block of blocks) {
        if (!block.alive) continue;
        ctx.fillStyle = BLOCK_FILL[block.color];
        ctx.fillRect(block.x, block.y, block.w, block.h);
        ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
        ctx.fillRect(block.x, block.y, block.w, BLOCK_STRIPE);
      }

      ctx.fillStyle = PADDLE_COLOR;
      ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
      ctx.fillStyle = BALL_COLOR;
      ctx.fillRect(ball.x, ball.y, ball.w, ball.h);
    },
    setKey(code, down) {
      if (status !== "playing") return;
      if (code === "ArrowLeft") left = down;
      else if (code === "ArrowRight") right = down;
    },
    snapshot(): GameSnapshot {
      return { score, status, hud: { lives, level: currentLevel } };
    },
    reset,
  };
}
