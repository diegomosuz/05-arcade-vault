"use server";

import { updateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type SubmitScoreResult =
  | { status: "saved" }
  | { status: "unauthenticated" }
  | { status: "invalid" } // juego inexistente, no ranked, no entero, negativo o sobre max_score
  | { status: "error" };

export async function submitScore(gameId: string, score: number): Promise<SubmitScoreResult> {
  // getUser() valida el token contra Supabase; el user_id nunca viene del cliente.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "unauthenticated" };

  if (typeof gameId !== "string" || typeof score !== "number" || !Number.isInteger(score) || score < 0) {
    return { status: "invalid" };
  }

  try {
    // La clave secreta ignora RLS: se usa solo tras verificar la sesión y validar los datos.
    const admin = createAdminClient();

    const { data: game, error: gameError } = await admin
      .from("games")
      .select("ranked, max_score")
      .eq("id", gameId)
      .maybeSingle();
    if (gameError) return { status: "error" };
    if (!game || !game.ranked || score > game.max_score) return { status: "invalid" };

    const { error } = await admin.from("scores").insert({ game_id: gameId, user_id: user.id, score });
    if (error) return { status: "error" };
  } catch {
    // Sin registrar datos de la partida en los logs.
    return { status: "error" };
  }

  // Lectura inmediata del ranking y las estadísticas en la siguiente petición.
  updateTag("scores");
  return { status: "saved" };
}
