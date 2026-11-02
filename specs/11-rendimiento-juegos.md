# SPEC 11 — Rendimiento fluido de los juegos en escritorio y móvil

> **Estado:** Implementado
> **Depende de:** SPEC 04, SPEC 07, SPEC 08, SPEC 09, SPEC 10, `specs/games-jam/frogger/01-frogger-core.md` (Ranaria)
> **Fecha:** 2026-11-02
> **Objetivo:** Que los 5 juegos reales (`rocas`, `caida`, `bloque-buster`, `serpentina`, `ranaria`) mantengan ≥ 55 FPS medios y sin picos de frame > 50 ms en escritorio y en emulación móvil con CPU 4× más lenta, sin cambiar su aspecto, reglas ni puntuación.

---

## Por qué existe este spec

El usuario percibe tirones (FPS bajos) al jugar. No hay medición previa, pero la auditoría del código señala causas concretas:

- **Glow por elemento en los motores.** Cada bloque/celda/entidad pone `ctx.shadowBlur` antes de dibujar (23 usos en 5 motores; p. ej. `drawBlock` en `lib/games/tetris/engine.ts:78-83` hace un desenfoque por bloque y por frame). El `shadowBlur` del canvas 2D es la operación de dibujo más cara y escala con el número de elementos.
- **Capas decorativas siempre activas detrás del canvas.** `app/layout.tsx` monta `.av-bg` (rejilla en perspectiva animada con `mask-image`, más scanlines con `mix-blend-mode: overlay`) y `.av-noise` (SVG con `feTurbulence`) a pantalla completa; el marco CRT añade `mix-blend-mode: multiply` y `inset box-shadow` de 60 px; el nav usa `backdrop-filter: blur(8px)`. Con un `<canvas>` repintando a 60 FPS encima, el navegador recompone y mezcla todo cada frame.
- **Trabajo repetido por frame en `GameCanvas`.** `canvasRef.current?.getContext("2d")` se llama cada frame, el contexto se crea con canal alfa, y cada cambio de puntuación/HUD re-renderiza todo `GamePlayer`.

SPEC 10 prohibió tocar los motores por ser solo táctil. Este spec levanta esa restricción **solo para rendimiento visual interno**: el resultado en pantalla, las reglas, la física y la puntuación no cambian.

---

## Alcance

**Dentro:**

- **Línea base medible.** Antes de optimizar, medir cada juego (FPS medio, p95 de frame time, frames > 50 ms) y guardar la tabla en `references/performance-baseline.md` (nuevo), antes y después.
- **Glow de motores sin cambiar el look.** En `lib/games/{asteroids,tetris,arkanoid,snake,ranaria}/engine.ts`: sustituir el `shadowBlur` por elemento por una técnica equivalente y más barata, a elegir por caso: sprites con glow pre-renderizados en un canvas offscreen (creado una vez por partida/skin y copiados con `drawImage`), o agrupar varios elementos del mismo color en un único trazo con un solo `shadowBlur`. Las skins sin glow (`pal.glow` = 0) no pagan nada.
- **Eliminar asignaciones por frame en los motores** donde se detecten en hot paths de `update`/`draw` (p. ej. `.filter()` que recrea arrays de partículas/balas/asteroides en `asteroids/engine.ts`, `.map()`/spread en bucles): reutilizar o compactar en sitio, sin cambiar el orden ni el resultado de la simulación.
- **`GameCanvas`** (`components/games/game-canvas.tsx`): obtener el contexto 2D una sola vez por motor con `getContext("2d", { alpha: false })` y reutilizarlo en el bucle; no reinstalar efectos ni listeners por frame.
- **Re-renders de React.** Evitar que cada frame con cambio de HUD re-renderice componentes ajenos al HUD: memoizar o aislar el HUD/`TouchControls`/`SkinSelector` en `components/game-player.tsx` y `components/games/` para que los cambios de `score`/`hud` solo actualicen el HUD.
- **Capas decorativas solo en `/juegos/[id]/jugar`.** Mientras hay un juego real montado y en marcha, `GamePlayer` marca `document.documentElement` con `data-playing="true"` (efecto con limpieza al desmontar o al ocultarse la página por `cacheComponents`). Reglas CSS nuevas en `app/globals.css` bajo `[data-playing="true"]`: detener la animación de `.av-bg::before`, ocultar `.av-noise`, desactivar `mix-blend-mode` y `backdrop-filter` del nav y simplificar `inset box-shadow` de `.crt-screen`. Fuera de la página de juego el sitio queda idéntico.
- **Verificación con Playwright** en perfil de escritorio (1280×800) y perfil móvil (390×844, `hasTouch`, `isMobile`, CPU throttling 4×): script de medición con `requestAnimationFrame` + `performance.now()` durante una partida de 30 s por juego.
- Ranaria incluido como juego real registrado (`lib/games/registry.ts`).

