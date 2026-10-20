// Snake (Serpentina). No hay código de referencia: las reglas salen de SPEC 09.
// Módulo independiente de React y del DOM: recibe las imágenes ya cargadas.
import type {
  GameAssets,
  GameEngine,
  GameSnapshot,
  GameStatus,
} from "../types";

export const WIDTH = 800;
export const HEIGHT = 600;

const COLS = 20;
const ROWS = 15;
const CELL = 40;
const START_LENGTH = 3;
const START_COL = 10;
const START_ROW = 7;
const FRUIT_SCORE = 10;
const FRUITS_PER_LEVEL = 5;
const STEP_BASE = 0.18; // s por paso en el nivel 1
const STEP_DECREMENT = 0.015; // s menos por nivel
const STEP_MIN = 0.06; // se alcanza en el nivel 9
const MAX_QUEUED_TURNS = 2;

const FRUIT_HEIGHT = 36; // px en pantalla; las frutas miden 160 px de alto en la hoja
const FRUIT_FALLBACK_COLOR = "#ff4d6d";

const BG_COLOR = "#0a0a12";
const GRID_COLOR = "rgba(255, 255, 255, 0.04)";
const BODY_COLOR = "#00ff88";
const HEAD_COLOR = "#b6ffd9";
const EYE_COLOR = "#0a0a12";

type Dir = { dx: number; dy: number };
type Cell = { col: number; row: number };
type Fruit = Cell & { sprite: number };

// Recortes de la fila pixel art de fruits.png, copiados de sprites.js (y = 136, h = 160).
const FRUITS: { name: string; x: number; y: number; w: number; h: number }[] = [
  { name: "banana", x: 34, y: 136, w: 110, h: 160 },
  { name: "orange", x: 186, y: 136, w: 150, h: 160 },
  { name: "grape", x: 378, y: 136, w: 110, h: 160 },
  { name: "garlic", x: 540, y: 136, w: 130, h: 160 },
  { name: "eggplant", x: 712, y: 136, w: 130, h: 160 },
  { name: "strawberry", x: 894, y: 136, w: 110, h: 160 },
  { name: "cherry", x: 1066, y: 136, w: 110, h: 160 },
  { name: "carrot", x: 1228, y: 136, w: 130, h: 160 },
  { name: "mushroom", x: 1400, y: 136, w: 130, h: 160 },
  { name: "broccoli", x: 1582, y: 136, w: 110, h: 160 },
  { name: "watermelon", x: 1734, y: 136, w: 150, h: 160 },
  { name: "pepper", x: 1906, y: 136, w: 150, h: 160 },
  { name: "kiwi", x: 2068, y: 136, w: 170, h: 160 },
  { name: "lemon", x: 2250, y: 136, w: 140, h: 160 },
  { name: "peach", x: 2432, y: 136, w: 130, h: 160 },
  { name: "peanut", x: 2604, y: 136, w: 130, h: 160 },
  { name: "apple", x: 2786, y: 136, w: 110, h: 160 },
  { name: "tomato", x: 2948, y: 136, w: 130, h: 160 },
  { name: "berries", x: 3110, y: 136, w: 150, h: 160 },
  { name: "grapes2", x: 3302, y: 136, w: 110, h: 160 },
  { name: "pineapple", x: 3454, y: 136, w: 150, h: 160 },
  { name: "melon", x: 3637, y: 136, w: 130, h: 160 },
];

const KEY_DIRS: Record<string, Dir> = {
  ArrowUp: { dx: 0, dy: -1 },
  KeyW: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  KeyS: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  KeyA: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  KeyD: { dx: 1, dy: 0 },
};

function stepInterval(level: number) {
  return Math.max(STEP_MIN, STEP_BASE - (level - 1) * STEP_DECREMENT);
}

