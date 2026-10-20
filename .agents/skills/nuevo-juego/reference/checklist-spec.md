# Criterios de aceptación y riesgos base

Plantilla para el spec generado. Sustituye `<slug>` y `<TÍTULO>`, quita lo que no aplique y añade los criterios propios del juego (puntos por acción, reglas, controles, niveles). Cada ítem debe seguir siendo booleano y verificable.

## Criterios de aceptación

**Globales**

- [ ] `npm run build` termina sin errores ni errores de tipos.
- [ ] `npm run lint` termina sin errores.
- [ ] No hay errores ni advertencias de hidratación ni de React Strict Mode en la consola de `/juegos/<slug>/jugar`.
- [ ] `references/` queda intacto.
- [ ] No se modifica ninguna clase existente de `app/globals.css`; solo se añaden reglas nuevas.
- [ ] Las pantallas de los specs anteriores se ven igual salvo lo que este spec cambia.

**Juego** _(añadir aquí las reglas concretas del juego)_

- [ ] Las teclas `<controles>` hacen lo descrito y no hacen scroll de la página mientras se juega.
- [ ] Las acciones de un solo disparo ocurren una vez por pulsación, no por mantener (si el original es así).
- [ ] La puntuación suma exactamente `<regla de puntos>`.
- [ ] `<condición de fin>` abre el modal «FIN DEL JUEGO» con la puntuación final real.

**Integración con el reproductor**

- [ ] El HUD muestra jugador, puntuación (`es-ES`) y las métricas `<vidas/nivel/líneas…>` reales, actualizadas al instante.
- [ ] PAUSA congela el juego y REANUDAR lo continúa sin saltos.
- [ ] FIN abre el modal con la puntuación actual.
- [ ] «JUGAR DE NUEVO» reinicia con puntuación 0 y estado inicial nuevo.
- [ ] SALIR y «VOLVER AL VAULT» navegan correctamente; al volver, la partida empieza de cero sin bucles ni listeners duplicados.
- [ ] Cambiar de pestaña o perder el foco de la ventana pausa el juego.
- [ ] El pie del marco CRT muestra los controles del juego.
- [ ] `/juegos/rocas/jugar` y las demás demos siguen igual que antes.

**Rendimiento y limpieza**

- [ ] Al desmontar se cancela el `requestAnimationFrame` y se retiran los listeners (tras navegar fuera, pulsar teclas no ejecuta código del juego).
- [ ] Con la pestaña oculta o en pausa no hay trabajo de simulación.
- [ ] Una partida de 2 minutos no muestra crecimiento sostenido de memoria ni arrays sin purgar.

**Base de datos y catálogo**

- [ ] `supabase/migrations/NNN_juego_<slug>.sql` existe y coincide con lo aplicado.
- [ ] `games` tiene `ranked = true` y el `max_score` acordado para `<slug>`; el resto de filas no cambia.
- [ ] `get_advisors` de seguridad no reporta avisos nuevos.
- [ ] Un `insert` en `scores` con la clave publishable falla, incluso con sesión iniciada.
- [ ] `/` y `/biblioteca` muestran los mismos juegos que antes (8 si es reemplazo) con el texto y la portada de `<TÍTULO>` actualizados.
- [ ] `/juegos/<slug>` y `/juegos/<slug>/jugar` cargan; un id inexistente muestra la página de no encontrado.

**Guardado y leaderboard**

- [ ] Con sesión iniciada, al terminar `<slug>` el modal muestra el `username` real y «GUARDAR PUNTUACIÓN» inserta una fila en `scores` con `game_id = '<slug>'`, el `user_id` del usuario y la puntuación mostrada.
- [ ] Pulsar «GUARDAR PUNTUACIÓN» dos veces rápido inserta una sola fila.
- [ ] Sin sesión, el modal muestra «INICIA SESIÓN PARA GUARDAR TU PUNTUACIÓN» con enlace a `/acceso` y sin botón de guardar.
- [ ] `submitScore('<slug>', max_score + 1)` devuelve `invalid` y no inserta.
- [ ] Tras guardar, la marca aparece en la pestaña `<TÍTULO>` de `/salon` al recargar, una sola fila por jugador (la mejor).
- [ ] La tarjeta y el detalle del juego muestran la mejor marca y el número de partidas reales.
- [ ] Si `<slug>` reemplaza una demo, el juego anterior ya no muestra el aviso «ESTE JUEGO ES UNA DEMO».

**Responsive y accesibilidad**

- [ ] A 1440 px el canvas llena el marco CRT sin deformarse.
- [ ] A 390 px el canvas se escala, no hay scroll horizontal y el HUD no se rompe.
- [ ] El canvas tiene `aria-label` descriptivo.
- [ ] Con `prefers-reduced-motion: reduce` el juego no arranca solo y espera a REANUDAR.

## Riesgos base

| Riesgo                                                                                          | Mitigación                                                                                           |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Strict Mode monta el efecto dos veces y duplica bucles o listeners                              | El efecto devuelve limpieza completa; criterio de «sin listeners tras desmontar».                    |
| `cacheComponents` conserva la página oculta y el estado de React sobrevive al navegar           | El reproductor restablece su estado al desmontar el efecto; criterio de «empieza de cero al volver». |
| `onChange` en cada frame provoca 60 renders por segundo                                         | El componente compara el snapshot anterior y notifica solo si cambia.                                |
| `Math.random` en el render inicial rompe la hidratación                                         | El motor se crea dentro de `useEffect`.                                                              |
| Las flechas o el espacio hacen scroll o activan un botón enfocado                               | `preventDefault` en las teclas del juego; quitar el foco de los botones tras pulsarlos.              |
| `dt` grande al volver de una pestaña oculta hace saltar los objetos                             | `dt` máximo 0.05 s y pausa automática por visibilidad y foco.                                        |
| Escalar el canvas por CSS desenfoca líneas finas                                                | Validar visualmente a 1440 y 390 px; evaluar `devicePixelRatio` solo si se ve borroso.               |
| En móvil no hay teclado y el juego no es jugable                                                | Aceptado: fuera de alcance; el pie CRT muestra los controles de teclado.                             |
| Un usuario autenticado llama a `submitScore` con una marca falsa dentro del tope                | Aceptado en el MVP: `ranked` y `max_score` limitan el daño. Anticheat real, en otro spec.            |
| El `max_score` es demasiado bajo y rechaza partidas legítimas, o demasiado alto y no frena nada | Calcularlo a partir de las reglas y dejarlo ajustable por migración.                                 |
| Migración que cambia el `id` de una demo rompe la clave foránea de `scores`                     | Mantener el `id` existente al reemplazar una demo.                                                   |
| El juego original depende de assets o sonido que no se portan                                   | Dejarlos fuera de alcance de forma explícita y registrar la decisión.                                |
