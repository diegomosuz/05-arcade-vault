# SPEC 07 — Juego Tetris con puntuaciones y leaderboard

> **Estado:** Aprobado
> **Depende de:** SPEC 04, SPEC 06
> **Fecha:** 2026-10-19
> **Objetivo:** Portar a TypeScript `references/started-games/03-tetris`, jugarlo en `/juegos/caida/jugar` dentro del marco CRT y darlo de alta como juego `ranked` con puntuaciones reales en el Salón de la Fama, introduciendo antes el registro de juegos que SPEC 04 dejó pendiente.

---

## Por qué existe este spec

SPEC 04 portó Asteroides y dejó cableado en `components/game-player.tsx` el id `rocas` (`const isReal = id === "rocas"`, `AsteroidsCanvas`, `Run` con `score` y `level`, `lives` aparte). Decidió no generalizar con un solo juego real. Tetris es el segundo, así que ahora toca extraer el contrato: `lib/games/registry.ts` no existe todavía y este spec lo crea migrando `rocas` sin cambios visibles (pasos 1 a 6).

SPEC 06 ya dejó genéricos `submitScore`, `games`, `scores`, `leaderboard` y `/salon`. Para Tetris solo hace falta motor, registro y una migración de datos que convierte la demo `caida` en juego `ranked`.

El `game.js` original usa variables globales, `document.getElementById`, un `document.addEventListener` sin limpieza, su propio `requestAnimationFrame`, `getComputedStyle(document.body)` para la rejilla y un tema claro/oscuro con `localStorage`. No se puede incrustar tal cual en React, por eso se porta.

El código tiene **8 piezas**: las 7 clásicas más la «N» (tuerca 3×3 hueca, `PIECES[8]`), que el README no menciona. El spec conserva la pieza N porque es una regla del código real.

---

## Alcance

**Dentro:**

- Contrato compartido `lib/games/types.ts` y registro `lib/games/registry.ts` según `.claude/skills/nuevo-juego/reference/contrato-motor.md`.
- Componente genérico `components/games/game-canvas.tsx` que sustituye a `components/games/asteroids-canvas.tsx` (se elimina al final de la migración de `rocas`).
- Migración de `rocas` al registro: mismo HUD, mismos textos, mismo comportamiento.
- Motor `lib/games/tetris/engine.ts` portado de `game.js`:
  - Tablero 10×20, bloque de 30 px, 8 piezas equiprobables (`Math.floor(Math.random() * 8) + 1`), sin bolsa.
  - Rotación horaria con _wall kicks_ `[0, -1, 1, -2, 2]`.
  - Pieza fantasma al 20 % de opacidad y vista previa de la siguiente pieza.
  - Puntuación: `LINE_SCORES = [0, 100, 300, 500, 800]` × nivel; +1 por celda de bajada suave; +2 por celda de caída dura.
  - Nivel = `floor(líneas / 10) + 1`; intervalo de caída `max(0.1, 1 - (nivel - 1) * 0.09)` segundos.
  - Fin de partida cuando la pieza recién generada colisiona al aparecer.
  - Repetición de teclas propia en el motor para `←`, `→` y `↓`.
- Canvas 800×600 (4:3): tablero de 300×600 centrado y panel «NEXT» dibujado dentro del propio canvas.
- HUD React: PUNTOS, LÍNEAS y NIVEL, sin vidas.
- Controles: `←` `→` mover, `↑` o `X` rotar, `↓` bajar, `Espacio` caída dura.
- Aspecto original sobre fondo oscuro: paleta de 8 colores con el brillo superior en cada bloque, rejilla fina y fantasma. Sin HUD ni «GAME OVER» dibujados en el canvas.
- Migración `supabase/migrations/003_juego_caida.sql`: `caida` pasa a `ranked = true` y `max_score = 500000`, con `title`, `short`, `long`, `cover`, `color` y `position` sin cambios.
- Pie del marco CRT con los controles de Tetris.
- Pausa automática, `prefers-reduced-motion` y limpieza al desmontar, heredados del componente y del reproductor.

**Fuera de alcance (para specs futuros):**

