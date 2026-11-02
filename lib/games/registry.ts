import {
  createAsteroids,
  HEIGHT,
  WIDTH,
} from "./asteroids/engine";
import {
  createArkanoid,
  HEIGHT as ARKANOID_HEIGHT,
  WIDTH as ARKANOID_WIDTH,
} from "./arkanoid/engine";
import {
  createTetris,
  HEIGHT as TETRIS_HEIGHT,
  WIDTH as TETRIS_WIDTH,
} from "./tetris/engine";
import {
  createSnake,
  HEIGHT as SNAKE_HEIGHT,
  WIDTH as SNAKE_WIDTH,
} from "./snake/engine";
import {
  createRanaria,
  HEIGHT as RANARIA_HEIGHT,
  WIDTH as RANARIA_WIDTH,
} from "./ranaria/engine";
import { SKIN_IDS } from "./skins";
import type { GameDefinition } from "./types";

// Un juego es «real» si su id está aquí. Que acepte puntuaciones lo decide
// games.ranked en base de datos, no el registro.
export const GAME_REGISTRY: Record<string, GameDefinition> = {
  rocas: {
    id: "rocas",
    width: WIDTH,
    height: HEIGHT,
    keys: ["ArrowLeft", "ArrowRight", "ArrowUp", "Space"],
    controlsLabel: "← → ROTAR · ↑ PROPULSAR · ESPACIO DISPARAR",
    ariaLabel:
      "Juego Rocas: pilota la nave con las flechas izquierda y derecha, propulsa con la flecha arriba y dispara con la barra espaciadora para destruir los asteroides",
    hud: [
      { key: "score", label: "Puntuación", format: "int" },
      { key: "lives", label: "Vidas", format: "hearts" },
      { key: "level", label: "Nivel", format: "pad2" },
    ],
    skins: SKIN_IDS,
    touch: {
      kind: "split",
      label: "◀ ▶ ROTAR · ▲ PROPULSAR · ● DISPARAR",
      left: [
        { code: "ArrowLeft", label: "◀", ariaLabel: "Rotar a la izquierda" },
        { code: "ArrowRight", label: "▶", ariaLabel: "Rotar a la derecha" },
      ],
      right: [
        { code: "ArrowUp", label: "▲", ariaLabel: "Propulsar" },
        { code: "Space", label: "●", ariaLabel: "Disparar" },
      ],
    },
    create: createAsteroids,
  },
  caida: {
    id: "caida",
    width: TETRIS_WIDTH,
    height: TETRIS_HEIGHT,
    keys: ["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "KeyX", "Space"],
    controlsLabel: "← → MOVER · ↑ X ROTAR · ↓ BAJAR · ESPACIO CAÍDA",
    ariaLabel:
      "Tablero de Tetris: piezas que caen y se encajan en una cuadrícula de 10 por 20",
    hud: [
      { key: "score", label: "PUNTOS", format: "int" },
      { key: "lines", label: "LÍNEAS", format: "int" },
      { key: "level", label: "NIVEL", format: "int" },
    ],
    skins: SKIN_IDS,
    touch: {
      kind: "split",
      label: "◀ ▶ MOVER · ▼ BAJAR · ⟳ ROTAR · ⤓ CAÍDA",
      left: [
        { code: "ArrowLeft", label: "◀", ariaLabel: "Mover a la izquierda" },
        { code: "ArrowDown", label: "▼", ariaLabel: "Bajar la pieza" },
        { code: "ArrowRight", label: "▶", ariaLabel: "Mover a la derecha" },
      ],
      right: [
        { code: "ArrowUp", label: "⟳", ariaLabel: "Rotar la pieza" },
        { code: "Space", label: "⤓", ariaLabel: "Caída instantánea" },
      ],
    },
    create: createTetris,
  },
  "bloque-buster": {
    id: "bloque-buster",
    width: ARKANOID_WIDTH,
    height: ARKANOID_HEIGHT,
    keys: ["ArrowLeft", "ArrowRight"],
    controlsLabel: "← → MOVER LA PALETA",
    ariaLabel:
      "Juego Bloque Buster: mueve la paleta con las flechas izquierda y derecha para rebotar la bola y destruir todos los bloques",
    hud: [
      { key: "score", label: "Puntuación", format: "int" },
      { key: "lives", label: "Vidas", format: "hearts" },
      { key: "level", label: "Nivel", format: "pad2" },
    ],
    skins: SKIN_IDS,
    touch: {
      kind: "split",
      label: "◀ ▶ MOVER LA PALETA",
      left: [
        {
          code: "ArrowLeft",
          label: "◀",
          ariaLabel: "Mover la paleta a la izquierda",
          wide: true,
        },
      ],
      right: [
        {
          code: "ArrowRight",
          label: "▶",
          ariaLabel: "Mover la paleta a la derecha",
          wide: true,
        },
      ],
    },
    create: createArkanoid,
  },
  serpentina: {
    id: "serpentina",
    width: SNAKE_WIDTH,
    height: SNAKE_HEIGHT,
    keys: [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
    ],
    controlsLabel: "← ↑ ↓ → / WASD MOVER LA SERPIENTE",
    ariaLabel:
      "Juego Serpentina: guía la serpiente con las flechas o W A S D para comer frutas sin chocar con las paredes ni con tu propio cuerpo",
    hud: [
      { key: "score", label: "PUNTOS", format: "int" },
      { key: "length", label: "LONGITUD", format: "int" },
      { key: "level", label: "NIVEL", format: "int" },
    ],
    assets: { fruits: "/games/snake/fruits.png" },
    skins: SKIN_IDS,
    touch: {
      kind: "dpad",
      label: "▲ ▼ ◀ ▶ MOVER LA SERPIENTE",
      up: { code: "ArrowUp", label: "▲", ariaLabel: "Subir" },
      down: { code: "ArrowDown", label: "▼", ariaLabel: "Bajar" },
      left: { code: "ArrowLeft", label: "◀", ariaLabel: "Ir a la izquierda" },
      right: { code: "ArrowRight", label: "▶", ariaLabel: "Ir a la derecha" },
    },
    create: createSnake,
  },
  ranaria: {
    id: "ranaria",
    width: RANARIA_WIDTH,
    height: RANARIA_HEIGHT,
    keys: [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
    ],
    controlsLabel: "← ↑ ↓ → / WASD SALTAR",
    ariaLabel:
      "Juego Ranaria: guía la rana con las flechas o W A S D para cruzar la carretera y el río y llegar a las cinco bocas del otro lado",
    hud: [
      { key: "score", label: "PUNTOS", format: "int" },
      { key: "lives", label: "VIDAS", format: "hearts" },
      { key: "level", label: "NIVEL", format: "pad2" },
    ],
    skins: SKIN_IDS,
    touch: {
      kind: "dpad",
      label: "▲ ▼ ◀ ▶ SALTAR",
      up: { code: "ArrowUp", label: "▲", ariaLabel: "Saltar hacia arriba" },
      down: { code: "ArrowDown", label: "▼", ariaLabel: "Saltar hacia abajo" },
      left: {
        code: "ArrowLeft",
        label: "◀",
        ariaLabel: "Saltar a la izquierda",
      },
      right: {
        code: "ArrowRight",
        label: "▶",
        ariaLabel: "Saltar a la derecha",
      },
    },
    create: createRanaria,
  },
};
