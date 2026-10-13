"use server";

import { Resend } from "resend";

export type ContactValues = { name: string; email: string; msg: string };

export type ContactState =
  | { status: "idle" }
  | { status: "invalid"; fields: Partial<Record<"name" | "email" | "msg", string>>; values: ContactValues }
  | { status: "error"; values: ContactValues }
  | { status: "sent"; name: string };

const LIMITS = { name: 60, email: 120, msg: 2000 } as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const text = (formData: FormData, key: string) => {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
};

export async function sendContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  // El nombre acaba en el asunto: se colapsan saltos de línea y espacios repetidos.
  const values: ContactValues = {
    name: text(formData, "name").replace(/\s+/g, " ").trim(),
    email: text(formData, "email").trim(),
    msg: text(formData, "msg").trim(),
  };

  // Honeypot: un bot lo rellena. Se responde "éxito" sin enviar nada.
  if (text(formData, "website").trim() !== "") {
    return { status: "sent", name: values.name };
  }

  const fields: Partial<Record<"name" | "email" | "msg", string>> = {};
  if (!values.name) fields.name = "Escribe tu nombre.";
  else if (values.name.length > LIMITS.name) fields.name = `Máximo ${LIMITS.name} caracteres.`;
  if (!values.email) fields.email = "Escribe tu correo.";
  else if (values.email.length > LIMITS.email || !EMAIL_RE.test(values.email)) fields.email = "Correo no válido.";
  if (!values.msg) fields.msg = "Escribe un mensaje.";
  else if (values.msg.length > LIMITS.msg) fields.msg = `Máximo ${LIMITS.msg} caracteres.`;

  if (Object.keys(fields).length > 0) {
    return { status: "invalid", fields, values };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    console.error("[contacto] Faltan RESEND_API_KEY o CONTACT_TO_EMAIL.");
    return { status: "error", values };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: "Arcade Vault <onboarding@resend.dev>",
      to,
      replyTo: values.email,
      subject: `[Arcade Vault] Mensaje de ${values.name}`,
      text: `Nombre: ${values.name}\nCorreo: ${values.email}\n\nMensaje:\n${values.msg}\n`,
    });
    if (error) {
      // Solo el tipo de error: nunca el contenido del mensaje.
      console.error(`[contacto] Resend rechazó el envío: ${error.name}`);
      return { status: "error", values };
    }
  } catch {
    console.error("[contacto] Excepción al llamar a Resend.");
    return { status: "error", values };
  }

  return { status: "sent", name: values.name };
}
