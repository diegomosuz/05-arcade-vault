# SPEC 01 — MVP visual: las cinco pantallas de Arcade Vault

> **Estado:** Aprobado
> **Depende de:** ninguna (el commit `01-styles` ya dejó `app/globals.css` y `app/layout.tsx` listos)
> **Fecha:** 2026-10-07
> **Objetivo:** Portar a Next.js (App Router, TypeScript) las cinco pantallas de `references/templates/` (biblioteca, detalle, reproductor, acceso y salón de la fama) con datos simulados y sin implementar ningún juego.

---

## Por qué existe este spec

`references/templates/` es un prototipo en React 18 UMD + Babel con ruteo por `location.hash`. No sirve como base de producción. Este spec lo convierte en rutas reales del App Router, conservando el aspecto exacto y dejando los puntos de enganche (puntuaciones, sesión, reproductor) para que specs futuros añadan juegos y backend sin rehacer la UI.

---

## Alcance

**Dentro:**

- Cinco rutas del App Router con las pantallas de la plantilla:
  - `/` → Biblioteca (hero, buscador, chips de categoría, grilla de tarjetas con efecto tilt).
  - `/juegos/[id]` → Detalle del juego (portada, tags, estadísticas, ranking de 10 filas).
  - `/juegos/[id]/jugar` → Reproductor (HUD, marco CRT, arena decorativa, pausa, FIN, modal de fin de juego con guardado).
  - `/acceso` → Iniciar sesión / Crear cuenta (formulario simulado).
  - `/salon` → Salón de la Fama (tabs por juego, podio, tabla de 12 filas, fila "tu mejor marca").
- Navbar (con menú móvil) y footer compartidos en `app/layout.tsx`, tal como en `app.jsx` y `nav.jsx`.
- Datos simulados en módulos TypeScript: catálogo de 8 juegos, categorías y generador `seededScores`.
- Sesión simulada y puntuaciones guardadas en `localStorage` (`av_user`, `av_scores`).
- Reutilización de las clases globales ya existentes en `app/globals.css` (`.btn`, `.card`, `.av-nav`, `.crt`, `.podium`, etc.).
- Puntuación simulada en el reproductor (`setInterval` cada 220 ms), idéntica a la plantilla.
- Elementos decorativos replicados sin lógica: `CRÉDITOS · 03`, botones GOOGLE/GITHUB, "Jugar como invitado".
- Ruta 404 para `id` de juego inexistente (`notFound()`).

**Fuera de alcance (para specs futuros):**

- Cualquier juego real (motor, controles, colisiones, niveles).
- Backend, base de datos y autenticación real (OAuth, contraseñas, sesiones en servidor).
- Puntuaciones globales reales: el ranking sigue siendo `seededScores`.
- Que `av_scores` alimente el ranking o "tu mejor marca" (solo se escribe, no se lee).
- Sistema de créditos funcional.
- Migrar `globals.css` a CSS Modules o a utilidades Tailwind.
- Tests automatizados (no hay test runner configurado).
- i18n: la UI queda en español únicamente.
- Panel "tweaks" y clases `.spinner`/`.tw-*` de la plantilla (no se usan en ninguna pantalla).

---

## Modelo de datos

Los tipos nuevos viven en `lib/` (el alias `@/*` apunta a la raíz del repo).

```ts
// lib/games.ts
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type CoverClass =
  | "cover-bricks" | "cover-tetro" | "cover-snake" | "cover-glot"
  | "cover-invaders" | "cover-rocas" | "cover-rana" | "cover-duelo";

export type Game = {
  id: string;          // slug: "bloque-buster", "caida", ...
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: CoverClass;   // clase CSS ya definida en globals.css
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string;       // texto ya formateado, p. ej. "12.4K"
};

export const GAMES: Game[];                    // los 8 juegos de data.jsx, sin cambios de contenido
export const CATS: ("TODOS" | Category)[];     // ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"]
export function getGame(id: string): Game | undefined;
```

