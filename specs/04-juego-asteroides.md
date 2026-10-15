# SPEC 04 — Primer juego real: Asteroides en el reproductor

> **Estado:** Implementado
> **Depende de:** SPEC 01
> **Fecha:** 2026-10-15
> **Objetivo:** Portar a TypeScript el juego `references/started-games/02-asteroids` y jugarlo en `/juegos/rocas/jugar` dentro del marco CRT del reproductor, conectado a su HUD, pausa, fin de partida y guardado de puntuación.

---

## Por qué existe este spec

Hasta ahora `components/game-player.tsx` solo simula una partida (puntos aleatorios cada 220 ms sobre una arena decorativa). Este es el primer juego jugable de verdad. Fija el patrón que seguirán los demás juegos (Tetris, Arkanoid…): motor en un módulo TS independiente de React, un componente de canvas y un contrato mínimo con el reproductor.

El juego original es un solo `game.js` con variables globales y listeners de `window` sin limpieza. No se puede incrustar tal cual en React sin que se rompa con Strict Mode o al navegar, por eso se porta.

---

## Alcance

**Dentro:**

- Motor del juego portado de `game.js` a TypeScript, sin dependencias de React ni del DOM salvo el `CanvasRenderingContext2D` que recibe:
  - Nave con rotación, empuje, inercia, disparo con enfriamiento e invencibilidad parpadeante al reaparecer (3 s).
  - Asteroides de 3 tamaños que se parten en dos del tamaño inferior; polígonos irregulares con rotación.
  - Partículas de explosión, balas con tiempo de vida, mundo toroidal 800×600.
  - Power-up «3x» (disparo triple 5 s): 15 % de probabilidad por asteroide destruido, garantizado al 5.º, uno por nivel.
  - Niveles: al despejar todos los asteroides aparece el siguiente nivel con `3 + nivel` asteroides.
  - 3 vidas; al perder la última, estado `gameover`.
  - Puntos: grande 20, mediano 50, pequeño 100.
- Componente cliente `components/games/asteroids-canvas.tsx` con `<canvas width=800 height=600>` escalado por CSS al ancho del marco CRT, manteniendo la proporción 4:3.
- El reproductor (`components/game-player.tsx`) elige el juego por `id`: con `id === "rocas"` monta el canvas real; el resto de ids sigue usando la simulación actual sin cambios.
- Integración con el HUD React existente: puntuación, vidas y nivel se leen del motor. Botones PAUSA/REANUDAR, FIN y SALIR actúan sobre el juego real.
- Fin de partida: al llegar a `gameover` (o al pulsar FIN) se abre el modal «FIN DEL JUEGO» existente con la puntuación real; `saveScore` guarda en `localStorage` (`av_scores`) como hoy. «JUGAR DE NUEVO» reinicia el motor.
- Controles solo de teclado: `←` `→` rotar, `↑` propulsar, `Espacio` disparar. Se evita el scroll de página con `preventDefault` en esas teclas mientras el juego está activo.
- Aspecto original: vectorial blanco sobre fondo negro, llama naranja del propulsor, power-up cyan. Se elimina el HUD dibujado en el canvas (lo cubre el HUD React) y la pantalla «GAME OVER» del canvas (la cubre el modal).
- Ajustar el texto `long` de `rocas` en `lib/games.ts` para quitar la mención a OVNIs, que el juego no tiene.
- Pausa automática cuando la pestaña pierde visibilidad o el canvas pierde el foco de la ventana.
- Limpieza completa al desmontar: `cancelAnimationFrame` y retirada de `keydown`/`keyup`.

**Fuera de alcance (para specs futuros):**

- Guardar puntuaciones en Supabase, tabla de scores, RLS o ranking real en el Salón de la Fama.
- Controles táctiles o gamepad.
- Recolorear el juego con la paleta neón de la marca.
- OVNIs, sonido, música o efectos de audio.
- Cambiar las reglas, velocidades o balance del juego original.
- Portar Tetris y Arkanoid (`references/started-games/03-tetris`, `04-arkanoid`), y generalizar una interfaz común de juegos más allá del contrato mínimo descrito aquí.
- Tests automatizados (no hay test runner configurado).
- Internacionalización: solo español.

---

## Modelo de datos

No hay persistencia nueva: se reutiliza `SavedScore` de `lib/session.tsx`. Se añade el contrato entre el motor y el reproductor.

