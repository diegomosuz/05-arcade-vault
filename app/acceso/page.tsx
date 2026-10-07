import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Acceso · Arcade Vault",
  description: "Inicia sesión o crea tu cuenta para guardar tus puntuaciones.",
};

export default function AccesoPage() {
  return <AuthForm />;
}
