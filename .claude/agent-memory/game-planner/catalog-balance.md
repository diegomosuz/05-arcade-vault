---
name: catalog-balance
description: Equilibrio de categorías y colores del catálogo de Arcade Vault a 2026-10-26 y qué hueco cubre cada pendiente
metadata:
  type: project
---

Estado a 2026-10-26 (registry + references/implemented-games.md):

- ARCADE: Bloque Buster (cyan), Serpentina (green) — 2 reales; pendientes Glotón (yellow), Ranaria (green).
- PUZZLE: Caída (magenta) — 1 real; sin pendientes.
- SHOOTER: Rocas (yellow) — 1 real; pendiente Invasores (green).
- VERSUS: 0 reales; pendiente Duelo Pixel (cyan).

**Why:** el criterio 3 (equilibrio) depende de este reparto; ARCADE ya está sobrerrepresentado y VERSUS vacío, pero VERSUS choca con un leaderboard de un solo jugador.
**How to apply:** verificar contra `lib/games/registry.ts` antes de puntuar; tras Invasores, PUZZLE pasa a ser la categoría más débil (no hay PUZZLE pendiente en BD, posible idea nueva). Ver [[suggestions]].
