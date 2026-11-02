# SPEC JAM — CRUCE: motor jugable

> **Estado:** Borrador
> **Depende de:** SPEC 04, SPEC 06, SPEC 07, SPEC 09
> **Fecha:** 2026-10-28
> **Tema de la jam:** Frogger clásico (cruzar carretera y río hasta las casillas de llegada)
> **Objetivo:** Crear el motor canvas `lib/games/cruce/engine.ts` de un Frogger clásico con carretera, río, 5 casillas de llegada, vidas, temporizador y 10 niveles, y registrarlo como `cruce` en `GAME_REGISTRY`.

---

## Por qué existe este spec

La jam con tema «Frogger clásico» produce un único juego, CRUCE, partido en dos specs. Este primero cubre solo el motor y su entrada de registro. El segundo (`specs/games-jam/cruce/02-plataforma.md`) da de alta la fila en `games`, la portada y el guardado.

El contrato ya existe. SPEC 07 creó `lib/games/types.ts`, `lib/games/registry.ts` y `components/games/game-canvas.tsx`. SPEC 09 añadió `assets` opcionales. CRUCE no usa imágenes ni cambia el contrato: no hay paso 0.

No hay código de referencia en `references/`. Las reglas salen de las decisiones de este spec, inspiradas en el Frogger de 1981.

El catálogo ya tiene una demo parecida, `ranaria` (ARCADE, `cover-rana`, verde, posición 7, `ranked = false`). La jam crea juegos nuevos con fila propia, así que CRUCE no la reemplaza ni la toca.

La ruta `/juegos/cruce/jugar` solo existe cuando hay fila en `games`. Por eso las reglas de este spec se comprueban en el navegador después del paso 1 de `02-plataforma.md`.

---

## Alcance

**Dentro:**

- Motor `lib/games/cruce/engine.ts` con la factory `createCruce()` y las constantes `WIDTH = 800` y `HEIGHT = 600`.
- Rejilla de 20 columnas × 15 filas con celdas de 40 px.
- Filas: 0 decorativa, 1 casillas de llegada, 2–6 río, 7 mediana segura, 8–12 carretera, 13 salida segura, 14 decorativa.
- 5 carriles de carretera con coches, tractores, deportivos y camiones que matan al tocar a la rana.
- 5 carriles de río con troncos y grupos de tortugas que transportan a la rana; algunos grupos de tortugas se sumergen.
- 5 casillas de llegada en la fila 1; entrar en una casilla libre la ocupa.
- Saltos de una celda por pulsación con `↑ ↓ ← →` y `W A S D`, sin repetición al mantener.
- 3 vidas, temporizador de 30 s por intento y muerte con pausa de 1 s.
- Puntuación por fila nueva, por llegada, por tiempo sobrante y por nivel completado.
- 10 niveles con velocidad creciente; completar el nivel 10 termina la partida.
- Dibujo neón sobre fondo oscuro, sin HUD ni textos en el canvas.
- Entrada `cruce` en `lib/games/registry.ts` con HUD PUNTOS, VIDAS, NIVEL y TIEMPO.

**Fuera de alcance (para specs futuros):**

- Fila en `games`, migración, portada, pie CRT verificado, guardado y `/salon`: van en `02-plataforma.md`.
- Moscas bonus, rana hembra, cocodrilos, serpientes y nutrias del Frogger original.
- Vidas extra por puntuación.
- Animación de salto con duración: el salto es instantáneo.
- Sonido, música y sprites o imágenes.
- Atajo `P` o `Escape` para pausar: la pausa es el botón PAUSA existente.
- Controles táctiles o gamepad.
- Reemplazar, retirar o modificar la demo `ranaria`.
- Tests automatizados (no hay test runner configurado).
- Internacionalización: solo español.

---

## Modelo de datos

El contrato de `lib/games/types.ts` no cambia. `createCruce` no declara parámetros y es asignable a `create: (assets: GameAssets) => GameEngine`, como `createTetris`.

Motor (estructuras e hitos, no código completo):

