# SPEC 08 — Juego Arkanoid con puntuaciones y leaderboard

> **Estado:** Implementado
> **Depende de:** SPEC 04, SPEC 06, SPEC 07
> **Fecha:** 2026-10-20
> **Objetivo:** Portar a TypeScript el motor de `references/started-games/04-arkanoid` con formas dibujadas en lugar de sprites, jugarlo en `/juegos/bloque-buster/jugar` dentro del marco CRT y darlo de alta como juego `ranked` con puntuaciones reales en el Salón de la Fama.

---

## Por qué existe este spec

SPEC 07 creó el contrato (`lib/games/types.ts`), el registro (`lib/games/registry.ts`) y el componente genérico `components/games/game-canvas.tsx`. Arkanoid es el tercer juego real y el primero que se añade solo con motor, registro y una migración de datos, sin tocar el reproductor.

SPEC 06 dejó genéricos `submitScore`, `games`, `scores`, `leaderboard` y `/salon`. La demo `bloque-buster` ya existe en el catálogo (ARCADE, `cover-bricks`, cyan, posición 1, `ranked = false`) y este spec la convierte en juego real.

El `game.js` original usa variables globales, `document.getElementById`, un `document.addEventListener` sin limpieza, listeners de `click` y `mousemove` en el canvas, su propio `requestAnimationFrame` y `new Audio(...)`. Tampoco puede incrustarse tal cual en React, por eso se porta.

El juego original depende de un spritesheet, de animaciones de explosión y de dos mp3. El contrato prohíbe `Image` y `Audio` dentro del motor. Por eso este spec porta solo la jugabilidad y dibuja paleta, bola y bloques con rectángulos de color. Los sprites, las explosiones y el sonido van a un spec posterior.

El README del original dice que la paleta mide 162 px, pero el código la crea con `w: 81` y dibuja el sprite de 162 px a 81 px. Este spec sigue el código.

---

## Alcance

**Dentro:**

- Motor `lib/games/arkanoid/engine.ts` portado de `game.js` y `levels.js`:
  - Canvas 800×600. Paleta de 81×14 px en `y = 560`, centrada al empezar. Bola de 16×16 px.
  - La paleta se mueve a 400 px/s con `←` y `→`, limitada a `0…800 − 81`.
  - Cinco niveles con los patrones de `levels.js` (parrilla 10×6, pirámide, ajedrez, filas con huecos, marco con cruz) y velocidad de bola ×1,00 / 1,10 / 1,21 / 1,33 / 1,46 sobre `BASE_BALL_VX = 200` y `BASE_BALL_VY = -300`.
  - Rebotes en las paredes izquierda, derecha y superior, y en la paleta (solo si la bola baja, sin cambio de ángulo según el punto de impacto).
  - Colisión AABB con los bloques: se rompe un solo bloque por fotograma, suma 10 puntos e invierte `vy`.
  - Al romper el último bloque del nivel se carga el siguiente; al romper el último del nivel 5 la partida termina.
  - Tres vidas. Al caer la bola por el borde inferior se resta una vida y la bola vuelve sobre la paleta con la velocidad del nivel actual; con 0 vidas la partida termina.
  - La bola sale en movimiento al empezar, al reaparecer y al cambiar de nivel, sin tecla de lanzamiento, como el original.
- Aspecto sin sprites: fondo negro `#000`, bloques como rectángulos con los 7 nombres de color del original (`red`, `yellow`, `cyan`, `magenta`, `hotpink`, `green`, `gray`), paleta y bola lisas. Sin HUD, «GAME OVER», «¡Completaste el juego!» ni overlay de pausa dibujados en el canvas.
- Registro de `bloque-buster` en `lib/games/registry.ts` con HUD de puntuación, vidas (`hearts`) y nivel (`pad2`).
- Migración `supabase/migrations/004_juego_bloque_buster.sql`: `bloque-buster` pasa a `ranked = true` y `max_score = 2080`, con `title`, `short`, `long`, `cover`, `color` y `position` sin cambios.
- Pie del marco CRT con los controles de Arkanoid.
- Pausa automática, `prefers-reduced-motion` y limpieza al desmontar, heredados de `GameCanvas` y del reproductor.

