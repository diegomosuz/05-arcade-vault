# SPEC JAM — CRUCE: catálogo, puntuaciones y leaderboard

> **Estado:** Borrador
> **Depende de:** `specs/games-jam/cruce/01-motor.md`, SPEC 06
> **Fecha:** 2026-10-28
> **Tema de la jam:** Frogger clásico (cruzar carretera y río hasta las casillas de llegada)
> **Objetivo:** Dar de alta CRUCE como juego nuevo `ranked` en `games` con su portada `.cover-cruce`, de modo que sus partidas se guarden y aparezcan en `/salon`.

---

## Por qué existe este spec

`01-motor.md` crea el motor `lib/games/cruce/engine.ts` y la entrada `cruce` de `GAME_REGISTRY`. Sin fila en `games`, la ruta `/juegos/cruce/jugar` no existe y el juego no se ve en el catálogo.

SPEC 06 dejó genéricos `submitScore`, las vistas `game_stats` y `leaderboard`, `/salon` y el modal de fin de partida. Para CRUCE solo hace falta la fila en `games`, la portada y comprobar el flujo de punta a punta.

A diferencia de SPEC 07, 08 y 09, CRUCE no reemplaza una demo. Es una entrada nueva: necesita `insert`, una posición libre y una portada propia en `lib/games.ts` y `app/globals.css`.

---

## Alcance

**Dentro:**

- Migración `supabase/migrations/006_juego_cruce.sql` con un `insert` de la fila `cruce` (ARCADE, `cover-cruce`, `magenta`, posición 9, `ranked = true`, `max_score = 33830`).
- Literal `"cover-cruce"` en `CoverClass` de `lib/games.ts`.
- Portada CSS pura `.cover-cruce` (con `::before` y `::after`) en `app/globals.css`, diseñada con `/frontend-design`.
- Comprobación del pie CRT «← ↑ ↓ → / WASD SALTAR», que sale de `controlsLabel` definido en `01-motor.md`.
- Comprobación del escalado del canvas 800×600 y del HUD de 4 métricas a 1440 px y a 390 px.
- Comprobación del guardado con sesión, del modal sin sesión, del tope `max_score` y de la pestaña CRUCE en `/salon`.

**Fuera de alcance (para specs futuros):**

- Cambios en el motor o en las reglas: van en `01-motor.md` o en otro spec.
- Retirar, renombrar o reordenar la demo `ranaria` o cualquier otro juego del catálogo.
- Mostrar CRUCE en la vista previa de la home (`components/home/games-preview.tsx` muestra las 6 primeras posiciones).
- Cambios de esquema en `games` o `scores`.
- Imagen de portada o assets: la portada es CSS puro.
- Anticheat avanzado, rate limit o ranking en el detalle del juego.
- Tests automatizados (no hay test runner configurado).
- Internacionalización: solo español.

---

## Modelo de datos

La migración no cambia el esquema. Solo añade una fila: no hay que regenerar `lib/supabase/database.types.ts`.

```sql
-- supabase/migrations/006_juego_cruce.sql
-- SPEC JAM CRUCE: Frogger clásico como juego nuevo con puntuaciones.
insert into public.games (id, title, short, long, cat, cover, color, position, ranked, max_score)
values (
  'cruce',
  'CRUCE',
  'Cruza la carretera y el río sin perder el salto.',
  'Una rana de neón salta entre coches a toda velocidad, troncos a la deriva y tortugas que se sumergen. Llena las cinco casillas de llegada antes de que se agote el tiempo. Cada nivel acelera el tráfico.',
  'ARCADE',
  'cover-cruce',
  'magenta',
  9,
  true,
  33830
);
```

Tipo de portada (modificado):

```ts
// lib/games.ts
export type CoverClass =
  | "cover-bricks"
  // …literales actuales…
  | "cover-duelo"
  | "cover-cruce";
```

Portada (dirección para `/frontend-design`, no CSS final):

```css
/* app/globals.css, justo después de .cover-duelo */
.cover-cruce {
  background: /* franjas horizontales que imitan el tablero */;
}
.cover-cruce::before {
  /* río con troncos y casillas arriba */
}
.cover-cruce::after {
  /* carretera con coches neón y rana verde abajo */
}
```

Convenciones:

