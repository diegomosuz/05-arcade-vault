# SPEC 09 — Juego Serpentina (Snake) con puntuaciones y leaderboard

> **Estado:** Borrador
> **Depende de:** SPEC 04, SPEC 06, SPEC 07
> **Fecha:** 2026-10-20
> **Objetivo:** Crear en TypeScript el juego Snake (sin código de referencia, con las frutas de `references/sources-assets/snake-assets`), jugarlo en `/juegos/serpentina/jugar` dentro del marco CRT y darlo de alta como juego `ranked` con puntuaciones reales en el Salón de la Fama.

---

## Por qué existe este spec

SPEC 07 creó el contrato (`lib/games/types.ts`), el registro (`lib/games/registry.ts`) y `components/games/game-canvas.tsx`. SPEC 08 añadió Arkanoid sin tocar el contrato. Serpentina es el cuarto juego real y el primero sin código de referencia: las reglas salen de las decisiones de este spec, no de un `game.js`.

SPEC 06 dejó genéricos `submitScore`, `games`, `scores`, `leaderboard` y `/salon`. La demo `serpentina` ya existe en el catálogo (ARCADE, `cover-snake`, verde, posición 3, `ranked = false`) y este spec la convierte en juego real.

Las frutas vienen de un spritesheet (`fruits.png`, 3790×442 px, tres filas: vectorial, pixel art y realista). `sprites.js` recorta la fila del medio (pixel art, `y = 136…295`, 22 frutas). El contrato actual prohíbe `Image` dentro del motor, así que este spec añade una extensión mínima y opcional: la definición declara URLs de imágenes, `GameCanvas` las precarga y las pasa al motor ya cargadas. Los juegos que no declaran imágenes no cambian.

`references/` es solo lectura. El PNG se copia a `public/` y `sprites.js` solo se usa como fuente de las coordenadas.

---

## Alcance

**Dentro:**

- Extensión opcional del contrato: `assets` en `GameDefinition` y parámetro `assets` en `create`, más la precarga en `GameCanvas` (solo cuando la definición declara `assets`).
- `public/games/snake/fruits.png`: copia del spritesheet de `references/sources-assets/snake-assets/fruits.png`.
- Motor `lib/games/snake/engine.ts`:
  - Canvas 800×600. Rejilla de 20 columnas × 15 filas con celdas de 40 px.
  - La serpiente empieza con 3 segmentos en la fila 7, con la cabeza en la columna 10, moviéndose a la derecha sin pulsar tecla.
  - Avanza una celda por paso con un intervalo que depende del nivel.
  - Controles: `↑ ↓ ← →` y `W A S D`. Giros por flanco, cola de hasta 2 giros pendientes y sin giro de 180°.
  - Una fruta a la vez en una celda libre al azar, con uno de los 22 sprites de la fila pixel art. Comerla suma 10 puntos y alarga la serpiente 1 segmento.
  - Nivel = `floor(frutas / 5) + 1`. Intervalo de paso `max(0.06, 0.18 − (nivel − 1) × 0.015)` segundos.
  - Fin de partida al salir del tablero, al chocar con el propio cuerpo o al llenar las 300 celdas. Sin vidas.
- Aspecto: fondo `#0a0a12` con rejilla tenue, serpiente con segmentos de esquinas redondeadas en verde neón (`#00ff88`) con ojos en la cabeza, y frutas dibujadas con el sprite. Sin HUD ni «GAME OVER» dibujados en el canvas.
- Registro de `serpentina` en `lib/games/registry.ts` con HUD de PUNTOS, LONGITUD y NIVEL.
- Migración `supabase/migrations/005_juego_serpentina.sql`: `serpentina` pasa a `ranked = true` y `max_score = 2970`, con `title`, `short`, `long`, `cover`, `color` y `position` sin cambios.
- Pie del marco CRT con los controles.
- Pausa automática, `prefers-reduced-motion` y limpieza al desmontar, heredados de `GameCanvas` y del reproductor.

**Fuera de alcance (para specs futuros):**