**Fuera de alcance (para specs futuros):**

- Spritesheet `spritesheet-breakout.png`, animación de explosión de bloques y cualquier carga de imágenes.
- Sonido: `ball-bounce.mp3`, `break-sound.mp3` y música.
- Control con ratón (`mousemove`) y clic sobre el canvas.
- Atajos `P` y `Escape` y selector de nivel del overlay de pausa: la pausa es el botón PAUSA existente y saltar de nivel permitiría puntuar sin jugar.
- Ampliar el contrato con un estado `won` o con eventos de puntero.
- Recolorear con la paleta neón de la marca.
- Cambios de reglas o de balance (ángulo de rebote según el impacto, paleta de 162 px, bloques con varios golpes, power-ups, lanzamiento manual de la bola).
- Cambiar el texto del catálogo o la portada `cover-bricks` de `bloque-buster`.
- Controles táctiles o gamepad.
- Anticheat avanzado, rate limit o ranking en el detalle del juego.
- Portar los demás juegos demo.
- Tests automatizados (no hay test runner configurado).
- Internacionalización: solo español.

---

## Modelo de datos

El contrato compartido no cambia (`lib/games/types.ts` de SPEC 07). El snapshot de Arkanoid usa `hud: { lives, level }`.

Entrada de registro (nueva, junto a `rocas` y `caida`):

```ts
// lib/games/registry.ts
bloque-buster: {
  id: "bloque-buster",
  width: 800,
  height: 600,
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
```

Motor de Arkanoid (estructuras e hitos, no código completo):

```ts
// lib/games/arkanoid/engine.ts
export const WIDTH = 800;
export const HEIGHT = 600;

const PADDLE_SPEED = 400;
const BLOCK_COLS = 10;
const BLOCK_ROWS = 6;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCKS_ORIGIN_X = (WIDTH - BLOCK_COLS * BLOCK_W) / 2; // 80
const BLOCKS_ORIGIN_Y = 80;
const BASE_BALL_VX = 200;
const BASE_BALL_VY = -300;
const BLOCK_SCORE = 10;

type BlockColor =
  "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";

type Block = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  alive: boolean;
};

const LEVELS: {
  speed: number;
  blocks: { col: number; row: number; color: BlockColor }[];
}[] = [/* 5 niveles, generados con las mismas reglas que levels.js */];

export function createArkanoid(): GameEngine; // snapshot().hud = { lives, level }
```

Convenciones:

