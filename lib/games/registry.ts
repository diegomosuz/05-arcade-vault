import {
  createAsteroids,
  HEIGHT,
  WIDTH,
} from "./asteroids/engine";
import {
  createTetris,
  HEIGHT as TETRIS_HEIGHT,
  WIDTH as TETRIS_WIDTH,
} from "./tetris/engine";
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
};