**Fuera de alcance (para specs futuros):**

- Renderizado a `devicePixelRatio` / canvas hi-DPI y nitidez en pantallas retina (el usuario no reportó borrosidad).
- Cambiar reglas, física, velocidades, puntuación o tablas de niveles de cualquier juego.
- Cambiar paletas o colores de skins; el aspecto debe ser visualmente equivalente.
- `OffscreenCanvas` en Web Workers, WebGL/WebGPU o librerías de juegos.
- Rendimiento del resto del sitio (landing, biblioteca, salón) más allá de lo que toca `/jugar`.
- Retraso de entrada del mando táctil (no reportado).
- Calor/batería y peso de carga de página (no reportados).
- Tests automatizados permanentes (no hay test runner); el script de medición es una herramienta de verificación, no un test.
- Cambios en base de datos, `submitScore` o leaderboard.

---

## Modelo de datos

Este spec no introduce estructuras de datos en la app. Solo añade un artefacto de documentación y un atributo de DOM:

```md
<!-- references/performance-baseline.md -->

| Juego | Perfil | Skin | FPS medio | p95 frame (ms) | Frames > 50 ms | Antes/Después |
```

```html
<!-- Atributo en <html> mientras hay partida real montada -->
<html data-playing="true"></html>
```

Convenciones:

- Perfiles de medición: `desktop` (1280×800, sin throttling) y `mobile` (390×844, `hasTouch`, `isMobile`, CPU 4×).
- Skins medidas: `classic`, `neon` y `retro` de cada juego (el glow pesa más en `neon`/`retro`).
- Las reglas CSS nuevas llevan el prefijo de selector `[data-playing="true"]`; no se modifica ninguna clase existente.

---

## Plan de implementación

Antes del paso 1, leer en `node_modules/next/dist/docs/` la guía de App Router sobre Client Components y `cacheComponents` (comportamiento de páginas conservadas ocultas). Cada paso deja el sistema funcional y se commitea solo.

1. **Línea base.** Escribir el script de medición (Playwright, fuera de `app/`; p. ej. en el directorio scratchpad o `scripts/measure-fps.mjs`) y volcar la tabla «antes» en `references/performance-baseline.md` para los 5 juegos × 3 skins × 2 perfiles. Verificación: la tabla existe con 30 filas.
2. **`GameCanvas`.** Contexto `alpha: false` obtenido una vez por motor y reutilizado; sin lecturas redundantes en el frame. Verificación: `build`/`lint` pasan; los 5 juegos se ven y juegan igual.
3. **Marca `data-playing` y CSS.** Efecto en `GamePlayer` que pone/quita `data-playing` en `<html>` y reglas nuevas en `app/globals.css`. Verificación: en `/juegos/*/jugar` el fondo no anima y `.av-noise` no se pinta; en `/`, `/biblioteca` y `/salon` todo sigue igual; al salir de la página el atributo desaparece.
4. **Re-renders de React.** Aislar/memoizar HUD y mando para que no se re-renderice el árbol completo por frame de score. Verificación: React Profiler (o contador temporal) muestra que `GameCanvas`, `TouchControls` y `SkinSelector` no se re-renderizan al cambiar el score.
5. **Glow: Tetris y Serpentina** (los más simples: una celda = un sprite). Sprites con glow pre-renderizados por color y skin. Verificación: comparación visual lado a lado (screenshot antes/después) sin diferencias apreciables; FPS medido mejora.
6. **Glow: Bloque Buster y Ranaria.** Mismo enfoque para bloques/bola/paleta y para entidades de Ranaria. Verificación: igual que el paso 5.
7. **Glow y asignaciones: Rocas.** Agrupar trazos de nave/asteroides/balas por color con un solo `shadowBlur`; sustituir los `.filter()` por frame por compactación en sitio sin alterar el orden. Verificación: la simulación se comporta igual (mismo orden de colisiones y puntuación en una partida de prueba) y el FPS mejora.
8. **Medición final.** Repetir el script del paso 1 y completar la columna «después» en `references/performance-baseline.md`. Verificación: se cumplen los umbrales de los criterios de aceptación; si algún juego no los cumple, se documenta en el spec qué falta y se abre un spec de seguimiento.