- Archivos nuevos: `lib/games/arkanoid/engine.ts` y `supabase/migrations/004_juego_bloque_buster.sql`. Archivo modificado: `lib/games/registry.ts`.
- Carpeta del motor `arkanoid`, id de base de datos `bloque-buster`: el id ya existe y `scores.game_id` lo referencia.
- Se conservan los nombres `PADDLE_SPEED`, `BLOCK_COLS`, `BLOCK_ROWS`, `BLOCK_W`, `BLOCK_H`, `BLOCKS_ORIGIN_X`, `BLOCKS_ORIGIN_Y`, `BASE_BALL_VX`, `BASE_BALL_VY`, `LEVELS`, `initPaddle`, `initBall`, `loadLevel` y `collideAABB` para cotejar con `game.js`.
- Coordenadas con origen arriba a la izquierda. Posiciones y velocidades en píxeles y píxeles por segundo, con `dt` en segundos (≤ 0.05).
- Posición inicial: paleta en `x = 359.5`, bola en `x = 392`, `y = 544` (sobre la paleta), con `vx = 200` y `vy = -300` en el nivel 1.
- Las dos funciones del original que preparan la bola (`initBall` y la parte final de `loadLevel`) hacen lo mismo; el motor las unifica en una sola.
- Cambiar de nivel recoloca la bola sobre la paleta con la velocidad del nivel nuevo y conserva puntos, vidas y la posición actual de la paleta. Perder una vida recoloca la bola con la velocidad del nivel actual y también conserva la posición de la paleta.
- Dos estados del snapshot: `playing` y `gameover`. Limpiar el nivel 5 pasa a `gameover` (decisión explícita; el original tiene un estado `win` que el contrato no prevé). El motor guarda un indicador interno `won` sin exponerlo.
- Al terminar, `draw` sigue pintando el último fotograma; `update` y `setKey` dejan de actuar.
- `←` y `→` se leen por estado (mantener mueve), sin flanco ni repetición propia: el original mueve la paleta mientras la tecla está pulsada. Si ambas están pulsadas, se cancelan.
- Colores de los bloques sin sprites (valores fijos): `red #ef4444`, `yellow #facc15`, `cyan #22d3ee`, `magenta #d946ef`, `hotpink #ff69b4`, `green #4ade80`, `gray #9ca3af`. Paleta `#e5e7eb`, bola `#ffffff`. Cada bloque lleva una franja superior más clara de 3 px.
- El motor no usa `Math.random` (el original es determinista).
- La migración no cambia el esquema: no hay que regenerar `lib/supabase/database.types.ts`.

```sql
-- supabase/migrations/004_juego_bloque_buster.sql
-- SPEC 08: BLOQUE BUSTER (Arkanoid) pasa de demo a juego real con puntuaciones.
update public.games
set ranked = true,
    max_score = 2080
where id = 'bloque-buster';
```

Cálculo de `max_score = 2080`: los niveles tienen 60, 40, 30, 39 y 39 bloques (208 en total) y cada bloque suma 10 puntos. Es el techo exacto de una partida perfecta, así que cualquier marca superior es imposible. Si una migración futura añade niveles o cambia los puntos, `max_score` se ajusta en esa misma migración.

---

## Plan de implementación

Antes del paso 1, leer en `node_modules/next/dist/docs/` la guía de App Router sobre Client Components y `cacheComponents`. Next.js 16.4 y React 19.3 tienen cambios incompatibles con versiones anteriores. Este spec no cambia la interfaz de usuario más allá del canvas y del pie CRT, y cualquier ajuste visible se hace con `/frontend-design`, según `CLAUDE.md`. Cada paso se commitea solo.

