# SPEC 10 — Controles táctiles para jugar desde el móvil

> **Estado:** Implementado
> **Depende de:** SPEC 04, SPEC 06, SPEC 07, SPEC 08, SPEC 09
> **Fecha:** 2026-11-02
> **Objetivo:** Que los 4 juegos reales (`rocas`, `caida`, `bloque-buster`, `serpentina`) se puedan jugar completos en un móvil con pantalla táctil en vertical, mediante un mando de botones virtuales en pantalla que emite los mismos códigos de tecla que ya entienden los motores.

---

## Por qué existe este spec

`GameCanvas` (SPEC 07) solo escucha `keydown`/`keyup` en `window` y llama a `game.setKey(code, down)`. En un móvil no hay teclado, así que los juegos arrancan pero no se pueden controlar. SPEC 09 lo dejó anotado como riesgo aceptado y fuera de alcance.

El contrato `GameEngine.setKey(code, down)` ya modela «tecla pulsada / soltada», y los motores gestionan solos las teclas mantenidas (Caída tiene auto-repetición propia con `REPEAT_DELAY`/`REPEAT_INTERVAL`). Por eso basta con un mando en pantalla que llame a `setKey` con los mismos `KeyboardEvent.code`: **ningún motor cambia**.

---

## Alcance

**Dentro:**