---

## Criterios de aceptación

**Globales**

- [ ] `npm run build` termina sin errores ni errores de tipos.
- [ ] `npm run lint` termina sin errores.
- [ ] No hay errores ni advertencias de hidratación ni de Strict Mode en la consola de `/juegos/*/jugar`, en escritorio ni en móvil.
- [ ] Ningún cambio altera reglas, física, velocidades ni puntuación: una partida determinista de prueba por juego da el mismo resultado antes y después.
- [ ] No se modifica ninguna clase existente de `app/globals.css`; solo se añaden reglas nuevas con el selector `[data-playing="true"]`.

**Rendimiento (medido con el script del paso 1, 30 s de partida por juego)**

- [ ] En perfil `desktop`, los 5 juegos en las 3 skins mantienen ≥ 58 FPS medios.
- [ ] En perfil `mobile` (CPU 4×), los 5 juegos en las 3 skins mantienen ≥ 55 FPS medios.
- [ ] En ambos perfiles hay 0 frames > 50 ms durante los 30 s (se descarta el primer segundo de arranque).
- [ ] `references/performance-baseline.md` contiene la tabla «antes» y «después» de los 5 juegos × 3 skins × 2 perfiles.
- [ ] En ningún juego/skin el FPS medio «después» es peor que el «antes».

**Aspecto**

- [ ] En los 5 juegos y las 3 skins, una captura «después» es visualmente equivalente a la «antes» (mismos colores, glow visible en `neon`/`retro`, nada recortado).
- [ ] Las skins con `glow` = 0 siguen sin brillo y no ejecutan código de glow.
- [ ] En `/juegos/[id]/jugar` el fondo animado, el ruido y los overlays `mix-blend-mode` están desactivados mientras se juega.
- [ ] En `/`, `/biblioteca`, `/salon`, `/acerca-de` y `/acceso` el aspecto es idéntico al de antes.
- [ ] Al navegar de `/juegos/[id]/jugar` a otra ruta, `data-playing` desaparece de `<html>` y el fondo vuelve a animarse.

**Integración**

- [ ] Teclado, mando táctil (SPEC 10), PAUSA/REANUDAR, FIN, cambio de skin, «JUGAR DE NUEVO» y guardado de puntuación siguen funcionando en los 5 juegos.
- [ ] Al pausar, el bucle se detiene y no se pintan frames.
- [ ] Cambiar de skin y reiniciar no acumula canvas offscreen ni listeners (la memoria no crece tras 10 reinicios).
- [ ] Ningún archivo fuera de `lib/games/*/engine.ts`, `lib/games/sprites.ts` (helper común de sprites con glow, añadido en el paso 6), `components/game-player.tsx`, `components/games/*`, `app/globals.css`, `references/performance-baseline.md` y el script de medición cambia.

---

## Decisiones tomadas y descartadas

- **Sí:** medir antes de optimizar y guardar la línea base. **No:** optimizar a ciegas; sin números no hay forma de verificar «se ve fluido».
- **Sí:** objetivo numérico (≥ 55 FPS medios con CPU 4×, 0 frames > 50 ms). **No:** criterio cualitativo («se siente fluido»): no es booleano.
- **Sí:** mantener el look neón y optimizar el coste del glow (sprites pre-renderizados / trazos agrupados). **No:** quitar o reducir el glow, ni en móvil: cambiaría el aspecto de las skins `neon` y `retro`; queda como plan B solo si un juego no alcanza el objetivo tras optimizar.
- **Sí:** desactivar las capas decorativas solo en `/jugar` y mientras hay partida. **No:** hacerlo en todo el sitio ni solo en móvil: la ganancia es la misma en escritorio y el resto del sitio conserva su identidad visual.
- **Sí:** marcar `<html data-playing>` desde un efecto de `GamePlayer` con limpieza. **No:** el selector CSS `:has(.av-player)`: con `cacheComponents` Next conserva páginas ocultas en el DOM y el selector seguiría activo (ver riesgos).
- **Sí:** tocar `engine.ts` solo para rendimiento visual interno. **No:** cambiar reglas ni física; SPEC 10 prohibía tocar motores, esta excepción se limita a este spec.
- **Sí:** en Rocas, sprites para las balas y compactación en sitio de los arrays muertos. **No:** agrupar los asteroides en un único trazo con un solo `shadowBlur` (técnica prevista en el alcance «a elegir por caso»): medido en el navegador, un solo desenfoque sobre la caja envolvente de asteroides repartidos por el canvas es ~3× más lento (12 asteroides: 1,98 ms frente a 0,66 ms por frame; 30: 3,02 ms frente a 1,67 ms). La nave y el power-up (1 elemento cada uno) tampoco se tocan.
- **Sí:** `getContext("2d", { alpha: false })`. Canvas opaco: el navegador evita mezclar con la página. **No:** `desynchronized: true`: soporte irregular y riesgo de tearing.
- **Sí:** incluir Ranaria (ya registrada). **No:** excluirla: el usuario pidió «todos los juegos».
- **Sí:** hi-DPI (`devicePixelRatio`) queda fuera. **No:** subir la resolución del canvas: aumenta el coste de relleno, justo lo contrario del objetivo, y la borrosidad no fue reportada.
- **Sí:** verificación con Playwright (emulación + throttling) y capturas antes/después. **No:** añadir un test runner (decisión heredada de SPEC 10).

