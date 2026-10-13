# SPEC 02 — Homepage (landing) de Arcade Vault

> **Estado:** Aprobado
> **Depende de:** SPEC 01
> **Fecha:** 2026-10-13
> **Objetivo:** Portar a Next.js la landing de `references/templates/home-about/home.jsx` como nueva página de inicio en `/`, moviendo la Biblioteca a `/biblioteca`.

---

## Por qué existe este spec

El SPEC 01 dejó la Biblioteca en `/`. La plantilla `home-about` separa **Inicio** (landing de marketing con hero, secciones y CTA) de **Biblioteca**. Este spec añade la landing y reubica la Biblioteca, que obliga a tocar enlaces del SPEC 01.

La plantilla incluye además la página «Acerca de» con formulario de contacto (`about.jsx`). Queda fuera de este spec y irá en el SPEC 03.

---

## Alcance

**Dentro:**

- Nueva página `/` con las siete secciones de `home.jsx`:
  - Hero: eyebrow `▸ INSERTA UNA MONEDA_`, título en tres líneas, subtítulo, CTAs «EXPLORAR JUEGOS» y «CREAR CUENTA», indicador «DESLIZA» y 8 siluetas pixel flotantes decorativas.
  - `// 01` ¿POR QUÉ ARCADE VAULT?: 4 tarjetas con icono pixel (gamepad, free, trophy, rocket).
  - `// 02` JUEGOS DISPONIBLES AHORA: 6 mini-tarjetas (los 6 primeros de `GAMES`) y botón «VER TODOS LOS JUEGOS →».
  - Banda de estadísticas: «12+ JUEGOS», «MILES DE PARTIDAS», «GLOBAL RANKING».
  - `// 03` ACTIVIDAD EN VIVO: ticker de 7 últimas puntuaciones y top 5 de jugadores con barras y colores oro, plata y bronce.
  - `// 04` PRECIOS: tarjeta «JUGADOR VAULT $0» con sello «FREE PLAY» y 3 preguntas frecuentes.
  - CTA final «¿LISTO PARA JUGAR?» con botón «INSERTAR MONEDA →».
- Animación de entrada `reveal`: las secciones aparecen al entrar en el viewport (`IntersectionObserver`).
- Mover la Biblioteca de `/` a `/biblioteca` (`app/biblioteca/page.tsx`).
- Actualizar el navbar: añadir el enlace «Inicio» a `/`, mantener «Biblioteca» (ahora `/biblioteca`) y ajustar el estado activo.
- Actualizar los enlaces que apuntaban a la Biblioteca como `/` (ver Plan, paso 2).
- Copiar a `app/globals.css` solo las clases de la landing de `styles.css` (bloques «HOME PAGE», «ACTIVITY» y «PRICING»).
- Datos estáticos y simulados en `lib/home.ts`.

**Fuera de alcance (para specs futuros):**

- Página «Acerca de» y formulario de contacto (`about.jsx`): SPEC 03. El enlace «Acerca de» **no** se añade al navbar.
- Datos reales de actividad, top diario o estadísticas: todo es contenido fijo.
- Botones de las tarjetas de precio con lógica distinta a navegar (no hay planes reales ni pagos).
- Refrescar o animar el ticker en vivo: las filas solo entran con `tickin` al montar.
- Migrar estilos a CSS Modules o a utilidades Tailwind.
- Cambiar la Biblioteca (`components/library.tsx`) más allá de su ruta.
- Panel «tweaks» y variantes de tema de la plantilla («Theme variants», «GAMEPAD»).
- Tests automatizados (no hay test runner configurado).
- Internacionalización: solo español.

---

## Modelo de datos

Se introducen datos estáticos tipados en `lib/home.ts`. No hay persistencia ni estado nuevos. Los 6 juegos del carrusel salen de `GAMES` (`lib/games.ts`).