```ts
// lib/games/cruce/engine.ts
export const WIDTH = 800;
export const HEIGHT = 600;

const COLS = 20;
const ROWS = 15;
const CELL = 40;

const ROW_HOME = 1;
const ROW_MEDIAN = 7;
const ROW_START = 13;
const START_X = 400; // centro horizontal de la rana al aparecer

const LIVES = 3;
const TIME_LIMIT = 30; // s por intento
const DEATH_TIME = 1; // s de pausa tras morir
const MAX_LEVEL = 10;
const SPEED_STEP = 0.12; // velocidad × (1 + 0.12 × (nivel − 1))

const LOOP_MARGIN = 240; // longitud del objeto más largo
const LOOP = WIDTH + 2 * LOOP_MARGIN; // 1280 px: los objetos reaparecen por el otro lado fuera de la vista

const SLOT_X = [80, 240, 400, 560, 720]; // centros de las 5 casillas
const HOME_TOLERANCE = 20; // px de margen para entrar en una casilla

const FROG_HITBOX = 24; // ancho de la rana contra vehículos
const VEHICLE_INSET = 4; // px que se recorta cada extremo del vehículo

const DIVE_CYCLE = 4; // s: 2,5 visible · 0,5 aviso · 1 sumergida
const DIVE_WARN_AT = 2.5;
const DIVE_UNDER_AT = 3;

const SCORE_ROW = 10; // por fila nueva alcanzada en el intento
const SCORE_HOME = 50; // por rana que llega a una casilla
const SCORE_SECOND = 10; // por segundo entero sobrante al llegar
const SCORE_LEVEL = 1000; // por llenar las 5 casillas

type LaneKind = "car" | "tractor" | "racer" | "truck" | "log" | "turtles";

type Lane = {
  row: number;
  kind: LaneKind;
  dir: -1 | 1; // −1 izquierda, +1 derecha
  speed: number; // px/s en el nivel 1
  len: number; // celdas por objeto
  count: number; // objetos equidistantes en LOOP
  divers?: number[]; // índices de grupos de tortugas que se sumergen
  divePhase?: number; // s de desfase del ciclo de inmersión
};

const LANES: Lane[] = [
  // Carretera (de abajo arriba)
  { row: 12, kind: "car", dir: -1, speed: 60, len: 1, count: 4 },
  { row: 11, kind: "tractor", dir: 1, speed: 50, len: 1, count: 4 },
  { row: 10, kind: "car", dir: -1, speed: 80, len: 1, count: 4 },
  { row: 9, kind: "racer", dir: 1, speed: 140, len: 1, count: 2 },
  { row: 8, kind: "truck", dir: -1, speed: 70, len: 2, count: 3 },
  // Río (de abajo arriba)
  {
    row: 6,
    kind: "turtles",
    dir: -1,
    speed: 50,
    len: 3,
    count: 5,
    divers: [0, 3],
    divePhase: 0,
  },
  { row: 5, kind: "log", dir: 1, speed: 40, len: 3, count: 4 },
  { row: 4, kind: "log", dir: 1, speed: 90, len: 6, count: 3 },
  {
    row: 3,
    kind: "turtles",
    dir: -1,
    speed: 60,
    len: 2,
    count: 5,
    divers: [0, 3],
    divePhase: 2,
  },
  { row: 2, kind: "log", dir: 1, speed: 60, len: 4, count: 4 },
];

type Frog = {
  x: number; // centro horizontal en px (continuo: el río lo arrastra)
  row: number; // fila entera 0–14
  facing: "up" | "down" | "left" | "right";
};

export function createCruce(): GameEngine; // snapshot().hud = { lives, level, time }
```

Entrada de registro (nueva):

```ts
// lib/games/registry.ts
cruce: {
  id: "cruce",
  width: CRUCE_WIDTH,
  height: CRUCE_HEIGHT,
  keys: [
    "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
    "KeyW", "KeyA", "KeyS", "KeyD",
  ],
  controlsLabel: "← ↑ ↓ → / WASD SALTAR",
  ariaLabel:
    "Juego Cruce: salta con las flechas o W A S D para cruzar la carretera esquivando vehículos y el río sobre troncos y tortugas hasta llenar las cinco casillas de llegada",
  hud: [
    { key: "score", label: "PUNTOS", format: "int" },
    { key: "lives", label: "VIDAS", format: "hearts" },
    { key: "level", label: "NIVEL", format: "pad2" },
    { key: "time", label: "TIEMPO", format: "int" },
  ],
  create: createCruce,
},
```

