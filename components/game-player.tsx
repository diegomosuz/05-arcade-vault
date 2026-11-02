"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { submitScore } from "@/app/juegos/[id]/jugar/actions";
import { GameCanvas } from "@/components/games/game-canvas";
import { SkinSelector, useSkin } from "@/components/games/skin-selector";
import { TouchControls } from "@/components/games/touch-controls";
import { GAME_REGISTRY } from "@/lib/games/registry";
import { DEFAULT_SKIN, type SkinId } from "@/lib/games/skins";
import type { GameDefinition, GameSnapshot } from "@/lib/games/types";
import { useSession } from "@/lib/session";

type Run = { score: number; hud: Record<string, number> };

const INITIAL_RUN: Run = { score: 0, hud: { lives: 3, level: 1 } };

type HudStat = GameDefinition["hud"][number];

// HUD de las demos: puntuación, vidas y nivel simulados.
const DEMO_HUD: HudStat[] = [
  { key: "score", label: "Puntuación", format: "int" },
  { key: "lives", label: "Vidas", format: "hearts" },
  { key: "level", label: "Nivel", format: "pad2" },
];

function formatStat(value: number, format: HudStat["format"]) {
  if (format === "hearts") return "♥ ".repeat(value).trim() || "—";
  if (format === "pad2") return String(value).padStart(2, "0");
  return value.toLocaleString("es-ES");
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

const COARSE_POINTER = "(pointer: coarse)";

function subscribeCoarsePointer(cb: () => void) {
  const mq = window.matchMedia(COARSE_POINTER);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

// Puntero principal táctil (móvil/tablet). false en servidor y en la
// hidratación; el valor real llega tras el montaje.
function useCoarsePointer() {
  return useSyncExternalStore(
    subscribeCoarsePointer,
    () => window.matchMedia(COARSE_POINTER).matches,
    () => false,
  );
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
  const [run, setRun] = useState<Run>(INITIAL_RUN);
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
  const coarse = useCoarsePointer();
  // Entrada del motor real; GameCanvas la rellena y TouchControls la usa.
  const inputRef = useRef<((code: string, down: boolean) => void) | null>(null);

  // Los juegos del registro son reales; el resto sigue con la simulación.
  const def = GAME_REGISTRY[id];
  const isReal = !!def;
  // Con prefers-reduced-motion el juego real espera el primer REANUDAR.
  const awaitStart = isReal && reducedMotion && !started;
  const isPaused = paused || awaitStart;
  // Mando solo en juegos reales que lo declaran y con puntero táctil.
  const touchLayout = isReal && coarse ? def.touch : undefined;

  const name = user?.name ?? "INVITADO";
  const { score, hud } = run;
  const stats = def ? def.hud : DEMO_HUD;

  // Skin visual persistido por juego. Los juegos aún sin skins usan el
  // por defecto y no muestran selector.
  const [storedSkin, setStoredSkin] = useSkin(id);
  const skinOptions = def?.skins ?? [];
  const skin: SkinId = skinOptions.includes(storedSkin)
    ? storedSkin
    : DEFAULT_SKIN;
  // El motor lee la paleta al crearse, así que cambiar de skin empieza una
  // partida nueva: se bloquea en cuanto la partida suma puntos para no perderla.
  const skinLocked = !over && score > 0;

  // Math.random solo dentro del intervalo (nunca en el render inicial).
  useEffect(() => {
    if (isReal || over || paused) return;
    const t = setInterval(() => {
      setRun((r) => {
        const next = r.score + Math.floor(10 + Math.random() * 90);
        return {
          score: next,
          hud: {
            ...r.hud,
            level: next % 2500 < 100 ? r.hud.level + 1 : r.hud.level,
          },
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

  // SPEC 11: mientras hay un juego real montado se simplifican las capas
  // decorativas globales (ver `[data-playing="true"]` en globals.css). La
  // limpieza del efecto cubre tanto el desmontaje como el caso de
  // cacheComponents, que oculta la página sin desmontarla.
  useEffect(() => {
    if (!isReal) return;
    const root = document.documentElement;
    root.setAttribute("data-playing", "true");
    return () => root.removeAttribute("data-playing");
  }, [isReal]);

  // Con cacheComponents Next conserva la página oculta al navegar en vez de
  // desmontarla: al salir se limpian los efectos pero el estado de React
  // sobrevive. Se devuelve al estado inicial para que al volver la partida
  // empiece de cero (sin modal, sin pausa heredada).
  useEffect(() => {
    if (!isReal) return;
    return () => {
      setRun(INITIAL_RUN);
      setPaused(false);
      setOver(false);
      setSaveState("idle");
      setStarted(false);
    };
  }, [isReal]);

  // SPEC 11: estos callbacks tienen identidad estable (solo usan setters) para
  // que GameCanvas, TouchControls y SkinSelector, envueltos en memo, no se
  // re-rendericen con cada cambio de puntuación o HUD.
  const handleChange = useCallback((s: GameSnapshot) => {
    setRun({ score: s.score, hud: s.hud });
  }, []);

  // Única vía por la que el motor abre el modal de fin de partida.
  const handleGameOver = useCallback((finalScore: number) => {
    setRun((r) => ({ ...r, score: finalScore }));
    setOver(true);
  }, []);

  const restart = useCallback(() => {
    setRunKey((k) => k + 1);
    setRun(INITIAL_RUN);
    setPaused(false);
    setOver(false);
    setSaveState("idle");
  }, []);

  const changeSkin = useCallback(
    (next: SkinId) => {
      if (skinLocked) return;
      setStoredSkin(next);
      restart();
    },
    [skinLocked, setStoredSkin, restart],
  );

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
          {stats.map((stat) => (
            <div
              key={stat.key}
              className={`hud-stat${
                stat.format === "hearts" ? " lives" : ""
              }${stat.key === "level" ? " level" : ""}`}
            >
              <div className="l">{stat.label}</div>
              <div className="v">
                {formatStat(
                  stat.key === "score" ? score : (hud[stat.key] ?? 0),
                  stat.format,
                )}
              </div>
            </div>
          ))}
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
        <div
          className={isReal ? "crt-screen touch-screen" : "crt-screen"}
          // Relación real del canvas del juego (p. ej. 640/560 en Ranaria);
          // en escritorio la pantalla sigue en 4:3 y el canvas se encaja.
          style={
            isReal
              ? ({
                  "--touch-screen-ratio": `${def.width} / ${def.height}`,
                } as React.CSSProperties)
              : undefined
          }
        >
          {isReal ? (
            <GameCanvas
              def={def}
              skin={skin}
              paused={isPaused || over}
              runKey={runKey}
              onChange={handleChange}
              onGameOver={handleGameOver}
              inputRef={inputRef}
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
          {isReal && skinOptions.length > 1 && (
            <SkinSelector
              skins={skinOptions}
              value={skin}
              locked={skinLocked}
              onChange={changeSkin}
            />
          )}
          {isReal ? (
            <span>{touchLayout ? touchLayout.label : def.controlsLabel}</span>
          ) : (
            <>
              <span>{title} · CRT-83 · 60 HZ</span>
              <span>CARGA · 1MB</span>
            </>
          )}
        </div>
      </div>

      {touchLayout && (
        <TouchControls
          layout={touchLayout}
          inputRef={inputRef}
          paused={isPaused || over}
        />
      )}

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
