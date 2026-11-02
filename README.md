## Arcade Vault

Es una plataforma para jugar online y competir por la mayor cantidad de puntos.

## Usa Spec Driven Design

Basado en /spec y /spec-impl

Siguiendo las buenas practicas recomendadas aquí:
https://github.com/Klerith/fernando-skills

## Skills usadas

```bash
npx skills@latest add Klerith/fernando-skills
```

## Commands

- `npm run dev` — dev server (Turbopack) at http://localhost:3000
- `npm run build` / `npm run start` — production build / serve
- `npm run lint` — ESLint (flat config in `eslint.config.mjs`, uses `eslint-config-next`)
- `npx prettier --write <archivo>` — formato (también se aplica automáticamente tras cada edición vía hook de Claude Code)

## Juegos

Rocas, Caída, Bloque Buster y Serpentina: canvas puro, 3 skins (clásico, neón, retro), leaderboard global y controles táctiles para móvil. Detalle en `references/implemented-games.md`.

Para probar en el celular por IP de red usa `npm run build && npm run start`, no `next dev`.