```ts
// lib/scores.ts
export type ScoreRow = { rank: number; name: string; score: number; date: string }; // date: "dd/mm/2026"
export function seededScores(seed: number, count?: number): ScoreRow[]; // misma fórmula que data.jsx (determinista)
```

```ts
// lib/session.tsx  ("use client")
export type User = { name: string };           // MAYÚSCULAS, máx. 10 caracteres
// Contexto: { user: User | null; login(u: User | null): void; signOut(): void; saveScore(e): void; ready: boolean }

export type SavedScore = { game: string; score: number; name: string; at: number };
```

Convenciones de persistencia:

- `localStorage["av_user"]` guarda `User` en JSON. Ausente significa invitado.
- `localStorage["av_scores"]` guarda `SavedScore[]`. Solo se añaden entradas.
- Todo acceso a `localStorage` va dentro de `try/catch` y solo después del montaje, para evitar errores de hidratación. `ready` indica que ya se leyó.
- Formato numérico: `toLocaleString("es-ES")`.

---

## Plan de implementación

Antes del paso 1, leer la guía relevante en `node_modules/next/dist/docs/` (App Router, `cacheComponents`, `generateStaticParams`, `notFound`, `Link`). Next.js 16.4 tiene cambios incompatibles con versiones anteriores.

1. **Datos.** Crear `lib/games.ts` y `lib/scores.ts` portando `data.jsx` a TypeScript. Verificación: `npm run build` pasa.
2. **Sesión.** Crear `lib/session.tsx` (contexto cliente con `login`, `signOut`, `saveScore`, lectura diferida de `localStorage`). Verificación: `npm run build` pasa.
3. **Navbar y footer.** Crear `components/nav.tsx` (cliente: menú móvil, estado activo según `usePathname`, botón de sesión) y montar `SessionProvider`, `Nav` y el footer en `app/layout.tsx`, dentro de `<main className="av-main">`. Reutilizar los `av-bg`/`av-noise` que ya están en el layout. Verificación: `npm run dev` muestra la barra sobre el scaffold actual y el menú móvil abre y cierra a <840 px.
4. **Biblioteca (`/`).** Reemplazar `app/page.tsx`. Crear `components/game-card.tsx` (tilt con `onMouseMove`) y `components/library.tsx` (cliente: búsqueda y chips con filtro). Las tarjetas enlazan con `Link` a `/juegos/[id]`. Incluir el estado vacío "NO HAY RESULTADOS". Verificación: filtrar por texto y categoría, y ver el estado vacío.
5. **Detalle (`/juegos/[id]`).** Crear `app/juegos/[id]/page.tsx` con `generateStaticParams` sobre `GAMES` y `notFound()` si el `id` no existe. Ranking con `seededScores(id.length * 17 + 3, 10)`. Los botones usan `Link` a `/juegos/[id]/jugar` y `/`. Verificación: abrir los 8 juegos y un `id` inválido (404).
6. **Reproductor (`/juegos/[id]/jugar`).** Crear `app/juegos/[id]/jugar/page.tsx` (servidor) y `components/game-player.tsx` (cliente): HUD, CRT, arena decorativa, pausa, FIN, modal de fin de juego. "GUARDAR PUNTUACIÓN" llama a `saveScore` del contexto. El nombre inicial sale de `user?.name ?? "INVITADO"`. Verificación: puntuación sube, pausa la detiene, FIN abre el modal, guardar muestra el mensaje y escribe en `av_scores`.
7. **Acceso (`/acceso`).** Crear `app/acceso/page.tsx` y `components/auth-form.tsx` (cliente): tabs "INICIAR SESIÓN"/"CREAR CUENTA", campo de correo solo en el segundo, envío con `login({ name })` y redirección a `/` con `useRouter`. "JUGAR COMO INVITADO" llama a `login(null)` y redirige a `/`. Verificación: tras entrar, la navbar muestra el nombre y sobrevive a recargar.
8. **Salón de la Fama (`/salon`).** Crear `app/salon/page.tsx` y `components/hall-of-fame.tsx` (cliente: tabs por juego, podio, tabla con animación `rise`, fila "tu mejor marca" solo con sesión). Verificación: cambiar de tab cambia las filas; con sesión aparece la fila amarilla; sin sesión no.
9. **Metadatos.** Ajustar `title` y `description` por ruta con `generateMetadata` o `metadata` donde aplique. Verificación: la pestaña del navegador muestra el título de cada pantalla.

