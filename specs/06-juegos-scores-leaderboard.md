# SPEC 06 — Tabla de juegos, puntuaciones reales y leaderboard

> **Estado:** Aprobado
> **Depende de:** SPEC 01, SPEC 04, SPEC 05
> **Fecha:** 2026-10-15
> **Objetivo:** Mover el catálogo de juegos a una tabla `games` de Supabase, guardar las puntuaciones de jugadores autenticados en una tabla `scores` mediante una Server Action y mostrar el ranking real por juego en el Salón de la Fama.

---

## Por qué existe este spec

Hoy el catálogo vive en `lib/games.ts` con `best` y `plays` inventados, el Salón de la Fama genera filas falsas con `seededScores` y las puntuaciones guardadas se quedan en `localStorage` (`av_scores`), sin que nadie las vea. Este spec convierte todo eso en datos reales con una sola fuente de verdad: `games` define el catálogo, `scores` guarda las partidas y el leaderboard sale de ahí.

Es el primer spec con datos compartidos entre usuarios, por eso fija antes de escribir código quién puede escribir (solo el servidor) y quién puede leer (todos).

---

## Alcance

**Dentro:**

- Tabla `public.games` sembrada con los 8 juegos de `lib/games.ts` (con el texto actual de `rocas` del SPEC 04).
- Tabla `public.scores` con una fila por partida guardada (`game_id`, `user_id`, `score`).
- Vista `public.game_stats` (mejor marca y número de partidas por juego) y vista `public.leaderboard` (mejor marca por jugador y juego, con posición).
- RLS: lectura pública de `games`, `scores` y las vistas; ninguna política de escritura. Solo el servidor escribe, con la clave secreta.
- Server Action `submitScore` que verifica la sesión, valida el juego y la puntuación e inserta en `scores`.
- El catálogo (home, `/biblioteca`, `/juegos/[id]`, `/juegos/[id]/jugar`) lee de `games` con caché de Next 16; `best` y `plays` se calculan desde `scores`.
- Salón de la Fama (`/salon`) con datos reales: podio y tabla top 12 por juego con la mejor marca de cada jugador, fila «TU MEJOR MARCA» real para el usuario autenticado y estado vacío para juegos sin puntuaciones.
- Modal «FIN DEL JUEGO» adaptado: usuario autenticado guarda con su `username`; invitado ve un aviso para iniciar sesión; juegos demo no guardan.
- Eliminar `seededScores` (`lib/scores.ts`), la constante `GAMES` y el guardado en `localStorage` (`av_scores`, `saveScore`, `SavedScore`).
- Migración SQL versionada, tipos regenerados y variable de entorno `SUPABASE_SECRET_KEY`.

**Fuera de alcance (para specs futuros):**

