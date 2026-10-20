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
    create: createSnake,
  },
};