- Tema claro/oscuro del original y su clave `tetris-theme` de `localStorage`.
- Atajo `P` para pausar: la pausa la da el botón PAUSA existente.
- Sonido, música y assets.
- Recolorear con la paleta neón de la marca.
- Cambios de reglas o de balance (bolsa de 7 piezas, _hold_, SRS, _lock delay_, puntuación moderna).
- Controles táctiles o gamepad.
- Anticheat avanzado, rate limit o ranking en el detalle del juego.
- Cambiar el texto del catálogo o la portada `cover-tetro` de `caida`.
- Portar Arkanoid (`references/started-games/04-arkanoid`).
- Tests automatizados (no hay test runner configurado).
- Internacionalización: solo español.

---

## Modelo de datos

Contrato compartido (nuevo), tomado de `contrato-motor.md`:

```ts
// lib/games/types.ts
export type GameStatus = "playing" | "dead" | "gameover";

export type GameSnapshot = {
  score: number;
  status: GameStatus;
  hud: Record<string, number>; // rocas: { lives, level }; caida: { lines, level }
};

export type GameEngine = {
  update(dt: number): void; // segundos, ya limitado a 0.05
  draw(ctx: CanvasRenderingContext2D): void;
  snapshot(): GameSnapshot;
  setKey(code: string, down: boolean): void; // KeyboardEvent.code
  reset(): void;
};

export type GameDefinition = {
  id: string; // = games.id
  width: number;
  height: number;
  keys: string[];
  controlsLabel: string;
  ariaLabel: string;
  hud: { key: string; label: string; format?: "int" | "pad2" | "hearts" }[];
  create: () => GameEngine;
};
```

Registro (nuevo):

```ts
// lib/games/registry.ts
export const GAME_REGISTRY: Record<string, GameDefinition> = {
  rocas: {/* reproduce el HUD, pie y aria-label actuales de SPEC 04 */},
  caida: {
    id: "caida",
    width: 800,
    height: 600,
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
```

Motor de Tetris (estructuras e hitos, no código completo):

```ts
// lib/games/tetris/engine.ts
export const WIDTH = 800;
export const HEIGHT = 600;

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const BOARD_X = 250; // (800 - 300) / 2; el tablero ocupa x 250–550, y 0–600
const NEXT_X = 580; // panel «NEXT» de 120×120, a la derecha del tablero
const NEXT_Y = 40;

const LINE_SCORES = [0, 100, 300, 500, 800];
const COLORS = [
  null,
  "#4dd0e1",
  "#ffd54f",
  "#ba68c8",
  "#81c784",
  "#e57373",
  "#90caf9",
  "#ffb74d",
  "#9e9e9e",
];
const PIECES: (number[][] | null)[] = [
  null /* I O T S Z J L N, idénticas a game.js */,
];

const REPEAT_DELAY = 0.17; // s hasta la primera repetición de ← → ↓
const REPEAT_INTERVAL = 0.05; // s entre repeticiones

export function createTetris(): GameEngine; // snapshot().hud = { lines, level }
```

Convenciones:

- Archivos nuevos: `lib/games/types.ts`, `lib/games/registry.ts`, `lib/games/tetris/engine.ts`, `components/games/game-canvas.tsx`, `supabase/migrations/003_juego_caida.sql`.
- Carpeta del motor `tetris`, id de base de datos `caida`: el id ya existe y `scores.game_id` lo referencia.
- Nombres de `COLS`, `ROWS`, `BLOCK`, `COLORS`, `PIECES`, `LINE_SCORES`, `createBoard`, `randomPiece`, `collide`, `rotateCW`, `tryRotate`, `merge`, `clearLines`, `ghostY`, `hardDrop`, `softDrop`, `lockPiece` y `spawn` se conservan para cotejar con `game.js`.
- El motor acumula `dt` en segundos (`dropAccum`) y reinicia el acumulador a 0 tras cada caída automática, como el original. La caída automática no da puntos.
- Al bloquear una pieza, el multiplicador de `LINE_SCORES` es el nivel anterior a recalcular con las líneas nuevas, como el original.
- Rotar (`ArrowUp`, `KeyX`) y caída dura (`Space`) se detectan por flanco en `setKey`: mantener la tecla no repite.
- `←` `→` `↓` ejecutan la acción al pulsar y la repiten con `REPEAT_DELAY` y `REPEAT_INTERVAL` acumulando `dt`. Si `←` y `→` están pulsadas a la vez, manda la última pulsada. `↓` mantenida sobre el suelo bloquea la pieza (como el original) y la siguiente pieza también baja.
- Al terminar, `draw` sigue pintando el tablero y la pieza que no cupo; `update` y `setKey` dejan de actuar.
- Fondo del juego `#0f0f17`, paneles de tablero y NEXT `#1a1a25` con borde `#2a2a3a` y rejilla `#22222e` (valores del tema oscuro de `style.css`, ya sin `getComputedStyle`).
- La pieza siguiente se centra en el panel NEXT con el mismo cálculo de `offX`/`offY` de `drawNext`.
- `Math.random` solo dentro de `createTetris()`, `reset()` y `update()`.
- La migración no cambia el esquema: no hay que regenerar `lib/supabase/database.types.ts`.