Convenciones:

- Archivo nuevo: `lib/games/cruce/engine.ts`. Archivo modificado: `lib/games/registry.ts` (import con alias `CRUCE_WIDTH` y `CRUCE_HEIGHT`).
- Origen de coordenadas arriba a la izquierda. La fila `r` ocupa `y = r × 40` a `y = r × 40 + 40`.
- La rana guarda su centro horizontal `x` en px y su fila entera `row`. Al aparecer: `x = 400`, `row = 13`, `facing = "up"`.
- Posición del objeto `i` de un carril: `wrap(offset + i × LOOP / count + dir × speed × mult × t)`, con `wrap` al rango `[−240, 1040)`. `offset` es aleatorio por carril y se sortea en `createCruce()`, `reset()` y al subir de nivel.
- `mult = 1 + SPEED_STEP × (nivel − 1)`: 1 en el nivel 1, 1,12 en el nivel 2 y 2,08 en el nivel 10.
- El motor acumula el tiempo de los carriles (`laneTime`) en segundos con el `dt` de `update`. Los carriles se mueven también durante la pausa de muerte.
- Saltos por flanco: `setKey(code, true)` guarda un salto pendiente (el último pulsado gana). `update` aplica como máximo un salto por llamada. Mantener la tecla no repite.
- Salto horizontal: `x ± 40`. Se ignora si el centro resultante queda fuera de `[20, 780]`.
- Salto vertical: `row ± 1`, conservando `x`. No se puede bajar de la fila 13. La rana no se alinea a la rejilla.
- Puntos por fila nueva: el motor guarda `bestRow` (la fila más alta alcanzada en el intento, empieza en 13). Subir a una fila `r < bestRow` suma 10 y actualiza `bestRow`. Bajar y volver a subir no suma.
- Carretera (filas 8–12): la rana muere si su caja de 24 px centrada en `x` solapa un vehículo de su fila. El vehículo mide `len × 40 − 8` px.
- Río (filas 2–6): la rana está a salvo si su centro `x` cae dentro de un tronco o de un grupo de tortugas visible. Si no, se ahoga. Mientras está a salvo, su `x` se desplaza con el objeto que la sostiene.
- La rana muere si el río la arrastra y su centro sale de `[0, 800]`.
- Tortugas que se sumergen: los grupos de `divers` siguen `(laneTime + divePhase) mod 4`. De 0 a 2,5 s están visibles. De 2,5 a 3 s avisan (se dibujan al 50 %) y aún sostienen. De 3 a 4 s están sumergidas y no sostienen.
- Llegada: un salto desde la fila 2 a la fila 1 entra en la casilla libre cuyo centro esté a 20 px o menos de `x`. Si no hay casilla libre a esa distancia (seto o casilla ocupada), la rana muere y ese salto no suma.
- Al llegar: +10 (fila nueva), +50 y +10 × `floor(timeLeft)`. La casilla queda ocupada, la rana reaparece en la salida, `timeLeft` vuelve a 30 y `bestRow` vuelve a 13.
- Al ocupar la quinta casilla: +1000, las casillas se vacían, el nivel sube 1 y se sortean nuevos `offset`. Si el nivel completado era el 10, el estado pasa a `gameover` (victoria).
- `timeLeft` baja con `dt` solo en estado `playing`. Al llegar a 0, la rana muere.
- Muerte: se resta una vida al instante y se guarda la posición para dibujar la marca de choque. Si quedan vidas, el estado es `dead` durante 1 s y luego la rana reaparece en la salida con `timeLeft = 30` y `bestRow = 13`. Si no quedan, el estado pasa a `gameover` directamente.
- Tres estados del snapshot: `playing`, `dead` y `gameover`.
- `snapshot().hud = { lives, level, time }`, con `time = ceil(timeLeft)`. El HUD cambia como mucho una vez por segundo por el tiempo.
- Al terminar, `draw` sigue pintando el último fotograma; `update` y `setKey` dejan de actuar.
- `Math.random` solo dentro de `createCruce()`, `reset()` y `update()`.
- El motor no usa `window`, `document`, `requestAnimationFrame`, `Image` ni `Audio`.
- Paleta del dibujo: fondo `#0a0a12`; seto `#0b3d2e`; agua `#001a33`; aceras `#2a0a3a` con borde `#aa00ff`; asfalto `#111118` con líneas discontinuas `#333344`; coches `#f5ff00` (fila 12) y `#ff006e` (fila 10); tractores `#00f5ff`; deportivos `#ffffff`; camiones `#ff7700`; troncos `#7a4a22` con vetas `#a8703a`; tortugas `#e5484d`; rana `#00ff88` con ojos; marca de choque `#ff006e`.

