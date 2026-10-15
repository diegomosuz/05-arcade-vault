"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { createClient } from "@/lib/supabase/client";

export type User = { id: string; name: string }; // name = profiles.username

type SessionContextValue = {
  user: User | null;
  signOut: () => Promise<void>;
  ready: boolean;
};

// Clave heredada del login simulado (SPEC 01): se elimina al montar.
const LEGACY_USER_KEY = "av_user";

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  // null mientras no se ha leído la sesión. username null = el usuario no tiene perfil.
  const [checked, setChecked] = useState(false);
  const [profile, setProfile] = useState<{
    id: string;
    username: string | null;
  } | null>(null);

  // Lectura diferida: solo tras el montaje, para evitar diferencias de hidratación.
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_USER_KEY);
    } catch {}

    const supabase = createClient();
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setUserId(data.session?.user.id ?? null);
      setChecked(true);
    });

    // El callback solo guarda el id: llamar a Supabase aquí dentro puede bloquearse.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      setChecked(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // El nombre público sale de `profiles`, no de los metadatos (editables por el usuario).
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    createClient()
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled)
          setProfile({ id: userId, username: data?.username ?? null });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const profileReady = userId !== null && profile?.id === userId;
  const username = profileReady ? profile.username : null;
  const user = useMemo<User | null>(
    () => (userId && username ? { id: userId, name: username } : null),
    [userId, username],
  );
  const ready = checked && (userId === null || profileReady);

  const signOut = useCallback(async () => {
    await createClient().auth.signOut();
  }, []);

  const value = useMemo(
    () => ({ user, signOut, ready }),
    [user, signOut, ready],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

const subscribeNoop = () => () => {};

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  // false en servidor y durante la hidratación; true después. Un límite de Suspense
  // puede hidratarse tras el efecto del provider: sin esto vería `user`/`ready` ya
  // actualizados y no coincidiría con el HTML del servidor.
  const hydrated = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  if (!ctx)
    throw new Error("useSession debe usarse dentro de <SessionProvider>");
  if (hydrated) return ctx;
  return { ...ctx, user: null, ready: false };
}
