"use client";

import { memo, useEffect, useRef, useState } from "react";
import type { TouchButton, TouchLayout } from "@/lib/games/types";

type Props = {
  layout: TouchLayout;
  inputRef: React.RefObject<((code: string, down: boolean) => void) | null>;
  paused: boolean;
};

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const VIBRATE_MS = 10;

function vibrate() {
  try {
    if (window.matchMedia(REDUCED_MOTION).matches) return;
    navigator.vibrate?.(VIBRATE_MS);
  } catch {
    // sin vibración (iOS) o bloqueada: se ignora
  }
}

// Mando virtual: cada botón emite el mismo KeyboardEvent.code que el teclado a
// través de `inputRef`. El estado se lleva por pointerId para que soltar un dedo
// no libere la tecla que mantiene otro.
export const TouchControls = memo(function TouchControls({
  layout,
  inputRef,
  paused,
}: Props) {
  // pointerId → code que mantiene. Es la fuente de verdad de lo pulsado.
  const activeRef = useRef(new Map<number, string>());
  const [pressed, setPressed] = useState<ReadonlySet<string>>(new Set());

  const sync = () => setPressed(new Set(activeRef.current.values()));

  const emit = (code: string, down: boolean) => inputRef.current?.(code, down);

  const release = (pointerId: number) => {
    const code = activeRef.current.get(pointerId);
    if (code === undefined) return; // idempotente: up, cancel y lostcapture
    activeRef.current.delete(pointerId);
    const heldByOther = [...activeRef.current.values()].includes(code);
    if (!heldByOther) emit(code, false);
    sync();
  };

  const releaseAll = () => {
    const codes = new Set(activeRef.current.values());
    activeRef.current.clear();
    codes.forEach((code) => emit(code, false));
  };

  // Al pausar, GameCanvas ya suelta las teclas del motor; aquí se vacía el
  // estado de punteros para que un dedo aún apoyado no reviva al reanudar.
  useEffect(() => {
    if (paused) releaseAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  useEffect(() => releaseAll, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Ajuste de estado durante el render: el aspecto «pulsado» se apaga en pausa.
  if (paused && pressed.size > 0) setPressed(new Set());

  const renderButton = (b: TouchButton, area?: string) => (
    <button
      key={b.code}
      type="button"
      className="touch-btn"
      data-wide={b.wide ? "true" : undefined}
      data-area={area}
      aria-label={b.ariaLabel}
      aria-pressed={pressed.has(b.code)}
      data-pressed={pressed.has(b.code) ? "true" : undefined}
      onPointerDown={(e) => {
        e.preventDefault(); // sin foco ni clics fantasma
        if (paused) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const heldByOther = [...activeRef.current.values()].includes(b.code);
        activeRef.current.set(e.pointerId, b.code);
        if (!heldByOther) emit(b.code, true);
        vibrate();
        sync();
      }}
      onPointerMove={(e) => {
        // Con la captura el puntero sigue «dentro» aunque el dedo salga; se
        // comprueba el rectángulo para soltar al arrastrar fuera del botón.
        if (!activeRef.current.has(e.pointerId)) return;
        const r = e.currentTarget.getBoundingClientRect();
        const outside =
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom;
        if (outside) release(e.pointerId);
      }}
      onPointerUp={(e) => release(e.pointerId)}
      onPointerCancel={(e) => release(e.pointerId)}
      onLostPointerCapture={(e) => release(e.pointerId)}
    >
      <span className="touch-led" aria-hidden="true" />
      <span className="touch-glyph" aria-hidden="true">
        {b.label}
      </span>
    </button>
  );

  return (
    <div
      className="touch-pad"
      data-kind={layout.kind}
      onContextMenu={(e) => e.preventDefault()}
    >
      {layout.kind === "split" ? (
        <>
          <div className="touch-side" data-side="left">
            {layout.left.map((b) => renderButton(b))}
          </div>
          <div className="touch-side" data-side="right">
            {layout.right.map((b) => renderButton(b))}
          </div>
        </>
      ) : (
        <div className="touch-dpad">
          {renderButton(layout.up, "up")}
          {renderButton(layout.left, "left")}
          {renderButton(layout.right, "right")}
          {renderButton(layout.down, "down")}
        </div>
      )}
    </div>
  );
});