Cálculo de `max_score = 33 830`:

- Por cada llegada: 12 filas nuevas × 10 = 120, más 50, más como máximo 10 × 30 = 300 de tiempo. Total 470. El tope real de tiempo es 290, porque `timeLeft` ya bajó de 30 al llegar; se usa 300 como cota segura.
- Por nivel: 5 llegadas × 470 + 1000 = 3 350.
- 10 niveles: 33 500.
- Intentos fallidos: cada muerte suma como mucho 11 filas × 10 = 110 (de la 12 a la 2; el salto fallido a la fila 1 no suma). Hay como mucho 3 muertes: 330.
- Total: 33 500 + 330 = 33 830. Cualquier marca superior es imposible.

---

## Plan de implementación

Antes del paso 1, leer en `node_modules/next/dist/docs/` la guía de App Router sobre Client Components. Next.js 16.4 y React 19.3 tienen cambios incompatibles con versiones anteriores. Este spec no toca la interfaz React. Cada paso se commitea solo.

1. **Motor: estado y snapshot.** Crear `lib/games/cruce/engine.ts` con las constantes, `LANES`, los tipos `Lane` y `Frog`, `createCruce()`, el estado inicial (rana, 3 vidas, nivel 1, 30 s, casillas vacías, `offset` sorteados), `snapshot()` y `reset()`. `update`, `draw` y `setKey` quedan como esqueletos vacíos. Verificación: `npm run build` y `npm run lint` pasan.
2. **Motor: teclas y saltos.** Implementar `setKey` por flanco con el mapa de las 8 teclas, el salto pendiente, la aplicación de un salto por `update`, los límites horizontales, el tope inferior de la fila 13, `facing` y los puntos por fila nueva con `bestRow`. Verificación: `build` y `lint` pasan.
3. **Motor: carriles y arrastre.** Implementar `laneTime`, el multiplicador por nivel, la posición con `wrap` de cada objeto, el ciclo de inmersión de las tortugas y el arrastre de la rana sobre troncos y tortugas. Verificación: `build` y `lint` pasan.
4. **Motor: muertes y vidas.** Implementar las cinco causas de muerte (vehículo, agua, arrastre fuera, seto o casilla ocupada, tiempo), el estado `dead` de 1 s, la reaparición y el paso a `gameover` sin vidas. Verificación: `build` y `lint` pasan.
5. **Motor: casillas y niveles.** Implementar la entrada en casillas con `HOME_TOLERANCE`, los puntos de llegada y de tiempo, el bonus de nivel, el vaciado de casillas, la subida de nivel con nuevos `offset` y la victoria al completar el nivel 10. Verificación: `build` y `lint` pasan.
6. **Motor: dibujo.** Añadir `draw(ctx)`: fondo y franjas por fila, casillas con ranas ocupantes, vehículos con faros en su sentido, troncos con vetas, tortugas (50 % en aviso, solo ondas sumergidas), rana orientada por `facing` y marca de choque durante `dead`. Sin HUD ni textos. Verificación: `build` y `lint` pasan.
7. **Registrar `cruce`.** Añadir la entrada `cruce` a `GAME_REGISTRY` con `create: createCruce`. Verificación: `build` y `lint` pasan; `/biblioteca` sigue mostrando los mismos 8 juegos, porque la fila de `games` llega en `02-plataforma.md`.

---

## Criterios de aceptación

Los criterios de **Juego**, **Integración con el reproductor** y **Rendimiento y limpieza** se comprueban en el navegador cuando `02-plataforma.md` haya aplicado su migración (paso 1). Antes de eso solo se verifican con `build`, `lint` y lectura del código.

**Globales**

