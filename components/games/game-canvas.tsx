"use client";

import { memo, useEffect, useRef } from "react";
import type {
  GameAssets,
  GameDefinition,
  GameEngine,
  GameSnapshot,
} from "@/lib/games/types";
import type { SkinId } from "@/lib/games/skins";

type Props = {
  def: GameDefinition;
  skin: SkinId; // solo visual; cambiarlo recrea el motor (nueva partida)
  paused: boolean;
  runKey: number; // cambia para reiniciar la partida
  onChange: (s: GameSnapshot) => void; // solo cuando score, status o hud cambian
  onGameOver: (finalScore: number) => void; // una vez por partida
  // Entrada alternativa al teclado (mando táctil): se rellena al crear el motor
  // y vuelve a null al limpiar. Aplica las mismas reglas que los listeners.
  inputRef?: React.RefObject<((code: string, down: boolean) => void) | null>;
};

const MAX_DT = 0.05;

function sameSnapshot(a: GameSnapshot | null, b: GameSnapshot) {
  if (a === null || a.score !== b.score || a.status !== b.status) return false;
  const keys = Object.keys(b.hud);
  if (keys.length !== Object.keys(a.hud).length) return false;
  return keys.every((k) => a.hud[k] === b.hud[k]);
}

// memo: el padre se re-renderiza con cada cambio de puntuación/HUD, pero el
// canvas lo pinta el bucle de rAF y no necesita volver a renderizarse.
export const GameCanvas = memo(function GameCanvas({
  def,
  skin,
  paused,
  runKey,
  onChange,
  onGameOver,
  inputRef,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameEngine | null>(null);
  // Contexto 2D opaco, obtenido una sola vez al crear el motor (no por frame).
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
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
    let cancelled = false;
    let removeListeners: (() => void) | null = null;
    lastSnapRef.current = null;
    gameOverFiredRef.current = false;

    const start = (assets: GameAssets) => {
      if (cancelled) return;
      const game = def.create(assets, skin);
      gameRef.current = game;

      // `alpha: false`: todos los motores rellenan el fondo en cada draw, así
      // que el navegador puede tratar el canvas como opaco (sin mezclarlo).
      const ctx = canvasRef.current?.getContext("2d", { alpha: false }) ?? null;
      ctxRef.current = ctx;
      if (ctx) game.draw(ctx);
      const snap = game.snapshot();
      lastSnapRef.current = snap;
      onChangeRef.current(snap);

      // Solo códigos del juego; en pausa se ignoran las pulsaciones pero no
      // las sueltas. Devuelve si la pulsación se aplicó.
      const press = (code: string, down: boolean) => {
        if (!def.keys.includes(code)) return false;
        if (down && pausedRef.current) return false;
        game.setKey(code, down);
        return true;
      };

      const onKeyDown = (e: KeyboardEvent) => {
        if (press(e.code, true)) e.preventDefault();
      };
      const onKeyUp = (e: KeyboardEvent) => {
        press(e.code, false);
      };
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      if (inputRef) inputRef.current = press;
      removeListeners = () => {
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        if (inputRef) inputRef.current = null;
      };
    };

    if (def.assets) {
      // Con imágenes, el motor se crea cuando todas terminan de cargar o
      // fallan; las que fallan se omiten y el motor usa su dibujo de respaldo.
      Promise.allSettled(
        Object.entries(def.assets).map(
          ([name, url]) =>
            new Promise<[string, HTMLImageElement]>((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve([name, img]);
              img.onerror = reject;
              img.src = url;
            }),
        ),
      ).then((results) => {
        const assets: GameAssets = {};
        for (const r of results) {
          if (r.status === "fulfilled") assets[r.value[0]] = r.value[1];
        }
        start(assets);
      });
    } else {
      start({});
    }

    return () => {
      cancelled = true;
      removeListeners?.();
      gameRef.current = null;
      ctxRef.current = null;
    };
  }, [def, runKey, skin, inputRef]);

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
      const ctx = ctxRef.current;
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
  }, [def, paused, runKey, skin]);

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
});
