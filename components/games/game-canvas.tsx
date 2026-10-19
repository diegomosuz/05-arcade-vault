"use client";

import { useEffect, useRef } from "react";
import type {
  GameDefinition,
  GameEngine,
  GameSnapshot,
} from "@/lib/games/types";

type Props = {
  def: GameDefinition;
  paused: boolean;
  runKey: number; // cambia para reiniciar la partida
  onChange: (s: GameSnapshot) => void; // solo cuando score, status o hud cambian
  onGameOver: (finalScore: number) => void; // una vez por partida
};

const MAX_DT = 0.05;

function sameSnapshot(a: GameSnapshot | null, b: GameSnapshot) {
  if (a === null || a.score !== b.score || a.status !== b.status) return false;
  const keys = Object.keys(b.hud);
  if (keys.length !== Object.keys(a.hud).length) return false;
  return keys.every((k) => a.hud[k] === b.hud[k]);
}

export function GameCanvas({
  def,
  paused,
  runKey,
  onChange,
  onGameOver,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameEngine | null>(null);
  const pausedRef = useRef(paused);
  const onChangeRef = useRef(onChange);
  const onGameOverRef = useRef(onGameOver);
  const lastSnapRef = useRef<GameSnapshot | null>(null);
  const gameOverFiredRef = useRef(false);

  // Los callbacks y `paused` se leen desde refs para que el bucle y los
  // listeners no se reinstalen cuando el padre cambia de identidad.
  useEffect(() => {
    pausedRef.current = paused;
    onChangeRef.current = onChange;
    onGameOverRef.current = onGameOver;
  });

  // Partida: se crea (y se recrea al cambiar runKey) dentro de un efecto para
  // que el render inicial no use aleatoriedad.
  useEffect(() => {
    const game = def.create();
    gameRef.current = game;
    lastSnapRef.current = null;
    gameOverFiredRef.current = false;

    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) game.draw(ctx);
    const snap = game.snapshot();
    lastSnapRef.current = snap;
    onChangeRef.current(snap);

    const onKeyDown = (e: KeyboardEvent) => {
      if (!def.keys.includes(e.code)) return;
      if (pausedRef.current) return;
      e.preventDefault();
      game.setKey(e.code, true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!def.keys.includes(e.code)) return;
      game.setKey(e.code, false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      gameRef.current = null;
    };
  }, [def, runKey]);

  // Bucle: solo corre mientras no está en pausa. Declarado después del efecto
  // de la partida para que `gameRef` ya esté listo cuando cambia runKey.
  useEffect(() => {
    const game = gameRef.current;
    if (paused) {
      // Soltar las teclas: un keyup durante la pausa no llega a procesarse.
      if (game) for (const code of def.keys) game.setKey(code, false);
      return;
    }

    let raf = 0;
    let last: number | null = null;

    const frame = (ts: number) => {
      const g = gameRef.current;
      const ctx = canvasRef.current?.getContext("2d");
      if (g && ctx) {
        const dt = last === null ? 0 : Math.min((ts - last) / 1000, MAX_DT);
        last = ts;
        g.update(dt);
        g.draw(ctx);

        const snap = g.snapshot();
        if (!sameSnapshot(lastSnapRef.current, snap)) {
          lastSnapRef.current = snap;
          onChangeRef.current(snap);
        }
        if (snap.status === "gameover" && !gameOverFiredRef.current) {
          gameOverFiredRef.current = true;
          onGameOverRef.current(snap.score);
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => cancelAnimationFrame(raf);
  }, [def, paused, runKey]);

  return (
    <canvas
      ref={canvasRef}
      width={def.width}
      height={def.height}
      className="asteroids-canvas"
      role="img"
      aria-label={def.ariaLabel}
    />
  );
}