- [ ] `npm run build` termina sin errores ni errores de tipos.
- [ ] `npm run lint` termina sin errores.
- [ ] No hay errores ni advertencias de hidratación ni de React Strict Mode en la consola de `/juegos/cruce/jugar`.
- [ ] `references/` queda intacto.
- [ ] `app/globals.css`, `components/game-player.tsx`, `components/games/game-canvas.tsx` y `lib/games/types.ts` no cambian en este spec.
- [ ] Las pantallas de los specs anteriores se ven igual salvo lo que este spec cambia.

**Motor y registro**

- [ ] `lib/games/cruce/engine.ts` exporta `WIDTH = 800`, `HEIGHT = 600` y `createCruce`.
- [ ] `lib/games/cruce/engine.ts` no contiene `window`, `document`, `requestAnimationFrame`, `Image` ni `Audio`.
- [ ] `Math.random` solo aparece dentro de `createCruce()`, `reset()` y `update()`.
- [ ] `GAME_REGISTRY` contiene `rocas`, `caida`, `bloque-buster`, `serpentina` y `cruce`, y las cuatro primeras no cambian.
- [ ] La entrada `cruce` no declara `assets`.

**Juego**

- [ ] La rana aparece en la fila 13, centrada en `x = 400`, mirando hacia arriba.
- [ ] `↑ ↓ ← →` y `W A S D` mueven la rana exactamente una celda por pulsación y no hacen scroll de la página mientras se juega.
- [ ] Mantener una tecla pulsada no repite el salto.
- [ ] La rana no puede bajar de la fila 13 ni salir por los laterales con un salto.
- [ ] Subir a una fila no alcanzada en el intento suma exactamente 10 puntos; bajar y volver a subir no suma.
- [ ] Tocar cualquier vehículo en las filas 8–12 mata a la rana.
- [ ] La mediana (fila 7) y la salida (fila 13) son seguras.
- [ ] Sobre un tronco o un grupo de tortugas visible, la rana avanza con él a su misma velocidad.
- [ ] Caer al agua fuera de un tronco o de una tortuga mata a la rana.
- [ ] Los grupos 0 y 3 de las filas 3 y 6 se ven al 50 % durante 0,5 s antes de sumergirse y, sumergidos, no sostienen a la rana.
- [ ] Si el río arrastra a la rana fuera del canvas, muere.
- [ ] Saltar a la fila 1 a 20 px o menos del centro de una casilla libre la ocupa con una rana dibujada.
- [ ] Saltar a la fila 1 sobre el seto o sobre una casilla ocupada mata a la rana y no suma puntos.
- [ ] Llegar a una casilla suma 10 + 50 + 10 × los segundos enteros sobrantes.
- [ ] Tras llegar a una casilla, la rana reaparece en la salida y el TIEMPO vuelve a 30.
- [ ] Llenar las 5 casillas suma 1 000, vacía las casillas y sube el NIVEL en 1.
- [ ] En el nivel 2 los vehículos, troncos y tortugas van 1,12 veces más rápido que en el nivel 1.
- [ ] Si el TIEMPO llega a 0, la rana muere.
- [ ] Cada muerte resta una vida al instante, muestra la marca de choque 1 s y reaparece la rana en la salida con 30 s.
- [ ] Perder la tercera vida abre el modal «FIN DEL JUEGO» con la puntuación final real.
- [ ] Completar el nivel 10 abre el modal «FIN DEL JUEGO» con la puntuación final real.
- [ ] El canvas no dibuja marcador, vidas, nivel, tiempo ni textos («GAME OVER», «PAUSA»).
- [ ] `P` y `Escape` no hacen nada.

**Integración con el reproductor**

- [ ] El HUD muestra jugador, PUNTOS (`es-ES`), VIDAS (♥), NIVEL (dos dígitos) y TIEMPO reales, actualizados al instante.
- [ ] PAUSA congela el juego (ni la rana, ni los carriles, ni el tiempo avanzan) y REANUDAR lo continúa sin saltos.
- [ ] FIN abre el modal con la puntuación actual.
- [ ] «JUGAR DE NUEVO» reinicia con 0 puntos, 3 vidas, nivel 1, 30 s, casillas vacías y la rana en la salida.
- [ ] SALIR y «VOLVER AL VAULT» navegan correctamente; al volver, la partida empieza de cero sin bucles ni listeners duplicados.
- [ ] Cambiar de pestaña o perder el foco de la ventana pausa el juego.
- [ ] `/juegos/rocas/jugar`, `/juegos/caida/jugar`, `/juegos/bloque-buster/jugar`, `/juegos/serpentina/jugar` y las demos (incluida `ranaria`) siguen igual que antes.