```ts
// lib/games/asteroids/engine.ts
export const WIDTH = 800;
export const HEIGHT = 600;

export type AsteroidsStatus = "playing" | "dead" | "gameover";

export type AsteroidsSnapshot = {
  score: number;
  lives: number;
  level: number;
  status: AsteroidsStatus;
};

export type AsteroidsGame = {
  update(dt: number): void; // dt en segundos, ya limitado a 0.05
  draw(ctx: CanvasRenderingContext2D): void;
  snapshot(): AsteroidsSnapshot;
  setKey(code: string, down: boolean): void; // ArrowLeft, ArrowRight, ArrowUp, Space
  reset(): void;
};

export function createAsteroids(): AsteroidsGame;
```

```ts
// components/games/asteroids-canvas.tsx  ("use client")
type Props = {
  paused: boolean;
  runKey: number; // cambia para reiniciar la partida
  onChange: (s: AsteroidsSnapshot) => void; // solo cuando score, lives, level o status cambian
  onGameOver: (finalScore: number) => void; // una vez por partida
};
```

Convenciones:

- Archivos nuevos: `lib/games/asteroids/engine.ts` (motor y clases) y `components/games/asteroids-canvas.tsx`.
- El motor no usa `window`, `document` ni `requestAnimationFrame`; el bucle y los listeners viven en el componente. Así el motor se puede mover a otro sitio o probar sin DOM.
- Aleatoriedad (`Math.random`) solo dentro de `createAsteroids()`/`reset()`/`update()`, nunca en el render inicial de React (hidratación).
- Los nombres de clase y constantes (`Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`, `RADII`, `SPEEDS`, `POINTS`) se conservan para poder cotejar con `game.js`.
- Constantes de reglas idénticas al original: `POWERUP_DROP_CHANCE = 0.15`, `POWERUP_DURATION = 5`, `POWERUP_TTL = 12`, `TRIPLE_SPREAD = 0.18`, `dt` máximo 0.05 s.
- El «justPressed» del original se sustituye por flanco en `setKey`: `Space` dispara una sola vez por pulsación (no por mantener).

---

## Plan de implementación

Antes del paso 1, leer en `node_modules/next/dist/docs/` la guía de App Router sobre Client Components y `cacheComponents` (el reproductor se monta dentro de `Suspense` en `app/juegos/[id]/jugar/page.tsx`). Next.js 16.4 y React 19.3 tienen cambios incompatibles con versiones anteriores. La interfaz del reproductor se toca con el skill `/frontend-design`, según `CLAUDE.md`; el juego en sí conserva el aspecto original.

1. **Motor.** Crear `lib/games/asteroids/engine.ts` portando `game.js` a TS: clases, constantes, `createAsteroids()` con estado encapsulado, `snapshot()`, `setKey()`, `reset()`. Sin HUD ni overlay de game over en `draw`. Verificación: `npm run build` y `npm run lint` pasan.
2. **Componente de canvas.** Crear `components/games/asteroids-canvas.tsx`: crea el motor en `useEffect`, bucle con `requestAnimationFrame` (`dt` limitado a 50 ms), `keydown`/`keyup` en `window` con `preventDefault` para las 4 teclas, congela el bucle si `paused`, reinicia si cambia `runKey`, llama a `onChange` solo ante cambios y a `onGameOver` una vez. Limpia todo al desmontar. Verificación: la nave se mueve y dispara en `/juegos/rocas/jugar` sin errores en consola, también tras navegar fuera y volver.
3. **Reproductor.** En `components/game-player.tsx`, cuando `id === "rocas"`: sustituir el intervalo aleatorio y la `game-arena` por `AsteroidsCanvas` dentro de `.crt-screen`; alimentar `score`, `lives` y `level` desde `onChange`; abrir el modal con `onGameOver` o con FIN; usar `runKey` en «JUGAR DE NUEVO». El resto de ids conserva el comportamiento actual. Verificación: otros juegos (`/juegos/caida/jugar`) siguen funcionando igual.
4. **Escalado y marco CRT.** Ajustar CSS de `.crt-screen` solo para que el canvas 800×600 se escale con `width: 100%`, proporción 4:3 y sin desbordar a 390 px. Añadir reglas nuevas en `app/globals.css` sin modificar clases existentes. Verificación: a 1440 px y a 390 px el canvas cabe, es nítido y no hay scroll horizontal.
5. **Pausa automática y foco.** Pausar al `visibilitychange` oculto y al `blur` de la ventana; mostrar el overlay «EN PAUSA» existente. Verificación: cambiar de pestaña pausa el juego y al volver hay que pulsar REANUDAR.
6. **Contenido del catálogo.** Actualizar el `long` de `rocas` en `lib/games.ts` quitando los OVNIs; mencionar el power-up de disparo triple. Verificación: el detalle `/juegos/rocas` muestra el texto nuevo.
7. **Ajuste del pie CRT.** Para `rocas`, el pie del marco muestra los controles («← → ROTAR · ↑ PROPULSAR · ESPACIO DISPARAR»); los demás juegos conservan el pie actual. Verificación: visible en escritorio y móvil.
8. **Movimiento reducido.** `prefers-reduced-motion` no afecta al juego en sí (es la acción principal), pero se mantiene el arranque en pausa si el usuario lo tiene activo, con el overlay «PULSA REANUDAR PARA EMPEZAR». Verificación: con la preferencia activa el juego no arranca solo.