```ts
// lib/home.ts
export type Accent = "cyan" | "magenta" | "yellow" | "green";

export type Feature = { icon: "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET"; title: string; desc: string; color: Accent };
export type HomeStat = { n: string; u: string; s: string };
export type RecentScore = { player: string; game: string; score: number; when: string; color: Accent };
export type TopPlayer = { rank: number; player: string; score: number };
export type Faq = { q: string; a: string };

export const FEATURES: Feature[];       // 4, textos idénticos a home.jsx
export const HOME_STATS: HomeStat[];    // 3
export const RECENT_SCORES: RecentScore[]; // 7
export const TOP_PLAYERS: TopPlayer[];  // 5
export const PRICING_FEATURES: string[]; // 6 ítems de la lista «✔ ...»
export const FAQS: Faq[];               // 3
```

Convenciones:

- Los textos se copian tal cual de `home.jsx`, sin cambios de contenido.
- Formato numérico: `toLocaleString("es-ES")`.
- Los iconos pixel (`FeatureIcon`) y las siluetas (`FloatingSilhouettes`) son SVG en componentes, no datos.

---

## Plan de implementación

Antes del paso 1, leer en `node_modules/next/dist/docs/` la guía de App Router sobre `Link`, `usePathname` y `cacheComponents`. Next.js 16.4 tiene cambios incompatibles con versiones anteriores. La interfaz se construye con el skill `/frontend-design`, según `CLAUDE.md`.

1. **Estilos.** Copiar a `app/globals.css` los bloques de `references/templates/home-about/styles.css`: «HOME PAGE» (líneas 930–1070, sin la parte de «ABOUT PAGE»), «ACTIVITY» (1621–1670) y «PRICING» (1672–1725). Incluir un `.blink` global (en `globals.css` solo existe `.av-hero .sub .blink`) y comprobar que `float`, `bounce`, `tickin` y `pulse-led` quedan definidos. No modificar ninguna clase existente. Verificación: `npm run build` pasa y las pantallas del SPEC 01 no cambian.
2. **Mover la Biblioteca.** Crear `app/biblioteca/page.tsx` con el contenido actual de `app/page.tsx` (metadatos incluidos). Cambiar a `/biblioteca` los enlaces que apuntan a la Biblioteca: «VOLVER AL VAULT» en `app/juegos/[id]/page.tsx` y `components/game-player.tsx`, y «VOLVER A LA BIBLIOTECA» en `components/hall-of-fame.tsx`. Verificación: `/biblioteca` muestra la misma pantalla que antes.
3. **Navbar.** En `components/nav.tsx`: añadir «Inicio» (`/`, activo solo con `pathname === "/"`), pasar «Biblioteca» a `/biblioteca` (activo con `/biblioteca` y `/juegos/*`), y reflejarlo en el panel móvil. El logo sigue enlazando a `/`. Verificación: el resaltado cambia según la ruta, en escritorio y en móvil.
4. **Redirecciones tras acceso.** En `components/auth-form.tsx`, enviar a `/biblioteca` en lugar de `/` tras iniciar sesión y tras «JUGAR COMO INVITADO». Verificación: ambas acciones aterrizan en `/biblioteca`.
5. **Datos.** Crear `lib/home.ts` con los tipos y constantes del modelo. Verificación: `npm run build` pasa.
6. **Componentes de la landing.** Crear `components/home/reveal.tsx` (cliente: envuelve una sección y añade `.in` con `IntersectionObserver`, con `threshold: 0.12` y `unobserve` al entrar) y `components/home/pixel-art.tsx` (`FloatingSilhouettes` y `FeatureIcon`, servidor). Verificación: `npm run build` pasa.
7. **Secciones.** Crear `components/home/hero.tsx`, `features.tsx`, `games-preview.tsx`, `stats.tsx`, `activity.tsx`, `pricing.tsx` y `final-cta.tsx`. Todos son Server Components salvo que necesiten estado. Los botones de navegación son `Link` con clase `btn` (no `button` con `onClick`). Las mini-tarjetas enlazan a `/juegos/[id]`. Verificación: cada sección se ve con el estilo de la plantilla.
8. **Página.** Reemplazar `app/page.tsx` por la composición de las secciones dentro de `<div className="home fade-in">`, con `metadata` propio. Verificación: `/` muestra la landing completa y todos los CTA navegan al destino correcto.
9. **Accesibilidad de movimiento.** Añadir `@media (prefers-reduced-motion: reduce)` que desactive `reveal` (visible de inmediato), `float`, `bounce` y `pulse` en la landing. Verificación: con la preferencia activa, no hay animaciones de entrada ni elementos ocultos.