1. **Motor: estado, niveles y snapshot.** Crear `lib/games/arkanoid/engine.ts` con constantes, `LEVELS`, el tipo `Block`, `createArkanoid()`, `initPaddle`, `initBall`, `loadLevel`, `collideAABB`, `snapshot()` (`score`, `status`, `hud: { lives, level }`) y `reset()`. `update`, `draw` y `setKey` quedan como esqueletos vacíos. Verificación: `npm run build` y `npm run lint` pasan.
2. **Motor: paleta y teclas.** Implementar `setKey` para `ArrowLeft` y `ArrowRight` y el movimiento de la paleta en `update(dt)` con límites. Verificación: `build` y `lint` pasan.
3. **Motor: bola y paredes.** Añadir movimiento de la bola, rebotes en paredes y rebote en la paleta (solo con `vy > 0` y con la ventana de 8 px del original). Verificación: `build` y `lint` pasan.
4. **Motor: bloques, niveles y fin de partida.** Añadir la colisión con bloques (uno por fotograma, +10, inversión de `vy`), el avance de nivel, la pérdida de vida, `gameover` con 0 vidas y el paso a `gameover` al limpiar el nivel 5. Verificación: `build` y `lint` pasan.
5. **Motor: dibujo.** Añadir `draw(ctx)`: fondo negro, bloques vivos como rectángulos de color con franja superior, paleta y bola, sin HUD ni textos. Verificación: `build` y `lint` pasan.
6. **Registrar `bloque-buster`.** Añadir la entrada a `GAME_REGISTRY` con `create: createArkanoid`. Verificación: `/juegos/bloque-buster/jugar` ya se juega con el HUD de puntuación, vidas y nivel; el modal todavía avisa de demo porque `ranked` sigue en `false`; `/juegos/rocas/jugar` y `/juegos/caida/jugar` siguen igual.
7. **Migración.** Comprobar con `select count(*) from public.scores where game_id = 'bloque-buster'` que devuelve 0, crear `supabase/migrations/004_juego_bloque_buster.sql` y aplicarla con `apply_migration`. Verificación: `select id, ranked, max_score from public.games where id = 'bloque-buster'` devuelve `true` y `2080`; `get_advisors` de seguridad sin avisos nuevos; un `insert` en `scores` con la clave publishable falla.
8. **Pie CRT, escalado y movimiento reducido.** Comprobar el pie «← → MOVER LA PALETA», el escalado del canvas 800×600 con la clase existente a 1440 px y a 390 px, y el arranque en pausa con `prefers-reduced-motion`. Si hace falta algún ajuste, solo reglas nuevas en `app/globals.css`. Verificación: sin scroll horizontal y el canvas nítido.
9. **Verificación del guardado.** Con sesión iniciada, jugar una partida real de `bloque-buster`, guardar la puntuación, comprobar la fila en `scores` con `execute_sql` (solo `select`) y verla en la pestaña BLOQUE BUSTER de `/salon` tras recargar. Verificación: la marca coincide con la del modal.

---

## Criterios de aceptación

**Globales**

- [ ] `npm run build` termina sin errores ni errores de tipos.
- [ ] `npm run lint` termina sin errores.
- [ ] No hay errores ni advertencias de hidratación ni de React Strict Mode en la consola de `/juegos/bloque-buster/jugar`.
- [ ] `references/` queda intacto.
- [ ] No se modifica ninguna clase existente de `app/globals.css`; solo se añaden reglas nuevas, si hace falta alguna.
- [ ] Las pantallas de los specs anteriores se ven igual salvo lo que este spec cambia.

**Juego**

- [ ] `←` y `→` mueven la paleta mientras están pulsadas y la paleta no sale de `0…719` px.
- [ ] Pulsar `←` y `→` a la vez no mueve la paleta.
- [ ] Las flechas no hacen scroll de la página mientras se juega.
- [ ] La paleta mide 81 px de ancho y empieza centrada.
- [ ] La bola empieza sobre la paleta en movimiento (`vx = 200`, `vy = -300` en el nivel 1) sin pulsar ninguna tecla.
- [ ] La bola rebota en las paredes izquierda, derecha y superior.
- [ ] La bola rebota en la paleta solo cuando baja, y el ángulo de salida no depende del punto de impacto.
- [ ] Romper un bloque suma exactamente 10 puntos e invierte la velocidad vertical de la bola.
- [ ] Solo se rompe un bloque por fotograma.
- [ ] El nivel 1 tiene 60 bloques, el 2 tiene 40, el 3 tiene 30, el 4 tiene 39 y el 5 tiene 39, con los patrones y colores de `levels.js`.
- [ ] Al romper el último bloque de un nivel aparece el siguiente, con la bola sobre la paleta, y se conservan puntos y vidas.
- [ ] La velocidad de la bola es ×1,00, ×1,10, ×1,21, ×1,33 y ×1,46 en los niveles 1 a 5.
- [ ] Si la bola cae por el borde inferior se resta una vida y la bola vuelve sobre la paleta con la velocidad del nivel actual.
- [ ] Al perder la tercera vida se abre el modal «FIN DEL JUEGO» con la puntuación final real.
- [ ] Al romper el último bloque del nivel 5 se abre el modal «FIN DEL JUEGO» con la puntuación final real.
- [ ] El canvas no dibuja marcador, vidas, nivel ni textos («GAME OVER», «PAUSA», «¡Completaste el juego!»); solo bloques, paleta y bola.
- [ ] Los bloques se dibujan con el color de su nombre en `levels.js` y una franja superior más clara.
- [ ] El ratón no mueve la paleta y `P` y `Escape` no hacen nada.

