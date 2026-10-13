# SPEC 03 — Página «Acerca de» y formulario de contacto con Resend

> **Estado:** Borrador
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-10-13
> **Objetivo:** Portar a Next.js la página `references/templates/home-about/about.jsx` en `/acerca-de` y conectar su formulario de contacto a un correo real enviado con Resend mediante una Server Action.

---

## Por qué existe este spec

El SPEC 02 dejó fuera «Acerca de» y su enlace en el navbar. La plantilla simula el envío (`setSent(...)` sin red). Este spec lo hace real: es la primera integración con un servicio externo y la primera variable de entorno secreta del proyecto, por eso fija el mecanismo, el remitente y las defensas antes de escribir código.

---

## Alcance

**Dentro:**

- Nueva ruta `/acerca-de` con las dos secciones de `about.jsx`:
  - Hero: kicker `▸ ACERCA DE`, título «ACERCA DE ARCADE VAULT», texto de misión y 3 highlights con icono pixel (HEART magenta, BROWSER cyan, PLANT verde).
  - Divisor decorativo de 24 píxeles animados (`aria-hidden`).
  - Contacto: kicker `▸ CONTACTO`, título «CONTÁCTANOS», subtítulo, 3 tips con LED («RESPUESTA EN 24-48H», «SUGERENCIAS BIENVENIDAS», «SIN SPAM, JAMÁS») y formulario NOMBRE, CORREO ELECTRÓNICO, MENSAJE.
- Textos, clases y estructura idénticos a `about.jsx`, sin cambios de contenido.
- Animación de entrada `reveal` en divisor y contacto, reutilizando `components/home/reveal.tsx` del SPEC 02.
- Envío real con Resend desde una Server Action (`app/acerca-de/actions.ts`).
- Formulario cliente con `useActionState`: estado inicial, enviando, éxito (terminal `VAULT-OS // TERMINAL`), error de validación (shake) y error de envío (línea de error inline).
- Validación en servidor de nombre, correo y mensaje, con longitudes máximas.
- Honeypot oculto contra bots.
- Enlace «Acerca de» en el navbar de escritorio y en el panel móvil, activo en `/acerca-de`.
- Copiar a `app/globals.css` el bloque «ABOUT PAGE» de `styles.css` (líneas 1071–1150).
- Variables de entorno `RESEND_API_KEY` y `CONTACT_TO_EMAIL`, con `.env.example` documentado.
- Metadatos propios de la ruta.

**Fuera de alcance (para specs futuros):**

- Dominio propio verificado en Resend. El remitente es `onboarding@resend.dev`.
- Rate limit por IP o cualquier almacenamiento (Redis, KV, base de datos).
- Guardar los mensajes recibidos o mostrarlos en alguna pantalla.
- Correo de confirmación al visitante (solo se envía un correo al equipo).
- CAPTCHA (Turnstile, reCAPTCHA).
- Plantillas de correo con React Email o HTML elaborado: el correo es texto plano.
- Adjuntos.
- Panel «tweaks» y variantes de tema de la plantilla.
- Tests automatizados (no hay test runner configurado).
- Internacionalización: solo español.

---

## Modelo de datos

No hay persistencia nueva. Se añaden tipos para el formulario y para el resultado de la acción, y dos variables de entorno.

```ts
// app/acerca-de/actions.ts  ("use server")
export type ContactState =
  | { status: "idle" }
  | { status: "invalid"; fields: Partial<Record<"name" | "email" | "msg", string>>; values: ContactValues }
  | { status: "error"; values: ContactValues }
  | { status: "sent"; name: string };

export type ContactValues = { name: string; email: string; msg: string };

export async function sendContact(prev: ContactState, formData: FormData): Promise<ContactState>;
```

```bash
# .env.example  (el real va en .env.local, ignorado por git)
RESEND_API_KEY=re_xxxxxxxxxxxx     # clave de la cuenta de Resend
CONTACT_TO_EMAIL=tu@correo.com     # único destinatario; debe ser el correo dueño de la cuenta de Resend
```

Convenciones:

- Campos del `FormData`: `name`, `email`, `msg` y el honeypot `website` (debe llegar vacío).
- Límites de validación: `name` 1–60 caracteres, `email` con formato válido y máximo 120, `msg` 1–2000. Se aplica `trim()` antes de validar.
- Remitente: `Arcade Vault <onboarding@resend.dev>`. `replyTo` es el correo del visitante. Asunto: `[Arcade Vault] Mensaje de {name}`. Cuerpo en texto plano con nombre, correo y mensaje.
- Si el honeypot trae contenido, la acción devuelve `{ status: "sent", name }` sin llamar a Resend, para no dar pistas al bot.
- `RESEND_API_KEY` y `CONTACT_TO_EMAIL` se leen solo en el servidor. Nunca llevan prefijo `NEXT_PUBLIC_`.
- Los valores escritos se devuelven en `values` para que no se pierdan al fallar la validación o el envío.

---

## Plan de implementación

Antes del paso 1, leer en `node_modules/next/dist/docs/` la guía de App Router sobre Server Actions, `useActionState`, variables de entorno y `cacheComponents` (en especial cómo conviven acciones y formularios con ese modo). Next.js 16.4 tiene cambios incompatibles con versiones anteriores. La interfaz se construye con el skill `/frontend-design`, según `CLAUDE.md`. La plantilla manda: el formulario y la terminal deben verse igual que en `about.jsx`.

1. **Dependencia y entorno.** Ejecutar `npm install resend`. Crear `.env.example` con las dos variables y añadir `!.env.example` a `.gitignore` (hoy `.env*` lo ignora). Crear `.env.local` con valores reales sin commitearlo. Verificación: `npm run build` pasa y `git status` muestra `.env.example` pero no `.env.local`.
2. **Estilos.** Copiar a `app/globals.css` el bloque «ABOUT PAGE» (`styles.css` líneas 1071–1150). Revisar con `Grep` que no choque con clases existentes (`.field`, `.kicker`, `.caret`, `.dot`) y añadir `textarea` al estilo de `.field` solo si falta. Comprobar que `shake` queda definido. No modificar ninguna clase existente. Verificación: `npm run build` pasa y las pantallas de SPEC 01 y SPEC 02 no cambian.
3. **Iconos y secciones estáticas.** Crear `components/about/highlight-icon.tsx` (SVG HEART, BROWSER, PLANT, servidor) y `components/about/about-hero.tsx` (servidor: hero, highlights y divisor). Verificación: `npm run build` pasa.
4. **Ruta.** Crear `app/acerca-de/page.tsx` con `metadata` propio («Acerca de · Arcade Vault») que compone `<div className="about fade-in">`, `AboutHero`, el divisor y la sección de contacto envueltos en `Reveal`. De momento la sección de contacto muestra el formulario visual sin acción. Verificación: `/acerca-de` se ve como la plantilla y el scroll revela las secciones.
5. **Navbar.** En `components/nav.tsx` añadir «Acerca de» (`/acerca-de`, activo con `pathname.startsWith("/acerca-de")`) tras «Salón de la Fama», en escritorio y en el panel móvil. Verificación: el resaltado y el cierre del panel móvil funcionan.
6. **Server Action.** Crear `app/acerca-de/actions.ts` con `sendContact`: honeypot, `trim`, validación y límites, envío con `resend.emails.send` y manejo de `error` o excepción de Resend devolviendo `{ status: "error" }`. Sin registrar el cuerpo del mensaje en logs. Verificación: `npm run build` pasa y un envío de prueba llega a `CONTACT_TO_EMAIL`.
7. **Formulario cliente.** Crear `components/about/contact-form.tsx` (`"use client"`, `useActionState(sendContact, { status: "idle" })`). Estados: campos controlados por `values`, botón `▶  ENVIAR MENSAJE` deshabilitado y con texto «ENVIANDO…» mientras `pending`, clase `shake` 400 ms ante `invalid`, terminal de éxito con `{name.toUpperCase()}` y botón «ENVIAR OTRO MENSAJE» que reinicia el formulario. Añadir el campo `website` oculto (fuera de pantalla, `tabIndex={-1}`, `autoComplete="off"`, `aria-hidden`). Sustituir el formulario visual del paso 4. Verificación: los cuatro estados se ven y el envío real funciona.
8. **Error de envío.** Mostrar bajo el botón, cuando `status === "error"`, la línea `[ERROR] NO SE PUDO ENVIAR. INTÉNTALO DE NUEVO.` con estilo de terminal y `role="alert"`, conservando lo escrito. Verificación: con `RESEND_API_KEY` inválida aparece el error y los campos mantienen su valor.
9. **Movimiento reducido.** Extender el `@media (prefers-reduced-motion: reduce)` del SPEC 02 para desactivar `shake`, la animación de los píxeles del divisor y `pulse-led` en los tips. Verificación: con la preferencia activa la página es visible sin animaciones.