---

## Criterios de aceptación

**Globales**

- [ ] `npm run build` termina sin errores ni errores de tipos.
- [ ] `npm run lint` termina sin errores.
- [ ] No hay errores ni advertencias de hidratación en la consola del navegador en `/` ni en `/biblioteca`.
- [ ] `references/templates/` queda intacto.
- [ ] No se modifica ninguna clase existente de `app/globals.css`; solo se añaden las de la landing.
- [ ] Las 5 pantallas del SPEC 01 se ven igual que antes.

**Rutas y navegación**

- [ ] `/` muestra la landing y `/biblioteca` muestra la Biblioteca del SPEC 01 (hero, buscador, chips y 8 tarjetas).
- [ ] El navbar lista «Inicio», «Biblioteca» y «Salón de la Fama». No hay enlace «Acerca de».
- [ ] «Inicio» está activo en `/`. «Biblioteca» está activo en `/biblioteca` y `/juegos/*`. «Salón de la Fama» está activo en `/salon`.
- [ ] El panel móvil (<840 px) lista los mismos enlaces y se cierra al pulsar uno.
- [ ] «VOLVER AL VAULT» (detalle y reproductor) y «VOLVER A LA BIBLIOTECA» (salón) llevan a `/biblioteca`.
- [ ] Tras iniciar sesión o pulsar «JUGAR COMO INVITADO» en `/acceso`, se redirige a `/biblioteca`.

**Hero**

- [ ] Se ve el eyebrow `▸ INSERTA UNA MONEDA` con guion bajo parpadeante, y el título en tres líneas («EL ARCADE», «CLÁSICO ESTÁ», «DE VUELTA»).
- [ ] «EXPLORAR JUEGOS» lleva a `/biblioteca` y «CREAR CUENTA» lleva a `/acceso`.
- [ ] Hay 8 siluetas decorativas con `aria-hidden="true"` que no interceptan clics.

**Secciones**

- [ ] «¿POR QUÉ ARCADE VAULT?» muestra 4 tarjetas con icono, título y descripción, en cyan, amarillo, magenta y verde.
- [ ] «JUEGOS DISPONIBLES AHORA» muestra exactamente 6 mini-tarjetas, con portada, título y categoría. Pulsar una navega a `/juegos/[id]`.
- [ ] «VER TODOS LOS JUEGOS →» lleva a `/biblioteca`.
- [ ] La banda de estadísticas muestra «12+», «MILES» y «GLOBAL» con sus etiquetas.
- [ ] El ticker lista 7 filas con jugador, juego, `+puntuación` en formato `es-ES` y tiempo relativo.
- [ ] El top de jugadores lista 5 filas con #01 en oro, #02 en plata y #03 en bronce, y barras de ancho 100 %, 84 %, 68 %, 52 % y 36 %.
- [ ] «VER SALÓN →» lleva a `/salon`.
- [ ] La tarjeta de precios muestra «$0 / SIEMPRE», 6 ítems con ✔ y el sello «FREE PLAY». «EMPEZAR GRATIS →» lleva a `/acceso`.
- [ ] Se muestran las 3 preguntas frecuentes con los textos de la plantilla.
- [ ] «INSERTAR MONEDA →» (CTA final) lleva a `/biblioteca`.

**Animación**

- [ ] Las secciones con `reveal` están ocultas al cargar y aparecen una sola vez al entrar en el viewport.
- [ ] Con `prefers-reduced-motion: reduce`, todas las secciones son visibles sin desplazarse.

**Responsive**

- [ ] A 1440 px: 4 tarjetas de características por fila y 6 mini-tarjetas por fila.
- [ ] A 390 px: 1 columna de características, 2 columnas de mini-tarjetas, estadísticas apiladas y sin scroll horizontal.

