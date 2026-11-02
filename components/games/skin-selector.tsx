"use client";

import { memo, useCallback, useSyncExternalStore } from "react";
import { DEFAULT_SKIN, isSkinId, SKINS, type SkinId } from "@/lib/games/skins";

// ── Persistencia ──────────────────────────────────────────────────────────────
// localStorage dentro de try/catch: en modo privado, con cuota llena o con el
// almacenamiento bloqueado el skin vive solo en memoria durante la sesión.
const storageKey = (gameId: string) => `av-skin:${gameId}`;
const memory = new Map<string, SkinId>();
const listeners = new Set<() => void>();

function readSkin(gameId: string): SkinId {
  const inMemory = memory.get(gameId);
  if (inMemory) return inMemory;
  try {
    const stored = window.localStorage.getItem(storageKey(gameId));
    if (isSkinId(stored)) return stored;
  } catch {
    // sin localStorage: valor por defecto
  }
  return DEFAULT_SKIN;
}

function writeSkin(gameId: string, skin: SkinId) {
  memory.set(gameId, skin);
  try {
    window.localStorage.setItem(storageKey(gameId), skin);
  } catch {
    // sin localStorage: queda en memoria
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  // Otra pestaña cambió el skin: se descarta la copia en memoria.
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith("av-skin:")) {
      memory.delete(e.key.slice("av-skin:".length));
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

// En servidor y en la hidratación vale DEFAULT_SKIN; el guardado llega tras el
// montaje (el canvas se dibuja en un efecto, así que no hay parpadeo visible).
export function useSkin(gameId: string): [SkinId, (skin: SkinId) => void] {
  const skin = useSyncExternalStore(
    subscribe,
    () => readSkin(gameId),
    () => DEFAULT_SKIN,
  );
  const setSkin = useCallback(
    (next: SkinId) => writeSkin(gameId, next),
    [gameId],
  );
  return [skin, setSkin];
}

// ── Selector ──────────────────────────────────────────────────────────────────
// Botonera de «canales» en el bezel del CRT. Botones con aria-pressed (no un
// radiogroup) porque las flechas pertenecen al juego.
export const SkinSelector = memo(function SkinSelector({
  skins,
  value,
  locked,
  onChange,
}: {
  skins: readonly SkinId[];
  value: SkinId;
  locked: boolean; // partida en curso: cambiar de skin la reiniciaría
  onChange: (skin: SkinId) => void;
}) {
  const options = SKINS.filter((s) => skins.includes(s.id));

  return (
    <div
      className="skin-switch"
      role="group"
      aria-label="Skin del juego"
      aria-describedby={locked ? "skin-switch-lock" : undefined}
    >
      {options.map((s) => (
        <button
          key={s.id}
          type="button"
          className="skin-key"
          data-skin={s.id}
          aria-pressed={s.id === value}
          disabled={locked && s.id !== value}
          onClick={(e) => {
            // Evita que Espacio vuelva a activar el botón mientras se juega.
            e.currentTarget.blur();
            if (s.id !== value) onChange(s.id);
          }}
        >
          {s.label}
        </button>
      ))}
      {locked && (
        <span id="skin-switch-lock" className="skin-lock">
          Termina la partida para cambiar
        </span>
      )}
    </div>
  );
});