---

## Criterios de aceptación

**Globales**

- [ ] `npm run build` termina sin errores ni errores de tipos.
- [ ] `npm run lint` termina sin errores.
- [ ] No hay errores ni advertencias de hidratación en la consola del navegador en ninguna de las 5 rutas.
- [ ] Las 5 rutas (`/`, `/juegos/bloque-buster`, `/juegos/bloque-buster/jugar`, `/acceso`, `/salon`) cargan con el estilo de la plantilla (fondo con rejilla, scanlines y neón).
- [ ] `/juegos/no-existe` y `/juegos/no-existe/jugar` muestran la página 404 (`notFound()`). Con `cacheComponents` el estado HTTP queda en 200 porque el shell ya se envió; Next añade `<meta name="robots" content="noindex">`. Un 404 HTTP real requeriría un Proxy y queda fuera de este spec.
- [ ] No se añaden clases nuevas a `globals.css` salvo que falte alguna usada por la plantilla; `references/templates/` queda intacto.

**Navbar y footer**

- [ ] El enlace activo se resalta: "Biblioteca" en `/`, `/juegos/*` y `/juegos/*/jugar`; "Salón de la Fama" en `/salon`.
- [ ] A menos de 840 px aparece el botón `≡`, y el panel lateral abre y cierra con el backdrop.
- [ ] Sin sesión se ve "Iniciar Sesión" y lleva a `/acceso`. Con sesión se ve `NOMBRE ▾` y al pulsarlo se cierra la sesión.
- [ ] El footer muestra "© 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0".

**Biblioteca**

- [ ] Se muestran 8 tarjetas con portada CSS, categoría, descripción y mejor puntuación en formato `es-ES`.
- [ ] Escribir "caí" muestra solo CAÍDA. Elegir PUZZLE muestra solo CAÍDA. Una búsqueda sin coincidencias muestra "NO HAY RESULTADOS".
- [ ] Pulsar una tarjeta o su botón JUGAR navega a `/juegos/[id]`.

**Detalle**

- [ ] Muestra tags, descripción larga, estadísticas (Partidas, Mejor global, Dificultad) y 10 filas de ranking con #01/#02/#03 en oro, plata y bronce.
- [ ] "JUGAR AHORA" lleva a `/juegos/[id]/jugar` y "VOLVER AL VAULT" a `/`.
- [ ] El ranking de un mismo juego es idéntico entre recargas.

**Reproductor**

- [ ] La puntuación aumenta sola, "PAUSA" la detiene y muestra "EN PAUSA", y "REANUDAR" la retoma.
- [ ] "FIN" abre el modal con la puntuación final.
- [ ] "GUARDAR PUNTUACIÓN" muestra "▸ PUNTUACIÓN GUARDADA_" y añade `{ game, score, name, at }` a `localStorage["av_scores"]`.
- [ ] "JUGAR DE NUEVO" reinicia puntuación, vidas y nivel. "VOLVER AL VAULT" lleva a `/`. "SALIR" lleva a `/juegos/[id]`.
- [ ] El campo de nombre fuerza mayúsculas y máximo 10 caracteres.

**Acceso**

- [ ] El tab "CREAR CUENTA" añade el campo de correo con animación y cambia el texto del botón a "CREAR Y JUGAR".
- [ ] Enviar con usuario "px_kai" deja `{"name":"PX_KAI"}` en `localStorage["av_user"]` y redirige a `/`.
- [ ] Enviar con el usuario vacío usa "PLAYER1".
- [ ] "JUGAR COMO INVITADO" redirige a `/` sin sesión.
- [ ] Los botones GOOGLE y GITHUB no hacen nada ni producen errores.
- [ ] La sesión se mantiene tras recargar la página.

