# Juegos implementados en Arcade Vault

> Consultado desde la base de datos de Supabase el 2026-10-21.

## Resumen

| Estado        | Cantidad |
| ------------- | -------- |
| Implementado  | 4        |
| Pendiente     | 4        |
| **Total**     | **8**    |

---

## Juegos implementados (con engine)

Estos juegos tienen motor de juego funcional en `lib/games/` y están registrados en `lib/games/registry.ts`.

### 1. Bloque Buster

| Campo         | Valor                                              |
| ------------- | -------------------------------------------------- |
| **ID**        | `bloque-buster`                                    |
| **Categoría** | ARCADE                                             |
| **Engine**    | `lib/games/arkanoid/engine.ts`                     |
| **Ranked**    | Si                                                 |
| **Max score** | 2,080                                              |
| **Color**     | cyan                                               |
| **Controles** | ← → Mover paleta                                  |
| **Descripción** | Rebota la pelota y destruye muros de neón. Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. |

### 2. Caída

| Campo         | Valor                                              |
| ------------- | -------------------------------------------------- |
| **ID**        | `caida`                                            |
| **Categoría** | PUZZLE                                             |
| **Engine**    | `lib/games/tetris/engine.ts`                       |
| **Ranked**    | Si                                                 |
| **Max score** | 500,000                                            |
| **Color**     | magenta                                            |
| **Controles** | ← → Mover · ↑ X Rotar · ↓ Bajar · Espacio Caída  |
| **Descripción** | Encaja las piezas antes de que el techo te aplaste. Piezas geométricas descienden desde la oscuridad. |

### 3. Serpentina

| Campo         | Valor                                              |
| ------------- | -------------------------------------------------- |
| **ID**        | `serpentina`                                       |
| **Categoría** | ARCADE                                             |
| **Engine**    | `lib/games/snake/engine.ts`                        |
| **Ranked**    | Si                                                 |
| **Max score** | 2,970                                              |
| **Color**     | green                                              |
| **Controles** | ← ↑ ↓ → / WASD Mover                              |
| **Assets**    | `public/games/snake/fruits.png`                    |
| **Descripción** | Crece sin morder tu propia cola. Una serpiente de luz recorre la grilla buscando núcleos magenta. |

### 4. Rocas

| Campo         | Valor                                              |
| ------------- | -------------------------------------------------- |
| **ID**        | `rocas`                                            |
| **Categoría** | SHOOTER                                            |
| **Engine**    | `lib/games/asteroids/engine.ts`                    |
| **Ranked**    | Si                                                 |
| **Max score** | 1,000,000                                          |
| **Color**     | yellow                                             |
| **Controles** | ← → Rotar · ↑ Propulsar · Espacio Disparar        |
| **Descripción** | Pulveriza asteroides en gravedad cero. Tu nave triangular flota en vacío absoluto. |

---

## Juegos pendientes (sin engine)

Estos juegos existen en la base de datos pero aún no tienen motor implementado. No están en el registry y tienen `ranked: false`.

### 5. Glotón

| Campo         | Valor                                              |
| ------------- | -------------------------------------------------- |
| **ID**        | `gloton`                                           |
| **Categoría** | ARCADE                                             |
| **Color**     | yellow                                             |
| **Descripción** | Devora puntos y escapa de los fantasmas. Un círculo glotón patrulla un laberinto coleccionando puntos luminosos. |

### 6. Invasores

| Campo         | Valor                                              |
| ------------- | -------------------------------------------------- |
| **ID**        | `invasores`                                        |
| **Categoría** | SHOOTER                                            |
| **Color**     | green                                              |
| **Descripción** | Defiende el planeta de filas alienígenas. Olas de pixeles hostiles descienden formación tras formación. |

### 7. Ranaria

| Campo         | Valor                                              |
| ------------- | -------------------------------------------------- |
| **ID**        | `ranaria`                                          |
| **Categoría** | ARCADE                                             |
| **Color**     | green                                              |
| **Descripción** | Cruza la autopista de pixeles. Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. |

### 8. Duelo Pixel

| Campo         | Valor                                              |
| ------------- | -------------------------------------------------- |
| **ID**        | `duelo-pixel`                                      |
| **Categoría** | VERSUS                                             |
| **Color**     | cyan                                               |
| **Descripción** | Dos paletas. Una pelota. Reflejos máximos. El duelo más puro: dos paletas verticales se enfrentan por rebotar una pelota luminosa. |

---

## Estadísticas de juego (desde game_stats)

| Juego         | Mejor puntuación | Partidas jugadas |
| ------------- | ----------------:| ----------------:|
| Bloque Buster | 10               | 1                |
| Rocas         | 2,400            | 1                |
| Caída         | —                | —                |
| Serpentina    | —                | —                |
