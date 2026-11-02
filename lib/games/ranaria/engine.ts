// Ranaria (Frogger). Las reglas salen de specs/games-jam/frogger/01-frogger-core.md.
// Módulo independiente de React y del DOM; todo se dibuja con primitivas canvas.
import type {
  GameAssets,
  GameEngine,
  GameSnapshot,
  GameStatus,
} from "../types";
import { DEFAULT_SKIN, type SkinId } from "../skins";
import { createGlowSprite, drawGlowSprite, type GlowSprite } from "../sprites";
import { RANARIA_SKINS } from "./skins";

const COLS = 16;
const ROWS = 14;
const CELL = 40;
export const WIDTH = COLS * CELL; // 640
export const HEIGHT = ROWS * CELL; // 560

// Zonas (índice de fila, 0 = arriba)
const ROW_GOALS = 0;
const ROW_RIVER_TOP = 1;
const ROW_RIVER_BOT = 6;
const ROW_SAFE_MID = 7;
const ROW_ROAD_TOP = 8;
const ROW_ROAD_BOT = 12;
const ROW_START = 13;

const START_COL = 7;
const START_LIVES = 3;
const HOP_TIME = 0.12; // s
const DEATH_TIME = 0.6; // s que se ve la rana aplastada antes de reaparecer
const TIME_BASE = 15; // s por rana en el nivel 1
const TIME_MIN = 8;
const SPEED_PER_LEVEL = 0.15; // +15 % por nivel
const TURTLE_VISIBLE = 3; // s
const TURTLE_SUBMERGED = 1.5; // s
const TURTLE_WARN = 0.5; // s de parpadeo antes de sumergirse (solo visual)

const SCORE_ROW = 10;
const SCORE_GOAL = 50;
const SCORE_ROUND = 200;
const SCORE_TIME_MULT = 10;

// Cada boca ocupa 2 columnas; empiezan en estas columnas.
const GOAL_STARTS = [1, 4, 7, 10, 13];
const GOAL_WIDTH = 2;
const GOAL_Y = 18; // y de la casilla de meta dentro de su fila

// Zona de la rana dentro de su celda para los choques con vehículos.
const FROG_MARGIN = 0.15;

type Direction = "up" | "down" | "left" | "right";
type EntityType = "car" | "truck" | "log" | "turtle";
type Entity = {
  col: number; // fraccionaria
  width: number;
  type: EntityType;
  variant: number; // variante de color (coches)
  t: number; // reloj propio (tortugas: ciclo de inmersión)
  submerged?: boolean;
};
type Lane = {
  row: number;
  speed: number; // celdas/s
  dir: 1 | -1;
  length: number; // longitud del bucle (≥ COLS + 4)
  entities: Entity[];
};
type Frog = {
  col: number;
  row: number;
  animating: boolean;
  animT: number;
  targetCol: number;
  targetRow: number;
  facing: Direction;
};

type LaneDef = {
  row: number;
  dir: 1 | -1;
  speed: number; // celdas/s en el nivel 1
  type: EntityType;
  width: number;
  gap: number;
  offset: number; // desfase inicial en celdas
};

// Velocidades de carretera 2,25–6 celdas/s (1,5–4 px/frame a 60 fps) y de río
// 1,5–4,5 celdas/s (1–3 px/frame). Huecos ≥ 1 celda en todos los carriles.
const LANE_DEFS: LaneDef[] = [
  { row: 12, dir: 1, speed: 2.5, type: "car", width: 1, gap: 3, offset: 0 },
  { row: 11, dir: -1, speed: 3.5, type: "truck", width: 2, gap: 4, offset: 1 },
  { row: 10, dir: 1, speed: 5, type: "car", width: 1, gap: 5, offset: 2 },
  { row: 9, dir: -1, speed: 2.8, type: "truck", width: 3, gap: 4, offset: 3 },
  { row: 8, dir: 1, speed: 4, type: "car", width: 2, gap: 4, offset: 1 },
  { row: 6, dir: 1, speed: 2, type: "log", width: 3, gap: 3, offset: 0 },
  { row: 5, dir: -1, speed: 1.8, type: "turtle", width: 3, gap: 2, offset: 1 },
  { row: 4, dir: 1, speed: 3, type: "log", width: 4, gap: 3, offset: 2 },
  { row: 3, dir: -1, speed: 2.2, type: "turtle", width: 2, gap: 2, offset: 0 },
  { row: 2, dir: 1, speed: 2.6, type: "log", width: 3, gap: 3, offset: 1 },
  { row: 1, dir: -1, speed: 2.4, type: "log", width: 2, gap: 3, offset: 2 },
];

