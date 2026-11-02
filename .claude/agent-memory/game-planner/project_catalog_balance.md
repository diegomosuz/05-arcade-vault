---
name: project-catalog-balance
description: Estado del equilibrio de categorías/colores del catálogo de Arcade Vault y ranking de pendientes (snapshot 2026-10-26)
metadata:
  type: project
---

Snapshot 2026-10-26 (verificar contra lib/games/registry.ts antes de usar):

- Implementados: Rocas (SHOOTER, yellow), Caída (PUZZLE, magenta), Bloque Buster (ARCADE, cyan), Serpentina (ARCADE, green).
- Pendientes en BD: Invasores (SHOOTER, green), Ranaria (ARCADE, green), Duelo Pixel (VERSUS, cyan), Glotón (ARCADE, yellow).
- Ranking emitido: Invasores 22 > Duelo Pixel 20 > Ranaria 18 > Glotón 17 (puntuaciones oficiales en suggestions.md).
- VERSUS sigue vacía; ARCADE ya tiene 2.

**Why:** el criterio de equilibrio penaliza un 3er ARCADE y premia SHOOTER/VERSUS.
**How to apply:** al recomendar de nuevo, revisar si Invasores avanzó (specs/ o registry) y recalcular; detalle en suggestions.md. Ver [[user-decisions]] cuando existan decisiones del usuario.
