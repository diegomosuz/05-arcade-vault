"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const USERNAME_RE = /^[A-Z0-9_]{3,10}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

const MSG = {
  username: "[ERROR] USUARIO: 3-10 CARACTERES (A-Z, 0-9 Y _).",
  email: "[ERROR] CORREO ELECTRÓNICO NO VÁLIDO.",
  password: `[ERROR] LA CONTRASEÑA DEBE TENER AL MENOS ${MIN_PASSWORD} CARACTERES.`,
  usernameTaken: "[ERROR] ESE USUARIO YA ESTÁ EN USO.",
  emailTaken: "[ERROR] ESE CORREO YA TIENE UNA CUENTA.",
  credentials: "[ERROR] CORREO O CONTRASEÑA INCORRECTOS.",
  weak: "[ERROR] CONTRASEÑA DEMASIADO DÉBIL. PRUEBA OTRA.",
  rate: "[ERROR] DEMASIADOS INTENTOS. ESPERA UN MOMENTO.",
  createFailed:
    "[ERROR] NO SE PUDO CREAR LA CUENTA. EL USUARIO PUEDE ESTAR EN USO.",
  generic: "[ERROR] NO SE PUDO COMPLETAR LA OPERACIÓN. INTÉNTALO DE NUEVO.",
};

// Traduce un error de Supabase Auth (o de la comprobación previa) a una línea de terminal.
function authMessage(err: unknown): string {
  const { code, message } = (err ?? {}) as { code?: string; message?: string };
  switch (code) {
    case "username_taken":
      return MSG.usernameTaken;
    case "user_already_exists":
    case "email_exists":
      return MSG.emailTaken;
    case "invalid_credentials":
      return MSG.credentials;
    case "weak_password":
      return MSG.weak;
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return MSG.rate;
    // El trigger de `profiles` falla (p. ej. username duplicado en una carrera):
    // Supabase Auth devuelve el código de Postgres (HTTP 500), no un código propio.
    case "23505": // unique_violation (profiles_username_key)
    case "23514": // check_violation (profiles_username_check)
      return MSG.createFailed;
  }
  if (message?.includes("Database error saving new user"))
    return MSG.createFailed;
  return MSG.generic;
}

export function AuthForm() {
  const router = useRouter();
  const [tab, setTab] = useState<"in" | "up">("in");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    setError(null);

    const mail = email.trim();
    if (tab === "up" && !USERNAME_RE.test(user)) {
      setError(MSG.username);
      return;
    }
    if (!EMAIL_RE.test(mail)) {
      setError(MSG.email);
      return;
    }
    if (pass.length < MIN_PASSWORD) {
      setError(MSG.password);
      return;
    }

    setPending(true);
    const supabase = createClient();
    try {
      if (tab === "up") {
        // Comprobación previa; la restricción unique de la base de datos es la defensa real.
        const { data: taken, error: lookupError } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", user)
          .maybeSingle();
        if (lookupError) throw lookupError;
        if (taken) throw { code: "username_taken" };

        const { data, error } = await supabase.auth.signUp({
          email: mail,
          password: pass,
          options: { data: { username: user } },
        });
        // Sin sesión = «Confirm email» activo en Supabase: no se deja al usuario a medias.
        if (error || !data.session) throw error ?? new Error("no-session");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: mail,
          password: pass,
        });
        if (error) throw error;
      }
      router.push("/biblioteca");
    } catch (err) {
      setPass("");
      setError(authMessage(err));
      setPending(false);
    }
  };

  const guest = () => {
    router.push("/biblioteca");
  };

  const changeTab = (next: "in" | "up") => {
    setTab(next);
    setError(null);
  };

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={tab === "in" ? "on" : ""}
            onClick={() => changeTab("in")}
          >
            INICIAR SESIÓN
          </button>
          <button
            type="button"
            className={tab === "up" ? "on" : ""}
            onClick={() => changeTab("up")}
          >
            CREAR CUENTA
          </button>
        </div>

        <form onSubmit={submit} noValidate>
          {tab === "up" && (
            <div className="field slide-in">
              <label htmlFor="auth-user">Usuario</label>
              <input
                id="auth-user"
                value={user}
                onChange={(e) =>
                  setUser(
                    e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9_]/g, "")
                      .slice(0, 10),
                  )
                }
                placeholder="PX_KAI"
                autoComplete="username"
                maxLength={10}
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="auth-email">Correo electrónico</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jugador@vault.gg"
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="auth-pass">Contraseña</label>
            <input
              id="auth-pass"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
              autoComplete={tab === "in" ? "current-password" : "new-password"}
            />
          </div>

          <button
            className="btn lg"
            type="submit"
            disabled={pending}
            style={{ width: "100%", marginTop: 8 }}
          >
            {pending
              ? "CONECTANDO…"
              : tab === "in"
                ? "ENTRAR AL VAULT"
                : "CREAR Y JUGAR"}
          </button>
          {error && (
            <div
              role="alert"
              style={{
                marginTop: 14,
                fontFamily: "var(--mono)",
                fontSize: 12,
                lineHeight: 1.6,
                color: "var(--magenta)",
                textShadow: "0 0 6px rgba(255,0,110,0.45)",
              }}
            >
              {error}
            </div>
          )}
        </form>

        <button
          type="button"
          className="btn ghost"
          style={{ width: "100%", marginTop: 10 }}
          onClick={guest}
        >
          JUGAR COMO INVITADO
        </button>

        <div className="auth-divider">O CONTINÚA CON</div>
        <div className="social">
          <button className="btn ghost" type="button">
            ◆ GOOGLE
          </button>
          <button className="btn ghost" type="button">
            ▣ GITHUB
          </button>
        </div>

        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
          }}
        >
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}
