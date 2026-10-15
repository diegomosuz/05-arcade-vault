# SPEC 05 — Autenticación real con Supabase Auth y perfiles públicos

> **Estado:** Aprobado
> **Depende de:** SPEC 01
> **Fecha:** 2026-10-15
> **Objetivo:** Sustituir el login simulado de `localStorage` por registro e inicio de sesión reales con correo y contraseña en Supabase Auth, con un `username` público guardado en la tabla `profiles`.

---

## Por qué existe este spec

Hoy `components/auth-form.tsx` acepta cualquier texto y `lib/session.tsx` guarda `{ name }` en `localStorage` (`av_user`). Cualquiera puede llamarse como quiera y no existe una identidad en la que apoyar un ranking. El SPEC 06 (juegos, scores y leaderboard) necesita un `user_id` verificado por el servidor y un nombre público único, por eso la autenticación va primero y en su propio spec.

Este spec no guarda puntuaciones ni toca el catálogo. Mantiene la API `useSession()` para que el navbar y el reproductor sigan funcionando sin cambios.

---

## Alcance

**Dentro:**

- Registro con `username`, correo y contraseña; inicio de sesión con correo y contraseña; cierre de sesión.
- Tabla `public.profiles` con `username` único, creada automáticamente por un trigger al registrarse un usuario.
- RLS en `profiles`: lectura pública, sin escritura desde el cliente.
- `lib/session.tsx` reescrito para alimentarse de la sesión de Supabase (cookies, ya refrescadas por `proxy.ts`), conservando `useSession()` con `user`, `signOut` y `ready`.
- `components/auth-form.tsx` conectado a Supabase: en «INICIAR SESIÓN» pide correo y contraseña; en «CREAR CUENTA» pide usuario, correo y contraseña.
- Errores de autenticación inline, con el mismo estilo de línea `[ERROR]` y `role="alert"` del SPEC 03.
- «JUGAR COMO INVITADO» sigue navegando a `/biblioteca` sin sesión.
- Eliminar la clave `av_user` de `localStorage` (limpieza de datos heredados).
- Migración SQL versionada en `supabase/migrations/` y tipos generados en `lib/supabase/database.types.ts`.
- Documentar en el spec el ajuste manual de Supabase: desactivar «Confirm email».

**Fuera de alcance (para specs futuros):**

- Inicio de sesión con Google o GitHub: los botones siguen siendo decorativos.
- Confirmación de correo, recuperación de contraseña y cambio de correo.
- Cambiar el `username` o editar el perfil, avatar o cualquier otro campo.
- Rutas protegidas o redirecciones por falta de sesión.
- Borrar la cuenta.
- Guardar puntuaciones, tabla `games` y leaderboard (SPEC 06).
- Rate limit propio ni CAPTCHA (se confía en los límites de Supabase Auth).
- Migrar datos de `av_user` o `av_scores`.
- Tests automatizados (no hay test runner configurado).
- Internacionalización: solo español.

---

## Modelo de datos

```sql
-- supabase/migrations/001_profiles.sql
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[A-Z0-9_]{3,10}$'),
  created_at timestamptz not null default now()
);
```

```ts
// lib/session.tsx
export type User = { id: string; name: string }; // name = profiles.username

type SessionContextValue = {
  user: User | null;
  signOut: () => Promise<void>;
  saveScore: (e: SavedScore) => void; // sin cambios: lo sustituye el SPEC 06
  ready: boolean;
};
```

Convenciones:

- `username`: 3–10 caracteres, solo `A-Z`, `0-9` y `_`, siempre en mayúsculas. El campo del formulario convierte a mayúsculas mientras se escribe y la base de datos lo exige con el `check`.
- El `username` viaja en `options.data.username` de `signUp` (metadatos del usuario). Un trigger `handle_new_user` (`security definer`, `set search_path = ''`) inserta la fila en `profiles` con ese valor en mayúsculas. El cliente nunca inserta en `profiles`.
- Se revoca `execute` de `handle_new_user` a `anon`, `authenticated` y `public`: solo lo invoca el trigger.
- RLS activado en `profiles`. Una única política: `select` para `anon` y `authenticated` con `using (true)`. No hay políticas de `insert`, `update` ni `delete`.
- El correo nunca se guarda en `profiles` ni es público.
- Contraseña: mínimo 8 caracteres, validado en el cliente además del mínimo del servidor de Supabase.
- `User.name` se carga desde `profiles` (no desde los metadatos del usuario, que el propio usuario puede editar).
- `saveScore` y `SavedScore` se mantienen tal cual en este spec; el SPEC 06 los elimina.
- Variables de entorno: sin cambios (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).

---

## Plan de implementación

Antes del paso 1, leer en `node_modules/next/dist/docs/` la guía de App Router sobre Client Components y `cacheComponents` (el proveedor de sesión vive en `app/layout.tsx` y debe seguir siendo solo de cliente), y la documentación de `@supabase/ssr` para el cliente de navegador. Next.js 16.4 y React 19.3 tienen cambios incompatibles con versiones anteriores. La interfaz del formulario se toca con el skill `/frontend-design`, según `CLAUDE.md`: el aspecto existente se conserva.