---

## Criterios de aceptación

**Globales**

- [ ] `npm run build` termina sin errores ni errores de tipos.
- [ ] `npm run lint` termina sin errores.
- [ ] No hay errores ni advertencias de hidratación ni de React Strict Mode en la consola de `/juegos/rocas/jugar`.
- [ ] `references/started-games/` queda intacto.
- [ ] No se modifica ninguna clase existente de `app/globals.css`; solo se añaden reglas nuevas.
- [ ] Las pantallas de SPEC 01, 02 y 03 se ven igual que antes.

**Juego**

- [ ] `←` y `→` rotan la nave, `↑` la propulsa con inercia y llama naranja, `Espacio` dispara una bala por pulsación.
- [ ] Mantener `Espacio` no dispara en ráfaga continua (igual que el original).
- [ ] La nave, los asteroides y las balas aparecen por el borde opuesto al salir del canvas.
- [ ] Empiezan 4 asteroides grandes lejos del centro; un asteroide grande se parte en 2 medianos, un mediano en 2 pequeños y un pequeño desaparece.
- [ ] Destruir un grande suma 20, un mediano 50 y un pequeño 100.
- [ ] Al chocar con un asteroide se pierde una vida, la nave reaparece tras 2 s en el centro y parpadea 3 s sin poder morir.
- [ ] Al despejar todos los asteroides el nivel sube y aparecen `3 + nivel` asteroides.
- [ ] Tras destruir 5 asteroides sin power-up aparece uno garantizado («3x» cyan); recogerlo da disparo triple 5 s.
- [ ] Al perder la tercera vida se abre el modal «FIN DEL JUEGO» con la puntuación final real.

**Integración con el reproductor**

- [ ] El HUD muestra jugador, puntuación (`es-ES`), vidas (♥) y nivel reales, actualizados al instante.
- [ ] PAUSA congela el juego (nave, asteroides, partículas); REANUDAR lo continúa sin saltos.
- [ ] FIN abre el modal con la puntuación actual.
- [ ] «GUARDAR PUNTUACIÓN» escribe en `localStorage` (`av_scores`) una entrada `{ game: "rocas", score, name, at }`.
- [ ] «JUGAR DE NUEVO» reinicia con 0 puntos, 3 vidas, nivel 1 y asteroides nuevos.
- [ ] SALIR y «VOLVER AL VAULT» navegan correctamente; al volver a entrar, la partida empieza de cero y no hay bucles ni listeners duplicados.
- [ ] Cambiar de pestaña o perder el foco de la ventana pausa el juego.
- [ ] Las flechas y la barra espaciadora no hacen scroll de la página mientras se juega.
- [ ] `/juegos/caida/jugar` y los demás ids siguen con la simulación actual, sin cambios visibles.

**Rendimiento y limpieza**

- [ ] Al desmontar el componente se cancela el `requestAnimationFrame` y se retiran los listeners (verificable: tras navegar fuera, pulsar teclas no ejecuta código del juego).
- [ ] Con la pestaña oculta o la partida en pausa no hay trabajo de simulación.
- [ ] Una partida de 2 minutos no muestra crecimiento sostenido de memoria ni arrays sin purgar (balas, partículas y power-ups muertos se filtran).

**Responsive y accesibilidad**

- [ ] A 1440 px el canvas llena el marco CRT con proporción 4:3 y sin deformarse.
- [ ] A 390 px el canvas se escala, no hay scroll horizontal y el HUD no se rompe.
- [ ] El canvas tiene `aria-label` descriptivo y el pie CRT muestra los controles.
- [ ] Con `prefers-reduced-motion: reduce` el juego no arranca solo y espera a REANUDAR.

**Contenido**

- [ ] El texto de `rocas` ya no menciona OVNIs.

---

## Decisiones tomadas y descartadas

