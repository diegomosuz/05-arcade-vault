"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/session";

type Run = { score: number; level: number };

export function GamePlayer({ id, title }: { id: string; title: string }) {
  const { user, saveScore } = useSession();
  const [run, setRun] = useState<Run>({ score: 0, level: 1 });
  const [lives, setLives] = useState(3);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  // null = sin editar: el nombre sigue a la sesión (que se lee tras el montaje).
  const [typedName, setTypedName] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const name = typedName ?? user?.name ?? "INVITADO";
  const { score, level } = run;

  // Math.random solo dentro del intervalo (nunca en el render inicial).
  useEffect(() => {
    if (over || paused) return;
    const t = setInterval(() => {
      setRun((r) => {
        const next = r.score + Math.floor(10 + Math.random() * 90);
        return { score: next, level: next % 2500 < 100 ? r.level + 1 : r.level };
      });
    }, 220);
    return () => clearInterval(t);
  }, [over, paused]);

  const restart = () => {
    setRun({ score: 0, level: 1 });
    setLives(3);
    setPaused(false);
    setOver(false);
    setSaved(false);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>{name}</div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={() => setOver(true)}>FIN</button>
          <Link href={`/juegos/${id}`} className="btn ghost">SALIR</Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          <div className="game-arena">
            <div className="grid-floor"></div>
            <div className="enemy e1"></div>
            <div className="enemy e2"></div>
            <div className="enemy e3"></div>
            <div className="player-ship"></div>
          </div>
          {paused && (
            <div className="crt-content" style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}>
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>EN PAUSA</div>
                <div
                  className="mono"
                  style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 10, letterSpacing: "0.16em" }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) => setTypedName(e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="TUS INICIALES"
                />
                <button
                  className="btn yellow"
                  onClick={() => {
                    saveScore({ game: id, score, name, at: Date.now() });
                    setSaved(true);
                  }}
                >
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>JUGAR DE NUEVO</button>
              <Link href="/" className="btn magenta">VOLVER AL VAULT</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