**Integración con el reproductor**

- [ ] El HUD muestra jugador, puntuación (`es-ES`), vidas (♥) y nivel con dos dígitos, reales y actualizados al instante.
- [ ] PAUSA congela el juego (la bola y la paleta no se mueven) y REANUDAR lo continúa sin saltos.
- [ ] FIN abre el modal con la puntuación actual.
- [ ] «JUGAR DE NUEVO» reinicia con 0 puntos, 3 vidas, nivel 1, bloques completos y la bola sobre la paleta.
- [ ] SALIR y «VOLVER AL VAULT» navegan correctamente; al volver, la partida empieza de cero sin bucles ni listeners duplicados.
- [ ] Cambiar de pestaña o perder el foco de la ventana pausa el juego.
- [ ] El pie del marco CRT muestra «← → MOVER LA PALETA».
- [ ] `/juegos/rocas/jugar`, `/juegos/caida/jugar` y las demás demos siguen igual que antes.

**Rendimiento y limpieza**

- [ ] Al desmontar se cancela el `requestAnimationFrame` y se retiran los listeners (tras navegar fuera, pulsar teclas no ejecuta código del juego).
- [ ] Con la pestaña oculta o en pausa no hay trabajo de simulación.
- [ ] Una partida de 2 minutos no muestra crecimiento sostenido de memoria; los bloques son un array de tamaño fijo por nivel y no se acumulan objetos.

**Base de datos y catálogo**

- [ ] `supabase/migrations/004_juego_bloque_buster.sql` existe y coincide con lo aplicado.
- [ ] `games` tiene `ranked = true` y `max_score = 2080` para `bloque-buster`; el resto de filas y los campos `title`, `short`, `long`, `cover`, `color` y `position` de `bloque-buster` no cambian.
- [ ] `get_advisors` de seguridad no reporta avisos nuevos.
- [ ] Un `insert` en `scores` con la clave publishable falla, incluso con sesión iniciada.
- [ ] `/` y `/biblioteca` muestran los mismos 8 juegos con el mismo texto y la misma portada `cover-bricks` para BLOQUE BUSTER.
- [ ] `/juegos/bloque-buster` y `/juegos/bloque-buster/jugar` cargan; un id inexistente muestra la página de no encontrado.

**Guardado y leaderboard**

- [ ] Con sesión iniciada, al terminar `bloque-buster` el modal muestra el `username` real y «GUARDAR PUNTUACIÓN» inserta una fila en `scores` con `game_id = 'bloque-buster'`, el `user_id` del usuario y la puntuación mostrada.
- [ ] Pulsar «GUARDAR PUNTUACIÓN» dos veces rápido inserta una sola fila.
- [ ] Sin sesión, el modal muestra «INICIA SESIÓN PARA GUARDAR TU PUNTUACIÓN» con enlace a `/acceso` y sin botón de guardar.
- [ ] `submitScore('bloque-buster', 2081)` devuelve `invalid` y no inserta.
- [ ] Tras guardar, la marca aparece en la pestaña BLOQUE BUSTER de `/salon` al recargar, una sola fila por jugador (la mejor).
- [ ] La tarjeta y el detalle de BLOQUE BUSTER muestran la mejor marca y el número de partidas reales.
- [ ] El modal de `bloque-buster` ya no muestra el aviso «ESTE JUEGO ES UNA DEMO».

**Responsive y accesibilidad**