- Extensión opcional del contrato: campo `touch` en `GameDefinition` (`lib/games/types.ts`) con la distribución de botones del mando y el texto del pie CRT táctil.
- Declaración de `touch` en las 4 entradas de `lib/games/registry.ts`, con esta distribución (izquierda = pulgar izquierdo, derecha = pulgar derecho):
  - **Rocas:** izquierda `◀` (`ArrowLeft`, rotar izq.) y `▶` (`ArrowRight`, rotar der.); derecha `▲` (`ArrowUp`, propulsar) y `●` (`Space`, disparar).
  - **Caída:** izquierda `◀` (`ArrowLeft`), `▼` (`ArrowDown`, bajar) y `▶` (`ArrowRight`); derecha `⟳` (`ArrowUp`, rotar) y `⤓` (`Space`, caída).
  - **Bloque Buster:** un botón ancho `◀` (`ArrowLeft`) a la izquierda y otro `▶` (`ArrowRight`) a la derecha.
  - **Serpentina:** cruceta centrada `▲ ▼ ◀ ▶` (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`).
  - `KeyX` (Caída) y `W A S D` (Serpentina) no tienen botón: duplican a otros.
- Componente nuevo `components/games/touch-controls.tsx`: mando con Pointer Events, multitáctil (p. ej. rotar y disparar a la vez en Rocas), que llama a `press(code, true)` al tocar y `press(code, false)` al soltar, cancelar o perder la captura del puntero.
- `GameCanvas` expone una función de entrada (`press`) que aplica las mismas reglas que el teclado: solo códigos de `def.keys` y, con pausa, ignora pulsaciones (las sueltas sí se procesan).
- Detección con la media query `(pointer: coarse)` mediante `useSyncExternalStore` (mismo patrón que `prefers-reduced-motion` en `components/game-player.tsx`). Valor `false` en servidor e hidratación.
- Orientación vertical: canvas arriba, mando debajo del marco CRT. En horizontal funciona igual, sin layout específico.
- Evitar gestos del navegador al jugar: `touch-action: none` en el canvas y el mando, `user-select: none`, `-webkit-touch-callout: none` y sin menú contextual al mantener pulsado un botón. Sin zoom por doble toque sobre el mando.
- Vibración háptica de ~10 ms al pulsar un botón con `navigator.vibrate`, solo si existe y si no está activo `prefers-reduced-motion: reduce`.
- Pie CRT adaptado: con puntero táctil, muestra `def.touch.label` en lugar de `def.controlsLabel`.
- Revisión de HUD, botones PAUSA/FIN/SALIR, selector de skins y modal de fin a 360 y 390 px: sin solaparse con el mando y sin scroll horizontal. Solo reglas CSS nuevas en `app/globals.css`.
- Aspecto del mando diseñado con `/frontend-design` (según `CLAUDE.md`), coherente con el marco CRT y las teclas de skin existentes, legible en modo oscuro.

**Fuera de alcance (para specs futuros):**

- Gestos (deslizar, arrastrar la paleta, tocar el canvas para disparar).
- Layout específico en horizontal, pantalla completa (Fullscreen API) y bloqueo de orientación.
- Interruptor para mostrar/ocultar el mando o para desactivar la vibración, y cualquier preferencia en `localStorage`.
- Mando para las 4 demos simuladas: no tienen entrada real y no muestran mando.
- Gamepad físico (Gamepad API).
- Cambios en los motores (`lib/games/*/engine.ts`) o en sus reglas.
- PWA, instalación en pantalla de inicio o modo offline.
- Cambios en base de datos, `submitScore` o leaderboard.
- Tests automatizados (no hay test runner configurado).
- Internacionalización: solo español.

---

## Modelo de datos

Extensión retrocompatible del contrato. Un juego sin `touch` no muestra mando.

```ts
// lib/games/types.ts
export type TouchButton = {
  code: string; // KeyboardEvent.code; debe estar en def.keys
  label: string; // glifo visible, p. ej. "◀"
  ariaLabel: string; // p. ej. "Rotar a la izquierda"
  wide?: boolean; // botón ancho (Bloque Buster)
};

export type TouchLayout =
  | { kind: "split"; label: string; left: TouchButton[]; right: TouchButton[] }
  | {
      kind: "dpad";
      label: string;
      up: TouchButton;
      down: TouchButton;
      left: TouchButton;
      right: TouchButton;
    };

export type GameDefinition = {
  // …campos actuales…
  touch?: TouchLayout; // label = texto del pie CRT en táctil
};
```

Ejemplo de entrada (Rocas):

```ts
// lib/games/registry.ts
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
```

Textos del pie táctil:

| Juego         | `touch.label`                             |
| ------------- | ----------------------------------------- |
| Rocas         | `◀ ▶ ROTAR · ▲ PROPULSAR · ● DISPARAR`    |
| Caída         | `◀ ▶ MOVER · ▼ BAJAR · ⟳ ROTAR · ⤓ CAÍDA` |
| Bloque Buster | `◀ ▶ MOVER LA PALETA`                     |
| Serpentina    | `▲ ▼ ◀ ▶ MOVER LA SERPIENTE`              |

Entrada de `GameCanvas`:

```ts
// components/games/game-canvas.tsx
type Props = {
  // …props actuales…
  inputRef?: React.RefObject<((code: string, down: boolean) => void) | null>;
};
```

`GameCanvas` rellena `inputRef.current` al crear el motor y lo pone a `null` en la limpieza. `GamePlayer` crea el ref y lo pasa a `TouchControls`.

Convenciones:

- Archivos nuevos: `components/games/touch-controls.tsx`. Archivos modificados: `lib/games/types.ts`, `lib/games/registry.ts`, `components/games/game-canvas.tsx`, `components/game-player.tsx`, `app/globals.css` (solo reglas nuevas).
- Clases CSS nuevas con prefijo `touch-` (`touch-pad`, `touch-btn`, …).
- Los botones son `<button type="button">` con `aria-label`; el `pointerdown` hace `preventDefault()` y `setPointerCapture` para no robar el foco ni generar clics fantasma.
- Estado visual «pulsado» por botón, derivado de los punteros activos; al pausar o terminar la partida se sueltan todos los botones (visual y `press(code, false)`).
- Sin persistencia: no se guarda nada entre sesiones.

---

## Plan de implementación

Antes del paso 1, leer en `node_modules/next/dist/docs/` la guía de App Router sobre Client Components. Cada paso deja el sistema funcional y se commitea solo.

1. **Contrato.** Añadir `TouchButton`, `TouchLayout` y `touch?` a `lib/games/types.ts`. Verificación: `npm run build` y `npm run lint` pasan sin tocar el registro.
2. **Registro.** Declarar `touch` en las 4 entradas de `lib/games/registry.ts` con la distribución y los textos de este spec; cada `code` está en `def.keys`. Verificación: `build` y `lint` pasan; en escritorio nada cambia.
3. **Entrada en `GameCanvas`.** Añadir la prop `inputRef` y exponer `press(code, down)` con las mismas reglas que los listeners de teclado. Verificación: `build`/`lint` pasan; los 4 juegos se juegan igual con teclado.
4. **Detección táctil.** Hook `useCoarsePointer()` con `useSyncExternalStore` sobre `(pointer: coarse)` en `components/game-player.tsx` (o junto al de reduced motion). Verificación: en DevTools con emulación de móvil devuelve `true`; en escritorio `false`; sin avisos de hidratación.
5. **Componente `TouchControls`.** Crear `components/games/touch-controls.tsx` con ambos `kind` (`split`, `dpad`), Pointer Events multitáctil, liberación en `pointerup`/`pointercancel`/`lostpointercapture`, suelta total al pausar, y vibración condicionada. Diseño con `/frontend-design`. Verificación: `build`/`lint` pasan.
6. **Integración en `GamePlayer`.** Renderizar `TouchControls` debajo del `.crt` solo si `isReal && def.touch && coarse`; pasar `inputRef` y `paused`. Cambiar el texto del pie CRT a `def.touch.label` en táctil. Verificación: emulación móvil muestra el mando y el pie táctil; escritorio no.
7. **CSS móvil.** Reglas nuevas en `app/globals.css`: `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none` en canvas y mando; tamaños de botón ≥ 48 px; ajustes de `.av-player`, `.player-hud` y `.hud-actions` a ≤ 400 px para que nada se solape ni desborde. Verificación: a 360 y 390 px sin scroll horizontal.
8. **Verificación en dispositivo.** Jugar una partida de cada juego en un móvil real (o Playwright con contexto `hasTouch` + `isMobile`, viewport 390×844) y completar los criterios de aceptación.

---

## Criterios de aceptación

**Globales**

- [ ] `npm run build` termina sin errores ni errores de tipos.
- [ ] `npm run lint` termina sin errores.
- [ ] No hay errores ni advertencias de hidratación ni de Strict Mode en la consola de `/juegos/*/jugar`, en escritorio ni en móvil.
- [ ] Ningún archivo `lib/games/*/engine.ts` cambia.
- [ ] No se modifica ninguna clase existente de `app/globals.css`; solo se añaden reglas nuevas.
- [ ] En escritorio con ratón (`pointer: fine`), las 4 páginas de juego se ven y se juegan exactamente igual que antes: sin mando y con el pie de teclado.

**Contrato y registro**

- [ ] `GameDefinition.touch` es opcional; los 4 juegos reales lo declaran.
- [ ] Todo `code` de `touch` está incluido en `def.keys` del mismo juego.
- [ ] Las distribuciones coinciden con las de este spec (Rocas 2+2, Caída 3+2, Bloque Buster 1+1 anchos, Serpentina cruceta).

**Mando**

- [ ] Con `pointer: coarse` el mando aparece debajo del marco CRT en los 4 juegos reales; en las demos no aparece.
- [ ] Mantener pulsado un botón equivale a mantener la tecla: la nave de Rocas sigue rotando, la pieza de Caída se auto-repite, la paleta de Bloque Buster sigue moviéndose.
- [ ] Dos botones a la vez funcionan (p. ej. `▶` + `●` en Rocas rota y dispara a la vez).
- [ ] Al soltar el dedo, arrastrarlo fuera del botón o recibir `pointercancel`, la tecla se suelta (sin teclas «pegadas»).
- [ ] Con el juego en pausa, tocar el mando no mueve nada; al pausar con un botón pulsado, el botón se suelta.
- [ ] Un giro de 180° en Serpentina por la cruceta no tiene efecto (misma regla que con teclado).
- [ ] Tocar los botones no hace zoom, scroll, selección de texto ni abre el menú contextual, también con doble toque o pulsación larga.
- [ ] Cada botón tiene `aria-label` y un área táctil de al menos 48×48 px.
- [ ] En un dispositivo compatible, cada pulsación vibra ~10 ms; con `prefers-reduced-motion: reduce` no vibra; en iOS (sin `navigator.vibrate`) no hay errores.

**Pie CRT**

- [ ] En táctil, el pie muestra `touch.label` del juego; en escritorio, `controlsLabel`.

**Layout móvil (vertical)**

- [ ] A 360 px y 390 px no hay scroll horizontal en `/juegos/*/jugar`.
- [ ] A 390×844 el canvas y el mando completo caben a la vez en el viewport (se permite desplazar la página para ocultar la navegación).
- [ ] El HUD, los botones PAUSA/FIN/SALIR y el selector de skins no se solapan ni se cortan.
- [ ] El modal «FIN DEL JUEGO» se ve completo y sus botones son pulsables por encima del mando.
- [ ] En horizontal el juego sigue siendo jugable (sin layout específico).

**Integración**

- [ ] REANUDAR, «JUGAR DE NUEVO», cambiar de skin y SALIR siguen funcionando en móvil; tras reiniciar, el mando controla el motor nuevo.
- [ ] Con sesión iniciada en móvil se puede terminar una partida y guardar la puntuación de cualquiera de los 4 juegos.
- [ ] Al desmontar, `inputRef.current` queda en `null` y no quedan listeners de puntero activos.

---

## Decisiones tomadas y descartadas

- **Sí:** botones virtuales que emiten `KeyboardEvent.code` existentes. **No:** gestos (swipe, arrastrar la paleta): exigen cambiar motores y el contrato con posiciones de puntero. **No:** mixto botones + swipe: más casos que verificar sin necesidad.
- **Sí:** distribución propia por juego (Rocas 2+2, Caída 3+2, Bloque Buster 1+1 anchos, Serpentina cruceta). **No:** cruceta común con A/B: deja direcciones sin uso y es menos clara en Bloque Buster.
- **Sí:** declarar el mando en `GameDefinition.touch`, junto al resto de la definición del juego. **No:** archivo aparte `touch-layouts.ts`: duplica la fuente de verdad.
- **Sí:** detección con `(pointer: coarse)`. **No:** breakpoint de ancho: falla en tablets grandes y en ventanas estrechas de escritorio. **No:** interruptor manual con `localStorage`: no hace falta para este alcance.
- **Sí:** solo layout vertical, canvas arriba y mando debajo. **No:** layout horizontal específico ni pantalla completa: más CSS y soporte irregular de Fullscreen API en iOS Safari.
- **Sí:** vibración siempre activa, salvo con `prefers-reduced-motion`. **No:** interruptor de vibración.
- **Sí:** exponer la entrada con `inputRef` desde `GameCanvas`, que ya es dueño del motor y de las reglas de pausa. **No:** que `TouchControls` despache `KeyboardEvent` sintéticos en `window`: frágil y mezcla dos vías de entrada.
- **Sí:** sin mando en las demos simuladas: no tienen entrada real. **No:** mando decorativo que no hace nada.
- **Sí:** sin botón para `KeyX` ni `W A S D`: duplican a otros botones.
- **Sí:** verificación con `build`, `lint`, emulación móvil y prueba en dispositivo real. **No:** añadir un test runner.

---

## Riesgos identificados

| Riesgo                                                                                                         | Mitigación                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Una tecla queda «pegada» si el dedo sale del botón o el sistema cancela el toque                               | `setPointerCapture` + liberar en `pointerup`, `pointercancel` y `lostpointercapture`; criterio explícito.                          |
| Multitáctil: soltar un dedo libera la tecla de otro botón                                                      | Estado por `pointerId`; un código solo se suelta cuando ningún puntero activo lo mantiene.                                         |
| Doble toque o pulsación larga hacen zoom, seleccionan texto o abren el menú contextual (sobre todo iOS Safari) | `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none` y `preventDefault` en `contextmenu`; validar en iOS real. |
| Pulsar un botón del mando le da el foco y luego Espacio/Enter de un teclado lo activa                          | `preventDefault` en `pointerdown` evita el foco; el mando solo aparece con `pointer: coarse`.                                      |
| Dispositivos híbridos (portátil táctil con ratón) reportan `pointer: fine` y no muestran mando                 | Aceptado: decisión explícita; un interruptor manual iría en otro spec.                                                             |
| Desajuste de hidratación al decidir si se muestra el mando                                                     | `useSyncExternalStore` con `false` en servidor; el mando aparece tras el montaje.                                                  |
| El mando, el HUD y el CRT no caben a la vez en 390×844                                                         | Reducir padding de `.av-player`/`.crt` solo a ≤ 400 px con reglas nuevas; criterio de «caben a la vez».                            |
| `window.blur` / `visibilitychange` pausan con un botón pulsado                                                 | Al pausar, `GameCanvas` ya suelta todas las teclas y `TouchControls` limpia su estado visual.                                      |
| `navigator.vibrate` no existe en iOS o lanza en algunos navegadores                                            | Llamada protegida (`navigator.vibrate?.(10)` dentro de `try`).                                                                     |
| Botones demasiado pequeños o pegados provocan pulsaciones erróneas                                             | Área táctil ≥ 48×48 px y separación entre botones; validar en dispositivo real.                                                    |

---

## Qué **no** está en este spec

- Gestos táctiles (swipe, arrastrar, tocar el canvas).
- Layout horizontal específico, pantalla completa o bloqueo de orientación.
- Interruptores de mando o vibración y preferencias persistidas.
- Mando para las demos simuladas.
- Gamepad físico.
- Cambios en motores, reglas, base de datos o leaderboard.
- PWA o modo offline.
- Tests automatizados.
- Internacionalización.

Cada uno de ellos, si se aborda, va en su propio spec.
