# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault: plataforma web para jugar clásicos arcade en el navegador y competir por la puntuación más alta. El desarrollo sigue un flujo basado en especificaciones (`/spec` y `/spec-impl`) usando los skills de https://github.com/Klerith/fernando-skills (instalados con `npx skills@latest add Klerith/fernando-skills`).

No test runner is configured.

## Skills

Usa siempre `/frontend-design` para interfaces gráficas de usuario.

Skills del proyecto en `.claude/skills/`: `frontend-design`, `spec`, `spec-impl` (flujo de specs), `spec-impl-game` (implementa un spec de juego con el flujo de `/spec-impl` y luego lanza en secuencia `skin-designer` → `mobile-porter-agent`) y `nuevo-juego` (genera `specs/NN-juego-<slug>.md` en estado Borrador a partir de `references/started-games/` o una descripción; la implementación la hace `/spec-impl`). Versiones fijadas en `skills-lock.json`.

## Agents

- `game-planner` (`.claude/agents/game-planner.md`): planifica y decide qué juego encaja con la plataforma. Mantiene memoria de sugerencias previas en `.claude/agent-memory/game-planner/` (`suggestions.md` + `MEMORY.md`).
- `game-jam` (`.claude/agents/game-jam.md`): recibe un tema y crea 3 juegos con 2 specs cada uno en `specs/games-jam/<game-id>/` (`01-motor.md`, `02-plataforma.md`). Solo specs, sin código.
- `skin-designer` (`.claude/agents/skin-designer.md`): revisa que todo juego tenga al menos 3 skins (classic por defecto, neon y retro), los implementa en los motores (`lib/games/<juego>/skins.ts`) y verifica que se vean bien en modo oscuro.
- `mobile-porter-agent` (`.claude/agents/mobile-porter-agent.md`): audita y corrige la experiencia móvil/responsive de todo el sitio y verifica que cada juego cumpla el contrato táctil de la SPEC 10 (`specs/10-controles-tactiles-movil.md`).

Hook `PostToolUse` (`.claude/settings.json` → `.claude/hooks/format-on-write.mjs`): tras cada `Write`/`Edit` ejecuta Prettier + ESLint sobre el archivo.

## Specs

Las especificaciones viven en `specs/` y documentan cada fase del proyecto:

| #   | Spec                           | Estado       |
| --- | ------------------------------ | ------------ |
| 01  | MVP – pantallas visuales       | Implementado |
| 02  | Homepage / landing             | Implementado |
| 03  | Acerca de + contacto (Resend)  | Implementado |
| 04  | Juego Asteroides (Rocas)       | Implementado |
| 05  | Autenticación con Supabase     | Implementado |
| 06  | Juegos, scores y leaderboard   | Implementado |
| 07  | Juego Tetris (Caída)           | Implementado |
| 08  | Juego Arkanoid (Bloque Buster) | Implementado |
| 09  | Juego Snake (Serpentina)       | Implementado |
| 10  | Controles táctiles (móvil)     | Implementado |
| 11  | Rendimiento de los juegos      | Implementado |

Specs de game jam (solo specs, sin código aún) en `specs/games-jam/<game-id>/` (`01-motor.md`, `02-plataforma.md`). Actualmente: `cruce` (Frogger, estado Borrador; sin motor ni fila en `games`).

## Next.js version warning

This is Next.js 16.4 with React 19.3, which has breaking changes from what you may know. Per `AGENTS.md`, read the relevant guide in `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`, `04-community`) before writing Next.js code, and heed deprecation notices. `AGENTS.md` is re-written by `next dev`; commit it rather than removing it.

## Architecture notes

- **Framework**: Next.js 16.4 (App Router only) + React 19.3 + TypeScript 5. Path alias `@/*` maps to the repo root.
- **Styling**: Tailwind CSS v4 via Turbopack (`@tailwindcss/turbopack` en `next.config.ts`). Sin `tailwind.config`; tokens de tema en `@theme inline` dentro de `app/globals.css`.
- **Fuentes**: Press Start 2P (headings retro), JetBrains Mono y Courier Prime via `next/font/google`, expuestas como variables CSS.
- **Backend**: Supabase (auth, base de datos PostgreSQL, RLS).
  - Cliente browser: `lib/supabase/client.ts`
  - Cliente servidor (cookies): `lib/supabase/server.ts`
  - Cliente admin (service role, sin RLS): `lib/supabase/admin.ts`
  - Cliente público (anon, sin cookies): `lib/supabase/public.ts`
  - Tipos generados: `lib/supabase/database.types.ts`
- **Email**: Resend (`resend` package) para el formulario de contacto (`app/acerca-de/actions.ts`).
- **Caching**: `next.config.ts` habilita `cacheComponents` y `partialPrefetching` + flag `experimental.agentFeedback`. Los datos de juegos y leaderboard usan `"use cache"` con `cacheTag("games", "scores")` e invalidación via `updateTag("scores")`.
- **Layout raíz**: Tipado con `LayoutProps<"/">` (tipos generados en `.next/types`; correr `dev` o `build` si faltan).

## Pages / Routes

| Ruta                 | Archivo                          | Descripción                                                                |
| -------------------- | -------------------------------- | -------------------------------------------------------------------------- |
| `/`                  | `app/page.tsx`                   | Landing page (Hero, Features, GamesPreview, Stats, Activity, Pricing, CTA) |
| `/biblioteca`        | `app/biblioteca/page.tsx`        | Catálogo de juegos con filtro por categoría                                |
| `/juegos/[id]`       | `app/juegos/[id]/page.tsx`       | Detalle de juego + leaderboard                                             |
| `/juegos/[id]/jugar` | `app/juegos/[id]/jugar/page.tsx` | Canvas del juego + envío de puntuación                                     |
| `/salon`             | `app/salon/page.tsx`             | Salón de la fama (leaderboards globales)                                   |
| `/acerca-de`         | `app/acerca-de/page.tsx`         | Página "Acerca de" + formulario de contacto                                |
| `/acceso`            | `app/acceso/page.tsx`            | Login / registro (Supabase Auth)                                           |