```sql
-- supabase/migrations/003_juego_caida.sql
-- SPEC 07: CAÍDA (Tetris) pasa de demo a juego real con puntuaciones.
update public.games
set ranked = true,
    max_score = 500000
where id = 'caida';
```

Cálculo de `max_score = 500 000`: encadenar solo _tetris_ da 2 000 × nivel por cada 10 líneas; hasta el nivel 22 suman 2 000 × Σ(1..22) = 506 000, unas 220 líneas de partida perfecta, muy por encima de una partida humana normal. El valor se ajusta por migración si hace falta.

---

## Plan de implementación

Antes del paso 1, leer en `node_modules/next/dist/docs/` la guía de App Router sobre Client Components y `cacheComponents`. Next.js 16.4 y React 19.3 tienen cambios incompatibles con versiones anteriores. Cualquier cambio visible del reproductor (HUD, pie CRT) se hace con `/frontend-design`, según `CLAUDE.md`, conservando el aspecto actual.

Los pasos 1 a 6 migran `rocas` al registro y no cambian nada para el usuario. Los pasos 7 a 9 crean el motor sin registrarlo. Cada paso se commitea solo.

1. **Contrato.** Crear `lib/games/types.ts` con `GameStatus`, `GameSnapshot`, `GameEngine` y `GameDefinition`. Verificación: `npm run build` y `npm run lint` pasan.
2. **Motor de Asteroides al contrato.** En `lib/games/asteroids/engine.ts`, `snapshot()` devuelve `{ score, status, hud: { lives, level } }` y el motor implementa `GameEngine`. Los tipos `AsteroidsSnapshot`/`AsteroidsGame` se eliminan si dejan de usarse. Verificación: `build` pasa y `/juegos/rocas/jugar` se juega igual.
3. **Componente genérico.** Crear `components/games/game-canvas.tsx` derivado de `asteroids-canvas.tsx` con las props de `contrato-motor.md` (`def`, `paused`, `runKey`, `onChange`, `onGameOver`) y la clase `asteroids-canvas` en el `<canvas>`. Todavía no se usa. Verificación: `build` y `lint` pasan.
4. **Registro con `rocas`.** Crear `lib/games/registry.ts` con `GAME_REGISTRY` y solo la entrada `rocas` (teclas `ArrowLeft`, `ArrowRight`, `ArrowUp`, `Space`; HUD de puntos, vidas `hearts` y nivel; pie y `aria-label` actuales). Verificación: `build` pasa.
5. **Reproductor sobre el registro.** En `components/game-player.tsx`: `const def = GAME_REGISTRY[id]; const isReal = !!def`, montar `GameCanvas` en vez de `AsteroidsCanvas`, y guardar en `Run` el `score` más un `hud: Record<string, number>` en lugar de `level` y `lives` sueltos. Eliminar `components/games/asteroids-canvas.tsx`. Se conservan pausa por `visibilitychange`/`blur`, reseteo al desmontar, `prefers-reduced-motion`, modal y `savingRef`. Verificación: `/juegos/rocas/jugar` y `/juegos/serpentina/jugar` (demo) se comportan como antes.
6. **HUD y pie desde la definición.** Pintar el HUD de los juegos reales desde `def.hud` y `snapshot.hud` (formatos `int`, `pad2`, `hearts`) y el pie CRT desde `def.controlsLabel`; las demos mantienen su HUD simulado. Verificación: `rocas` muestra el mismo HUD y pie que antes, a 1440 px y a 390 px.
7. **Motor: tablero y piezas.** Crear `lib/games/tetris/engine.ts` con constantes, `PIECES`, `createBoard`, `randomPiece`, `collide`, `rotateCW`, `tryRotate`, `merge`, `clearLines`, `ghostY`, `spawn` y puntuación/nivel, más `snapshot()` y `reset()`. Sin dibujo ni bucle todavía. Verificación: `build` y `lint` pasan.
8. **Motor: caída, repetición y teclas.** Añadir `update(dt)` con `dropAccum`/`dropInterval`, `softDrop`, `hardDrop`, `lockPiece`, fin de partida, `setKey` con flanco para `ArrowUp`/`KeyX`/`Space` y repetición propia para `ArrowLeft`/`ArrowRight`/`ArrowDown`. Verificación: `build` y `lint` pasan.
9. **Motor: dibujo.** Añadir `draw(ctx)`: fondo, panel del tablero con rejilla, bloques con brillo, fantasma al 20 %, pieza actual y panel NEXT, sin HUD ni «GAME OVER». Verificación: `build` y `lint` pasan.
10. **Registrar `caida`.** Añadir la entrada `caida` a `GAME_REGISTRY` con `create: createTetris`. Verificación: `/juegos/caida/jugar` ya se juega con el HUD PUNTOS/LÍNEAS/NIVEL; el modal todavía avisa de demo porque `ranked` sigue en `false`.
11. **Migración.** Crear `supabase/migrations/003_juego_caida.sql` y aplicarla con `apply_migration`. Verificación: `select id, ranked, max_score from public.games where id = 'caida'` devuelve `true` y `500000`; `get_advisors` de seguridad sin avisos nuevos; un `insert` en `scores` con la clave publishable falla.
12. **Pie CRT, escalado y movimiento reducido.** Comprobar el pie «← → MOVER · ↑ X ROTAR · ↓ BAJAR · ESPACIO CAÍDA», el escalado del canvas 800×600 con la clase existente a 1440 px y a 390 px, y el arranque en pausa con `prefers-reduced-motion`. Si hace falta algún ajuste, solo reglas nuevas en `app/globals.css`. Verificación: sin scroll horizontal y el canvas nítido.
13. **Verificación del guardado.** Con sesión iniciada, jugar una partida real de `caida`, guardar la puntuación, comprobar la fila en `scores` con `execute_sql` (solo `select`) y verla en la pestaña CAÍDA de `/salon` tras recargar. Verificación: la marca coincide con la del modal.

