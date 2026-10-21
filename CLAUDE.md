# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault: plataforma web para jugar clásicos arcade en el navegador y competir por la puntuación más alta. El desarrollo sigue un flujo basado en especificaciones (`/spec` y `/spec-impl`) usando los skills de https://github.com/Klerith/fernando-skills (instalados con `npx skills@latest add Klerith/fernando-skills`).

No test runner is configured.

## Skills

Usa siempre `/frontend-design` para interfaces gráficas de usuario.

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

## Game engine architecture

Los motores de juego son canvas puro (sin librerías de juegos), con una interfaz común:

- **Tipos**: `lib/games/types.ts` – `GameEngine` (update/draw/snapshot/setKey/reset), `GameDefinition`, `GameSnapshot`.
- **Registro**: `lib/games/registry.ts` – mapea cada `id` de juego a su `GameDefinition`. Un juego es "real" si su id está aquí.
- **Motores**: `lib/games/{asteroids,tetris,arkanoid,snake}/engine.ts` – cada uno exporta una factory `create*()` y dimensiones.
- **Componente canvas**: `components/games/game-canvas.tsx` – loop genérico de requestAnimationFrame, input, HUD y submit de score.
- **Assets estáticos**: `public/games/snake/fruits.png` (sprite atlas de frutas para Serpentina).

### Juegos disponibles

ver: references\implemented-games.md                      |

## Auth & session

- Supabase Auth (email + password). Registro crea perfil via trigger en Postgres.
- `lib/session.tsx`: `SessionProvider` (context client-side) + `useSession()` hook. Lee `profiles.username` de Supabase.
- Server Actions validan sesión con `supabase.auth.getUser()` antes de escribir scores.

## Database (Supabase)

Tablas principales: `games`, `profiles`, `scores`.
Vistas: `game_stats` (mejor score y total de partidas por juego), `leaderboard` (top N por juego con rank).
Las vistas se usan en `lib/db/games.ts` y `lib/db/leaderboard.ts`.

## Components

- **Home**: `components/home/` – hero, features, games-preview, stats, activity, pricing, final-cta, pixel-art, reveal.
- **About**: `components/about/` – about-hero, contact-form, highlight-icon.
- **Shared**: `components/nav.tsx`, `components/game-card.tsx`, `components/hall-of-fame.tsx`, `components/library.tsx`, `components/auth-form.tsx`, `components/game-player.tsx`.

## Server Actions

- `app/juegos/[id]/jugar/actions.ts` → `submitScore()`: valida sesión, juego ranked, score dentro de max_score, inserta en `scores`, invalida cache.
- `app/acerca-de/actions.ts` → `sendContact()`: validación server-side, honeypot anti-bot, envío via Resend.
