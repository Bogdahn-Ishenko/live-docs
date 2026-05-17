"use client";

import { useCallback, useEffect, useState } from "react";

const AUTH_KEY = "wikilive:auth";
const AUTH_USER_KEY = "wikilive:auth:user";
const AUTH_CHANGE_EVENT = "wikilive:auth-change";

function readAuth(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(AUTH_KEY) === "1";
}

function readUsername(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AUTH_USER_KEY);
  const normalized = raw?.trim();
  return normalized ? normalized : null;
}

function notifyAuthChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT));
}

export function useWikiAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsAuthenticated(readAuth());
    setUsername(readUsername());
    setIsLoading(false);

    const onStorage = (e: StorageEvent) => {
      if (e.key === AUTH_KEY) {
        setIsAuthenticated(readAuth());
      }
      if (e.key === AUTH_USER_KEY) {
        setUsername(readUsername());
      }
    };

    const onCustom = () => {
      setIsAuthenticated(readAuth());
      setUsername(readUsername());
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(AUTH_CHANGE_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(AUTH_CHANGE_EVENT, onCustom);
    };
  }, []);

  const login = useCallback(
    async (username: string, password: string): Promise<string | null> => {
      try {
        const res = await fetch("/api/wiki/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = (await res.json()) as {
          ok: boolean;
          error?: string;
        };
        if (res.ok && data.ok) {
          localStorage.setItem(AUTH_KEY, "1");
          localStorage.setItem(AUTH_USER_KEY, (username ?? "").trim());
          setIsAuthenticated(true);
          setUsername((username ?? "").trim() || null);
          notifyAuthChange();
          return null;
        }
        return data.error || "Неверный логин или пароль";
      } catch {
        return "Не удалось связаться с сервером";
      }
    },
    [],
  );

  const logout = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
    }
    setIsAuthenticated(false);
    setUsername(null);
    notifyAuthChange();
  }, []);

  return { isAuthenticated, isLoading, username, login, logout };
}