---

## Criterios de aceptación

**Globales**

- [ ] `npm run build` termina sin errores ni errores de tipos.
- [ ] `npm run lint` termina sin errores.
- [ ] No hay errores ni advertencias de hidratación en la consola en `/acerca-de`.
- [ ] `references/templates/` queda intacto.
- [ ] No se modifica ninguna clase existente de `app/globals.css`; solo se añaden las de «ABOUT PAGE».
- [ ] Las pantallas de SPEC 01 y SPEC 02 se ven igual que antes.
- [ ] `.env.local` no está en git y `.env.example` sí.
- [ ] `RESEND_API_KEY` no aparece en el JavaScript enviado al navegador (búsqueda en `.next/static` sin resultados).

**Navegación**

- [ ] El navbar lista «Inicio», «Biblioteca», «Salón de la Fama» y «Acerca de».
- [ ] «Acerca de» está activo en `/acerca-de` y los demás enlaces no.
- [ ] El panel móvil (<840 px) lista «Acerca de» y se cierra al pulsarlo.

**Contenido**

- [ ] Se ven el kicker `▸ ACERCA DE`, el título «ACERCA DE ARCADE VAULT» y el texto de misión idéntico a la plantilla.
- [ ] Hay 3 highlights con icono: magenta, cyan y verde, con los textos de la plantilla.
- [ ] El divisor tiene 24 píxeles y `aria-hidden="true"`.
- [ ] Se ven el kicker `▸ CONTACTO`, «CONTÁCTANOS», el subtítulo y los 3 tips con LED cyan, amarillo y magenta.
- [ ] Divisor y contacto aparecen una sola vez al entrar en el viewport.

**Formulario**

- [ ] Enviar con algún campo vacío o solo espacios no llama a Resend, aplica `shake` y conserva lo escrito.
- [ ] Un correo con formato inválido se rechaza en el servidor aunque se salte la validación del navegador.
- [ ] Un mensaje de más de 2000 caracteres se rechaza.
- [ ] Mientras se envía, el botón está deshabilitado y dice «ENVIANDO…».
- [ ] Un envío válido llega a `CONTACT_TO_EMAIL` con asunto `[Arcade Vault] Mensaje de {name}`, remitente `onboarding@resend.dev`, cuerpo con nombre, correo y mensaje, y `Reply-To` igual al correo del visitante.
- [ ] Tras un envío exitoso se muestra la terminal con «MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {NOMBRE EN MAYÚSCULAS}.».
- [ ] «ENVIAR OTRO MENSAJE» vuelve al formulario con los campos vacíos.
- [ ] Con `RESEND_API_KEY` inválida o ausente, no aparece la terminal de éxito: se muestra la línea `[ERROR]` con `role="alert"` y los campos conservan su valor.
- [ ] Rellenar el campo oculto `website` devuelve la terminal de éxito pero no genera ningún correo en Resend.
- [ ] El campo `website` no es visible, no recibe foco con Tab y no se anuncia en lectores de pantalla.

**Animación y accesibilidad**

- [ ] Con `prefers-reduced-motion: reduce` todo es visible sin desplazarse y no hay `shake`, píxeles animados ni LEDs pulsantes.
- [ ] Cada campo tiene su `label` asociado.

**Responsive**

- [ ] A 1440 px, contacto en dos columnas (intro y formulario) y 3 highlights en fila.
- [ ] A 390 px, una columna, highlights apilados y sin scroll horizontal.

**Metadatos**

- [ ] La pestaña de `/acerca-de` muestra «Acerca de · Arcade Vault».

**Revisión visual**

- [ ] `/acerca-de` se compara con `references/templates/home-about/arcade-vault-standalone.html` (ruta Acerca de) a 1440 px y a 390 px, incluido el estado de éxito, sin diferencias visibles de layout, color o tipografía.

---

## Decisiones tomadas y descartadas