- `id = 'cruce'`, igual que la entrada de `GAME_REGISTRY` y que la carpeta del motor.
- Posición 9: la siguiente libre tras `duelo-pixel` (8). Ninguna otra fila cambia de posición.
- Textos sin comillas simples, para no escaparlas en SQL.
- `cat` y `color` respetan los `check constraints` de `002_games_scores.sql`.
- La portada vive cerca de las demás (`.cover-rana` está hacia la línea 513 de `app/globals.css`) y solo añade reglas nuevas.
- Portada en franjas horizontales, de arriba abajo: seto oscuro con 5 casillas, río azul con 2 troncos marrones, mediana morada, asfalto con 2 coches (amarillo `--yellow` y magenta `--magenta`) y la rana `--green` con brillo en la franja inferior.
- Debe distinguirse a simple vista de `.cover-rana` (franjas cian y un círculo verde centrado).
- Solo `background`, gradientes y pseudo-elementos; sin imágenes, sin `content` de texto largo y sin animación.

Cálculo de `max_score = 33 830` (detalle en `01-motor.md`): 10 niveles × (5 llegadas × 470 + 1 000) = 33 500, más 3 intentos fallidos × 110 = 330.

---

## Plan de implementación

Antes del paso 1, leer en `node_modules/next/dist/docs/` la guía de App Router sobre `cacheComponents` y `"use cache"`. Next.js 16.4 y React 19.3 tienen cambios incompatibles con versiones anteriores. Todo cambio visual se hace con `/frontend-design`, según `CLAUDE.md`. Cada paso se commitea solo.

1. **Migración.** Comprobar con `execute_sql` (solo `select`) que `select id from public.games where id = 'cruce' or position = 9` no devuelve filas y que `select count(*) from public.scores where game_id = 'cruce'` devuelve 0. Crear `supabase/migrations/006_juego_cruce.sql` y aplicarla con `apply_migration`. Verificación: `select id, ranked, max_score, position from public.games where id = 'cruce'` devuelve `true`, `33830` y `9`; `/juegos/cruce/jugar` carga y se juega.
2. **Tipo de portada.** Añadir `"cover-cruce"` a `CoverClass` en `lib/games.ts`. Verificación: `npm run build` y `npm run lint` pasan.
3. **Portada.** Diseñar `.cover-cruce` con `/frontend-design` en `app/globals.css`, después de `.cover-duelo`, sin tocar reglas existentes. Verificación: la tarjeta CRUCE de `/biblioteca` y la cabecera de `/juegos/cruce` muestran la portada a 1440 px y a 390 px, distinta de la de RANARIA.
4. **Pie CRT, HUD y escalado.** Comprobar el pie «← ↑ ↓ → / WASD SALTAR», el HUD con PUNTOS, VIDAS, NIVEL y TIEMPO, el escalado del canvas 800×600 a 1440 px y a 390 px y el arranque en pausa con `prefers-reduced-motion`. Si el HUD se rompe a 390 px, añadir solo reglas nuevas en `app/globals.css` con `/frontend-design`. Verificación: sin scroll horizontal y con las 4 métricas legibles.
5. **Seguridad de la tabla.** Ejecutar `get_advisors` de seguridad y probar un `insert` en `scores` con la clave publishable. Verificación: sin avisos nuevos y el `insert` falla.
6. **Guardado y Salón.** Con sesión iniciada, jugar una partida real de `cruce`, guardar la puntuación, comprobar la fila en `scores` con `execute_sql` (solo `select`) y verla en la pestaña CRUCE de `/salon` tras recargar. Verificación: la marca coincide con la del modal y la tarjeta muestra mejor marca y partidas.

---

## Criterios de aceptación

**Globales**

- [ ] `npm run build` termina sin errores ni errores de tipos.
- [ ] `npm run lint` termina sin errores.
- [ ] No hay errores ni advertencias de hidratación ni de React Strict Mode en la consola de `/juegos/cruce/jugar`, `/juegos/cruce`, `/biblioteca` ni `/salon`.
- [ ] `references/` queda intacto.
- [ ] No se modifica ninguna clase existente de `app/globals.css`; solo se añaden reglas nuevas.
- [ ] `lib/games/cruce/engine.ts` y `lib/games/registry.ts` no cambian en este spec.
- [ ] Las pantallas de los specs anteriores se ven igual salvo lo que este spec cambia.

**Base de datos y catálogo**

