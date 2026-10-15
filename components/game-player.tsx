"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { submitScore } from "@/app/juegos/[id]/jugar/actions";
import { AsteroidsCanvas } from "@/components/games/asteroids-canvas";
import type { AsteroidsSnapshot } from "@/lib/games/asteroids/engine";
import { useSession } from "@/lib/session";

type Run = { score: number; level: number };

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

type SaveState = "idle" | "saving" | "saved" | "error";

const NOTICE_STYLE = {
  margin: "0 0 14px",
  textAlign: "center",
  fontFamily: "var(--mono)",
  fontSize: 12,
  letterSpacing: "0.08em",
  color: "var(--ink-dim)",
} as const;

// `ranked`: el juego acepta puntuaciones reales (solo los juegos con motor propio).
export function GamePlayer({
  id,
  title,
  ranked,
}: {
  id: string;
  title: string;
  ranked: boolean;
}) {
  const { user } = useSession();
  const [run, setRun] = useState<Run>({ score: 0, level: 1 });
  const [lives, setLives] = useState(3);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const savingRef = useRef(false);
  // Cambia para reiniciar el motor real en «JUGAR DE NUEVO».
  const [runKey, setRunKey] = useState(0);
  // Se pone a true con el primer REANUDAR (relevante con prefers-reduced-motion).
  const [started, setStarted] = useState(false);
  // En servidor y en la hidratación vale false; el valor real llega tras el montaje.
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );

  // Solo «rocas» tiene juego real; el resto sigue con la simulación.
  const isReal = id === "rocas";
  // Con prefers-reduced-motion el juego real espera el primer REANUDAR.
  const awaitStart = isReal && reducedMotion && !started;
  const isPaused = paused || awaitStart;

  const name = user?.name ?? "INVITADO";
  const { score, level } = run;

  // Math.random solo dentro del intervalo (nunca en el render inicial).
  useEffect(() => {
    if (isReal || over || paused) return;
    const t = setInterval(() => {
      setRun((r) => {
        const next = r.score + Math.floor(10 + Math.random() * 90);
        return {
          score: next,
          level: next % 2500 < 100 ? r.level + 1 : r.level,
        };
      });
    }, 220);
    return () => clearInterval(t);
  }, [isReal, over, paused]);

  // Pausa automática del juego real al ocultar la pestaña o perder el foco de
  // la ventana; se reanuda solo con el botón REANUDAR.
  useEffect(() => {
    if (!isReal) return;
    const pause = () => setPaused(true);
    const onVisibility = () => {
      if (document.hidden) pause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", pause);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", pause);
    };
  }, [isReal]);

  // Con cacheComponents Next conserva la página oculta al navegar en vez de
  // desmontarla: al salir se limpian los efectos pero el estado de React
  // sobrevive. Se devuelve al estado inicial para que al volver la partida
  // empiece de cero (sin modal, sin pausa heredada).
  useEffect(() => {
    if (!isReal) return;
    return () => {
      setRun({ score: 0, level: 1 });
      setLives(3);
      setPaused(false);
      setOver(false);
      setSaveState("idle");
      setStarted(false);
    };
  }, [isReal]);

  const handleChange = (s: AsteroidsSnapshot) => {
    setRun({ score: s.score, level: s.level });
    setLives(s.lives);
  };

  // Única vía por la que el motor abre el modal de fin de partida.
  const handleGameOver = (finalScore: number) => {
    setRun((r) => ({ ...r, score: finalScore }));
    setOver(true);
  };

  const restart = () => {
    setRunKey((k) => k + 1);
    setRun({ score: 0, level: 1 });
    setLives(3);
    setPaused(false);
    setOver(false);
    setSaveState("idle");
  };

  const handleSave = async () => {
    // El estado «saving» deshabilita el botón, pero un doble clic puede llegar antes del render.
    if (savingRef.current) return;
    savingRef.current = true;
    setSaveState("saving");
    try {
      const result = await submitScore(id, score);
      setSaveState(result.status === "saved" ? "saved" : "error");
    } catch {
      setSaveState("error");
    } finally {
      savingRef.current = false;
    }
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
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
          <button
            className="btn yellow"
            onClick={(e) => {
              // Evita que Espacio vuelva a activar el botón mientras se juega.
              e.currentTarget.blur();
              if (awaitStart) setStarted(true);
              else setPaused((p) => !p);
            }}
          >
            {isPaused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={() => setOver(true)}>
            FIN
          </button>
          <Link href={`/juegos/${id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {isReal ? (
            <AsteroidsCanvas
              paused={isPaused || over}
              runKey={runKey}
              onChange={handleChange}
              onGameOver={handleGameOver}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {isPaused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  {awaitStart
                    ? "PULSA REANUDAR PARA EMPEZAR"
                    : "PULSA REANUDAR PARA CONTINUAR"}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          {isReal ? (
            <span>← → ROTAR · ↑ PROPULSAR · ESPACIO DISPARAR</span>
          ) : (
            <>
              <span>{title} · CRT-83 · 60 HZ</span>
              <span>CARGA · 1MB</span>
            </>
          )}
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!ranked ? (
              <div style={NOTICE_STYLE}>
                ESTE JUEGO ES UNA DEMO: SU PUNTUACIÓN NO SE GUARDA.
              </div>
            ) : !user ? (
              <>
                <div style={NOTICE_STYLE}>
                  INICIA SESIÓN PARA GUARDAR TU PUNTUACIÓN.
                </div>
                <Link
                  href="/acceso"
                  className="btn yellow"
                  style={{ display: "block", textAlign: "center" }}
                >
                  INICIAR SESIÓN
                </Link>
              </>
            ) : saveState === "saved" ? (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            ) : (
              <>
                <div style={NOTICE_STYLE}>JUGANDO COMO {user.name}</div>
                <button
                  className="btn yellow"
                  style={{ width: "100%" }}
                  disabled={saveState === "saving"}
                  onClick={handleSave}
                >
                  {saveState === "saving" ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}
                </button>
                {saveState === "error" && (
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
                    [ERROR] NO SE PUDO GUARDAR. INTÉNTALO DE NUEVO.
                  </div>
                )}
              </>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/biblioteca" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