---

## Criterios de aceptación

**Globales**

- [ ] `npm run build` termina sin errores ni errores de tipos.
- [ ] `npm run lint` termina sin errores.
- [ ] No hay errores ni advertencias de hidratación ni de React Strict Mode en la consola de `/juegos/caida/jugar` ni de `/juegos/rocas/jugar`.
- [ ] `references/` queda intacto.
- [ ] No se modifica ninguna clase existente de `app/globals.css`; solo se añaden reglas nuevas.
- [ ] Las pantallas de los specs anteriores se ven igual salvo lo que este spec cambia.

**Registro y migración de `rocas`**

- [ ] `lib/games/registry.ts` existe y `GAME_REGISTRY` contiene exactamente `rocas` y `caida`.
- [ ] `components/games/asteroids-canvas.tsx` ya no existe y nada lo importa.
- [ ] `/juegos/rocas/jugar` muestra el mismo HUD (puntos, vidas ♥, nivel), el mismo pie y el mismo `aria-label` que antes del spec.
- [ ] Las reglas de Asteroides (20/50/100 puntos, 3 vidas, nivel, power-up) no cambian.
- [ ] Las 6 demos restantes (`/juegos/serpentina/jugar`, etc.) siguen con su simulación y su aviso de demo.

**Juego**