- Sonido y música.
- Frutas bonus, obstáculos, modo con paredes que atraviesan, vidas y cualquier variante de reglas.
- Las otras dos filas del spritesheet (vectorial y realista) y selección de tema de frutas.
- Recortes del spritesheet para la cabeza, el cuerpo o la cola de la serpiente.
- Cambiar el texto del catálogo (`long` menciona «núcleos magenta») o la portada `cover-snake`.
- Atajo `P` o `Escape` para pausar: la pausa es el botón PAUSA existente.
- Controles táctiles o gamepad.
- Anticheat avanzado, rate limit o ranking en el detalle del juego.
- Portar los demás juegos demo.
- Tests automatizados (no hay test runner configurado).
- Internacionalización: solo español.

---

## Modelo de datos

Extensión del contrato (`lib/games/types.ts`). Es retrocompatible: `createAsteroids`, `createTetris` y `createArkanoid` no declaran parámetros y siguen siendo asignables.

```ts
// lib/games/types.ts
export type GameAssets = Record<string, HTMLImageElement>; // solo las que cargaron

export type GameDefinition = {
  // …campos actuales…
  assets?: Record<string, string>; // nombre → URL bajo /public, p. ej. { fruits: "/games/snake/fruits.png" }
  create: (assets: GameAssets) => GameEngine;
};
```

Entrada de registro (nueva):

```ts
// lib/games/registry.ts
serpentina: {
  id: "serpentina",
  width: 800,
  height: 600,
  keys: [
    "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
    "KeyW", "KeyA", "KeyS", "KeyD",
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
```

Motor de Snake (estructuras e hitos, no código completo):

```ts
// lib/games/snake/engine.ts
export const WIDTH = 800;
export const HEIGHT = 600;

const COLS = 20;
const ROWS = 15;
const CELL = 40;
const START_LENGTH = 3;
const FRUIT_SCORE = 10;
const FRUITS_PER_LEVEL = 5;
const STEP_BASE = 0.18; // s por paso en el nivel 1
const STEP_DECREMENT = 0.015; // s menos por nivel
const STEP_MIN = 0.06; // se alcanza en el nivel 9
const MAX_QUEUED_TURNS = 2;

type Dir = { dx: number; dy: number };
type Cell = { col: number; row: number };

// Recortes de la fila pixel art de fruits.png, copiados de sprites.js (y = 136, h = 160).
const FRUITS: { name: string; x: number; y: number; w: number; h: number }[] = [
  { name: "banana", x: 34, y: 136, w: 110, h: 160 },
  /* …las 22 frutas de sprites.js, mismas coordenadas… */
];

export function createSnake(assets: GameAssets): GameEngine; // snapshot().hud = { length, level }
```

Convenciones:

- Archivos nuevos: `lib/games/snake/engine.ts`, `public/games/snake/fruits.png`, `supabase/migrations/005_juego_serpentina.sql`. Archivos modificados: `lib/games/types.ts`, `components/games/game-canvas.tsx`, `lib/games/registry.ts`.
- Carpeta del motor `snake`, id de base de datos `serpentina`: el id ya existe y `scores.game_id` lo referencia.
- Se conservan los nombres de las 22 frutas de `sprites.js` (`banana`, `orange`, `grape`, …, `melon`) para cotejar.
- La serpiente es un array de `Cell` con la cabeza en la posición 0. Posición inicial: cabeza en `{ col: 10, row: 7 }`, cuerpo en `{ 9, 7 }` y `{ 8, 7 }`, dirección `{ dx: 1, dy: 0 }`.
- El motor acumula `dt` en segundos (`stepAccum`) y avanza un paso cuando supera el intervalo del nivel. Como `dt ≤ 0.05` y el intervalo mínimo es 0,06 s, hay como máximo un paso por fotograma.
- Moverse a la celda que la cola va a abandonar es legal si no se come en ese paso; moverse a cualquier otra celda del cuerpo termina la partida.
- Las teclas se procesan por flanco en `setKey(code, true)`: cada pulsación añade un giro a la cola (máximo 2). Un giro se descarta si es igual o contrario a la última dirección, ya sea la actual o la última encolada. Mantener la tecla no repite.
- Al comer, se genera la fruta siguiente en una celda libre al azar con un sprite al azar. Si no queda ninguna celda libre (300 celdas ocupadas), el estado pasa a `gameover`.
- Los sprites se dibujan con `drawImage` a una altura de 36 px, conservando la proporción (`escala = 36 / 160`), centrados en su celda. Si `assets.fruits` no existe, se dibuja un círculo `#ff4d6d` de 28 px.
- Al terminar, `draw` sigue pintando el último fotograma; `update` y `setKey` dejan de actuar.
- Dos estados del snapshot: `playing` y `gameover`. No se usa `dead`.
- `Math.random` solo dentro de `createSnake()`, `reset()` y `update()`.
- La migración no cambia el esquema: no hay que regenerar `lib/supabase/database.types.ts`.

