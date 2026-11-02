---
name: spec-impl-game
description: Implementa el spec aprobado de un juego siguiendo exactamente /spec-impl y, al terminar, lanza uno tras otro (nunca en paralelo) los agentes skin-designer y mobile-porter-agent.
disable-model-invocation: true
argument-hint: <NN-juego-slug>
allowed-tools: Read, Glob, Grep, Edit, Write, AskUserQuestion, Agent, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*)
---

# /spec-impl-game — Implementa un juego y lo pasa por skins y móvil

## Contexto de sesión

Estado del repositorio:
!`git status --short`

Rama actual:
!`git branch --show-current`

Specs disponibles:
!`ls specs/ 2>/dev/null || echo "No existe la carpeta specs/"`

Configuración de creación de rama:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (default, sin archivo de config)"`

Motores ya portados:
!`ls lib/games/ 2>/dev/null`

---

Esta skill hace lo mismo que `/spec-impl` y añade, al final, dos agentes en secuencia. Responde siempre en español.

El argumento es `$ARGUMENTS`.

## Fase A — Implementación (delegada en `/spec-impl`)

`/spec-impl` tiene `disable-model-invocation: true`, así que no se puede invocar con `Skill`. Se reutiliza leyendo su definición:

1. Lee `.claude/skills/spec-impl/SKILL.md` completo en esta ejecución. Si no puedes leerlo, detente y avisa: no lo reconstruyas de memoria.
2. Ejecuta sus Fases 1 a 4 **tal cual**, con `$ARGUMENTS` como argumento: identificar el spec, validar que está `Aprobado`, rama `spec-NN-slug`, resumen del spec y implementación paso a paso con pausas y confirmación del usuario. Sus reglas (nunca commitear, no improvisar ante ambigüedades, nada fuera de alcance) rigen aquí sin cambios. Usa el contexto de sesión de arriba en lugar de los bloques `!` de esa skill.
3. Si `/spec-impl` se detiene (argumento vacío, spec no encontrado, estado distinto de Aprobado, cambios sin commitear sin resolver, usuario que no confirma), **termina aquí**: no lances ningún agente.

## Fase B — Puente

Solo cuando `/spec-impl` haya completado **todos** los pasos del plan:

1. Identifica el `id` del juego (entrada nueva en `lib/games/registry.ts` o el indicado en el spec) y la lista de archivos tocados (`git status --short` y `git diff --name-only`).
2. Avisa al usuario: «Implementación terminada. Ahora lanzo `skin-designer` y, cuando termine, `mobile-porter-agent`.»

## Fase C — Agentes en secuencia

**Nunca en paralelo**: cada `Agent` va en su propio turno y no se lanza el siguiente hasta recibir el informe final del anterior.

1. **`skin-designer`** (`subagent_type: "skin-designer"`). El prompt incluye: ruta del spec, `id` del juego, archivos tocados, que el foco es ese juego sin romper los demás, y «no hagas commits». Espera su informe.
2. Si `skin-designer` falla o deja `npx tsc --noEmit` o `npm run lint` rotos, **para**, muestra su informe y pregunta al usuario antes de seguir.
3. **`mobile-porter-agent`** (`subagent_type: "mobile-porter-agent"`). El prompt incluye: ruta del spec, `id` del juego, archivos tocados por la implementación **y** por `skin-designer` (resume su informe), que el foco es el contrato táctil de la SPEC 10 del juego nuevo y su reproductor ya con el selector de skins, y «no hagas commits». Espera su informe.

## Fase D — Cierre

1. Resume al usuario el informe de cada agente: tablas de cumplimiento, archivos creados o modificados, pendientes y riesgos.
2. Recuerda el siguiente paso de `/spec-impl`: verificar uno a uno los criterios de aceptación; si pasan, cambiar el estado del spec a `Implementado` y hacer el commit final antes de fusionar la rama.
3. **Para aquí.** No hagas commit ni propongas nuevos juegos.

## Reglas duras

- No lances agentes si la implementación no terminó.
- Nunca lances los dos agentes a la vez; el orden es siempre `skin-designer` → `mobile-porter-agent`.
- No hagas commits, ni tú ni los agentes.
- No modifiques `.claude/skills/spec-impl/SKILL.md` ni `.claude/agents/*`.