- Portar más juegos: solo `rocas` produce puntuaciones reales; los otros 7 siguen siendo simulaciones y no guardan nada.
- Mostrar el ranking en el detalle del juego o la posición («QUEDASTE #N») en el modal.
- Guardar con nombre libre o como invitado.
- Migrar `av_scores` o cualquier dato de `localStorage`.
- Anticheat avanzado: replays, firmas de partida, validación de eventos en el servidor o rate limit.
- Moderación, borrado o edición de puntuaciones; panel de administración.
- Filtros por periodo (semanal, mensual) o paginación del ranking.
- Edición del catálogo desde la interfaz.
- Tiempo real (Supabase Realtime) para el ranking.
- Tests automatizados (no hay test runner configurado).
- Internacionalización: solo español.

---

## Modelo de datos

```sql
-- supabase/migrations/002_games_scores.sql
create table public.games (
  id text primary key,            -- slug actual: 'rocas', 'caida', ...
  title text not null,
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover text not null,            -- clase CSS: 'cover-rocas', ...
  color text not null check (color in ('cyan','magenta','yellow','green')),
  position smallint not null,     -- orden en el catálogo
  ranked boolean not null default false, -- true solo si el juego es real y acepta puntuaciones
  max_score integer not null default 1000000 check (max_score > 0)
);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games (id),
  user_id uuid not null references public.profiles (id) on delete cascade,
  score integer not null check (score >= 0),
  created_at timestamptz not null default now()
);
create index scores_game_score_idx on public.scores (game_id, score desc);
create index scores_user_idx on public.scores (user_id);

-- Vistas con security_invoker = true:
--   game_stats  (game_id, best_score, plays)
--   leaderboard (game_id, user_id, username, best_score, achieved_at, rank)
--     rank = row_number() over (partition by game_id order by best_score desc, achieved_at asc)
```

```ts
// lib/games.ts  (solo tipos; ya no exporta GAMES)
export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: CoverClass;
  color: "cyan" | "magenta" | "yellow" | "green";
  ranked: boolean;
  best: number; // 0 si no hay partidas (viene de game_stats)
  plays: number; // viene de game_stats
};

// app/juegos/[id]/jugar/actions.ts  ("use server")
export type SubmitScoreResult =
  | { status: "saved" }
  | { status: "unauthenticated" }
  | { status: "invalid" } // juego inexistente, no ranked, no entero, negativo o sobre max_score
  | { status: "error" };

export async function submitScore(
  gameId: string,
  score: number,
): Promise<SubmitScoreResult>;
```

```bash
# .env.example (el real va en .env.local, ignorado por git)
SUPABASE_SECRET_KEY=sb_secret_xxxxxxxx   # solo servidor; nunca NEXT_PUBLIC_
```

Convenciones:

- `ranked` es `true` únicamente para `rocas` en la siembra. `max_score` es 1 000 000 en todos los juegos como tope inicial ajustable por migración.
- La Server Action obtiene el usuario con `supabase.auth.getUser()` (verificado contra Supabase, no con `getSession()`), lee `games` para validar y escribe con el cliente de la clave secreta (`lib/supabase/admin.ts`, solo servidor).
- El `user_id` nunca viaja desde el cliente: sale de la sesión.
- Las lecturas públicas usan un cliente sin cookies (`lib/supabase/public.ts`) para poder cachearse con `"use cache"`. Capa de datos en `lib/db/games.ts` y `lib/db/leaderboard.ts`.
- Etiquetas de caché `games` y `scores`; `submitScore` invalida `scores` tras insertar usando la API de Next 16 indicada en su documentación.
- El ranking muestra 12 filas por juego. Los empates se resuelven por la fecha más antigua.
- Fechas del ranking con formato `dd/mm/aaaa` (`es-ES`), puntuaciones con `toLocaleString("es-ES")`.
- `plays` se muestra como número `es-ES`; sin partidas, `best` y `plays` valen 0 y la interfaz muestra «—».

---

## Plan de implementación

Antes del paso 1, leer en `node_modules/next/dist/docs/` las guías de App Router sobre caché (`"use cache"`, `cacheLife`, `cacheTag`, invalidación desde Server Actions), `generateStaticParams` con `cacheComponents` y Server Actions. Next.js 16.4 y React 19.3 tienen cambios incompatibles con versiones anteriores. La interfaz se toca con el skill `/frontend-design`, según `CLAUDE.md`; el aspecto existente se conserva y solo se añaden estados nuevos.

1. **Entorno y clientes.** Añadir `SUPABASE_SECRET_KEY` a `.env.example` y a `.env.local` (la clave se obtiene del panel de Supabase y no se commitea). Crear `lib/supabase/public.ts` (cliente sin cookies con la clave publishable) y `lib/supabase/admin.ts` (clave secreta, solo servidor). Añadir `@supabase/supabase-js` como dependencia directa si no lo está. Verificación: `npm run build` pasa y `git status` no muestra `.env.local`.
2. **Migración.** Crear `supabase/migrations/002_games_scores.sql` con las tablas, índices, vistas, RLS y la siembra de los 8 juegos (copiando `lib/games.ts`), y aplicarla con `apply_migration`. Verificación: `list_tables` muestra `games` (8 filas) y `scores` con RLS activo; `get_advisors` (seguridad) sin avisos nuevos; un `insert` en `scores` con la clave publishable falla.
3. **Tipos.** Regenerar `lib/supabase/database.types.ts`. Verificación: `npm run build` pasa.
4. **Capa de datos.** Crear `lib/db/games.ts` con `getGames()` y `getGame(id)` (cacheadas, combinando `games` y `game_stats`). Se mantiene `GAMES` todavía. Verificación: `npm run build` pasa.
5. **Biblioteca y home.** `app/biblioteca/page.tsx`, `app/page.tsx` y los componentes `library.tsx`, `game-card.tsx` y `home/games-preview.tsx` reciben `games` por props en lugar de importar `GAMES`; `best` y `plays` salen de la base de datos con «—» si es 0. Verificación: `/` y `/biblioteca` muestran 8 juegos con los mismos textos y filtros; el resto de pantallas no cambia.
6. **Detalle y jugar.** `app/juegos/[id]/page.tsx` y `app/juegos/[id]/jugar/page.tsx` usan `getGames()` en `generateStaticParams` y `getGame()` en página y metadatos; `notFound()` si el id no existe. `GamePlayer` recibe `ranked`. Verificación: `/juegos/rocas`, `/juegos/rocas/jugar` y un id inexistente (404) funcionan.
7. **Leaderboard.** Crear `lib/db/leaderboard.ts` con la lectura del top 12 por juego. Reescribir `components/hall-of-fame.tsx` con datos por props y la fila «TU MEJOR MARCA» del usuario autenticado (lectura de sus filas en `leaderboard` desde el navegador al montar); añadir estados vacíos («AÚN NO HAY MARCAS · SÉ EL PRIMERO», y para el usuario «AÚN NO TIENES MARCA EN {JUEGO}»). Eliminar `lib/scores.ts` y la constante `GAMES` de `lib/games.ts`. Verificación: `/salon` muestra las 8 pestañas sin filas simuladas y `npm run build` pasa.
8. **Server Action.** Crear `app/juegos/[id]/jugar/actions.ts` con `submitScore`: sesión, juego existente y `ranked`, entero entre 0 y `max_score`, inserción con el cliente de la clave secreta e invalidación de la etiqueta `scores`. Sin registrar datos de la partida en logs. Verificación: `npm run build` pasa; una llamada con sesión válida inserta una fila, y sin sesión devuelve `unauthenticated`.
9. **Modal de fin de partida.** En `components/game-player.tsx`: con sesión, mostrar «JUGANDO COMO {USERNAME}» y el botón «GUARDAR PUNTUACIÓN» que llama a `submitScore` (estados «GUARDANDO…», guardado `▸ PUNTUACIÓN GUARDADA_` y error `[ERROR] NO SE PUDO GUARDAR. INTÉNTALO DE NUEVO.` con `role="alert"` y botón reactivado); sin sesión, aviso «INICIA SESIÓN PARA GUARDAR TU PUNTUACIÓN» con enlace a `/acceso`; juegos no `ranked`, aviso «ESTE JUEGO ES UNA DEMO: SU PUNTUACIÓN NO SE GUARDA». Eliminar el campo de nombre libre. Quitar `saveScore`, `SavedScore` y la clave `av_scores` de `lib/session.tsx`. Verificación: jugar `rocas` con sesión guarda la marca y aparece en `/salon`.

---

## Criterios de aceptación

**Globales**

- [ ] `npm run build` termina sin errores ni errores de tipos.
- [ ] `npm run lint` termina sin errores.
- [ ] No hay errores ni advertencias de hidratación en la consola en `/`, `/biblioteca`, `/salon` y `/juegos/rocas/jugar`.
- [ ] `SUPABASE_SECRET_KEY` no aparece en el JavaScript enviado al navegador (búsqueda en `.next/static` sin resultados) y `.env.local` no está en git.
- [ ] `references/` queda intacto.
- [ ] No se modifica ninguna clase existente de `app/globals.css`; solo se añaden reglas nuevas si hacen falta.
- [ ] Las pantallas de SPEC 01–05 se ven igual que antes salvo las partes que este spec cambia.

**Base de datos y seguridad**

- [ ] `games` tiene 8 filas con los mismos `id`, títulos, categorías y colores que el catálogo anterior, y solo `rocas` tiene `ranked = true`.
- [ ] `games` y `scores` tienen RLS activo y solo políticas de `select`.
- [ ] Un `insert`, `update` o `delete` en `scores` o `games` con la clave publishable falla, incluso con sesión iniciada.
- [ ] Las vistas `game_stats` y `leaderboard` usan `security_invoker`.
- [ ] `get_advisors` de seguridad no reporta avisos nuevos.
- [ ] `supabase/migrations/002_games_scores.sql` existe y coincide con lo aplicado.

**Catálogo**

- [ ] `/` y `/biblioteca` muestran los 8 juegos con los mismos títulos, descripciones, categorías y portadas que antes.
- [ ] Las tarjetas y el detalle de un juego sin partidas guardadas muestran «—» en mejor marca y partidas.
- [ ] Tras guardar una marca en `rocas`, el detalle y la tarjeta muestran la mejor marca real y el número de partidas correctos.
- [ ] `/juegos/xyz` y `/juegos/xyz/jugar` devuelven 404.
- [ ] El código ya no exporta `GAMES` ni usa `seededScores`.

**Guardado de puntuaciones**

- [ ] Con sesión iniciada, al terminar `rocas` el modal muestra el `username` real y «GUARDAR PUNTUACIÓN» inserta una fila en `scores` con `game_id = 'rocas'`, `user_id` del usuario y la puntuación mostrada.
- [ ] El modal no tiene campo de nombre editable.
- [ ] Pulsar «GUARDAR PUNTUACIÓN» dos veces rápido inserta una sola fila (botón deshabilitado y estado «GUARDANDO…»).
- [ ] Sin sesión, el modal muestra «INICIA SESIÓN PARA GUARDAR TU PUNTUACIÓN» con enlace a `/acceso` y no existe botón de guardar.
- [ ] En los 7 juegos demo, el modal muestra el aviso de demo y no permite guardar.
- [ ] `submitScore` devuelve `unauthenticated` sin sesión y `invalid` para un juego inexistente, un juego no `ranked`, un valor negativo, no entero o mayor que `max_score`; en esos casos no inserta.
- [ ] Si la inserción falla, el modal muestra `[ERROR] NO SE PUDO GUARDAR. INTÉNTALO DE NUEVO.` con `role="alert"` y el botón vuelve a estar activo.
- [ ] Nada escribe ya en `localStorage` bajo `av_scores`.

**Leaderboard**

- [ ] `/salon` muestra una pestaña por juego, sin ninguna fila simulada.
- [ ] `rocas` lista como máximo 12 filas con una sola fila por jugador (su mejor marca), ordenadas de mayor a menor puntuación.
- [ ] Si un jugador guarda dos marcas en `rocas`, solo aparece la mayor.
- [ ] En un empate, el jugador con la marca más antigua queda por delante.
- [ ] El podio muestra a los tres primeros; con menos de tres jugadores los puestos libres aparecen vacíos sin romper el diseño.
- [ ] Un juego sin puntuaciones muestra «AÚN NO HAY MARCAS · SÉ EL PRIMERO» sin podio ni tabla vacía.
- [ ] Con sesión, la fila «TU MEJOR MARCA EN {JUEGO}» muestra la posición, puntuación y fecha reales del usuario; sin marca en ese juego muestra «AÚN NO TIENES MARCA EN {JUEGO}».
- [ ] Sin sesión no aparece la fila «TU MEJOR MARCA».
- [ ] Tras guardar una marca nueva, recargar `/salon` la muestra sin esperar horas.

**Responsive y accesibilidad**

- [ ] A 1440 px y a 390 px `/salon` y el modal no se desbordan y no aparece scroll horizontal nuevo.
- [ ] Los estados vacíos y los errores son legibles con `prefers-reduced-motion: reduce`.

---

## Decisiones tomadas y descartadas

- **Sí:** tabla `games` como fuente de verdad del catálogo y clave foránea de `scores`. **No:** conservar `lib/games.ts` como segunda fuente: se desincroniza con la base de datos.
- **Sí:** `best` y `plays` calculados desde `scores`. **No:** columnas inventadas en `games`: la tarjeta contradeciría al Salón.
- **Sí:** el Salón es 100 % real, con estado vacío. **No:** relleno simulado ni migrar `av_scores`: mostraría datos falsos como reales o abriría la puerta a puntuaciones forjadas desde `localStorage`.
- **Sí:** escritura solo desde una Server Action con clave secreta; las tablas no tienen políticas de escritura. **No:** `insert` directo desde el navegador con RLS: cualquiera podría llamar a la API con la clave pública y enviar cualquier marca.
- **Sí:** columna `ranked` que solo es `true` en `rocas`. Es un derivado del requisito «Salón 100 % real»: los 7 juegos restantes generan puntos aleatorios y guardarlos contaminaría el ranking. **No:** aceptar puntuaciones de cualquier juego.
- **Sí:** `max_score` por juego como tope de validación (1 000 000 inicial). **No:** confiar en cualquier entero; sigue siendo anticheat básico, no seguro.
- **Sí:** `getUser()` en la Server Action. **No:** `getSession()`, que no verifica el token en el servidor.
- **Sí:** `user_id` obtenido de la sesión en el servidor. **No:** recibirlo del cliente.
- **Sí:** guardar todas las partidas en `scores` y agregar la mejor por jugador en la vista `leaderboard`. Conserva el historial para futuros periodos. **No:** una sola fila por jugador y juego con `upsert`, que pierde el historial y el número real de partidas.
- **Sí:** vistas con `security_invoker`. **No:** vistas con permisos del propietario, que ignoran el RLS de las tablas base.
- **Sí:** cliente de lectura sin cookies con `"use cache"` y etiquetas `games` y `scores`. Mantiene las páginas del catálogo estáticas y rápidas con `cacheComponents`. **No:** usar `lib/supabase/server.ts` (lee cookies y haría dinámica toda la página).
- **Sí:** «TU MEJOR MARCA» leída en el navegador tras montar. **No:** leerla en el servidor, que obligaría a volver dinámicas las páginas cacheadas.
- **Sí:** el invitado juega pero no guarda y ve un enlace a `/acceso`. **No:** guardar con nombre libre, ni encolar la marca para guardarla tras el login (la puntuación se pierde al salir; aceptado en el MVP).
- **Sí:** mantener el aspecto del Salón (podio, tabla, pestañas) y añadir solo estados vacíos y de error. **No:** rediseñarlo.
- **Sí:** verificación con `build`, `lint`, consultas SQL de comprobación, una partida real y revisión visual. **No:** añadir un test runner.

---

## Riesgos identificados

| Riesgo                                                                                 | Mitigación                                                                                                                                                                         |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Un usuario autenticado llama a `submitScore` con una marca falsa dentro del tope       | Aceptado en el MVP: la validación de `max_score` y `ranked` limita el daño. Anticheat real (firmas, replays, rate limit) queda para otro spec.                                     |
| `SUPABASE_SECRET_KEY` filtrada al cliente o al repositorio                             | Se lee solo en `lib/supabase/admin.ts` marcado como solo servidor (`import "server-only"`), sin prefijo `NEXT_PUBLIC_`, `.env*` ignorado y criterio de búsqueda en `.next/static`. |
| La clave secreta ignora RLS: un error en la Server Action puede escribir donde no debe | La acción hace una única inserción con campos fijos (`game_id`, `user_id`, `score`) y valida todo antes.                                                                           |
| `cacheComponents` y la caché de datos sirven un ranking viejo tras guardar             | `submitScore` invalida la etiqueta `scores`; criterio de aceptación de «recargar `/salon` muestra la marca nueva».                                                                 |
| `generateStaticParams` consulta la base de datos en el build y esta falla o está vacía | El paso 6 verifica el build con datos; una tabla vacía produce cero rutas estáticas y 404 en vez de un fallo silencioso, por lo que el seed es parte de la migración.              |
| La vista `leaderboard` calcula el `rank` sobre todas las filas en cada consulta        | Con el volumen del MVP es despreciable; el índice `scores_game_score_idx` cubre el caso y la consulta filtra por `game_id`. Se revisa con `get_advisors` de rendimiento si crece.  |
| Doble clic o reintento duplica la marca guardada                                       | Botón deshabilitado durante el envío y un solo estado «guardado» por partida.                                                                                                      |
| Se pierde la puntuación de un invitado que se registra después de jugar                | Aceptado y documentado; se puede abordar con un spec de «guardado pendiente».                                                                                                      |
| Los textos de la siembra se desvían de `lib/games.ts`                                  | La siembra se copia desde `lib/games.ts` antes de eliminarlo y el criterio de «mismos textos» lo verifica visualmente.                                                             |
| Los juegos demo muestran un modal distinto al actual y pueden confundir                | El aviso de demo es explícito y está cubierto por criterio de aceptación.                                                                                                          |

---

## Qué **no** está en este spec

- Portar Tetris, Arkanoid u otros juegos: solo `rocas` guarda puntuaciones.
- Ranking en el detalle del juego o la posición en el modal de fin de partida.
- Guardado de invitados o con nombre libre, y migración de `av_scores`.
- Anticheat avanzado, rate limit o moderación.
- Filtros por periodo, paginación o tiempo real.
- Edición del catálogo desde la interfaz.
- Tests automatizados.
- Internacionalización.

Cada uno de ellos, si se aborda, va en su propio spec.