```sql
-- supabase/migrations/005_juego_serpentina.sql
-- SPEC 09: SERPENTINA (Snake) pasa de demo a juego real con puntuaciones.
update public.games
set ranked = true,
    max_score = 2970
where id = 'serpentina';
```

Cálculo de `max_score = 2970`: la rejilla tiene 300 celdas y la serpiente empieza con 3, así que caben 297 frutas de 10 puntos. Es el techo exacto de una partida perfecta; cualquier marca superior es imposible. Si una migración futura cambia la rejilla o los puntos, `max_score` se ajusta en esa misma migración.

---

## Plan de implementación

Antes del paso 1, leer en `node_modules/next/dist/docs/` la guía de App Router sobre Client Components y `cacheComponents`. Next.js 16.4 y React 19.3 tienen cambios incompatibles con versiones anteriores. Este spec no cambia la interfaz más allá del canvas y del pie CRT; cualquier ajuste visible se hace con `/frontend-design`, según `CLAUDE.md`. Cada paso se commitea solo.

1. **Contrato con assets.** En `lib/games/types.ts`, añadir `GameAssets`, el campo opcional `assets` y el parámetro de `create`. Verificación: `npm run build` y `npm run lint` pasan sin tocar los motores existentes.
2. **Precarga en `GameCanvas`.** Si `def.assets` existe, cargar cada URL con `Image` dentro del efecto de la partida, esperar a que todas terminen (con `allSettled`: una que falle se omite) y crear el motor con las que cargaron; con una bandera de cancelación en la limpieza para Strict Mode. Sin `def.assets`, el flujo actual no cambia. Verificación: `build` y `lint` pasan; `/juegos/rocas/jugar` y `/juegos/bloque-buster/jugar` se juegan igual.
3. **Asset.** Copiar `references/sources-assets/snake-assets/fruits.png` a `public/games/snake/fruits.png` sin modificar `references/`. Verificación: `/games/snake/fruits.png` responde 200 en `npm run dev`.
4. **Motor: estado y snapshot.** Crear `lib/games/snake/engine.ts` con constantes, `FRUITS`, el tipo `Cell`, `createSnake(assets)`, la serpiente inicial, la fruta inicial, `snapshot()` (`score`, `status`, `hud: { length, level }`) y `reset()`. `update`, `draw` y `setKey` quedan como esqueletos vacíos. Verificación: `build` y `lint` pasan.
5. **Motor: teclas y giros.** Implementar `setKey` con flanco, el mapa de las 8 teclas a direcciones, la cola de 2 giros y el descarte de giros iguales o contrarios. Verificación: `build` y `lint` pasan.
6. **Motor: avance, fruta y fin.** Implementar `update(dt)` con `stepAccum` e intervalo por nivel, el paso de la serpiente, comer (+10, crecer, nueva fruta), el cálculo de nivel y los tres finales (pared, cuerpo, tablero lleno). Verificación: `build` y `lint` pasan.
7. **Motor: dibujo.** Añadir `draw(ctx)`: fondo, rejilla tenue, fruta con sprite (o círculo de respaldo), segmentos redondeados en `#00ff88` con la cabeza más clara y ojos, sin HUD ni textos. Verificación: `build` y `lint` pasan.
8. **Registrar `serpentina`.** Añadir la entrada a `GAME_REGISTRY` con `assets` y `create: createSnake`. Verificación: `/juegos/serpentina/jugar` ya se juega con el HUD PUNTOS/LONGITUD/NIVEL y las frutas con sprite; el modal todavía avisa de demo porque `ranked` sigue en `false`; `rocas`, `caida` y `bloque-buster` siguen igual.
9. **Migración.** Comprobar con `select count(*) from public.scores where game_id = 'serpentina'` que devuelve 0, crear `supabase/migrations/005_juego_serpentina.sql` y aplicarla con `apply_migration`. Verificación: `select id, ranked, max_score from public.games where id = 'serpentina'` devuelve `true` y `2970`; `get_advisors` de seguridad sin avisos nuevos; un `insert` en `scores` con la clave publishable falla.
10. **Pie CRT, escalado y movimiento reducido.** Comprobar el pie «← ↑ ↓ → / WASD MOVER LA SERPIENTE», el escalado del canvas 800×600 con la clase existente a 1440 px y a 390 px, la nitidez de los sprites reducidos y el arranque en pausa con `prefers-reduced-motion`. Si hace falta algún ajuste, solo reglas nuevas en `app/globals.css`. Verificación: sin scroll horizontal y sprites legibles.
11. **Verificación del guardado.** Con sesión iniciada, jugar una partida real de `serpentina`, guardar la puntuación, comprobar la fila en `scores` con `execute_sql` (solo `select`) y verla en la pestaña SERPENTINA de `/salon` tras recargar. Verificación: la marca coincide con la del modal.

