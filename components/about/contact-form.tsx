"use client";

import { useActionState, useEffect, useState } from "react";
import { sendContact, type ContactState } from "@/app/acerca-de/actions";

const INITIAL: ContactState = { status: "idle" };

// Al cambiar la `key` se desmonta el formulario y useActionState vuelve al estado inicial.
export function ContactForm() {
  const [resetKey, setResetKey] = useState(0);
  return <ContactFormInner key={resetKey} onReset={() => setResetKey((k) => k + 1)} />;
}

function ContactFormInner({ onReset }: { onReset: () => void }) {
  const [state, formAction, pending] = useActionState(sendContact, INITIAL);
  const [seen, setSeen] = useState(state);
  const [shake, setShake] = useState(false);

  // Cada respuesta `invalid` es un objeto nuevo: dispara el shake una vez por envío.
  if (seen !== state) {
    setSeen(state);
    if (state.status === "invalid") setShake(true);
  }

  useEffect(() => {
    if (!shake) return;
    const t = setTimeout(() => setShake(false), 400);
    return () => clearTimeout(t);
  }, [shake]);

  const values = state.status === "invalid" || state.status === "error" ? state.values : { name: "", email: "", msg: "" };
  const fields = state.status === "invalid" ? state.fields : {};

  return (
    <form className={"contact-form" + (shake ? " shake" : "")} action={formAction}>
      {state.status !== "sent" ? (
        <>
          <div className="field">
            <label htmlFor="contact-name">NOMBRE</label>
            <input
              id="contact-name"
              name="name"
              defaultValue={values.name}
              placeholder="px_kai"
              aria-invalid={fields.name ? true : undefined}
            />
          </div>
          <div className="field">
            <label htmlFor="contact-email">CORREO ELECTRÓNICO</label>
            <input
              id="contact-email"
              name="email"
              type="email"
              defaultValue={values.email}
              placeholder="jugador@vault.gg"
              aria-invalid={fields.email ? true : undefined}
            />
          </div>
          <div className="field">
            <label htmlFor="contact-msg">MENSAJE</label>
            <textarea
              id="contact-msg"
              name="msg"
              rows={5}
              defaultValue={values.msg}
              placeholder="Cuéntanos qué tienes en mente…"
              aria-invalid={fields.msg ? true : undefined}
            ></textarea>
          </div>
          {/* Honeypot: fuera de pantalla, sin foco y oculto a lectores de pantalla. */}
          <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
            <label htmlFor="contact-website">WEBSITE</label>
            <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>
          <button className="btn xl press" type="submit" disabled={pending} style={{ width: "100%" }}>
            {pending ? "ENVIANDO…" : "▶  ENVIAR MENSAJE"}
          </button>
          {state.status === "error" && (
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
              [ERROR] NO SE PUDO ENVIAR. INTÉNTALO DE NUEVO.
            </div>
          )}
        </>
      ) : (
        <div className="terminal-success">
          <div className="term-bar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./send_message --to=team
            </div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {state.name.toUpperCase()}.
              <span className="caret">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <button className="btn ghost" type="button" onClick={onReset}>
                ENVIAR OTRO MENSAJE
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