**Salón de la Fama**

- [ ] Hay un tab por cada uno de los 8 juegos, con el primero activo al entrar.
- [ ] El podio muestra #2, #1 (CAMPEÓN, más alto) y #3, y la tabla lista 12 filas ordenadas por puntuación descendente.
- [ ] Con sesión aparece la fila amarilla "TU MEJOR MARCA EN {JUEGO}". Sin sesión no aparece.
- [ ] "VOLVER A LA BIBLIOTECA" lleva a `/`.

**Revisión visual**

- [ ] Las 5 pantallas se comparan lado a lado con la plantilla abierta en el navegador a 1440 px y a 390 px de ancho, sin diferencias visibles de layout, color o tipografía.

---

## Decisiones tomadas y descartadas

- **Sí:** rutas reales del App Router (`/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/acceso`, `/salon`). URLs compartibles y alineado con Next.js 16. **No:** SPA con `location.hash` como la plantilla, porque va contra el App Router y no sirve para producción.
- **Sí:** nombres de ruta en español, coherentes con la UI. **No:** rutas en inglés.
- **Sí:** reutilizar las clases globales ya portadas a `app/globals.css`. Los efectos CRT, neón y scanlines son difíciles de expresar en utilidades y ya están resueltos. **No:** CSS Modules ni reescritura en Tailwind: sería un refactor no pedido con riesgo de regresión visual.
- **Sí:** sesión y puntuaciones simuladas con `localStorage` (`av_user`, `av_scores`), igual que la plantilla. **No:** backend ni auth real, que irán en otro spec.
- **Sí:** reproductor como réplica visual con puntuación simulada, para dejar el flujo completo (jugar → fin → guardar) listo para enchufar un juego real. **No:** pantalla "PRÓXIMAMENTE" estática.
- **Sí:** elementos decorativos replicados sin lógica (CRÉDITOS, GOOGLE/GITHUB, invitado). **No:** ocultarlos, para mantener fidelidad con la plantilla.
- **Sí:** `av_scores` solo se escribe y no se lee. Evita acoplar este spec a un modelo de ranking que se definirá con el backend.
- **Sí:** datos en `lib/*.ts` y componentes cliente solo donde hace falta estado (`nav`, `library`, `game-card`, `game-player`, `auth-form`, `hall-of-fame`). Las páginas son Server Components.
- **Sí:** verificación con `build`, `lint` y revisión visual manual. **No:** añadir un test runner en este spec.

---

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Errores de hidratación al leer `localStorage` en el primer render | La sesión se lee en `useEffect` tras montar. Hasta `ready === true` la navbar no pinta ni "Iniciar Sesión" ni el nombre. |
| `cacheComponents` y `partialPrefetching` cambian el renderizado dinámico (acceso a `params`) | `generateStaticParams` en `/juegos/[id]` y `/juegos/[id]/jugar`. Leer la guía de Next 16 antes del paso 5. |
| `Math.random` en el reproductor genera diferencias entre servidor y cliente | Solo se usa dentro de `setInterval` (efecto), nunca en el render inicial. |
| `localStorage` bloqueado o modo privado | Todo acceso en `try/catch`. Si falla, la app funciona sin persistir la sesión. |
| Fechas y rangos de `seededScores` dependen de la aritmética de la semilla | Portar la fórmula sin cambios. El criterio "ranking idéntico entre recargas" lo cubre. |

---

## Qué **no** está en este spec

- Ningún juego jugable (Bloque Buster, Caída, Serpentina, etc.).
- Backend, base de datos, autenticación real u OAuth.
- Ranking global real ni lectura de `av_scores`.
- Créditos funcionales.
- Migración de estilos a CSS Modules o Tailwind.
- Tests automatizados.
- Internacionalización.

Cada uno de ellos, si se aborda, va en su propio spec.