**Rendimiento y limpieza**

- [ ] Al desmontar se cancela el `requestAnimationFrame` y se retiran los listeners (tras navegar fuera, pulsar teclas no ejecuta código del juego).
- [ ] Con la pestaña oculta o en pausa no hay trabajo de simulación.
- [ ] Una partida de 2 minutos no muestra crecimiento sostenido de memoria; los carriles tienen un número fijo de objetos y no se crean arrays por fotograma.

---

## Decisiones tomadas y descartadas

- **Sí:** un solo juego en esta jam, por excepción autorizada por el usuario. **No:** los 3 juegos que pide la regla del agente `game-jam`: el usuario pidió solo el Frogger clásico.
- **Sí:** nombre CRUCE e id `cruce`. Es corto, en español y no existe en `games` ni en `specs/games-jam/`. **No:** «Rana», que se confunde con la demo `ranaria` y su portada `cover-rana`.
- **Sí:** fila nueva en `games`, sin tocar `ranaria`. Es la regla de la jam. **No:** reemplazar la demo `ranaria`: la decisión de retirarla o fusionarla es del usuario y va en otro spec.
- **Sí:** carpeta del motor `lib/games/cruce/`, igual al id, como pide el formato de la jam. **No:** `lib/games/frogger/`, que seguiría la costumbre de los nombres en inglés de SPEC 07 y 09 pero rompería la ruta pedida.
- **Sí:** canvas 800×600 con celdas de 40 px. Reutiliza el escalado 4:3 de `.crt-screen .asteroids-canvas` sin CSS nuevo. **No:** el 224×256 vertical del original, que exigiría una regla de escalado nueva.
- **Sí:** 15 filas con dos franjas decorativas arriba y abajo. **No:** dibujar el temporizador como barra en la franja inferior: el contrato prohíbe HUD dentro del canvas.
- **Sí:** casillas centradas en columnas pares (80, 240, 400, 560, 720) con 20 px de tolerancia. Son simétricas y la rana puede alinearse saltando en horizontal. **No:** exigir el centro exacto: el río deja la rana en `x` no enteros y sería injugable.
- **Sí:** `x` continuo sin alinear a la rejilla, como el original. **No:** alinear la rana a la columna más cercana al salir del río: produce saltos laterales inesperados.
- **Sí:** salto instantáneo de una celda, por flanco, con un salto pendiente por `update`. **No:** animación de salto de 0,1 s: añade un estado intermedio sin cambiar reglas. **No:** repetir al mantener: el original es una pulsación por salto.
- **Sí:** puntuación clásica (10 por fila nueva, 50 por llegada, tiempo sobrante y 1 000 por nivel). **No:** moscas ni rana hembra bonus: complican el tope de `max_score` y van en otro spec.
- **Sí:** 10 niveles finitos con victoria al completar el 10. Acota `max_score` de forma exacta. **No:** niveles infinitos: la puntuación no tendría techo y `max_score` sería arbitrario.
- **Sí:** velocidad × (1 + 0,12 × (nivel − 1)), hasta ×2,08 en el nivel 10. **No:** curvas más agresivas: con 240 px/s los troncos largos dejan de ser alcanzables.
- **Sí:** tortugas que se sumergen en los grupos 0 y 3 de cada carril de tortugas, con 0,5 s de aviso. Es la mecánica característica del río. **No:** que se sumerjan todas: el carril sería un muro intermitente.
- **Sí:** 3 vidas sin vidas extra. **No:** vida extra a los 10 000 puntos: cambia el cálculo del tope.
- **Sí:** temporizador de 30 s por intento, visible en el HUD como TIEMPO. **No:** 60 s: deja el bonus de tiempo casi constante y resta tensión.
- **Sí:** estado `dead` de 1 s antes de reaparecer y `gameover` inmediato al perder la última vida. **No:** esperar 1 s también en la última muerte: retrasa el modal sin aportar nada.
- **Sí:** `max_score = 33 830`, calculado con las reglas (ver Modelo de datos). **No:** el defecto de 1 000 000, sin base.
- **Sí:** HUD con PUNTOS, VIDAS (`hearts`), NIVEL (`pad2`) y TIEMPO (`int`). **No:** mostrar casillas ocupadas: ya se ven en el canvas.
- **Sí:** aspecto neón dibujado con primitivas de canvas y la rana en `#00ff88`. **No:** sprites: no hay assets y el contrato de assets queda sin uso aquí.
- **Sí:** el motor acumula `dt` en segundos y respeta `dt ≤ 0.05`. **No:** `setInterval` ni `performance.now()` dentro del motor.
- **Sí:** verificación con `build`, `lint`, partida manual en el navegador y revisión visual. **No:** añadir un test runner.