const KEY_DIRS: Record<string, Direction> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

const FACING_ANGLE: Record<Direction, number> = {
  up: 0,
  right: Math.PI / 2,
  down: Math.PI,
  left: -Math.PI / 2,
};

const isRoad = (row: number) => row >= ROW_ROAD_TOP && row <= ROW_ROAD_BOT;
const isRiver = (row: number) => row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT;

function timeLimit(level: number) {
  return Math.max(TIME_MIN, TIME_BASE - (level - 1));
}

function wrap(e: Entity, lane: Lane) {
  if (lane.dir > 0) {
    while (e.col >= COLS) e.col -= lane.length;
  } else {
    while (e.col + e.width <= 0) e.col += lane.length;
  }
}

export function buildLanes(level: number): Lane[] {
  const mult = 1 + SPEED_PER_LEVEL * (level - 1);
  return LANE_DEFS.map((def) => {
    const step = def.width + def.gap;
    const count = Math.ceil((COLS + 4) / step);
    const lane: Lane = {
      row: def.row,
      speed: def.speed * mult,
      dir: def.dir,
      length: count * step,
      entities: [],
    };
    for (let i = 0; i < count; i++) {
      const e: Entity = {
        col: i * step + def.offset,
        width: def.width,
        type: def.type,
        variant: (i + def.row) % 3,
        t: (i * 1.7 + def.offset) % (TURTLE_VISIBLE + TURTLE_SUBMERGED),
      };
      e.submerged = e.t >= TURTLE_VISIBLE && e.type === "turtle";
      wrap(e, lane);
      lane.entities.push(e);
    }
    return lane;
  });
}

// Choque de una celda (col, fila) con cualquier vehículo del carril.
function checkRoadCollision(col: number, row: number, lanes: Lane[]) {
  if (!isRoad(row)) return false;
  const lane = lanes.find((l) => l.row === row);
  if (!lane) return false;
  const left = col + FROG_MARGIN;
  const right = col + 1 - FROG_MARGIN;
  return lane.entities.some((e) => left < e.col + e.width && right > e.col);
}

// Entidad de río bajo el centro de la rana; null si no hay o la tortuga está sumergida.
function getSupport(col: number, row: number, lanes: Lane[]): Entity | null {
  if (!isRiver(row)) return null;
  const lane = lanes.find((l) => l.row === row);
  if (!lane) return null;
  const x = col + 0.5;
  for (const e of lane.entities) {
    if (x >= e.col && x < e.col + e.width) {
      return e.type === "turtle" && e.submerged ? null : e;
    }
  }
  return null;
}

function goalIndex(col: number) {
  return GOAL_STARTS.findIndex((s) => col >= s && col < s + GOAL_WIDTH);
}