- **Sí:** Server Action con `useActionState`. No hay endpoint público que mantener, la clave queda en el servidor y el estado del formulario se modela en un solo tipo. **No:** Route Handler `/api/contacto`, porque añade un endpoint expuesto y un `fetch` manual sin beneficio aquí.
- **Sí:** remitente `onboarding@resend.dev` y destinatario único `CONTACT_TO_EMAIL`. Sin dominio propio, Resend solo entrega a la cuenta dueña de la clave. **No:** dominio verificado ahora, porque exige infraestructura que el proyecto no tiene. Se resolverá en otro spec.
- **Sí:** destinatario y clave en variables de entorno. **No:** hardcodear el correo en el código, para no publicarlo en el repositorio ni atarlo al código.
- **Sí:** `replyTo` con el correo del visitante, para responder directamente desde el cliente de correo. **No:** usar el correo del visitante como `from`: Resend lo rechaza y suplantar remitentes degrada la entregabilidad.
- **Sí:** error de envío inline con `[ERROR]` en estilo terminal y valores conservados. **No:** mostrar la terminal de éxito cuando Resend falla, porque mentiría al usuario, ni limitarse al `shake`, que no explica nada.
- **Sí:** honeypot más validación y límites en el servidor. Cubre bots simples sin dependencias. **No:** rate limit por IP, porque necesita almacenamiento que no existe. **No:** CAPTCHA, que degrada la experiencia arcade y añade un tercero.
- **Sí:** el honeypot responde «éxito» sin enviar. **No:** devolver un error, porque enseña al bot que fue detectado.
- **Sí:** correo en texto plano. **No:** React Email ni HTML, porque el único lector es el equipo y evita otra dependencia.
- **Sí:** solo un correo al equipo. **No:** confirmación al visitante, porque duplica el volumen de envíos desde `onboarding@resend.dev` y abre la puerta a usar el formulario para enviar correo a terceros.
- **Sí:** ruta `/acerca-de`, en español como el resto de rutas. **No:** `/about`.
- **Sí:** copiar solo el bloque «ABOUT PAGE» a `app/globals.css`, como en SPEC 01 y SPEC 02. **No:** CSS Modules ni Tailwind.
- **Sí:** secciones estáticas como Server Components; solo `Reveal` y `ContactForm` son cliente. **No:** toda la página `"use client"`.
- **Sí:** `prefers-reduced-motion` desde el inicio, igual que en SPEC 02.
- **Sí:** verificación con `build`, `lint`, un envío real y revisión visual manual. **No:** añadir un test runner ni mockear Resend en pruebas automáticas.

---

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Con el remitente `onboarding@resend.dev`, Resend solo entrega al correo dueño de la cuenta; otro destinatario falla con error 403 | `CONTACT_TO_EMAIL` debe ser ese correo. Se documenta en `.env.example` y se valida en el paso 6. |
| El formulario puede usarse para inundar de correos al destinatario | Honeypot, límites de longitud y `Reply-To` en lugar de reenviar a terceros. El rate limit queda explícitamente fuera y es riesgo aceptado del MVP. |
| `RESEND_API_KEY` filtrada al cliente o al repositorio | Solo se lee en el archivo `"use server"`, sin prefijo `NEXT_PUBLIC_`, `.env*` ignorado y criterio de búsqueda en `.next/static`. |
| Inyección de cabeceras o contenido malicioso en asunto y cuerpo | El asunto usa `name` ya limpiado (sin saltos de línea) y el cuerpo es texto plano, no HTML. |
| `cacheComponents` y Server Actions pueden comportarse distinto al Next.js clásico | Leer la guía de Next 16 antes del paso 1 y verificar el envío real en el paso 6. |
| Resend caído o con límites de cuota (plan gratuito) | Estado `error` con mensaje inline y valores conservados. No se pierde lo escrito. |
| El `textarea` no tiene estilo en la plantilla fuera de `.field input` | Paso 2 comprueba y extiende el selector solo si falta. |

---

## Qué **no** está en este spec

- Dominio propio verificado ni remitente personalizado.
- Rate limit, CAPTCHA o almacenamiento de mensajes.
- Correo de confirmación al visitante o plantillas HTML.
- Panel para leer los mensajes recibidos.
- Backend, base de datos o autenticación real.
- Migración de estilos a CSS Modules o Tailwind.
- Tests automatizados.
- Internacionalización.

Cada uno de ellos, si se aborda, va en su propio spec.