**Metadatos**

- [ ] La pestaña de `/` muestra un título propio («Inicio · Arcade Vault» o equivalente) y la de `/biblioteca` conserva «Biblioteca · Arcade Vault».

**Revisión visual**

- [ ] `/` se compara con `references/templates/home-about/arcade-vault-standalone.html` abierto en el navegador a 1440 px y a 390 px, sin diferencias visibles de layout, color o tipografía.

---

## Decisiones tomadas y descartadas

- **Sí:** landing en `/` y Biblioteca en `/biblioteca`, igual que la plantilla (Inicio, Biblioteca, Salón, Acerca de). **No:** dejar la Biblioteca en `/`, porque la landing no sería la página de entrada. **No:** fusionar la Biblioteca como sección de la landing, porque rompe la paridad con la plantilla y con el SPEC 01.
- **Sí:** solo la home en este spec; «Acerca de» va al SPEC 03. **No:** portar `about.jsx` ahora, porque trae un formulario y una ruta con su propia verificación.
- **Sí:** copiar solo las clases de la landing a `app/globals.css`, como hizo el SPEC 01. **No:** CSS separado ni reescritura en Tailwind, para no abrir otra convención ni arriesgar regresión visual en los efectos neón.
- **Sí:** datos estáticos y simulados en `lib/home.ts`, textos idénticos a la plantilla. **No:** derivarlos de `GAMES` y `seededScores`, porque exigiría definir fórmulas que se alejan de la plantilla. **No:** hardcodearlos en los componentes, porque dificulta sustituirlos por datos reales.
- **Sí:** `Link` para todos los CTA en lugar de `button` con `onClick`. Son navegación real, accesible y prefetch del App Router. **No:** replicar el `navigate()` de la plantilla.
- **Sí:** Server Components para las secciones; solo `Reveal` es cliente. **No:** una landing entera `"use client"`, porque no necesita estado.
- **Sí:** `prefers-reduced-motion` desde el inicio, porque `reveal` oculta contenido y debe degradar bien. La plantilla no lo contempla.
- **Sí:** el enlace «Acerca de» no aparece en el navbar hasta que exista la ruta. **No:** dejar un enlace roto.
- **Sí:** el redirect tras acceso pasa a `/biblioteca` para conservar el flujo del SPEC 01 (entrar y ver juegos). **No:** enviar a `/`, porque devolvería al usuario a la landing que ya vio.
- **Sí:** verificación con `build`, `lint` y revisión visual manual. **No:** añadir un test runner.

---

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| `reveal` oculta secciones si JS falla o tarda en hidratar | `prefers-reduced-motion` las muestra. Se valida en el paso 9 y en los criterios de animación. |
| Mover `/` rompe enlaces del SPEC 01 que no estén en la lista del paso 2 | `Grep` de `href="/"` y `push("/")` en `app/` y `components/` antes de cerrar el paso 2. |
| Colisión de nombres entre las clases nuevas y las existentes (`.blink`, `.top-row`, `.tick-row`, `.kicker`) | Revisar con `Grep` antes de pegar cada bloque. No sobrescribir las existentes. |
| `cacheComponents` hace que `usePathname` en el navbar requiera `Suspense` o provoque avisos | Reutilizar el patrón que ya funciona en el SPEC 01 y leer la guía de Next 16. |
| `IntersectionObserver` no existe en SSR | Solo se usa dentro de `useEffect` en `Reveal`. |
| Las siluetas SVG y el scroll horizontal en móvil por posiciones absolutas | `.home-hero` con `overflow: hidden` y criterio de «sin scroll horizontal» a 390 px. |

---

## Qué **no** está en este spec

- Página «Acerca de», formulario de contacto y el enlace en el navbar (SPEC 03).
- Datos reales de actividad, ranking diario o estadísticas.
- Planes de precios múltiples, pagos o créditos funcionales.
- Backend, base de datos o autenticación real.
- Migración de estilos a CSS Modules o Tailwind.
- Tests automatizados.
- Internacionalización.

Cada uno de ellos, si se aborda, va en su propio spec.