---

## Riesgos identificados

| Riesgo                                                                                         | Mitigación                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El glow pre-renderizado se ve distinto al `shadowBlur` directo (halo recortado o más tenue)    | Sprites con margen suficiente para el radio de `pal.glow`; comparación visual lado a lado como criterio de aceptación.                                              |
| Optimizar `filter()`/arrays en Rocas cambia el orden de colisiones o la puntuación             | Compactación en sitio que preserva el orden; partida determinista de prueba (semilla/entradas fijas) antes y después.                                               |
| La emulación de CPU 4× no representa un móvil real                                             | Es un umbral reproducible, no una garantía; se recomienda además una prueba manual en un móvil real (ver memoria «probar en celular»: `next start`, no `next dev`). |
| Medir en `next dev` sobreestima el coste (Strict Mode, sin minificar)                          | La medición se hace siempre con `next build` + `next start`.                                                                                                        |
| `data-playing` queda activo al navegar con `cacheComponents` (página oculta, estado sobrevive) | El atributo se pone y quita en un efecto con limpieza, igual que el reset de estado ya existente en `GamePlayer`; criterio de aceptación.                           |
| `alpha: false` pinta negro donde un motor dependía de transparencia                            | Cada motor ya rellena el fondo en `draw`; verificar visualmente los 5 juegos.                                                                                       |
| Un juego no alcanza el umbral tras optimizar                                                   | Se documenta en la tabla; plan B explícito: bajar el glow solo en táctil, decisión que requiere un spec de seguimiento.                                             |
| Memoizar el HUD introduce valores obsoletos (HUD que no se actualiza)                          | Criterio de integración y comprobación visual de puntuación, vidas y nivel en cada juego.                                                                           |

---

## Resultado de la implementación y excepciones aceptadas

Verificación final (2026-11-02): 28 de 30 combinaciones cumplen los umbrales (59,1–60 FPS; en escritorio, de 25,6–49,7 FPS antes a 59,3–60 FPS después). Tabla completa y repeticiones en `references/performance-baseline.md`. Se da la spec por Implementada aceptando estas excepciones:

- **Frame lento aislado en móvil.** `ranaria · mobile · retro` mostró 1 frame > 50 ms en 1 de 4 corridas, y `rocas · mobile · neon` en la corrida oficial (0 en 3 repeticiones). El criterio «0 frames > 50 ms» no se cumple de forma estable en esas combinaciones.
- **Memoria tras reinicios sin comparar con el código original.** El heap de JS crece ~233 KB en los primeros 10 reinicios y ~40–70 KB por cada 10 más, con y sin sprites (skin `classic`), por lo que no lo causan los sprites. No se comparó con `HEAD` ni se midió la memoria de los canvas auxiliares. No se acumulan listeners.
- **No verificado:** guardado de puntuación con sesión iniciada y prueba con dedo real en un móvil.

---

## Qué **no** está en este spec

- Renderizado hi-DPI / nitidez en pantallas retina.
- Cambios de reglas, física, velocidades, puntuación o paletas.
- Quitar o reducir el glow de las skins (solo plan B en un spec posterior).
- WebGL, WebGPU, `OffscreenCanvas` en Workers o librerías de juegos.
- Rendimiento del resto del sitio, carga de página, batería y latencia del mando.
- Cambios en base de datos, `submitScore` o leaderboard.
- Tests automatizados permanentes.

Cada uno de ellos, si se aborda, va en su propio spec.