---

## Riesgos identificados

| Riesgo                                                                                | Mitigación                                                                                                                               |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| La ruta `/juegos/cruce/jugar` no existe hasta que `02-plataforma.md` inserta la fila  | Los pasos 1 a 7 se verifican con `build` y `lint`; las reglas se prueban en el navegador tras el paso 1 de `02-plataforma.md`.           |
| Strict Mode monta el efecto dos veces y duplica bucles o listeners                    | `GameCanvas` ya devuelve limpieza completa; criterio de «sin listeners tras desmontar».                                                  |
| `cacheComponents` conserva la página oculta y el estado de React sobrevive al navegar | El reproductor ya restablece su estado al desmontar; criterio de «empieza de cero al volver».                                            |
| `onChange` en cada frame provoca 60 renders por segundo                               | `GameCanvas` compara snapshots; `time` es `ceil(timeLeft)` y solo cambia una vez por segundo.                                            |
| `Math.random` en el render inicial rompe la hidratación                               | Los `offset` se sortean en `createCruce()`, que `GameCanvas` llama dentro de `useEffect`.                                                |
| Las flechas o `W A S D` hacen scroll o activan un botón enfocado tras pulsar PAUSA    | `preventDefault` en las 8 teclas mientras no esté en pausa; quitar el foco de los botones tras pulsarlos.                                |
| `dt` grande al volver de una pestaña oculta hace saltar los objetos                   | `dt` máximo 0,05 s y pausa automática por visibilidad y foco.                                                                            |
| Un vehículo rápido atraviesa a la rana entre fotogramas sin detectar el choque        | El más rápido va a 291 px/s en el nivel 10: 14,6 px por fotograma, menos que la caja de la rana (24 px).                                 |
| Los objetos aparecen de golpe en un borde al envolver                                 | El bucle mide 1 280 px con 240 px de margen a cada lado, la longitud del tronco más largo.                                               |
| Una disposición aleatoria de `offset` deja un carril de río imposible de cruzar       | Los objetos de un carril son equidistantes; el `offset` solo desplaza el carril entero y los huecos máximos son de 200 px.               |
| Los niveles altos son demasiado difíciles o demasiado fáciles                         | `SPEED_STEP`, `TIME_LIMIT` y `LANES` están al principio del motor; si cambian, se recalcula `max_score` en la migración correspondiente. |
| Cuatro métricas más el jugador no caben en el HUD a 390 px                            | Se valida en `02-plataforma.md`; si se rompe, se ajusta con reglas nuevas en `app/globals.css` usando `/frontend-design`.                |
| `max_score` demasiado bajo rechaza una partida legítima                               | Calculado con cotas seguras (300 de tiempo por llegada en vez de 290); se reajusta en la migración que cambie las reglas.                |
| CRUCE y la demo `ranaria` conviven con el mismo concepto en el catálogo               | Aceptado de forma explícita; retirar o fusionar `ranaria` queda para un spec que decida el usuario.                                      |
| En móvil no hay teclado y el juego no es jugable                                      | Aceptado: fuera de alcance; el pie CRT muestra los controles de teclado.                                                                 |

---

## Qué **no** está en este spec

- Fila en `games`, migración, portada, guardado de puntuación y `/salon` (van en `02-plataforma.md`).
- Moscas, rana hembra, cocodrilos, serpientes, nutrias y vidas extra.
- Animación de salto, sonido, música y sprites.
- Atajos `P` y `Escape`.
- Controles táctiles o gamepad.
- Cambios en la demo `ranaria`.
- Tests automatizados.
- Internacionalización.

Cada uno de ellos, si se aborda, va en su propio spec.