export function createSnake(assets: GameAssets): GameEngine {
  let snake: Cell[] = [];
  let dir: Dir = { dx: 1, dy: 0 };
  let turns: Dir[] = [];
  let fruit: Fruit | null = null;
  let score = 0;
  let eaten = 0;
  let status: GameStatus = "playing";
  let stepAccum = 0;

  const level = () => Math.floor(eaten / FRUITS_PER_LEVEL) + 1;

  function spawnFruit() {
    const taken = new Set(snake.map((c) => c.row * COLS + c.col));
    const free: number[] = [];
    for (let i = 0; i < COLS * ROWS; i++) if (!taken.has(i)) free.push(i);
    if (free.length === 0) {
      fruit = null;
      status = "gameover"; // tablero lleno
      return;
    }
    const pick = free[Math.floor(Math.random() * free.length)];
    fruit = {
      col: pick % COLS,
      row: Math.floor(pick / COLS),
      sprite: Math.floor(Math.random() * FRUITS.length),
    };
  }

  function reset() {
    snake = [];
    for (let i = 0; i < START_LENGTH; i++) {
      snake.push({ col: START_COL - i, row: START_ROW });
    }
    dir = { dx: 1, dy: 0 };
    turns = [];
    score = 0;
    eaten = 0;
    status = "playing";
    stepAccum = 0;
    spawnFruit();
  }

  function step() {
    if (turns.length > 0) dir = turns.shift()!;
    const head = snake[0];
    const next: Cell = { col: head.col + dir.dx, row: head.row + dir.dy };

    if (next.col < 0 || next.col >= COLS || next.row < 0 || next.row >= ROWS) {
      status = "gameover";
      return;
    }

    const ate = fruit !== null && next.col === fruit.col && next.row === fruit.row;
    // La cola se retira en este paso salvo que se coma, así que su celda es legal.
    const bodyLimit = ate ? snake.length : snake.length - 1;
    for (let i = 0; i < bodyLimit; i++) {
      if (snake[i].col === next.col && snake[i].row === next.row) {
        status = "gameover";
        return;
      }
    }

    snake.unshift(next);
    if (ate) {
      score += FRUIT_SCORE;
      eaten += 1;
      spawnFruit();
    } else {
      snake.pop();
    }
  }

  function drawFruit(ctx: CanvasRenderingContext2D) {
    if (!fruit) return;
    const cx = fruit.col * CELL + CELL / 2;
    const cy = fruit.row * CELL + CELL / 2;
    const img = assets.fruits;
    if (img) {
      const s = FRUITS[fruit.sprite];
      const scale = FRUIT_HEIGHT / s.h;
      const dw = s.w * scale;
      ctx.drawImage(img, s.x, s.y, s.w, s.h, cx - dw / 2, cy - FRUIT_HEIGHT / 2, dw, FRUIT_HEIGHT);
    } else {
      ctx.fillStyle = FRUIT_FALLBACK_COLOR;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawSnake(ctx: CanvasRenderingContext2D) {
    for (let i = snake.length - 1; i >= 0; i--) {
      const c = snake[i];
      ctx.fillStyle = i === 0 ? HEAD_COLOR : BODY_COLOR;
      ctx.beginPath();
      ctx.roundRect(c.col * CELL + 2, c.row * CELL + 2, CELL - 4, CELL - 4, 8);
      ctx.fill();
    }

    // Ojos: delante de la cabeza, separados en el eje perpendicular al avance.
    const head = snake[0];
    const cx = head.col * CELL + CELL / 2;
    const cy = head.row * CELL + CELL / 2;
    ctx.fillStyle = EYE_COLOR;
    for (const side of [-1, 1]) {
      const ex = cx + dir.dx * 8 + -dir.dy * side * 8;
      const ey = cy + dir.dy * 8 + dir.dx * side * 8;
      ctx.beginPath();
      ctx.arc(ex, ey, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  reset();

  return {
    update(dt: number) {
      if (status !== "playing") return;
      stepAccum += dt;
      let interval = stepInterval(level());
      while (status === "playing" && stepAccum >= interval) {
        stepAccum -= interval;
        step();
        interval = stepInterval(level());
      }
    },

    draw(ctx: CanvasRenderingContext2D) {
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let c = 1; c < COLS; c++) {
        ctx.moveTo(c * CELL + 0.5, 0);
        ctx.lineTo(c * CELL + 0.5, HEIGHT);
      }
      for (let r = 1; r < ROWS; r++) {
        ctx.moveTo(0, r * CELL + 0.5);
        ctx.lineTo(WIDTH, r * CELL + 0.5);
      }
      ctx.stroke();

      drawFruit(ctx);
      drawSnake(ctx);
    },

    snapshot(): GameSnapshot {
      return {
        score,
        status,
        hud: { length: snake.length, level: level() },
      };
    },

    setKey(code: string, down: boolean) {
      // Giros por flanco: solo la pulsación cuenta, mantener no repite.
      if (!down || status !== "playing") return;
      const d = KEY_DIRS[code];
      if (!d) return;
      const ref = turns.length > 0 ? turns[turns.length - 1] : dir;
      if (d.dx === ref.dx && d.dy === ref.dy) return; // misma dirección
      if (d.dx + ref.dx === 0 && d.dy + ref.dy === 0) return; // giro de 180°
      if (turns.length >= MAX_QUEUED_TURNS) return;
      turns.push(d);
    },

    reset,
  };
}