- [ ] `←` y `→` mueven la pieza una columna; mantenerlas la repite tras 0,17 s cada 0,05 s.
- [ ] `↑` y `X` rotan la pieza en sentido horario una vez por pulsación; mantener no repite.
- [ ] Si la rotación choca, se prueban los desplazamientos `0, -1, +1, -2, +2` en ese orden y, si ninguno cabe, la pieza no gira.
- [ ] `↓` baja una fila y suma 1 punto por fila; si la pieza no puede bajar, se bloquea.
- [ ] `Espacio` deja caer la pieza al instante, suma 2 puntos por celda recorrida y se dispara una vez por pulsación.
- [ ] Las flechas y la barra espaciadora no hacen scroll de la página mientras se juega.
- [ ] Aparecen 8 tipos de pieza (I, O, T, S, Z, J, L y la tuerca N gris 3×3 hueca), cada una con su color del original.
- [ ] Limpiar 1, 2, 3 y 4 líneas suma 100, 300, 500 y 800 multiplicado por el nivel vigente al bloquear la pieza.
- [ ] El nivel sube cada 10 líneas (`floor(líneas / 10) + 1`) y el intervalo de caída es 1 s en nivel 1, 0,91 s en nivel 2 y 0,1 s desde el nivel 11.
- [ ] La caída automática no suma puntos.
- [ ] La pieza fantasma se dibuja al 20 % donde aterrizaría la pieza actual.
- [ ] El panel NEXT muestra la pieza que aparecerá a continuación y coincide con la que aparece después.
- [ ] Cuando la pieza recién generada colisiona al aparecer, se abre el modal «FIN DEL JUEGO» con la puntuación final real.
- [ ] El canvas no dibuja marcadores ni texto «GAME OVER»; solo tablero, piezas, fantasma y panel NEXT.

**Integración con el reproductor**

- [ ] El HUD muestra jugador, PUNTOS (`es-ES`), LÍNEAS y NIVEL reales, actualizados al instante, y no muestra vidas.
- [ ] PAUSA congela el juego (la pieza no cae ni se repiten teclas) y REANUDAR lo continúa sin saltos de caída.
- [ ] FIN abre el modal con la puntuación actual.
- [ ] «JUGAR DE NUEVO» reinicia con 0 puntos, 0 líneas, nivel 1, tablero vacío y piezas nuevas.
- [ ] SALIR y «VOLVER AL VAULT» navegan correctamente; al volver, la partida empieza de cero sin bucles ni listeners duplicados.
- [ ] Cambiar de pestaña o perder el foco de la ventana pausa el juego.
- [ ] El pie del marco CRT muestra «← → MOVER · ↑ X ROTAR · ↓ BAJAR · ESPACIO CAÍDA».
- [ ] No hay atajo `P`: pulsar `P` no hace nada.

**Rendimiento y limpieza**

- [ ] Al desmontar se cancela el `requestAnimationFrame` y se retiran los listeners (tras navegar fuera, pulsar teclas no ejecuta código del juego).
- [ ] Con la pestaña oculta o en pausa no hay trabajo de simulación.
- [ ] Una partida de 2 minutos no muestra crecimiento sostenido de memoria; el tablero es una matriz de tamaño fijo y no se acumulan objetos.

**Base de datos y catálogo**

- [ ] `supabase/migrations/003_juego_caida.sql` existe y coincide con lo aplicado.
- [ ] `games` tiene `ranked = true` y `max_score = 500000` para `caida`; el resto de filas y los campos `title`, `short`, `long`, `cover`, `color` y `position` de `caida` no cambian.
- [ ] `get_advisors` de seguridad no reporta avisos nuevos.
- [ ] Un `insert` en `scores` con la clave publishable falla, incluso con sesión iniciada.
- [ ] `/` y `/biblioteca` muestran los mismos 8 juegos con el mismo texto y la misma portada `cover-tetro` para CAÍDA.
- [ ] `/juegos/caida` y `/juegos/caida/jugar` cargan; un id inexistente muestra la página de no encontrado.

**Guardado y leaderboard**