---

## Criterios de aceptación

**Globales**

- [ ] `npm run build` termina sin errores ni errores de tipos.
- [ ] `npm run lint` termina sin errores.
- [ ] No hay errores ni advertencias de hidratación ni de React Strict Mode en la consola de `/juegos/serpentina/jugar`.
- [ ] `references/` queda intacto.
- [ ] No se modifica ninguna clase existente de `app/globals.css`; solo se añaden reglas nuevas, si hace falta alguna.
- [ ] Las pantallas de los specs anteriores se ven igual salvo lo que este spec cambia.

**Contrato y assets**

- [ ] `GameDefinition.assets` es opcional y `rocas`, `caida` y `bloque-buster` no lo declaran ni cambian de comportamiento.
- [ ] `GameCanvas` no crea el motor de `serpentina` hasta que la imagen terminó de cargar o falló.
- [ ] Si `fruits.png` no carga, el juego sigue siendo jugable con círculos `#ff4d6d` como frutas.
- [ ] Con Strict Mode no queda ningún motor ni bucle duplicado tras el doble montaje del efecto.
- [ ] `lib/games/snake/engine.ts` no contiene `Image`, `Audio`, `window`, `document` ni `requestAnimationFrame`.

**Juego**

- [ ] La serpiente empieza con 3 segmentos, cabeza en la columna 10 y fila 7, moviéndose a la derecha sin pulsar ninguna tecla.
- [ ] `↑ ↓ ← →` y `W A S D` giran la serpiente y las flechas no hacen scroll de la página mientras se juega.
- [ ] Un giro de 180° (p. ej. `←` yendo a la derecha) no tiene efecto.
- [ ] Pulsar dos giros dentro del mismo paso ejecuta ambos en pasos consecutivos y un tercero se descarta.
- [ ] Mantener una tecla no repite el giro.
- [ ] Comer una fruta suma exactamente 10 puntos y alarga la serpiente en 1 segmento.
- [ ] La fruta aparece siempre en una celda libre, nunca sobre la serpiente.
- [ ] Las frutas se muestran con los sprites de la fila pixel art y varían entre sí.
- [ ] El nivel sube cada 5 frutas (`floor(frutas / 5) + 1`) y el intervalo de paso es 0,18 s en el nivel 1, 0,165 s en el nivel 2 y 0,06 s desde el nivel 9.
- [ ] Salir del tablero por cualquier borde abre el modal «FIN DEL JUEGO» con la puntuación final real.
- [ ] Chocar con el propio cuerpo abre el modal «FIN DEL JUEGO», y moverse a la celda que la cola abandona no lo abre.
- [ ] Llenar las 300 celdas abre el modal «FIN DEL JUEGO» con 2 970 puntos.
- [ ] El canvas no dibuja marcador, longitud, nivel ni textos («GAME OVER», «PAUSA»); solo rejilla, serpiente y fruta.
- [ ] `P` y `Escape` no hacen nada.