- [ ] `supabase/migrations/006_juego_cruce.sql` existe y coincide con lo aplicado.
- [ ] `games` tiene una fila `cruce` con `title = 'CRUCE'`, `cat = 'ARCADE'`, `cover = 'cover-cruce'`, `color = 'magenta'`, `position = 9`, `ranked = true` y `max_score = 33830`.
- [ ] Las otras 8 filas de `games`, incluida `ranaria`, no cambian.
- [ ] `lib/supabase/database.types.ts` no cambia.
- [ ] `get_advisors` de seguridad no reporta avisos nuevos.
- [ ] Un `insert` en `scores` con la clave publishable falla, incluso con sesión iniciada.
- [ ] `/biblioteca` muestra 9 juegos y CRUCE aparece el último, con su texto corto y la portada `.cover-cruce`.
- [ ] El filtro ARCADE de `/biblioteca` incluye CRUCE.
- [ ] La vista previa de `/` sigue mostrando los mismos 6 juegos que antes.
- [ ] `/juegos/cruce` y `/juegos/cruce/jugar` cargan; un id inexistente muestra la página de no encontrado.

**Portada**

- [ ] `CoverClass` en `lib/games.ts` incluye `"cover-cruce"`.
- [ ] `.cover-cruce` está en `app/globals.css` después de `.cover-duelo` y no usa imágenes.
- [ ] La portada muestra, de arriba abajo, casillas, río con troncos, mediana, carretera con coches y una rana verde.
- [ ] La portada de CRUCE se distingue de la de RANARIA en `/biblioteca`.
- [ ] La portada no se deforma ni se recorta de forma visible a 1440 px ni a 390 px.

**Integración con el reproductor**

- [ ] El pie del marco CRT muestra «← ↑ ↓ → / WASD SALTAR».
- [ ] El HUD muestra jugador, PUNTOS, VIDAS, NIVEL y TIEMPO sin romperse a 1440 px ni a 390 px.
- [ ] El modal de `cruce` no muestra el aviso «ESTE JUEGO ES UNA DEMO».
- [ ] `/juegos/rocas/jugar`, `/juegos/caida/jugar`, `/juegos/bloque-buster/jugar`, `/juegos/serpentina/jugar` y las demos siguen igual que antes.

**Guardado y leaderboard**

- [ ] Con sesión iniciada, al terminar `cruce` el modal muestra el `username` real y «GUARDAR PUNTUACIÓN» inserta una fila en `scores` con `game_id = 'cruce'`, el `user_id` del usuario y la puntuación mostrada.
- [ ] Pulsar «GUARDAR PUNTUACIÓN» dos veces rápido inserta una sola fila.
- [ ] Sin sesión, el modal muestra «INICIA SESIÓN PARA GUARDAR TU PUNTUACIÓN» con enlace a `/acceso` y sin botón de guardar.
- [ ] `submitScore('cruce', 33831)` devuelve `invalid` y no inserta.
- [ ] `submitScore('cruce', 33830)` es aceptado con sesión iniciada.
- [ ] `/salon` tiene una pestaña CRUCE.
- [ ] Tras guardar, la marca aparece en la pestaña CRUCE de `/salon` al recargar, una sola fila por jugador (la mejor).
- [ ] Sin partidas guardadas, la pestaña CRUCE de `/salon` muestra el estado vacío existente.
- [ ] La tarjeta y el detalle de CRUCE muestran la mejor marca y el número de partidas reales.

**Responsive y accesibilidad**

- [ ] A 1440 px el canvas llena el marco CRT con proporción 4:3 y sin deformarse.
- [ ] A 390 px el canvas se escala, no hay scroll horizontal y el HUD no se rompe.
- [ ] El canvas tiene `role="img"` y el `aria-label` de la entrada `cruce`.
- [ ] Con `prefers-reduced-motion: reduce` el juego no arranca solo y espera a REANUDAR.

---

## Decisiones tomadas y descartadas

