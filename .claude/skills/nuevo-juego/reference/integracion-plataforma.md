# Integración con la plataforma (SPEC 06)

Qué ya funciona para cualquier juego y qué hay que tocar al añadir uno.

## Ya es genérico: no tocar

- `app/juegos/[id]/jugar/actions.ts` — `submitScore(gameId, score)`: verifica sesión con `getUser()`, lee `games` y exige `ranked` y `score <= max_score`, inserta con la clave secreta e invalida la etiqueta `scores` con `updateTag`.
- Vistas `public.game_stats` y `public.leaderboard` (`security_invoker`) y RLS de solo lectura en `games` y `scores`.
- `lib/db/games.ts` (`getGames`, `getGame`) y `lib/db/leaderboard.ts`, con etiquetas `games` y `scores`.
- `/salon` — una pestaña por juego, podio, top 12, «TU MEJOR MARCA» y estados vacíos salen de los datos.
- `app/juegos/[id]/page.tsx` y `jugar/page.tsx` — `generateStaticParams` desde `getGames()`.
- Modal de fin de partida (guardar, invitado, demo).

## Sí hay que tocar

| Qué         | Dónde                                                                 | Cuándo                                                         |
| ----------- | --------------------------------------------------------------------- | -------------------------------------------------------------- |
| Motor       | `lib/games/<slug>/engine.ts`                                          | siempre                                                        |
| Registro    | `lib/games/registry.ts`                                               | siempre                                                        |
| Migración   | `supabase/migrations/NNN_juego_<slug>.sql`                            | siempre                                                        |
| Tipos de BD | `lib/supabase/database.types.ts` (regenerar)                          | solo si cambia el esquema; una migración de datos no lo cambia |
| Portada     | `CoverClass` en `lib/games.ts` y `.cover-<slug>` en `app/globals.css` | solo entrada nueva                                             |
| Reproductor | `components/game-player.tsx`                                          | solo si el registro aún no existe (paso 0)                     |

## Plantillas de migración

Numeración: el siguiente número libre de `supabase/migrations/` (hoy `001_profiles.sql`, `002_games_scores.sql`). Se aplica con `apply_migration` y el archivo debe coincidir con lo aplicado.

**Reemplazar una demo** (la fila, la portada y la posición ya existen):

```sql
-- SPEC NN: <TÍTULO> pasa de demo a juego real con puntuaciones.
update public.games
set title = '<TÍTULO>',            -- solo si cambia
    short = '<texto corto>',
    long = '<texto largo>',
    ranked = true,
    max_score = <tope>
where id = '<id-de-la-demo>';
```

Si cambia el `id`, no usar `update`: `scores.game_id` referencia `games.id`. Mantén el `id` de la demo o crea una fila nueva.

**Entrada nueva:**

```sql
insert into public.games (id, title, short, long, cat, cover, color, position, ranked, max_score)
values ('<slug>', '<TÍTULO>', '<corto>', '<largo>',
        'ARCADE',          -- ARCADE | PUZZLE | SHOOTER | VERSUS
        'cover-<slug>',
        'cyan',            -- cyan | magenta | yellow | green
        <siguiente position>, true, <tope>);
```

`cat` y `color` tienen `check constraints`; un valor fuera de la lista falla la migración.

## Después de migrar

1. Comprobar: `select id, ranked, max_score from public.games where id = '<slug>';`
2. `get_advisors` de seguridad sin avisos nuevos.
3. Si cambió el esquema: `generate_typescript_types` y reescribir `lib/supabase/database.types.ts`.
4. Un `insert` en `scores` con la clave publishable sigue fallando.

## Portada (solo entrada nueva)

- Añadir el literal `"cover-<slug>"` a `CoverClass` en `lib/games.ts`.
- Añadir `.cover-<slug>` (y sus `::before`/`::after` si hacen falta) en `app/globals.css`, cerca de las demás portadas (`.cover-rocas` está hacia la línea 494). Solo reglas nuevas.
- El diseño de la portada se hace con `/frontend-design`.

## Recordatorios del proyecto

- Next.js 16.4 / React 19.3 tienen cambios incompatibles: antes de escribir código Next, leer la guía relevante en `node_modules/next/dist/docs/`.
- La interfaz se toca con `/frontend-design` (regla de `CLAUDE.md`).
- No se modifica ninguna clase existente de `app/globals.css`.
- `npm run build` y `npm run lint` verifican cada paso; no hay test runner.
- `SUPABASE_SECRET_KEY` nunca llega al cliente.
- La verificación final es una partida real con sesión iniciada: la marca aparece en `scores` y, tras recargar, en `/salon`.