- [ ] A 1440 px el canvas llena el marco CRT con proporción 4:3 y sin deformarse.
- [ ] A 390 px el canvas se escala, no hay scroll horizontal y el HUD no se rompe.
- [ ] El canvas tiene `role="img"` y un `aria-label` descriptivo.
- [ ] Con `prefers-reduced-motion: reduce` el juego no arranca solo y espera a REANUDAR.

---

## Decisiones tomadas y descartadas

- **Sí:** reemplazar la demo `bloque-buster` y mantener su `id`, su portada `cover-bricks`, el color cyan y la posición 1. **No:** entrada nueva `arkanoid`: duplicaría el juego, subiría a 9 tarjetas y rompería el criterio de 8 de SPEC 01. Cambiar el `id` tampoco es posible sin romper la clave foránea de `scores`.
- **Sí:** dividir el trabajo y portar ahora solo la jugabilidad, con formas dibujadas. El motor del contrato no puede usar `Image` ni `Audio`, y sprites, explosiones y sonido tocan carga de assets, audio y reproductor. **No:** meter el spritesheet o el sonido en este spec: pasaría de tres áreas y retrasaría el juego jugable. **No:** inyectar el spritesheet desde el componente ahora: obliga a ampliar el contrato y a gestionar dibujar antes de que cargue la imagen.
- **Sí:** conservar los textos `short` y `long` de `bloque-buster`; encajan con rebotar la bola y romper muros de bloques por niveles. **No:** reescribirlos.
- **Sí:** `max_score = 2080`, calculado con las reglas reales (208 bloques × 10). **No:** el defecto de 1 000 000, sin base, ni 5 000, que no frena nada con las reglas actuales.
- **Sí:** paleta de 81 px, como el código real. **No:** 162 px, como dice el README: haría el juego más fácil que el original y cambiaría el balance.
- **Sí:** reglas idénticas al original: rebote sin ángulo, un bloque por fotograma, `vy` invertido en cada bloque, bola lanzada sin tecla, 10 puntos por bloque. **No:** mejorar el rebote ni añadir lanzamiento manual: es rediseño, no portado.
- **Sí:** solo teclado (`←` y `→`), porque el contrato recibe teclas por `setKey`. **No:** ratón: exige ampliar el contrato compartido con eventos de puntero y coordenadas escaladas, y merece su propio spec.
- **Sí:** quitar `P`, `Escape` y el selector de nivel; la pausa es el botón PAUSA. **No:** conservar el selector: permitiría saltar al nivel 5 y puntuar sin jugar, y el overlay se dibujaba en el canvas.
- **Sí:** limpiar el nivel 5 pasa a `gameover` y abre el modal con la puntuación final. **No:** añadir un estado `won` al contrato: tocaría `lib/games/types.ts`, `GameCanvas` y el reproductor, que hoy solo reaccionan a `gameover`. El indicador interno `won` deja la puerta abierta.
- **Sí:** colores fijos por nombre, con los 7 del original, sobre fondo negro. **No:** la paleta neón de la marca, para no mezclar portado y rediseño; el spec de sprites los sustituirá.
- **Sí:** HUD con puntuación, vidas (`hearts`) y nivel (`pad2`), con las mismas etiquetas que `rocas`. **No:** mostrar bloques restantes: el original no lo hace.
- **Sí:** el motor es determinista y respeta `dt ≤ 0.05`. **No:** `performance.now()` dentro del motor como hace el bucle original.
- **Sí:** verificación con `build`, `lint`, partida manual en el navegador, consulta SQL y revisión visual. **No:** añadir un test runner.

---

## Riesgos identificados