1. **Ajuste manual en Supabase.** En el panel (Authentication → Providers → Email) desactivar «Confirm email». Verificación: un `signUp` de prueba devuelve una sesión sin pedir confirmación.
2. **Migración.** Crear `supabase/migrations/001_profiles.sql` con la tabla, el trigger, la función y la política RLS, y aplicarla con `apply_migration`. Verificación: `list_tables` muestra `profiles` con RLS activo; `get_advisors` (seguridad) no reporta avisos nuevos; `insert` en `profiles` como `anon` falla.
3. **Tipos.** Generar `lib/supabase/database.types.ts` con `generate_typescript_types` y tipar `lib/supabase/client.ts` con `Database`. Verificación: `npm run build` pasa.
4. **Sesión.** Reescribir `lib/session.tsx`: `useEffect` con `getSession()` y `onAuthStateChange`, carga del `username` desde `profiles`, `signOut` con `supabase.auth.signOut()`, eliminación de `av_user`. Se conserva el truco de `useSyncExternalStore` para no desajustar la hidratación y se elimina `login`. Verificación: `npm run build` y `npm run lint` pasan; el navbar muestra «Acceso» para visitantes.
5. **Formulario.** En `components/auth-form.tsx`: campos según pestaña, validación de cliente (usuario 3–10 `[A-Z0-9_]`, correo válido, contraseña ≥ 8), comprobación previa de disponibilidad del `username` contra `profiles`, `signUp` y `signInWithPassword`, botón deshabilitado con texto «CONECTANDO…» mientras espera y redirección a `/biblioteca` al éxito. Se elimina la llamada a `login`. Verificación: crear una cuenta nueva deja la sesión iniciada y el navbar muestra el `username`.
6. **Errores.** Mostrar bajo el botón una línea `[ERROR] …` con `role="alert"` conservando lo escrito: credenciales inválidas, correo ya registrado, usuario ya en uso, contraseña débil, límite de peticiones y error genérico. Verificación: cada caso muestra su mensaje en español.
7. **Invitado y cierre de sesión.** «JUGAR COMO INVITADO» navega a `/biblioteca` sin llamar a Supabase; el botón del navbar cierra la sesión real y el navbar vuelve a «Acceso». Verificación: tras cerrar sesión y recargar no hay usuario; recargar con sesión la conserva.

---

## Criterios de aceptación

**Globales**

- [ ] `npm run build` termina sin errores ni errores de tipos.
- [ ] `npm run lint` termina sin errores.
- [ ] No hay errores ni advertencias de hidratación en la consola en `/acceso`, `/biblioteca` y `/`.
- [ ] No se modifica ninguna clase existente de `app/globals.css`; solo se añaden reglas si hacen falta.
- [ ] Las pantallas de SPEC 01–04 se ven igual que antes salvo el formulario de `/acceso`.
- [ ] `references/` queda intacto.

**Base de datos**

- [ ] Existe `public.profiles` con RLS activo y una sola política de `select` público.
- [ ] Un `insert`, `update` o `delete` en `profiles` hecho con la clave publishable falla.
- [ ] Registrar un usuario crea exactamente una fila en `profiles` con el `username` en mayúsculas.
- [ ] No es posible tener dos `username` iguales (la segunda cuenta falla y no queda un usuario huérfano usable).
- [ ] Un `username` fuera de `^[A-Z0-9_]{3,10}$` es rechazado por la base de datos.
- [ ] La función `handle_new_user` no es invocable por `anon` ni `authenticated`.
- [ ] `supabase/migrations/001_profiles.sql` existe y coincide con lo aplicado.

**Registro e inicio de sesión**

- [ ] En «CREAR CUENTA» se piden usuario, correo y contraseña; en «INICIAR SESIÓN», correo y contraseña.
- [ ] Un registro válido deja la sesión iniciada sin confirmar correo y redirige a `/biblioteca`.
- [ ] Un usuario ya en uso muestra `[ERROR]` sin crear cuenta.
- [ ] Un correo ya registrado muestra `[ERROR]` en español.
- [ ] Una contraseña de menos de 8 caracteres no se envía y muestra `[ERROR]`.
- [ ] Credenciales incorrectas muestran `[ERROR]` y los campos conservan su valor (excepto la contraseña, que se vacía).
- [ ] Mientras se espera la respuesta el botón está deshabilitado y dice «CONECTANDO…».
- [ ] Las líneas de error tienen `role="alert"`.

**Sesión y navegación**

