"use client";

import { useEffect, useRef } from "react";
import {
  createAsteroids,
  HEIGHT,
  WIDTH,
  type AsteroidsGame,
  type AsteroidsSnapshot,
} from "@/lib/games/asteroids/engine";

type Props = {
  paused: boolean;
  runKey: number; // cambia para reiniciar la partida
  onChange: (s: AsteroidsSnapshot) => void; // solo cuando score, lives, level o status cambian
  onGameOver: (finalScore: number) => void; // una vez por partida
};

const GAME_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "Space"];
const MAX_DT = 0.05;

function sameSnapshot(a: AsteroidsSnapshot | null, b: AsteroidsSnapshot) {
  return (
    a !== null &&
    a.score === b.score &&
    a.lives === b.lives &&
    a.level === b.level &&
    a.status === b.status
  );
}

export function AsteroidsCanvas({
  paused,
  runKey,
  onChange,
  onGameOver,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<AsteroidsGame | null>(null);
  const pausedRef = useRef(paused);
  const onChangeRef = useRef(onChange);
  const onGameOverRef = useRef(onGameOver);
  const lastSnapRef = useRef<AsteroidsSnapshot | null>(null);
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
    const game = createAsteroids();
    gameRef.current = game;
    lastSnapRef.current = null;
    gameOverFiredRef.current = false;

    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) game.draw(ctx);
    const snap = game.snapshot();
    lastSnapRef.current = snap;
    onChangeRef.current(snap);

    const onKeyDown = (e: KeyboardEvent) => {
      if (!GAME_KEYS.includes(e.code)) return;
      if (pausedRef.current) return;
      e.preventDefault();
      game.setKey(e.code, true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!GAME_KEYS.includes(e.code)) return;
      game.setKey(e.code, false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      gameRef.current = null;
    };
  }, [runKey]);

  // Bucle: solo corre mientras no está en pausa. Declarado después del efecto
  // de la partida para que `gameRef` ya esté listo cuando cambia runKey.
  useEffect(() => {
    const game = gameRef.current;
    if (paused) {
      // Soltar las teclas: un keyup durante la pausa no llega a procesarse.
      if (game) for (const code of GAME_KEYS) game.setKey(code, false);
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
  }, [paused, runKey]);

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      className="asteroids-canvas"
      role="img"
      aria-label="Juego Rocas: pilota la nave con las flechas izquierda y derecha, propulsa con la flecha arriba y dispara con la barra espaciadora para destruir los asteroides"
    />
  );
}