export function createRanaria(
  _assets: GameAssets,
  skin: SkinId = DEFAULT_SKIN,
): GameEngine {
  // Solo se lee en draw(): update() no depende del skin.
  const pal = RANARIA_SKINS[skin] ?? RANARIA_SKINS[DEFAULT_SKIN];

  let lanes: Lane[] = [];
  let frog: Frog;
  let goals: boolean[] = [];
  let score = 0;
  let lives = START_LIVES;
  let level = 1;
  let timeLeft = TIME_BASE;
  let bestRow = ROW_START; // fila más alta alcanzada por esta rana
  let deathTimer = 0;
  let status: GameStatus = "playing";
  let pendingDir: Direction | null = null;
  const held = new Set<string>();

  function newFrog(): Frog {
    return {
      col: START_COL,
      row: ROW_START,
      animating: false,
      animT: 0,
      targetCol: START_COL,
      targetRow: ROW_START,
      facing: "up",
    };
  }

  function respawn() {
    frog = newFrog();
    timeLeft = timeLimit(level);
    bestRow = ROW_START;
    pendingDir = null;
  }

  function reset() {
    level = 1;
    lives = START_LIVES;
    score = 0;
    goals = GOAL_STARTS.map(() => false);
    lanes = buildLanes(level);
    deathTimer = 0;
    status = "playing";
    held.clear();
    respawn();
  }

  function killFrog() {
    if (deathTimer > 0 || status !== "playing") return;
    lives = Math.max(0, lives - 1);
    deathTimer = DEATH_TIME;
    pendingDir = null;
  }

  function completeRound() {
    score += SCORE_ROUND;
    level += 1;
    goals = GOAL_STARTS.map(() => false);
    lanes = buildLanes(level);
    respawn();
  }

  // Se resuelve al terminar un salto.
  function land() {
    const { col, row } = frog;

    if (row === ROW_GOALS) {
      const idx = goalIndex(col);
      if (idx < 0 || goals[idx]) {
        killFrog();
        return;
      }
      goals[idx] = true;
      score += SCORE_GOAL + Math.floor(timeLeft) * SCORE_TIME_MULT;
      if (goals.every(Boolean)) completeRound();
      else respawn();
      return;
    }

    if (row < bestRow) {
      score += (bestRow - row) * SCORE_ROW;
      bestRow = row;
    }
    if (isRiver(row) && !getSupport(col, row, lanes)) killFrog();
    else if (checkRoadCollision(col, row, lanes)) killFrog();
  }

  function startHop(dir: Direction) {
    const baseCol = Math.round(frog.col);
    let tc = baseCol;
    let tr = frog.row;
    if (dir === "up") tr -= 1;
    else if (dir === "down") tr += 1;
    else if (dir === "left") tc -= 1;
    else tc += 1;
    frog.facing = dir;
    if (tr < ROW_GOALS || tr > ROW_START || tc < 0 || tc > COLS - 1) return;
    frog.animating = true;
    frog.animT = 0;
    frog.targetCol = tc;
    frog.targetRow = tr;
  }

  function stepFrog(dt: number) {
    if (frog.animating) {
      frog.animT += dt;
      // Un coche puede alcanzar a la rana en pleno salto: origen o destino.
      if (
        checkRoadCollision(frog.col, frog.row, lanes) ||
        checkRoadCollision(frog.targetCol, frog.targetRow, lanes)
      ) {
        killFrog();
        return;
      }
      if (frog.animT >= HOP_TIME) {
        frog.col = frog.targetCol;
        frog.row = frog.targetRow;
        frog.animating = false;
        land();
      }
      return;
    }

    if (isRiver(frog.row)) {
      const support = getSupport(frog.col, frog.row, lanes);
      if (!support) {
        killFrog();
        return;
      }
      const lane = lanes.find((l) => l.row === frog.row)!;
      frog.col += lane.speed * lane.dir * dt;
      const cx = frog.col + 0.5;
      if (cx < 0 || cx > COLS) {
        killFrog();
        return;
      }
    } else if (checkRoadCollision(frog.col, frog.row, lanes)) {
      killFrog();
      return;
    }

    if (pendingDir) {
      const dir = pendingDir;
      pendingDir = null;
      startHop(dir);
    }
  }

  // ---------- Dibujo ----------

  function drawZones(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = pal.goalBg;
    ctx.fillRect(0, 0, WIDTH, CELL);
    ctx.fillStyle = pal.water;
    ctx.fillRect(0, ROW_RIVER_TOP * CELL, WIDTH, (ROW_RIVER_BOT - ROW_RIVER_TOP + 1) * CELL);
    ctx.fillStyle = pal.waterLine;
    for (let r = ROW_RIVER_TOP; r <= ROW_RIVER_BOT; r++) {
      ctx.fillRect(0, r * CELL + CELL / 2 - 1, WIDTH, 2);
    }
    ctx.fillStyle = pal.safe;
    ctx.fillRect(0, ROW_SAFE_MID * CELL, WIDTH, CELL);
    ctx.fillRect(0, ROW_START * CELL, WIDTH, CELL);
    ctx.fillStyle = pal.road;
    ctx.fillRect(0, ROW_ROAD_TOP * CELL, WIDTH, (ROW_ROAD_BOT - ROW_ROAD_TOP + 1) * CELL);
    ctx.strokeStyle = pal.roadLine;
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 14]);
    ctx.beginPath();
    for (let r = ROW_ROAD_TOP + 1; r <= ROW_ROAD_BOT; r++) {
      ctx.moveTo(0, r * CELL);
      ctx.lineTo(WIDTH, r * CELL);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Casilla de meta: (x, y) es su esquina superior izquierda.
  function drawGoalSlot(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    filled: boolean,
  ) {
    const w = GOAL_WIDTH * CELL;
    const h = CELL - GOAL_Y;
    ctx.fillStyle = pal.goalSlot;
    ctx.fillRect(x, y, w, h);
    if (pal.glow) {
      ctx.shadowColor = pal.goalBorder;
      ctx.shadowBlur = pal.glow;
    }
    ctx.strokeStyle = pal.goalBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.shadowBlur = 0;
    if (filled) drawFrogShape(ctx, x + w / 2, y + h / 2, 0, false, 0.7);
  }

  // Sprites con glow (SPEC 11, ver lib/games/sprites.ts). Las metas y la rana
  // en reposo están en posiciones enteras y no cambian entre frames, así que se
  // renderizan una vez. La rana saltando (escala y posición interpoladas) se
  // sigue dibujando directa: dura ~0,12 s por salto.
  const goalSprites: (GlowSprite | null | undefined)[] = [];
  const goalSprite = (filled: boolean): GlowSprite | null => {
    const key = filled ? 1 : 0;
    if (goalSprites[key] === undefined) {
      // La rana de la meta (escala 0,7) sobresale unos px de la casilla.
      goalSprites[key] = createGlowSprite(
        GOAL_WIDTH * CELL,
        CELL - GOAL_Y,
        pal.glow,
        (c, pad) => drawGoalSlot(c, pad, pad, filled),
        8,
      );
    }
    return goalSprites[key] ?? null;
  };
  const FROG_BOX = 48;
  let idleFrogSprite: GlowSprite | null | undefined;
  const getIdleFrogSprite = (): GlowSprite | null => {
    if (idleFrogSprite === undefined) {
      idleFrogSprite = createGlowSprite(FROG_BOX, FROG_BOX, pal.glow, (c, pad) =>
        drawFrogShape(c, pad + FROG_BOX / 2, pad + FROG_BOX / 2, 0, false, 1),
      );
    }
    return idleFrogSprite;
  };

  function drawGoals(ctx: CanvasRenderingContext2D) {
    GOAL_STARTS.forEach((start, i) => {
      const x = start * CELL;
      const filled = !!goals[i];
      const sprite = pal.glow ? goalSprite(filled) : null;
      if (sprite) {
        drawGlowSprite(ctx, sprite, x, GOAL_Y);
      } else {
        drawGoalSlot(ctx, x, GOAL_Y, filled);
      }
    });
  }

  function drawVehicle(ctx: CanvasRenderingContext2D, e: Entity, lane: Lane) {
    const x = e.col * CELL;
    const w = e.width * CELL;
    const y = lane.row * CELL + 7;
    const h = CELL - 14;
    if (e.type === "car") {
      ctx.fillStyle = pal.cars[e.variant % pal.cars.length];
      ctx.beginPath();
      ctx.roundRect(x + 3, y, w - 6, h, 5);
      ctx.fill();
      ctx.fillStyle = pal.carWindow;
      const wx = lane.dir > 0 ? x + w - 16 : x + 8;
      ctx.fillRect(wx, y + 4, 8, h - 8);
    } else {
      const cabW = CELL - 6;
      ctx.fillStyle = pal.truckBody;
      ctx.beginPath();
      ctx.roundRect(x + 3, y, w - 6, h, 3);
      ctx.fill();
      ctx.fillStyle = pal.truckCab;
      const cx = lane.dir > 0 ? x + w - 3 - cabW : x + 3;
      ctx.beginPath();
      ctx.roundRect(cx, y, cabW, h, 3);
      ctx.fill();
      ctx.fillStyle = pal.carWindow;
      const wx = lane.dir > 0 ? cx + cabW - 10 : cx + 4;
      ctx.fillRect(wx, y + 4, 6, h - 8);
    }
    ctx.fillStyle = pal.wheel;
    for (const wxp of [x + 10, x + w - 10]) {
      ctx.beginPath();
      ctx.arc(wxp, y, 4, 0, Math.PI * 2);
      ctx.arc(wxp, y + h, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawLog(ctx: CanvasRenderingContext2D, e: Entity, lane: Lane) {
    const x = e.col * CELL;
    const w = e.width * CELL;
    const y = lane.row * CELL + 6;
    const h = CELL - 12;
    ctx.fillStyle = pal.log;
    ctx.beginPath();
    ctx.roundRect(x + 2, y, w - 4, h, 8);
    ctx.fill();
    ctx.strokeStyle = pal.logLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 1; i < e.width * 2; i++) {
      const lx = x + i * (CELL / 2);
      ctx.moveTo(lx, y + 4);
      ctx.lineTo(lx - 4, y + h - 4);
    }
    ctx.stroke();
  }

  function drawTurtles(ctx: CanvasRenderingContext2D, e: Entity, lane: Lane) {
    const phase = e.t % (TURTLE_VISIBLE + TURTLE_SUBMERGED);
    const submerged = phase >= TURTLE_VISIBLE;
    const warning =
      !submerged && phase >= TURTLE_VISIBLE - TURTLE_WARN && Math.floor(e.t * 10) % 2 === 0;
    for (let i = 0; i < e.width; i++) {
      const cx = (e.col + i + 0.5) * CELL;
      const cy = lane.row * CELL + CELL / 2;
      if (submerged) {
        ctx.strokeStyle = pal.turtle;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        continue;
      }
      ctx.globalAlpha = warning ? 0.5 : 1;
      ctx.fillStyle = pal.turtle;
      ctx.beginPath();
      ctx.arc(cx, cy, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = pal.turtleShell;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.moveTo(cx - 9, cy);
      ctx.lineTo(cx + 9, cy);
      ctx.moveTo(cx, cy - 9);
      ctx.lineTo(cx, cy + 9);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function drawFrogShape(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    angle: number,
    hopping: boolean,
    scale = 1,
  ) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    if (pal.glow) {
      ctx.shadowColor = pal.frog;
      ctx.shadowBlur = pal.glow;
    }
    // Patas: recogidas en reposo, extendidas durante el salto. Se trazan dos
    // veces (contorno oscuro y color) para separar la rana de troncos y tortugas.
    ctx.lineCap = "round";
    const ext = hopping ? 1 : 0.45;
    ctx.beginPath();
    for (const s of [-1, 1]) {
      ctx.moveTo(s * 10, 7);
      ctx.lineTo(s * (10 + 9 * ext), 7 + 11 * ext);
      ctx.moveTo(s * 11, -5);
      ctx.lineTo(s * (11 + 7 * ext), -5 - 9 * ext);
    }
    ctx.strokeStyle = pal.frogOutline;
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.strokeStyle = pal.frogDark;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = pal.frog;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = pal.frogOutline;
    ctx.lineWidth = 2;
    ctx.stroke();
    for (const s of [-1, 1]) {
      ctx.fillStyle = pal.frogEye;
      ctx.beginPath();
      ctx.arc(s * 6, -9, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal.frogPupil;
      ctx.beginPath();
      ctx.arc(s * 6, -10, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawFrog(ctx: CanvasRenderingContext2D) {
    if (deathTimer > 0) {
      const cx = (frog.col + 0.5) * CELL;
      const cy = frog.row * CELL + CELL / 2;
      ctx.strokeStyle = pal.death;
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy - 12);
      ctx.lineTo(cx + 12, cy + 12);
      ctx.moveTo(cx + 12, cy - 12);
      ctx.lineTo(cx - 12, cy + 12);
      ctx.stroke();
      return;
    }
    let col = frog.col;
    let row = frog.row;
    let scale = 1;
    if (frog.animating) {
      const t = Math.min(1, frog.animT / HOP_TIME);
      col += (frog.targetCol - frog.col) * t;
      row += (frog.targetRow - frog.row) * t;
      scale = 1 + 0.2 * Math.sin(Math.PI * t);
    }
    const idle = !frog.animating && pal.glow ? getIdleFrogSprite() : null;
    if (idle) {
      ctx.save();
      ctx.translate((col + 0.5) * CELL, row * CELL + CELL / 2);
      ctx.rotate(FACING_ANGLE[frog.facing]);
      drawGlowSprite(ctx, idle, -FROG_BOX / 2, -FROG_BOX / 2);
      ctx.restore();
      return;
    }
    drawFrogShape(
      ctx,
      (col + 0.5) * CELL,
      row * CELL + CELL / 2,
      FACING_ANGLE[frog.facing],
      frog.animating,
      scale,
    );
  }

  function drawHud(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = pal.hud;
    ctx.font = "bold 14px monospace";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText(`PTS ${score}`, 8, 2);
    ctx.textAlign = "center";
    ctx.fillText(`NIVEL ${String(level).padStart(2, "0")}`, WIDTH / 2, 2);
    for (let i = 0; i < lives; i++) {
      ctx.fillStyle = pal.frog;
      ctx.beginPath();
      ctx.arc(WIDTH - 14 - i * 18, 9, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    // Barra de tiempo: franja inferior de la fila de inicio (la fila 0 son las metas).
    const ratio = Math.max(0, Math.min(1, timeLeft / timeLimit(level)));
    ctx.fillStyle = ratio > 0.5 ? pal.timeOk : ratio > 0.25 ? pal.timeWarn : pal.timeBad;
    ctx.fillRect(0, HEIGHT - 6, WIDTH * ratio, 6);
  }

  reset();

  return {
    update(dt: number) {
      if (status !== "playing") return;

      for (const lane of lanes) {
        const d = lane.speed * lane.dir * dt;
        for (const e of lane.entities) {
          e.col += d;
          wrap(e, lane);
          if (e.type === "turtle") {
            e.t += dt;
            e.submerged =
              e.t % (TURTLE_VISIBLE + TURTLE_SUBMERGED) >= TURTLE_VISIBLE;
          }
        }
      }

      if (deathTimer > 0) {
        deathTimer -= dt;
        if (deathTimer <= 0) {
          deathTimer = 0;
          if (lives <= 0) status = "gameover";
          else respawn();
        }
        return;
      }

      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        killFrog();
        return;
      }

      stepFrog(dt);
    },

    draw(ctx: CanvasRenderingContext2D) {
      drawZones(ctx);
      drawGoals(ctx);
      for (const lane of lanes) {
        for (const e of lane.entities) {
          if (e.type === "log") drawLog(ctx, e, lane);
          else if (e.type === "turtle") drawTurtles(ctx, e, lane);
          else drawVehicle(ctx, e, lane);
        }
      }
      drawFrog(ctx);
      drawHud(ctx);
    },

    snapshot(): GameSnapshot {
      return { score, status, hud: { lives, level } };
    },

    setKey(code: string, down: boolean) {
      // Saltos por flanco: solo la pulsación cuenta, mantener la tecla no repite.
      if (!down) {
        held.delete(code);
        return;
      }
      if (held.has(code)) return;
      held.add(code);
      if (status !== "playing" || deathTimer > 0) return;
      const dir = KEY_DIRS[code];
      if (dir) pendingDir = dir;
    },

    reset,
  };
}