- **Sí:** portar el motor a TypeScript en `lib/games/asteroids/engine.ts` con un contrato `update/draw/snapshot/setKey/reset`. Permite conectar el HUD y el modal y deja el patrón para Tetris y Arkanoid. **No:** iframe con `public/` (HUD y puntuación aislados, requiere `postMessage`). **No:** pegar `game.js` en un `useEffect` (globals y listeners sin limpieza rompen con Strict Mode y al navegar).
- **Sí:** el motor no toca `window` ni `requestAnimationFrame`; eso vive en el componente. **No:** que el motor se auto-arranque como en el original.
- **Sí:** usar el id `rocas` ya existente en el catálogo (ROCAS, SHOOTER, `cover-rocas`). **No:** crear un 9.º juego «asteroids», porque duplicaría ROCAS y rompería el criterio de 8 tarjetas del SPEC 01.
- **Sí:** el reproductor decide por `id` entre el juego real y la simulación. **No:** definir ahora un registro genérico de juegos ni una interfaz común: con un solo juego real sería diseñar a ciegas. Se refactoriza al portar el segundo.
- **Sí:** mantener el flujo de puntuación actual (`saveScore` en `localStorage`). **No:** Supabase aquí, porque exige esquema, RLS, autenticación y sustituir los datos simulados del Salón de la Fama; merece su propio spec.
- **Sí:** aspecto vectorial blanco sobre negro, como el original. **No:** recolorear con la paleta neón, para no mezclar portado y rediseño; se puede abordar luego.
- **Sí:** HUD, vidas, nivel y fin de partida en el HUD y modal React existentes; se quitan del canvas. **No:** duplicar HUD dentro y fuera del canvas.
- **Sí:** solo teclado. **No:** controles táctiles ahora; en móvil el juego será visible pero no jugable hasta otro spec.
- **Sí:** pausa automática por visibilidad y foco, para no perder vidas en segundo plano. **No:** dejar que el bucle siga corriendo con la pestaña oculta.
- **Sí:** `Space` por flanco (un disparo por pulsación), como el `justPressed` original. **No:** disparo automático al mantener, que cambia el balance.
- **Sí:** conservar nombres de clases y constantes del original para poder cotejar. **No:** reescribir con otra arquitectura (ECS, etc.).
- **Sí:** verificación con `build`, `lint`, partida manual en el navegador y revisión visual. **No:** añadir un test runner.

---

## Riesgos identificados

| Riesgo                                                                                               | Mitigación                                                                                                                                |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Strict Mode monta el efecto dos veces y duplica bucles o listeners                                   | El efecto devuelve limpieza completa (`cancelAnimationFrame`, `removeEventListener`); criterio de «sin listeners tras desmontar».         |
| `cacheComponents` y el `Suspense` del reproductor cambian el momento de montaje                      | Mantener la estructura de `app/juegos/[id]/jugar/page.tsx`; el canvas solo se inicializa en `useEffect`.                                  |
| Llamar a `onChange` en cada frame provoca 60 renders de React por segundo                            | El componente compara el snapshot anterior y notifica solo si cambia `score`, `lives`, `level` o `status`.                                |
| `Math.random` en el render inicial causa errores de hidratación                                      | El motor se crea dentro de `useEffect`; el render inicial no usa aleatoriedad.                                                            |
| Las flechas y el espacio hacen scroll de la página o activan un botón enfocado                       | `preventDefault` en las 4 teclas mientras el juego está activo; quitar el foco de los botones tras pulsarlos si interfiere con `Espacio`. |
| `dt` grande al volver de una pestaña oculta hace que los objetos «salten»                            | `dt` máximo 0.05 s y pausa automática por visibilidad.                                                                                    |
| Escalar el canvas por CSS desenfoca las líneas finas                                                 | `lineWidth` del original se mantiene; se valida visualmente a 1440 px y 390 px, y se evalúa `devicePixelRatio` solo si se ve borroso.     |
| En móvil no hay teclado y el juego no es jugable                                                     | Aceptado y documentado como fuera de alcance; el pie CRT muestra los controles de teclado.                                                |
| El modal y el HUD quedan desincronizados si el estado llega por dos vías (`onChange` y `onGameOver`) | `onGameOver` es la única vía que abre el modal por fin de partida; `onChange` solo actualiza el HUD.                                      |

---

## Qué **no** está en este spec

- Guardado de puntuaciones en Supabase ni ranking real.
- Controles táctiles o gamepad.
- Sonido, música u OVNIs.
- Recoloreado con la paleta neón.
- Portado de Tetris y Arkanoid, o una arquitectura genérica de juegos.
- Cambios de reglas o balance.
- Tests automatizados.
- Internacionalización.

Cada uno de ellos, si se aborda, va en su propio spec.
