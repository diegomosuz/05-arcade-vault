# Contrato común de motor, registro y canvas

Generaliza lo que SPEC 04 hizo solo para `rocas` (`lib/games/asteroids/engine.ts`, `components/games/asteroids-canvas.tsx`). Es la referencia que el spec generado debe citar. Si `lib/games/registry.ts` ya existe, manda el código existente sobre este documento.

## Motor (`lib/games/<slug>/engine.ts`)

Módulo TypeScript independiente de React.

```ts
export type GameStatus = "playing" | "dead" | "gameover";

export type GameSnapshot = {
  score: number;
  status: GameStatus;
  hud: Record<string, number>; // métricas extra: lives, level, lines…
};

export type GameEngine = {
  update(dt: number): void; // segundos, ya limitado a 0.05
  draw(ctx: CanvasRenderingContext2D): void;
  snapshot(): GameSnapshot;
  setKey(code: string, down: boolean): void; // KeyboardEvent.code
  reset(): void;
};

export const WIDTH: number;
export const HEIGHT: number;
export function createGame(): GameEngine; // nombre por juego: createTetris(), createArkanoid()…
```

Reglas:

- El motor no usa `window`, `document`, `requestAnimationFrame` ni `Audio`. El bucle y los listeners viven en el componente.
- `Math.random` solo dentro de `create…()`, `reset()` y `update()`; nunca en el render inicial de React (hidratación).
- Se conservan los nombres de clases y constantes del `game.js` original para poder cotejar.
- Se elimina del `draw` el HUD y la pantalla de «GAME OVER» del original: los cubren el HUD React y el modal «FIN DEL JUEGO».
- Acciones de un solo disparo (disparar, rotar, caída dura) se detectan por flanco en `setKey`, no por mantener la tecla, salvo que el original repita.
- Juegos con temporizador por acumulación (Tetris) acumulan `dt` en segundos dentro del motor.
- Arrays de entidades muertas (balas, partículas, bloques rotos) se filtran cada `update`.
- Constantes de reglas idénticas al original salvo decisión explícita en el spec.

## Entrada de registro (`lib/games/registry.ts`)

Un mapa por `id` de juego de la tabla `games`:

```ts
export type GameDefinition = {
  id: string; // = games.id
  width: number;
  height: number;
  keys: string[]; // KeyboardEvent.code con preventDefault mientras se juega
  controlsLabel: string; // pie del marco CRT: "← → ROTAR · ↑ PROPULSAR · ESPACIO DISPARAR"
  ariaLabel: string; // descripción del canvas
  hud: {
    key: keyof GameSnapshot | string;
    label: string;
    format?: "int" | "pad2" | "hearts";
  }[];
  create: () => GameEngine;
};

export const GAME_REGISTRY: Record<string, GameDefinition>;
```

- Un juego es «real» si su `id` está en `GAME_REGISTRY`. Que acepte puntuaciones lo decide la columna `games.ranked` en base de datos, no el registro.
- Todo juego del registro debe tener `ranked = true` al darse de alta; un juego real sin `ranked` es una demo jugable que no guarda.

## Componente canvas (`components/games/game-canvas.tsx`)

Derivado de `components/games/asteroids-canvas.tsx`. Props:

```ts
type Props = {
  def: GameDefinition;
  paused: boolean;
  runKey: number; // cambia para reiniciar la partida
  onChange: (s: GameSnapshot) => void; // solo si score, status o hud cambian
  onGameOver: (finalScore: number) => void; // una vez por partida
};
```

Comportamiento que no se debe perder:

- Callbacks y `paused` se leen desde refs actualizados en un efecto, para no reinstalar bucle ni listeners.
- El motor se crea (y recrea al cambiar `runKey`) dentro de un `useEffect`; dibuja un primer fotograma y notifica el snapshot inicial.
- `keydown`/`keyup` en `window`; `preventDefault` solo para `def.keys` y solo si no está en pausa; `keyup` siempre se procesa.
- Bucle con `requestAnimationFrame` solo mientras no esté en pausa; `dt = min((ts - last)/1000, 0.05)`; el primer fotograma tras reanudar usa `dt = 0`.
- Al pausar, soltar todas las teclas (`setKey(code, false)`).
- `onChange` solo si el snapshot cambió respecto al anterior; `onGameOver` una vez por partida.
- Limpieza completa al desmontar: `cancelAnimationFrame` y `removeEventListener`.
- `<canvas width height className="asteroids-canvas">` (la clase CSS ya escala 4:3 dentro de `.crt-screen`; si el juego no es 4:3, el spec añade una regla nueva, sin tocar las existentes) con `role="img"` y `aria-label={def.ariaLabel}`.

## Reproductor (`components/game-player.tsx`)

Hoy decide con `const isReal = id === "rocas"` y tiene `AsteroidsCanvas` cableado, y `Run` guarda solo `score` y `level` más `lives` aparte. Al introducir el registro:

- `const def = GAME_REGISTRY[id]; const isReal = !!def;`
- El HUD se pinta desde `def.hud` y `snapshot.hud`; para demos se mantiene el HUD actual (puntuación, vidas, nivel simulados).
- El pie CRT usa `def.controlsLabel`.
- Se conservan sin cambios: pausa por `visibilitychange`/`blur`, reseteo del estado al desmontar (con `cacheComponents` Next conserva la página oculta), arranque en pausa con `prefers-reduced-motion`, modal «FIN DEL JUEGO», `submitScore` y el doble clic protegido por `savingRef`.
- Migrar `rocas` al registro debe ser invisible para el usuario: mismo HUD, mismos textos, mismo comportamiento. Es el paso 0 del primer spec que use esta skill.