- [ ] El navbar muestra el `username` de `profiles` tras iniciar sesión y «Acceso» sin sesión.
- [ ] Recargar la página conserva la sesión.
- [ ] Cerrar sesión desde el navbar elimina la sesión y vuelve a «Acceso».
- [ ] «JUGAR COMO INVITADO» entra en `/biblioteca` sin sesión.
- [ ] `localStorage` ya no contiene `av_user` tras visitar la app.
- [ ] `useSession()` conserva `user`, `signOut`, `saveScore` y `ready`; el reproductor y el Salón compilan sin cambios.
- [ ] Los botones GOOGLE y GITHUB no inician ninguna petición.

**Responsive**

- [ ] A 1440 px y a 390 px el formulario de `/acceso` no se desborda y no aparece scroll horizontal nuevo.

---

## Decisiones tomadas y descartadas

- **Sí:** Supabase Auth con correo y contraseña. **No:** OAuth ahora, porque exige apps y URLs de callback fuera del código; los botones sociales siguen decorativos.
- **Sí:** login por correo y `username` público en `profiles`. El correo nunca es público y el estándar de Supabase se respeta. **No:** login por `username` con correo sintético, porque rompe la recuperación de contraseña futura.
- **Sí:** `username` en mayúsculas, 3–10 caracteres, como el `slice(0, 10)` y el estilo arcade actuales. **No:** minúsculas ni caracteres libres: complica el aspecto del ranking y la unicidad.
- **Sí:** trigger `security definer` que crea el perfil desde los metadatos del registro. La fila se crea de forma atómica con el usuario y el cliente no necesita permisos de escritura. **No:** `insert` desde el navegador con política RLS: depende de una segunda llamada que puede fallar y deja usuarios sin perfil.
- **Sí:** leer el nombre desde `profiles`. **No:** `user_metadata`, que el usuario puede modificar con `updateUser`.
- **Sí:** autenticar desde el cliente con `createBrowserClient`. `onAuthStateChange` actualiza el navbar al instante porque el proveedor persiste entre navegaciones. **No:** Server Actions de auth: el proveedor no se enteraría de las cookies cambiadas en el servidor sin un `router.refresh()` y estado duplicado.
- **Sí:** mantener la API `useSession()` y `saveScore` tal cual. **No:** tocar el reproductor ahora; lo hace el SPEC 06.
- **Sí:** desactivar «Confirm email» para el MVP. **No:** confirmación obligatoria, porque exige ruta de callback, estado «pendiente» y el SMTP gratuito de Supabase tiene un límite de envíos por hora.
- **Sí:** el invitado juega pero no guarda. **No:** guardar con nombre libre: el ranking solo tiene sentido con identidades reales.
- **Sí:** contraseña mínima de 8 caracteres en el cliente. **No:** reglas de complejidad, que no aportan seguridad real.
- **Sí:** eliminar `av_user` y no migrarlo. Era un nombre sin verificación y no hay nada que conservar.
- **Sí:** SQL versionado en `supabase/migrations/` además de aplicarlo con el MCP. **No:** cambios solo en el panel, porque no son reproducibles.

---

## Riesgos identificados

| Riesgo                                                                         | Mitigación                                                                                                                                                      |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| «Confirm email» activo en el proyecto hace que `signUp` no devuelva sesión     | El paso 1 es manual y verificable; si falla, el formulario muestra el error genérico en lugar de dejar al usuario en un estado ambiguo.                         |
| Dos registros simultáneos con el mismo `username` pasan la comprobación previa | La restricción `unique` de la base de datos es la defensa real; el error de Supabase se traduce a «NO SE PUDO CREAR LA CUENTA. EL USUARIO PUEDE ESTAR EN USO.». |
| Llamar a Supabase dentro del callback de `onAuthStateChange` puede bloquearse  | El callback solo guarda el `user.id`; la consulta a `profiles` se hace en un `useEffect` aparte.                                                                |
| Strict Mode monta el efecto del proveedor dos veces                            | La limpieza cancela la suscripción (`unsubscribe`) y el estado se lee con una bandera `cancelled`.                                                              |
| Desajuste de hidratación al leer la sesión                                     | La sesión solo se lee tras el montaje; `useSession()` devuelve `user: null` y `ready: false` en servidor y durante la hidratación, como hoy.                    |
| Un fallo en el trigger bloquea todos los registros                             | La función es mínima, se prueba en el paso 2 con un `signUp` real y la migración es reversible.                                                                 |
| Enumeración de correos por el mensaje «correo ya registrado»                   | Aceptado en el MVP; Supabase aplica sus límites de peticiones.                                                                                                  |
| Usuarios con `username` ofensivo                                               | Fuera de alcance; se aborda con moderación en otro spec.                                                                                                        |

---

## Qué **no** está en este spec

- Inicio de sesión con Google o GitHub.
- Confirmación de correo, recuperación de contraseña y cambio de correo.
- Editar perfil o cambiar el `username`.
- Rutas protegidas.
- Tablas `games` y `scores`, guardado de puntuaciones y leaderboard (SPEC 06).
- Rate limit propio o CAPTCHA.
- Tests automatizados.
- Internacionalización.

Cada uno de ellos, si se aborda, va en su propio spec.
