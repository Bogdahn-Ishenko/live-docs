"use client";

import { useCallback, useEffect, useState } from "react";

const AUTH_KEY = "wikilive:auth";
const AUTH_CHANGE_EVENT = "wikilive:auth-change";

function readAuth(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(AUTH_KEY) === "1";
}

function notifyAuthChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT));
}

export function useWikiAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsAuthenticated(readAuth());
    setIsLoading(false);

    const onStorage = (e: StorageEvent) => {
      if (e.key === AUTH_KEY) {
        setIsAuthenticated(readAuth());
      }
    };

    const onCustom = () => {
      setIsAuthenticated(readAuth());
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
          setIsAuthenticated(true);
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
    }
    setIsAuthenticated(false);
    notifyAuthChange();
  }, []);

  return { isAuthenticated, isLoading, login, logout };
}