`proxy.ts` (raíz) es el proxy de Next 16 (antes `middleware`): refresca la sesión de Supabase en cada request con `updateSession` de `lib/supabase/proxy.ts`.

## Game engine architecture

Los motores de juego son canvas puro (sin librerías de juegos), con una interfaz común:

- **Tipos**: `lib/games/types.ts` – `GameEngine` (update/draw/snapshot/setKey/reset), `GameDefinition`, `GameSnapshot`.
- **Registro**: `lib/games/registry.ts` – mapea cada `id` de juego a su `GameDefinition`. Un juego es "real" si su id está aquí.
- **Motores**: `lib/games/{asteroids,tetris,arkanoid,snake}/engine.ts` – cada uno exporta una factory `create*(assets, skin)` y dimensiones.
- **Skins**: `lib/games/skins.ts` (`SkinId` = `classic` | `neon` | `retro`, `DEFAULT_SKIN = "classic"`, lista `SKINS`) y paleta por juego en `lib/games/<juego>/skins.ts`. Solo visuales: nunca cambian reglas, puntuación ni física. Todo juego registrado debe declarar `skins: SKIN_IDS` (3 skins). Selector en `components/games/skin-selector.tsx` (persistido en `localStorage` bajo `av-skin:<gameId>`, con try/catch y fallback en memoria). Cambiar de skin recrea el motor (nueva partida).
- **Controles táctiles** (SPEC 10): `GameDefinition.touch` (`TouchLayout`: `split` o `dpad`) declarado en el registro; `components/games/touch-controls.tsx` renderiza el mando (Pointer Events, multitáctil) y emite los mismos `KeyboardEvent.code` vía `press()` de `GameCanvas`, así que los motores no cambian. Se muestra solo con puntero táctil (`coarse`) en `components/game-player.tsx`.
- **Componente canvas**: `components/games/game-canvas.tsx` – loop genérico de requestAnimationFrame, input (teclado + `press`), pausa, HUD y submit de score.
- **Contrato al añadir un juego**: entrada en `GAME_REGISTRY` con `keys`, `controlsLabel`, `ariaLabel`, `hud`, `skins` (3) y `touch`; fila en `games` (migración en `supabase/migrations/`); portada `.cover-*` y entrada en `CoverClass` (`lib/games.ts`).
- **Rendimiento** (SPEC 11): `lib/games/sprites.ts` (`createGlowSprite`/`drawGlowSprite`) pre-renderiza en un canvas aparte los elementos con glow (`shadowBlur`) de las skins con `glow > 0`; los motores tienen dibujo directo de respaldo. `GameCanvas` usa contexto `alpha: false` (todo motor debe rellenar el fondo en `draw`). `GamePlayer` pone `data-playing="true"` en `<html>` y `globals.css` simplifica las capas decorativas solo en `/jugar`. Medición: `scripts/measure-fps.mjs` contra `next build` + `next start` (nunca `next dev`); resultados en `references/performance-baseline.md`.
- **Assets estáticos**: `public/games/snake/fruits.png` (sprite atlas de frutas para Serpentina).

### Juegos disponibles

ver: references\implemented-games.md |

## Auth & session

- Supabase Auth (email + password). Registro crea perfil via trigger en Postgres.
- `lib/session.tsx`: `SessionProvider` (context client-side) + `useSession()` hook. Lee `profiles.username` de Supabase.
- Server Actions validan sesión con `supabase.auth.getUser()` antes de escribir scores.

## Database (Supabase)

Tablas principales: `games`, `profiles`, `scores`. Migraciones SQL en `supabase/migrations/` (`001_profiles`, `002_games_scores`, `003_juego_caida`, `004_juego_bloque_buster`, `005_juego_serpentina`); los juegos nuevos añaden su propia migración.
Vistas: `game_stats` (mejor score y total de partidas por juego), `leaderboard` (top N por juego con rank).
Las vistas se usan en `lib/db/games.ts` y `lib/db/leaderboard.ts`.

## Components

- **Home**: `components/home/` – hero, features, games-preview, stats, activity, pricing, final-cta, pixel-art, reveal.
- **About**: `components/about/` – about-hero, contact-form, highlight-icon.
- **Games**: `components/games/` – game-canvas, skin-selector, touch-controls.
- **Shared**: `components/nav.tsx`, `components/game-card.tsx`, `components/hall-of-fame.tsx`, `components/library.tsx`, `components/auth-form.tsx`, `components/game-player.tsx`.

## Referencias

- `references/implemented-games.md`: estado de los juegos (implementados vs pendientes), consultado en Supabase.
- `references/games-suggestions.md`: sugerencias de juegos futuros.
- `references/started-games/` y `references/templates/`: código base y plantillas de diseño (solo lectura/consulta).
- `demos/Demo.tsx`: componente de demostración suelto, no se usa en la app.

## Server Actions

- `app/juegos/[id]/jugar/actions.ts` → `submitScore()`: valida sesión, juego ranked, score dentro de max_score, inserta en `scores`, invalida cache.
- `app/acerca-de/actions.ts` → `sendContact()`: validación server-side, honeypot anti-bot, envío via Resend.