**Integración con el reproductor**

- [ ] El HUD muestra jugador, PUNTOS (`es-ES`), LONGITUD y NIVEL reales, actualizados al instante, y no muestra vidas.
- [ ] PAUSA congela el juego (la serpiente no avanza) y REANUDAR lo continúa sin saltos.
- [ ] FIN abre el modal con la puntuación actual.
- [ ] «JUGAR DE NUEVO» reinicia con 0 puntos, longitud 3, nivel 1, serpiente inicial y fruta nueva.
- [ ] SALIR y «VOLVER AL VAULT» navegan correctamente; al volver, la partida empieza de cero sin bucles ni listeners duplicados.
- [ ] Cambiar de pestaña o perder el foco de la ventana pausa el juego.
- [ ] El pie del marco CRT muestra «← ↑ ↓ → / WASD MOVER LA SERPIENTE».
- [ ] `/juegos/rocas/jugar`, `/juegos/caida/jugar`, `/juegos/bloque-buster/jugar` y las demás demos siguen igual que antes.

**Rendimiento y limpieza**

- [ ] Al desmontar se cancela el `requestAnimationFrame` y se retiran los listeners (tras navegar fuera, pulsar teclas no ejecuta código del juego).
- [ ] Con la pestaña oculta o en pausa no hay trabajo de simulación.
- [ ] Una partida de 2 minutos no muestra crecimiento sostenido de memoria; la serpiente es un array acotado a 300 celdas y la imagen se carga una sola vez por montaje.

**Base de datos y catálogo**

- [ ] `supabase/migrations/005_juego_serpentina.sql` existe y coincide con lo aplicado.
- [ ] `games` tiene `ranked = true` y `max_score = 2970` para `serpentina`; el resto de filas y los campos `title`, `short`, `long`, `cover`, `color` y `position` de `serpentina` no cambian.
- [ ] `get_advisors` de seguridad no reporta avisos nuevos.
- [ ] Un `insert` en `scores` con la clave publishable falla, incluso con sesión iniciada.
- [ ] `/` y `/biblioteca` muestran los mismos 8 juegos con el mismo texto y la misma portada `cover-snake` para SERPENTINA.
- [ ] `/juegos/serpentina` y `/juegos/serpentina/jugar` cargan; un id inexistente muestra la página de no encontrado.

**Guardado y leaderboard**

- [ ] Con sesión iniciada, al terminar `serpentina` el modal muestra el `username` real y «GUARDAR PUNTUACIÓN» inserta una fila en `scores` con `game_id = 'serpentina'`, el `user_id` del usuario y la puntuación mostrada.
- [ ] Pulsar «GUARDAR PUNTUACIÓN» dos veces rápido inserta una sola fila.
- [ ] Sin sesión, el modal muestra «INICIA SESIÓN PARA GUARDAR TU PUNTUACIÓN» con enlace a `/acceso` y sin botón de guardar.
- [ ] `submitScore('serpentina', 2971)` devuelve `invalid` y no inserta.
- [ ] Tras guardar, la marca aparece en la pestaña SERPENTINA de `/salon` al recargar, una sola fila por jugador (la mejor).
- [ ] La tarjeta y el detalle de SERPENTINA muestran la mejor marca y el número de partidas reales.
- [ ] El modal de `serpentina` ya no muestra el aviso «ESTE JUEGO ES UNA DEMO».

**Responsive y accesibilidad**

