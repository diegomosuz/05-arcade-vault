# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault: a platform to play games online and compete for the highest score. The project follows a spec-driven workflow (`/spec` and `/spec-impl`) using the skills from https://github.com/Klerith/fernando-skills (installed via `npx skills@latest add Klerith/fernando-skills`). The code is currently the untouched Create Next App scaffold (`app/page.tsx`, `app/layout.tsx`), so there is no game, scoring or data logic yet.



No test runner is configured.

## Skills
Usa siempre /frontend-design Skills para interfaces gráficas de usuario. 

## Next.js version warning

This is Next.js 16.4 with React 19.3, which has breaking changes from what you may know. Per `AGENTS.md`, read the relevant guide in `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`, `04-community`) before writing Next.js code, and heed deprecation notices. `AGENTS.md` is re-written by `next dev`; commit it rather than removing it.

## Architecture notes

- App Router only (`app/`). Path alias `@/*` maps to the repo root.
- `next.config.ts` enables `cacheComponents` and `partialPrefetching` plus the `experimental.agentFeedback` flag, so caching/prefetch behavior differs from the classic Next.js defaults. Check the docs for those features when working with data fetching or dynamic rendering.
- Tailwind CSS v4 is wired through Turbopack: `next.config.ts` has a `turbopack.rules` entry running `@tailwindcss/turbopack` on `*.css`, and styles come from `@import "tailwindcss"` in `app/globals.css` (theme tokens via `@theme inline`, no `tailwind.config`).
- The root layout types its props with the globally generated `LayoutProps<"/">` helper (no import needed; types are generated into `.next/types`, so run `dev` or `build` once if they're missing).
- Fonts: Geist and Geist Mono via `next/font/google`, exposed as CSS variables.
