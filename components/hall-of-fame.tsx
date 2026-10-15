"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDate } from "@/lib/dates";
import type { LeaderboardRow } from "@/lib/db/leaderboard";
import type { Game } from "@/lib/games";
import { useSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";

type Mine = { rank: number; score: number; date: string };

const fmt = (n: number) => n.toLocaleString("es-ES");
const pad = (n: number) => String(n).padStart(2, "0");

export function HallOfFame({
  games,
  boards,
}: {
  games: Game[];
  boards: Record<string, LeaderboardRow[]>;
}) {
  const { user } = useSession();
  const [tab, setTab] = useState(games[0]?.id ?? "");
  // Mejores marcas del usuario por juego. Se asocia al id para descartar datos de otra sesión.
  const [mine, setMine] = useState<{
    userId: string;
    byGame: Record<string, Mine>;
  } | null>(null);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    createClient()
      .from("leaderboard")
      .select("game_id, best_score, achieved_at, rank")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (cancelled) return;
        const byGame: Record<string, Mine> = {};
        for (const r of data ?? []) {
          if (
            !r.game_id ||
            r.best_score === null ||
            r.rank === null ||
            !r.achieved_at
          )
            continue;
          byGame[r.game_id] = {
            rank: r.rank,
            score: r.best_score,
            date: formatDate(r.achieved_at),
          };
        }
        setMine({ userId, byGame });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const game = games.find((g) => g.id === tab) ?? games[0];
  const rows = boards[tab] ?? [];
  const myBest =
    user && mine?.userId === user.id ? mine.byGame[tab] : undefined;
  const myLoaded = !!user && mine?.userId === user.id;

  const slot = (
    cls: "gold" | "silver" | "bronze",
    pos: number,
    r: LeaderboardRow | undefined,
  ) => (
    <div className={"podium-slot " + cls}>
      {cls === "gold" && (
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}
        >
          CAMPEÓN
        </div>
      )}
      <div
        className="rank-num"
        style={cls === "gold" ? { fontSize: 36, marginTop: 4 } : undefined}
      >
        {pad(pos)}
      </div>
      <div className="name">{r?.name ?? "—"}</div>
      <div
        className="score"
        style={cls === "gold" ? { fontSize: 20 } : undefined}
      >
        {r ? fmt(r.score) : "—"}
      </div>
      <div className="date">{r?.date ?? " "}</div>
    </div>
  );

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {games.map((g) => (
          <button
            key={g.id}
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "56px 16px",
            color: "var(--ink-faint)",
          }}
        >
          <div
            className="pixel"
            style={{ fontSize: 14, color: "var(--magenta)", marginBottom: 12 }}
          >
            AÚN NO HAY MARCAS · SÉ EL PRIMERO
          </div>
          <div style={{ marginBottom: 20 }}>
            {game?.ranked
              ? "Nadie ha guardado una puntuación en este juego todavía."
              : "Este juego aún es una demo: sus puntuaciones no se guardan."}
          </div>
          {game?.ranked && (
            <Link href={`/juegos/${game.id}/jugar`} className="btn lg">
              ▶ JUGAR {game.title}
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="podium">
            {slot("silver", 2, rows[1])}
            {slot("gold", 1, rows[0])}
            {slot("bronze", 3, rows[2])}
          </div>

          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={tab + r.rank}
                className={
                  "tr" +
                  (i === 0
                    ? " top1"
                    : i === 1
                      ? " top2"
                      : i === 2
                        ? " top3"
                        : "")
                }
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{pad(r.rank)}</div>
                <div className="pl">{r.name}</div>
                <div className="sc">{fmt(r.score)}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {user && game && myLoaded && (
        <div
          className="hall-table"
          style={{ marginTop: rows.length === 0 ? 0 : 12 }}
        >
          <div className="tr you-label">▸ TU MEJOR MARCA EN {game.title}</div>
          {myBest ? (
            <div
              className="tr you"
              style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
            >
              <div className="rk" style={{ color: "var(--yellow)" }}>
                #{pad(myBest.rank)}
              </div>
              <div className="pl" style={{ color: "var(--yellow)" }}>
                {user.name}
              </div>
              <div
                className="sc"
                style={{
                  color: "var(--yellow)",
                  textShadow: "0 0 6px rgba(245,255,0,0.5)",
                }}
              >
                {fmt(myBest.score)}
              </div>
              <div className="dt">{myBest.date}</div>
            </div>
          ) : (
            <div
              className="tr"
              style={{
                animation: "none",
                opacity: 1,
                display: "block",
                color: "var(--ink-faint)",
              }}
            >
              AÚN NO TIENES MARCA EN {game.title}
            </div>
          )}
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/biblioteca" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