- [ ] Con sesión iniciada, al terminar `caida` el modal muestra el `username` real y «GUARDAR PUNTUACIÓN» inserta una fila en `scores` con `game_id = 'caida'`, el `user_id` del usuario y la puntuación mostrada.
- [ ] Pulsar «GUARDAR PUNTUACIÓN» dos veces rápido inserta una sola fila.
- [ ] Sin sesión, el modal muestra «INICIA SESIÓN PARA GUARDAR TU PUNTUACIÓN» con enlace a `/acceso` y sin botón de guardar.
- [ ] `submitScore('caida', 500001)` devuelve `invalid` y no inserta.
- [ ] Tras guardar, la marca aparece en la pestaña CAÍDA de `/salon` al recargar, una sola fila por jugador (la mejor).
- [ ] La tarjeta y el detalle de CAÍDA muestran la mejor marca y el número de partidas reales.
- [ ] El modal de `caida` ya no muestra el aviso «ESTE JUEGO ES UNA DEMO».

**Responsive y accesibilidad**

- [ ] A 1440 px el canvas llena el marco CRT con proporción 4:3 y sin deformarse.
- [ ] A 390 px el canvas se escala, no hay scroll horizontal y el HUD no se rompe.
- [ ] El canvas tiene `role="img"` y un `aria-label` descriptivo.
- [ ] Con `prefers-reduced-motion: reduce` el juego no arranca solo y espera a REANUDAR.

---

## Decisiones tomadas y descartadas

- **Sí:** crear el registro y el contrato en este spec (pasos 1 a 6) antes de portar Tetris. SPEC 04 lo aplazó explícitamente hasta el segundo juego. **No:** copiar el patrón `id === "caida"` en el reproductor: dos `if` por juego no escalan a Arkanoid.
- **Sí:** migrar `rocas` al registro sin cambios visibles y en pasos pequeños. **No:** dejar `rocas` con el cableado antiguo y `caida` con el nuevo: dos caminos paralelos en el reproductor.
- **Sí:** tipos compartidos en `lib/games/types.ts`. **No:** definirlos en `registry.ts`, que importaría los motores y crearía dependencias circulares con ellos.
- **Sí:** reemplazar la demo `caida` (PUZZLE, `cover-tetro`, magenta, posición 2) y mantener su `id`. **No:** entrada nueva `tetris`: duplicaría el juego, subiría a 9 tarjetas y rompería el criterio de 8 de SPEC 01. Cambiar el `id` tampoco es posible sin romper la clave foránea de `scores`.
- **Sí:** conservar los textos `short` y `long` de `caida`; ya describen Tetris y «cada 10 líneas» coincide con las reglas. **No:** reescribirlos.
- **Sí:** `max_score = 500 000`, calculado con las reglas (ver Modelo de datos). **No:** el defecto de 1 000 000, sin base, ni 250 000, que podría rechazar una partida maratón legítima.
- **Sí:** canvas 800×600 con tablero centrado y NEXT dibujado dentro. Reutiliza el escalado 4:3 existente sin tocar el CSS del marco. **No:** canvas 300×600 con regla 1:2 nueva: deja mucho margen vacío y el NEXT hay que dibujarlo en el canvas igualmente, porque el contrato solo prevé un canvas.
- **Sí:** conservar la pieza N (8 piezas equiprobables). **No:** quitarla para parecerse al Tetris clásico: es una regla del `game.js` y el spec no cambia reglas.
- **Sí:** repetición de teclas propia del motor (0,17 s y 0,05 s) acumulando `dt`. Es determinista y no depende de la configuración del sistema operativo. **No:** confiar en los `keydown` repetidos del navegador: el contrato `setKey(code, down)` y el flanco no los distinguen, y mantener `Espacio` rotaría o caería varias veces. **No:** una acción por pulsación: injugable. Es el único ajuste de sensación respecto al original y no cambia puntos ni velocidad de caída.
- **Sí:** HUD con PUNTOS, LÍNEAS y NIVEL, sin vidas, y sin atajo `P` (la pausa es el botón PAUSA). **No:** añadir `P` al reproductor, que supondría un cambio del contrato.
- **Sí:** aspecto del original sobre fondo oscuro, con valores fijos del tema oscuro. **No:** recolorear con la paleta neón, para no mezclar portado y rediseño. **No:** tema claro ni `localStorage`: el canvas no lee CSS del documento.
- **Sí:** sin sonido ni assets (el original no tiene). **No:** añadir audio ahora.
- **Sí:** el motor acumula `dt` en segundos y respeta `dt ≤ 0.05`. **No:** usar `performance.now()` dentro del motor como el original.
- **Sí:** verificación con `build`, `lint`, partida manual en el navegador, consulta SQL y revisión visual. **No:** añadir un test runner.

