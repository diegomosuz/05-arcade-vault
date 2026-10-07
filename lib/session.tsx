"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";

export type User = { name: string };
export type SavedScore = { game: string; score: number; name: string; at: number };

type SessionContextValue = {
  user: User | null;
  login: (u: User | null) => void;
  signOut: () => void;
  saveScore: (e: SavedScore) => void;
  ready: boolean;
};

const USER_KEY = "av_user";
const SCORES_KEY = "av_scores";

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // Lectura diferida: solo tras el montaje, para evitar diferencias de hidratación.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as User;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura diferida a propósito (spec 01)
        if (parsed && typeof parsed.name === "string") setUser(parsed);
      }
    } catch {
      // localStorage bloqueado o JSON inválido: se continúa como invitado.
    }
    setReady(true);
  }, []);

  const login = useCallback((u: User | null) => {
    setUser(u);
    try {
      if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
      else localStorage.removeItem(USER_KEY);
    } catch {}
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(USER_KEY);
    } catch {}
  }, []);

  const saveScore = useCallback((e: SavedScore) => {
    try {
      const raw = localStorage.getItem(SCORES_KEY);
      const list: SavedScore[] = raw ? JSON.parse(raw) : [];
      list.push(e);
      localStorage.setItem(SCORES_KEY, JSON.stringify(list));
    } catch {}
  }, []);

  const value = useMemo(
    () => ({ user, login, signOut, saveScore, ready }),
    [user, login, signOut, saveScore, ready],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

const subscribeNoop = () => () => {};

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  // false en servidor y durante la hidratación; true después. Un límite de Suspense
  // puede hidratarse tras el efecto del provider: sin esto vería `user`/`ready` ya
  // actualizados y no coincidiría con el HTML del servidor.
  const hydrated = useSyncExternalStore(subscribeNoop, () => true, () => false);
  if (!ctx) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  if (hydrated) return ctx;
  return { ...ctx, user: null, ready: false };
}