- [ ] A 1440 px el canvas llena el marco CRT con proporción 4:3 y sin deformarse.
- [ ] A 390 px el canvas se escala, no hay scroll horizontal, el HUD no se rompe y las frutas siguen distinguibles.
- [ ] El canvas tiene `role="img"` y un `aria-label` descriptivo.
- [ ] Con `prefers-reduced-motion: reduce` el juego no arranca solo y espera a REANUDAR.

---

## Decisiones tomadas y descartadas

- **Sí:** reemplazar la demo `serpentina` y mantener su `id`, su portada `cover-snake`, el color verde y la posición 3. **No:** entrada nueva `snake`: subiría a 9 tarjetas, rompería el criterio de 8 de SPEC 01 y exigiría portada nueva. **No:** reemplazar `gloton`: no es Snake.
- **Sí:** reglas clásicas, sin vidas: paredes y cuerpo matan, +10 por fruta, crece 1. **No:** paredes que atraviesan ni 3 vidas: son variantes y cambian el techo de puntos.
- **Sí:** la serpiente arranca en movimiento hacia la derecha sin tecla, como Arkanoid lanza la bola. **No:** esperar una primera tecla: el contrato no tiene estado «listo» y añadiría un cuarto estado al snapshot. Con `prefers-reduced-motion` el jugador ya espera a REANUDAR.
- **Sí:** ampliar el contrato con `assets` opcional, precargados por `GameCanvas`. Mantiene al motor libre de `Image` y no afecta a los otros juegos. **No:** formas dibujadas con sprites en otro spec: el usuario aportó los sprites para este juego. **No:** cargar la imagen dentro del motor o por closure desde el registro: rompe el contrato y dificulta la limpieza y la verificación.
- **Sí:** copiar el PNG a `public/games/snake/`. **No:** importarlo desde `references/`: es de solo lectura y no se sirve en producción.
- **Sí:** usar solo la fila pixel art (22 frutas, coordenadas de `sprites.js`) y elegir una al azar en cada aparición, siempre de 10 puntos. **No:** fruta distinta por nivel ni fruta bonus: lo segundo es un cambio de reglas y va en otro spec.
- **Sí:** nivel cada 5 frutas con paso de 0,18 s a 0,06 s (−0,015 s por nivel). **No:** velocidad constante (el HUD de nivel no tendría sentido) ni una curva más agresiva (partidas demasiado cortas).
- **Sí:** flechas y WASD con giros por flanco, cola de 2 giros y sin 180°. **No:** solo la última tecla pulsada por paso: perdería giros rápidos y haría perder partidas sin culpa del jugador.
- **Sí:** permitir moverse a la celda que la cola abandona. **No:** tratarla como colisión: es la regla clásica y evita muertes injustas al enrollarse.
- **Sí:** `max_score = 2970`, calculado con las reglas (297 frutas × 10). **No:** el defecto de 1 000 000, sin base.
- **Sí:** HUD con PUNTOS, LONGITUD y NIVEL, sin vidas y sin atajo `P`. **No:** mostrar frutas comidas, que ya se deduce de la longitud.
- **Sí:** aspecto neón sobre fondo oscuro, con `#00ff88` (el verde de la marca). **No:** sprites para la serpiente ni sonido: no hay assets y se dejan para otro spec.
- **Sí:** conservar los textos `short` y `long` de `serpentina` aunque `long` hable de «núcleos magenta». **No:** reescribirlos sin que el usuario lo confirme; queda anotado como pendiente de revisión humana.
- **Sí:** el motor acumula `dt` en segundos y respeta `dt ≤ 0.05`. **No:** `setInterval` ni `performance.now()` dentro del motor.
- **Sí:** verificación con `build`, `lint`, partida manual en el navegador, consulta SQL y revisión visual. **No:** añadir un test runner.

---

## Riesgos identificados