---

## Riesgos identificados

| Riesgo                                                                                    | Mitigación                                                                                                                                   |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Migrar `rocas` al registro cambia su HUD, pie o comportamiento sin querer                 | Pasos 2 a 6 pequeños, con verificación manual de `rocas` y de una demo tras cada uno; criterios de aceptación específicos.                   |
| Strict Mode monta el efecto dos veces y duplica bucles o listeners                        | `GameCanvas` conserva la limpieza completa de `asteroids-canvas.tsx`; criterio de «sin listeners tras desmontar».                            |
| `cacheComponents` conserva la página oculta y el estado de React sobrevive al navegar     | El reproductor restablece su estado al desmontar el efecto, ahora con `Run` genérico; criterio de «empieza de cero al volver».               |
| Pasar de `level`/`lives` sueltos a `hud` genérico rompe el reset de `rocas` o el modal    | El reseteo del paso 5 usa el `hud` inicial de la definición; criterio de «JUGAR DE NUEVO» en ambos juegos.                                   |
| Con el original, mantener `↓` sobre el suelo bloquea piezas en cadena                     | Comportamiento heredado del original (autorepetición del navegador); la cadencia de 0,05 s se acerca a la del sistema. Se valida en partida. |
| La repetición propia se siente distinta a la del navegador                                | Constantes `REPEAT_DELAY` y `REPEAT_INTERVAL` al principio del motor, ajustables sin tocar reglas.                                           |
| Soltar una tecla mientras está en pausa deja la repetición activa al reanudar             | `GameCanvas` libera todas las teclas al pausar (`setKey(code, false)`); el motor reinicia sus contadores de repetición en `keyup`.           |
| Escalar el canvas por CSS desenfoca la rejilla de 0,5 px                                  | Validar visualmente a 1440 px y 390 px; evaluar `devicePixelRatio` solo si se ve borroso.                                                    |
| Las flechas o el espacio hacen scroll o activan un botón enfocado tras pulsar PAUSA       | `preventDefault` en las 6 teclas del juego mientras no esté en pausa; quitar el foco de los botones tras pulsarlos.                          |
| En móvil no hay teclado y el juego no es jugable                                          | Aceptado: fuera de alcance; el pie CRT muestra los controles de teclado.                                                                     |
| `max_score` demasiado bajo rechaza una partida legítima o demasiado alto no frena nada    | Calculado con las reglas (506 000 hasta el nivel 22) y ajustable por una migración posterior.                                                |
| Un usuario autenticado llama a `submitScore` con una marca falsa dentro del tope          | Aceptado en el MVP: `ranked` y `max_score` limitan el daño. Anticheat real, en otro spec.                                                    |
| La migración cambia el `id` de la demo y rompe la clave foránea de `scores`               | La migración es solo un `update` por `id = 'caida'` y no toca el `id`.                                                                       |
| Hay marcas previas de `caida` en `scores` de pruebas anteriores que contaminan el ranking | Antes del paso 11 se comprueba con `select count(*) from public.scores where game_id = 'caida'`; debe ser 0, ya que la demo no guardaba.     |

---

## Qué **no** está en este spec

- Tema claro/oscuro, atajo `P`, sonido o música.
- Recoloreado con la paleta neón de la marca.
- Cambios de reglas o de balance (bolsa de 7 piezas, _hold_, SRS, _lock delay_).
- Controles táctiles o gamepad.
- Anticheat avanzado, rate limit o ranking en el detalle del juego.
- Cambio de textos o de portada de `caida` en el catálogo.
- Portado de Arkanoid y de los demás juegos demo.
- Tests automatizados.
- Internacionalización.

Cada uno de ellos, si se aborda, va en su propio spec.
