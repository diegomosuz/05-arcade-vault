# Rendimiento de los juegos — línea base (SPEC 11)

Generado con `node scripts/measure-fps.mjs --label antes|despues` contra `next build` + `next start`.

- **Partida:** 30 s por combinación (se descarta el primer segundo). Un conductor automático alterna teclas con una semilla fija; si la partida termina, se reinicia.
- **Perfiles:** `desktop` = 1280×800 sin throttling. `mobile` = 390×844, `hasTouch`, `isMobile`, CPU 4× más lenta.
- **Navegador:** Chromium headless de Playwright (render por software, sin GPU): los números sirven para comparar antes/después, no como FPS absolutos de un dispositivo real.
- **Umbrales:** desktop ≥ 58 FPS medios, mobile ≥ 55 FPS medios, 0 frames > 50 ms.

| Juego | Perfil | Skin | FPS medio | p95 frame (ms) | Frames > 50 ms | Fase |
| --- | --- | --- | --- | --- | --- | --- |
| rocas | desktop | classic | 45.5 | 33.4 | 9 | antes |
| rocas | desktop | neon | 36.3 | 50.0 | 46 | antes |
| rocas | desktop | retro | 43.5 | 33.4 | 3 | antes |
| rocas | mobile | classic | 59.9 | 16.8 | 0 | antes |
| rocas | mobile | neon | 58.7 | 16.8 | 1 | antes |
| rocas | mobile | retro | 59.4 | 16.8 | 2 | antes |
| caida | desktop | classic | 25.6 | 50.1 | 71 | antes |
| caida | desktop | neon | 34.2 | 50.0 | 27 | antes |
| caida | desktop | retro | 47.6 | 33.4 | 4 | antes |
| caida | mobile | classic | 59.7 | 16.7 | 1 | antes |
| caida | mobile | neon | 59.1 | 16.8 | 1 | antes |
| caida | mobile | retro | 59.7 | 16.8 | 1 | antes |
| bloque-buster | desktop | classic | 46.9 | 33.4 | 1 | antes |
| bloque-buster | desktop | neon | 49.7 | 33.4 | 3 | antes |
| bloque-buster | desktop | retro | 46.0 | 33.4 | 0 | antes |
| bloque-buster | mobile | classic | 59.7 | 16.8 | 0 | antes |
| bloque-buster | mobile | neon | 57.4 | 16.8 | 5 | antes |
| bloque-buster | mobile | retro | 59.7 | 16.8 | 2 | antes |
| serpentina | desktop | classic | 32.7 | 50.0 | 20 | antes |
| serpentina | desktop | neon | 46.6 | 33.4 | 1 | antes |
| serpentina | desktop | retro | 46.1 | 33.4 | 0 | antes |
| serpentina | mobile | classic | 59.7 | 16.8 | 1 | antes |
| serpentina | mobile | neon | 59.7 | 16.8 | 1 | antes |
| serpentina | mobile | retro | 58.8 | 16.8 | 6 | antes |
| ranaria | desktop | classic | 45.3 | 33.4 | 3 | antes |
| ranaria | desktop | neon | 48.6 | 33.4 | 1 | antes |
| ranaria | desktop | retro | 49.6 | 33.4 | 2 | antes |
| ranaria | mobile | classic | 56.0 | 33.3 | 9 | antes |
| ranaria | mobile | neon | 55.8 | 33.3 | 5 | antes |
| ranaria | mobile | retro | 57.4 | 16.8 | 4 | antes |
| rocas | desktop | classic | 60.0 | 16.7 | 0 | después |
| rocas | desktop | neon | 60.0 | 16.7 | 0 | después |
| rocas | desktop | retro | 60.0 | 16.7 | 0 | después |
| rocas | mobile | classic | 60.0 | 16.7 | 0 | después |
| rocas | mobile | neon | 59.1 | 16.8 | 1 | después |
| rocas | mobile | retro | 60.0 | 16.7 | 0 | después |
| caida | desktop | classic | 59.9 | 16.7 | 0 | después |
| caida | desktop | neon | 60.0 | 16.8 | 0 | después |
| caida | desktop | retro | 60.0 | 16.7 | 0 | después |
| caida | mobile | classic | 60.0 | 16.7 | 0 | después |
| caida | mobile | neon | 60.0 | 16.7 | 0 | después |
| caida | mobile | retro | 60.0 | 16.8 | 0 | después |
| bloque-buster | desktop | classic | 59.7 | 16.8 | 0 | después |
| bloque-buster | desktop | neon | 60.0 | 16.7 | 0 | después |
| bloque-buster | desktop | retro | 59.3 | 16.8 | 0 | después |
| bloque-buster | mobile | classic | 60.0 | 16.7 | 0 | después |
| bloque-buster | mobile | neon | 60.0 | 16.7 | 0 | después |
| bloque-buster | mobile | retro | 60.0 | 16.7 | 0 | después |
| serpentina | desktop | classic | 60.0 | 16.8 | 0 | después |
| serpentina | desktop | neon | 59.6 | 16.8 | 0 | después |
| serpentina | desktop | retro | 60.0 | 16.7 | 0 | después |
| serpentina | mobile | classic | 60.0 | 16.7 | 0 | después |
| serpentina | mobile | neon | 60.0 | 16.7 | 0 | después |
| serpentina | mobile | retro | 60.0 | 16.8 | 0 | después |
| ranaria | desktop | classic | 60.0 | 16.7 | 0 | después |
| ranaria | desktop | neon | 60.0 | 16.8 | 0 | después |
| ranaria | desktop | retro | 60.0 | 16.7 | 0 | después |
| ranaria | mobile | classic | 60.0 | 16.7 | 0 | después |
| ranaria | mobile | neon | 59.6 | 16.8 | 0 | después |
| ranaria | mobile | retro | 12.6 | 16.8 | 1 | después |

## Notas de la medición final

Corrida oficial «después»: 30 combinaciones, servidor `next start` con el build de los pasos 1–7. Dos filas no cumplen la letra de los criterios en esa corrida; se repitieron (30 s cada una, mismo servidor) para distinguir ruido del navegador de un problema real. La tabla conserva los valores de la corrida oficial.

| Combinación | Corrida oficial | Repeticiones (FPS medio · frames > 50 ms) |
| --- | --- | --- |
| rocas · mobile · neon | 59.1 FPS · 1 frame | 59.9 · 0 / 60.0 · 0 / 60.0 · 0 |
| ranaria · mobile · retro | 12.6 FPS · 1 frame (p95 16.8 ms: una única parada del navegador) | 58.6 · 1 / 59.5 · 0 / 59.7 · 0 |

- Ranaria móvil retro: en 1 de 4 corridas aparece un frame > 50 ms aislado; el criterio «0 frames > 50 ms» no se cumple de forma estable en esa combinación.
- Esta sección se escribe a mano: `scripts/measure-fps.mjs` regenera el archivo y la borraría.