| Riesgo                                                                                       | Mitigación                                                                                                                                   |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Cambiar `GameCanvas` rompe `rocas`, `caida` o `bloque-buster`                                | La rama asíncrona solo se activa con `def.assets`; los pasos 1 y 2 se verifican jugando los tres juegos antes de seguir.                     |
| Strict Mode monta el efecto dos veces y la carga asíncrona crea dos motores o listeners      | Bandera de cancelación en la limpieza: un efecto cancelado no crea motor ni registra listeners; criterio de «sin duplicados».                |
| Los listeners de teclado se registran antes de que exista el motor                           | Registrar `keydown`/`keyup` después de crear el motor, dentro del mismo callback de la carga.                                                |
| La imagen tarda o falla y el canvas queda en blanco                                          | Si falla, el motor se crea igual con círculos de respaldo; mientras carga, el canvas muestra el fondo del marco. Se valida con la red lenta. |
| `fruits.png` pesa y retrasa el arranque (3790×442 px)                                        | Se carga una sola vez por montaje y la caché del navegador la reutiliza; si se nota lento, recortar la fila en un spec posterior.            |
| Reducir sprites de 160 px a 36 px por CSS y `drawImage` los desenfoca o los hace irregulares | Validar visualmente a 1440 y 390 px; ajustar `imageSmoothingQuality` solo si se ve mal.                                                      |
| Strict Mode o `cacheComponents` conservan la página oculta y el estado sobrevive al navegar  | El reproductor restablece su estado al desmontar; criterio de «empieza de cero al volver».                                                   |
| `onChange` en cada frame provoca 60 renders por segundo                                      | `GameCanvas` compara el snapshot anterior y notifica solo si cambia (al comer, no en cada paso).                                             |
| Las flechas o `W A S D` hacen scroll o activan un botón enfocado tras pulsar PAUSA           | `preventDefault` en las 8 teclas mientras no esté en pausa; quitar el foco de los botones tras pulsarlos.                                    |
| Dos giros rápidos en el mismo paso provocan un 180° involuntario y muerte                    | La comprobación de 180° se hace contra el último giro encolado, no contra la dirección actual; criterio explícito.                           |
| La serpiente sale en movimiento sin tecla y el jugador no está listo                         | Decisión explícita; el primer paso ocurre tras 0,18 s y `prefers-reduced-motion` espera a REANUDAR. Un estado «listo» iría en otro spec.     |
| Generar la fruta en una celda libre tarda con el tablero casi lleno                          | Elegir al azar entre la lista de celdas libres (máximo 300 entradas), no por reintentos.                                                     |
| `max_score` demasiado bajo rechaza una partida legítima                                      | Calculado con las reglas (297 × 10 = 2 970, el máximo exacto); se reajusta en la migración que cambie la rejilla o los puntos.               |
| Un usuario autenticado llama a `submitScore` con una marca falsa dentro del tope             | Aceptado en el MVP: `ranked` y `max_score` limitan el daño (aquí 2 970). Anticheat real, en otro spec.                                       |
| La migración cambia el `id` de la demo y rompe la clave foránea de `scores`                  | La migración es solo un `update` por `id = 'serpentina'` y no toca el `id`.                                                                  |
| Hay marcas previas de `serpentina` en `scores` que contaminan el ranking                     | Antes del paso 9 se comprueba `select count(*) from public.scores where game_id = 'serpentina'`; debe ser 0, ya que la demo no guardaba.     |
| El texto `long` del catálogo habla de «núcleos magenta» y el juego usa frutas                | Aceptado de forma explícita; queda fuera de alcance y se anota para revisión humana en un spec de textos.                                    |
| En móvil no hay teclado y el juego no es jugable                                             | Aceptado: fuera de alcance; el pie CRT muestra los controles de teclado.                                                                     |

---

## Qué **no** está en este spec

- Sonido o música.
- Frutas bonus, obstáculos, vidas, paredes que atraviesan u otras variantes de reglas.
- Las filas vectorial y realista del spritesheet y sprites para la serpiente.
- Estado «listo» antes de arrancar o atajos `P` y `Escape`.
- Cambio de textos o de portada de `serpentina` en el catálogo.
- Controles táctiles o gamepad.
- Anticheat avanzado, rate limit o ranking en el detalle del juego.
- Portado de los demás juegos demo.
- Tests automatizados.
- Internacionalización.

Cada uno de ellos, si se aborda, va en su propio spec.