- **Sí:** un solo juego en esta jam, por excepción autorizada por el usuario. **No:** los 3 juegos de la regla del agente `game-jam`.
- **Sí:** fila nueva `cruce` con `insert`. Es la regla de la jam: juegos nuevos, no reemplazos. **No:** `update` sobre `ranaria`: cambiaría una demo que el usuario no pidió tocar.
- **Sí:** mantener `ranaria` como demo. **No:** borrarla, renombrarla o moverla de posición: es una decisión de catálogo que va en otro spec.
- **Sí:** categoría ARCADE. Frogger es un arcade de reflejos y no encaja en PUZZLE, SHOOTER ni VERSUS. **No:** forzar VERSUS para equilibrar el catálogo: no hay rival.
- **Sí:** color `magenta`. Ninguna entrada ARCADE lo usa y separa CRUCE de `serpentina` y `ranaria` (ambas `green`). **No:** `green`, aunque la rana sea verde: habría tres tarjetas ARCADE verdes. **No:** `cyan`, que ya usa `bloque-buster`.
- **Sí:** posición 9, al final. **No:** reordenar las posiciones existentes: cambiaría la vista previa de la home y las pantallas de specs anteriores.
- **Sí:** textos del catálogo nuevos y propios. **No:** reutilizar los de `ranaria`: hablan de «nenúfares» y no mencionan tortugas ni niveles.
- **Sí:** número de migración `006`, el siguiente libre tras `005_juego_serpentina.sql`. **No:** reutilizar un número: rompería el orden de aplicación.
- **Sí:** `max_score = 33830`, calculado en `01-motor.md`. **No:** el defecto de 1 000 000 de la columna, sin base.
- **Sí:** portada CSS pura en franjas horizontales que imitan el tablero, diseñada con `/frontend-design`. **No:** reutilizar `cover-rana`: dos tarjetas con la misma portada confunden. **No:** imagen PNG: las demás portadas son CSS puro.
- **Sí:** sin animación en la portada. **No:** coches o troncos animados: ninguna otra portada se anima y costaría trabajo en la biblioteca.
- **Sí:** verificación con `build`, `lint`, consultas SQL de solo lectura, `get_advisors` y partida manual con sesión. **No:** añadir un test runner.

---

## Riesgos identificados

| Riesgo                                                                           | Mitigación                                                                                                                  |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| La posición 9 o el id `cruce` ya existen al aplicar la migración                 | El paso 1 lo comprueba con un `select` antes de crear el archivo; si existen, se elige otra posición y se anota en el spec. |
| La fila se inserta antes de que exista `.cover-cruce` y la tarjeta se ve vacía   | Aceptado durante los pasos 1 a 3; la portada llega en el paso 3, antes de cerrar el spec.                                   |
| `cacheComponents` sirve el catálogo cacheado sin CRUCE tras la migración         | Reiniciar `npm run dev` o invalidar la etiqueta `games`; se valida en el paso 1.                                            |
| `generateStaticParams` no incluye `cruce` en un build previo                     | Se ejecuta `npm run build` tras la migración; la ruta se genera desde `getGames()`.                                         |
| El HUD de 4 métricas más jugador se rompe a 390 px                               | Paso 4 específico; si hace falta, reglas nuevas en `app/globals.css` con `/frontend-design`.                                |
| La portada se confunde con `.cover-rana`                                         | Criterio explícito de distinción visual en `/biblioteca`.                                                                   |
| CRUCE y `ranaria` conviven con el mismo concepto y confunden al jugador          | Aceptado de forma explícita; retirar o fusionar `ranaria` queda para un spec que decida el usuario.                         |
| Strict Mode monta el efecto dos veces y duplica bucles o listeners               | `GameCanvas` ya devuelve limpieza completa; heredado de `01-motor.md`.                                                      |
| Escalar el canvas por CSS desenfoca líneas finas                                 | Validar visualmente a 1440 y 390 px; evaluar `devicePixelRatio` solo si se ve borroso.                                      |
| En móvil no hay teclado y el juego no es jugable                                 | Aceptado: fuera de alcance; el pie CRT muestra los controles de teclado.                                                    |
| Un usuario autenticado llama a `submitScore` con una marca falsa dentro del tope | Aceptado en el MVP: `ranked` y `max_score` limitan el daño (aquí 33 830). Anticheat real, en otro spec.                     |
| El `max_score` es demasiado bajo y rechaza partidas legítimas                    | Calculado con cotas seguras en `01-motor.md`; ajustable con una migración posterior si cambian las reglas.                  |
| Hay marcas previas de `cruce` en `scores` que contaminan el ranking              | El paso 1 comprueba `select count(*) from public.scores where game_id = 'cruce'`; debe ser 0 porque el juego es nuevo.      |

---

## Qué **no** está en este spec

- Cambios en el motor, en las reglas o en el registro.
- Cambios en la demo `ranaria` o en el orden del catálogo.
- CRUCE en la vista previa de la home.
- Cambios de esquema en la base de datos.
- Portada con imagen o animación.
- Anticheat avanzado, rate limit o ranking en el detalle del juego.
- Tests automatizados.
- Internacionalización.

Cada uno de ellos, si se aborda, va en su propio spec.
