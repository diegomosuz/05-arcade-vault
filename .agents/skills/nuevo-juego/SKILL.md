---
name: nuevo-juego
description: Crea el spec para portar o crear un juego jugable con puntuaciones y leaderboard en Arcade Vault, partiendo de references/started-games/ o de una descripción. Genera specs/NN-juego-<slug>.md en estado Borrador; la implementación la hace /spec-impl.
disable-model-invocation: true
argument-hint: "<carpeta de references/started-games, p. ej. 03-tetris, o descripción del juego>"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), mcp__supabase__list_tables, mcp__supabase__execute_sql
---

# /nuevo-juego — Spec para un juego con leaderboard

## Contexto de sesión

Fecha de hoy (úsala en la cabecera del spec, nunca la adivines):
!`date +%F`

Specs existentes:
!`ls specs/ 2>/dev/null || echo "No existe la carpeta specs/"`

Migraciones existentes:
!`ls supabase/migrations/ 2>/dev/null`

Juegos de referencia disponibles:
!`ls references/started-games/ 2>/dev/null`

Motores ya portados:
!`ls lib/games/ 2>/dev/null`

¿Existe el registro de juegos?
!`ls lib/games/registry.ts 2>/dev/null || echo "NO existe lib/games/registry.ts"`

---

Esta skill produce **un spec**, no código. Convierte un juego (de `references/started-games/` o descrito por el usuario) en un spec listo para `/spec-impl` que lo porta a TypeScript, lo conecta al reproductor y lo da de alta como juego `ranked` con puntuaciones reales y leaderboard, siguiendo el patrón de SPEC 04 (motor + canvas) y SPEC 06 (`games`, `scores`, `submitScore`, Salón de la Fama).

Las respuestas, el spec y las preguntas van **en español**, con las mismas etiquetas que los specs existentes (`Estado`, `Borrador`, `Depende de`, `Alcance`, etc.).

Archivos de apoyo (léelos en la Fase 1):

- `reference/contrato-motor.md` — contrato común del motor, registro y componente canvas.
- `reference/integracion-plataforma.md` — qué ya es genérico y qué hay que tocar (migración, tipos, portada).
- `reference/checklist-spec.md` — criterios de aceptación y riesgos base reutilizables.

## Fase 1 — Contexto

1. Lee `AGENTS.md` y `AGENTS.md`.
2. **Lee la skill `/spec`** (obligatorio, antes de cualquier otra cosa de este flujo): `.Codex/skills/spec/SKILL.md` y `.Codex/skills/spec/template.md`. Esa skill es la fuente de verdad de cómo se diseña y se guarda un spec en este repo (fases, reglas duras, numeración, estado por defecto, `specs/.spec-config.yml`). Si no puedes leerla, detente y avisa al usuario: no generes el spec de memoria.
3. **Lee la carpeta `specs/`**: `specs/04-juego-asteroides.md` y `specs/06-juegos-scores-leaderboard.md` (el patrón a repetir) y los dos specs más recientes del listado, para copiar idioma, formato, etiquetas y numeración. Si existe `specs/.spec-config.yml`, léelo también.
4. Lee los tres archivos de `reference/`.
5. Si `lib/games/registry.ts` **no existe**, el spec debe incluir el paso 0 (crear contrato y registro y migrar `rocas` a él). Si existe, léelo y úsalo.
6. Consulta el catálogo real con `execute_sql` (solo `select`):
   `select id, title, cat, cover, color, position, ranked, max_score from public.games order by position;`
   Así sabes qué demos siguen sin motor real y cuál es la siguiente `position`.

## Fase 2 — Analizar el origen

El argumento es `$ARGUMENTS`.

**Si apunta a una carpeta de `references/started-games/`** (acepta `03`, `tetris` o `03-tetris`): lee su `AGENTS.md`, `README.md`, `game.js` y auxiliares (`levels.js`, `assets/`, `index.html`). Extrae y presenta un resumen breve:

- Tamaño del canvas y proporción.
- Controles de teclado.
- Reglas de puntuación y qué métricas muestra el HUD (vidas, nivel, líneas…).
- Estados (pausa, game over) y qué se dibuja en el canvas y debe desaparecer (HUD, pantalla de game over; los cubre React).
- Variables globales, listeners sin limpieza, `requestAnimationFrame` propio y otros puntos que impiden incrustarlo tal cual.
- Assets (spritesheet, sonido) y uso de `Math.random`.
- Tamaño aproximado (líneas) para juzgar si cabe en un solo spec.

**Si es una descripción libre:** no inventes reglas; todo lo que falte se pregunta en la Fase 3.

`references/` es solo lectura: nunca se modifica.

## Fase 3 — Preguntas

Haz preguntas en bloques de 3 a 5 con `AskUserQuestion`, con tu recomendación primero y etiquetada, y espera la respuesta de cada bloque. No repitas lo que ya se sabe por el análisis. Cubre siempre:

1. **Catálogo.** ¿Reemplaza una demo existente (propón la más afín por categoría y título, p. ej. Tetris → `caida`, Arkanoid → `bloque-buster`) o es una entrada nueva? Si es nueva: `id` (slug), `title`, `short`, `long`, `cat`, `color`, `position` y portada CSS nueva.
2. **`max_score`.** Propón un tope calculado a partir de las reglas (el valor por defecto 1 000 000 solo si no hay base para otro).
3. **HUD y controles.** Métricas que mostrará el HUD además de la puntuación, y teclas.
4. **Aspecto y extras.** Aspecto original vs paleta neón; sonido y assets dentro o fuera de alcance (por defecto fuera).
5. **Reglas.** Cambios de reglas o balance (por defecto ninguno).
6. **Tamaño.** Si el juego es grande (p. ej. Arkanoid con spritesheet, sonido y niveles), propón dividirlo: motor jugable primero; assets y sonido en otro spec.

Si una respuesta abre otra caja de Pandora (táctil, multijugador, anticheat), indica que merece su propio spec y déjala fuera.

**Para de preguntar** cuando puedas responder sin suponer: qué archivos aparecen o cambian, cuál es el primer y el último paso, y cómo se verifica que está terminado. Si el usuario quiere saltarse las preguntas, recuérdale que ahorran horas después y, si insiste, anótalo en «Decisiones».

## Fase 4 — Escribir el spec

Antes de escribir, **vuelve a consultar `.Codex/skills/spec/SKILL.md`** (Fases 3 y 4 y «Hard rules») y `template.md`, y aplica sus reglas tal cual: spec completo de una vez cuando la información está completa, sin TODO, sin código largo, sin decisiones sin confirmar. Esta skill solo añade el contenido específico de juegos; ante cualquier conflicto de formato o proceso, manda `/spec`.

Con la información completa, escribe el spec entero de una vez (sin mostrar borradores por secciones). Sigue `template.md` y el formato de SPEC 04/06, en este orden:

1. **Cabecera:** `# SPEC NN — Juego <TÍTULO> con puntuaciones y leaderboard`, `Estado: Borrador`, `Depende de: SPEC 04, SPEC 06` (más el spec que cree el registro, si ya existe uno), fecha del contexto de sesión y `Objetivo` en **una sola frase**.
2. **Por qué existe este spec.**
3. **Alcance:** dentro y fuera, ambos explícitos.
4. **Modelo de datos:** tipos concretos del motor y entrada de registro, SQL de la migración (con el siguiente número de `supabase/migrations/`) y cualquier tipo nuevo.
5. **Plan de implementación**, cada paso deja el sistema funcional y con verificación. Parte de este esqueleto y ajústalo:
   - **0.** _(solo si no existe `lib/games/registry.ts`)_ Crear contrato y registro, y migrar `rocas` sin cambios visibles.
   - **1.** Motor `lib/games/<slug>/engine.ts` portado según el contrato.
   - **2.** Registrar el juego en `lib/games/registry.ts`.
   - **3.** Migración `supabase/migrations/NNN_juego_<slug>.sql` aplicada con `apply_migration` y tipos regenerados.
   - **4.** Portada y catálogo (si es entrada nueva): `CoverClass` y `.cover-<slug>` en `app/globals.css`, solo reglas nuevas, con `/frontend-design`.
   - **5.** Pie CRT con controles, escalado y `prefers-reduced-motion`.
   - **6.** Verificación del guardado: partida real → fila en `scores` → aparece en `/salon`.
     Cada paso debe poder commitearse solo; si pide más de 30–50 líneas, divídelo. El último paso no es «probar todo».
6. **Criterios de aceptación:** parte de `reference/checklist-spec.md` sustituyendo `<slug>` y añade los específicos del juego (puntos por acción, reglas, controles). Todos booleanos y verificables.
7. **Decisiones tomadas y descartadas**, con motivo.
8. **Riesgos:** los base de `checklist-spec.md` más los propios del juego.
9. **Qué no está en este spec.**

Reglas del documento: una idea por frase, nombres concretos de archivos, sin TODO, sin funciones completas (solo fragmentos para ilustrar estructuras).

## Fase 5 — Guardar

Sigue la «Phase 4 — Save the spec» de `.Codex/skills/spec/SKILL.md`:

1. Número `NN`: el más alto de `specs/` más uno, con dos dígitos. Slug en kebab-case: `NN-juego-<slug>.md`.
2. Fecha: la del contexto de sesión, nunca otra. Estado: `Borrador`, nunca `Aprobado`.
3. Comprueba que cada spec de `Depende de` existe. Escribe el archivo directamente en `specs/` sin pedir permiso; pregunta solo si ya existe.
4. Si `specs/.spec-config.yml` no existe, créalo con el contenido por defecto que define `/spec`; si existe, no lo toques.
5. Confirma al usuario: la ruta creada, que está en `Borrador` y que debe pasarlo a `Aprobado` tras revisarlo (lo hace la persona, no el agente), si creaste `.spec-config.yml`, y el siguiente paso: `/spec-impl NN-juego-<slug>`.
6. **Para aquí.** No propongas implementarlo.

## Reglas duras

- No crees ningún archivo de spec sin haber leído antes `.Codex/skills/spec/SKILL.md` y `specs/` en esta misma ejecución.
- Nunca escribas código ni apliques migraciones en esta skill; los únicos archivos que creas son el spec y, si falta, `specs/.spec-config.yml`.
- Nunca toques `references/`.
- No asumas reglas del juego, textos del catálogo ni nombres que el usuario no haya confirmado.
- No inventes datos de la base: consúltalos.
- Si el juego no cabe en una frase de objetivo, o toca más de tres áreas, propón dividirlo antes de escribir.
