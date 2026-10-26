# Sugerencias de juegos (to-do)

Fuente: agente `game-planner`, ronda del 2026-10-26. Puntuación sobre 25 (viabilidad, competitividad, equilibrio, estética, esfuerzo). Los `max_score` marcados con `~` son provisionales y se cierran en la spec.

Ninguno tiene spec ni está en `lib/games/registry.ts`. Solo **Invasores** existe en la BD (`ranked: false`); el resto habría que insertarlo en `games` con `ranked: true` y su `max_score`.

## Prioridad recomendada

- [ ] **Invasores** (Space Invaders): el único ya en BD
- [ ] **Ciclo de Luz** (Tron): mejor idea nueva, estrena VERSUS
- [ ] **Silos** (Missile Command): mejor SHOOTER nuevo

## SHOOTER

- [ ] **Invasores** (Space Invaders) · green · M · 22 · max_score 15.900. 5×11 aliens, búnkeres de bloques 4×4, 10 oleadas. Sin assets.
- [ ] **Silos** (Missile Command) · cyan · M · 23 · max_score ~80.000. 12 oleadas, mira con aceleración, silos Z/X/C.
- [ ] **Ciempiés** (Centipede) · magenta · M · 21 · max_score ~60.000. Rejilla tipo Serpentina.
- [ ] **Túnel** (Scramble) · magenta · M · 20 · max_score ~30.000. Único con scroll horizontal, longitud fija.
- [ ] **Enjambre** (Galaga) · cyan · M · 20 · max_score ~70.000. Se solapa con Invasores; mejor después de él.
- [ ] **Escuadrón** (1942) · yellow · L · 17 · max_score ~50.000. Patrones de vuelo, jefes y scroll.

## ARCADE

- [ ] **Pirámide** (Q*bert) · magenta · M · 22 · max_score 20.000. Único color libre en ARCADE. Controles diagonales: requieren ayuda visual.
- [ ] **Bombardeo** (Kaboom!) · yellow · S · 22 · max_score 2.900. El más barato; se parece a Bloque Buster.
- [ ] **Ranaria** (Frogger) · green · M · 18. Rejilla como Serpentina; sería el 3.er ARCADE.
- [ ] **Alunizaje** (Lunar Lander) · cyan · S-M · 21 · max_score 7.500. Reutiliza la física de Rocas.
- [ ] **Excavador** (Dig Dug) · green · L · 18 · max_score ~60.000.
- [ ] **Glotón** (Pac-Man) · yellow · L · 17. Pospuesto: laberinto + IA de 4 fantasmas.
- [ ] **Escalada** (Donkey Kong) · magenta · L · 17 · max_score ~50.000.

## PUZZLE

- [ ] **Cañería** (Pipe Mania) · cyan · S-M · 22 · max_score 50.000. Usar semilla por nivel para equidad.
- [ ] **Burbujas** (Puzzle Bobble) · yellow · M · 21 · max_score ~60.000. Rejilla hexagonal, la más vistosa.
- [ ] **Columnas** (Columns) · green · S · 20 · max_score 500.000. Muy parecido a Caída.
- [ ] **Fusión** (2048) · yellow · S · 20 · max_score 4.000.000. Necesita modo de 3 min.
- [ ] **Almacén** (Sokoban) · green · S · 19 · max_score 15.000. Hay que diseñar 10 niveles.

## VERSUS / deportes / carreras

- [ ] **Ciclo de Luz** (Tron) · magenta · S · 24 · max_score 3.000. 10 rondas vs CPU. Se parece a Serpentina.
- [ ] **Asfalto** (Road Fighter) · yellow · M · 22 · max_score ~50.000. Scroll vertical, 4 tramos.
- [ ] **Duelo Pixel** (Pong) · cyan · S · 20. Contra CPU; física parecida a Bloque Buster.
- [ ] **Canasta** (Pop-A-Shot) · cyan · S-M · 21 · max_score ~450. 60 s de tiros.
- [ ] **Slalom** (Skiing) · cyan · M · 20 · max_score 10.000. Contrarreloj convertida a puntos.
- [ ] **Olimpiada** (Track & Field) · magenta · L · 16. No recomendado: fácil de falsear con macros.

## Notas

- Categorías existentes: ARCADE, PUZZLE, SHOOTER, VERSUS. Carreras y deportes se clasificaron como VERSUS; una categoría nueva exige migrar la BD y actualizar el filtro de `/biblioteca`.
- Paleta de 4 colores (cyan, magenta, yellow, green): algunos colores se repiten.
- Memoria del agente: `.claude/agent-memory/game-planner/suggestions.md`.