| Riesgo                                                                                        | Mitigación                                                                                                                                   |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Strict Mode monta el efecto dos veces y duplica bucles o listeners                            | `GameCanvas` conserva la limpieza completa; criterio de «sin listeners tras desmontar».                                                      |
| `cacheComponents` conserva la página oculta y el estado de React sobrevive al navegar         | El reproductor restablece su estado al desmontar el efecto; criterio de «empieza de cero al volver».                                         |
| `onChange` en cada frame provoca 60 renders por segundo                                       | `GameCanvas` compara el snapshot anterior y notifica solo si cambia.                                                                         |
| Las flechas hacen scroll o activan un botón enfocado tras pulsar PAUSA                        | `preventDefault` en `ArrowLeft` y `ArrowRight` mientras no esté en pausa; quitar el foco de los botones tras pulsarlos.                      |
| `dt` grande al volver de una pestaña oculta hace saltar la bola                               | `dt` máximo 0.05 s y pausa automática por visibilidad y foco.                                                                                |
| La bola atraviesa un bloque o la paleta con `dt` alto                                         | La bola recorre como máximo unos 22 px por fotograma (438 px/s × 0.05 s) frente a bloques de 24 px y bola de 16 px; se valida en el nivel 5. |
| La bola sale en movimiento sin tecla y el jugador no está listo, sobre todo al reanudar       | Comportamiento heredado del original. En `prefers-reduced-motion` el juego espera a REANUDAR; un lanzamiento manual iría en otro spec.       |
| La bola rebota de forma plana y puede quedar en un bucle sin romper bloques                   | Heredado del original (sin ángulo según el impacto). Se acepta; un ángulo variable sería un cambio de reglas en otro spec.                   |
| Inversión de `vy` en cualquier impacto de bloque hace rebotes poco naturales en los laterales | Heredado del original y cotejable con `game.js`; no se corrige en este spec.                                                                 |
| Los rectángulos sin sprites desentonan con la portada o con el original                       | Aceptado de forma explícita: el aspecto con sprites va en un spec posterior. Se validan los 7 colores a 1440 y 390 px.                       |
| Escalar el canvas por CSS desenfoca los bordes de los bloques                                 | Validar visualmente a 1440 y 390 px; evaluar `devicePixelRatio` solo si se ve borroso.                                                       |
| En móvil no hay teclado y el juego no es jugable                                              | Aceptado: fuera de alcance; el pie CRT muestra los controles de teclado.                                                                     |
| `max_score` demasiado bajo rechaza una partida legítima                                       | Calculado con las reglas (208 bloques × 10 = 2 080, el máximo exacto); se reajusta en la migración que cambie niveles o puntos.              |
| Un usuario autenticado llama a `submitScore` con una marca falsa dentro del tope              | Aceptado en el MVP: `ranked` y `max_score` limitan el daño (aquí 2 080). Anticheat real, en otro spec.                                       |
| La migración cambia el `id` de la demo y rompe la clave foránea de `scores`                   | La migración es solo un `update` por `id = 'bloque-buster'` y no toca el `id`.                                                               |
| Hay marcas previas de `bloque-buster` en `scores` que contaminan el ranking                   | Antes del paso 7 se comprueba `select count(*) from public.scores where game_id = 'bloque-buster'`; debe ser 0, ya que la demo no guardaba.  |
| El juego original depende de assets y sonido que no se portan                                 | Quedan fuera de alcance de forma explícita (ver Decisiones); el spec posterior los incorpora.                                                |

---

## Qué **no** está en este spec

- Spritesheet, animación de explosión de bloques y sonido.
- Control con ratón, atajos `P` y `Escape` y selector de nivel.
- Estado `won` en el contrato ni cambios en `GameCanvas` o en el reproductor.
- Recoloreado con la paleta neón de la marca.
- Cambios de reglas o de balance.
- Cambio de textos o de portada de `bloque-buster` en el catálogo.
- Controles táctiles o gamepad.
- Anticheat avanzado, rate limit o ranking en el detalle del juego.
- Portado de los demás juegos demo.
- Tests automatizados.
- Internacionalización.

Cada uno de ellos, si se aborda, va en su propio spec.
