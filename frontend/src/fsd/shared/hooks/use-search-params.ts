'use client'
import { useCallback, useEffect, useState } from "react";

const SEARCH_PARAMS_EVENT = "search-params-change";

function readParams<T extends Record<string, string>>(defaults: T): T {
  if (typeof window === 'undefined') return defaults;
  
  const search = new URLSearchParams(window.location.search);
  const result = { ...defaults } as T;
  for (const key in defaults) {
    const val = search.get(key);
    if (val !== null) {
      result[key] = val as T[typeof key];
    }
  }
  return result;
}

export function useSearchParams<T extends Record<string, string>>(
  defaults: T,
): [T, (updates: Partial<T>) => void] {
  const [params, setParamsState] = useState<T>(defaults);

  // Инициализируем параметры на клиенте
  useEffect(() => {
    setParamsState(readParams(defaults));
  }, [defaults]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    function onUpdate() {
      setParamsState(readParams(defaults));
    }
    window.addEventListener(SEARCH_PARAMS_EVENT, onUpdate);
    return () => window.removeEventListener(SEARCH_PARAMS_EVENT, onUpdate);
  }, [defaults]);

  const setParams = useCallback((updates: Partial<T>) => {
    if (typeof window === 'undefined') return;
    
    const search = new URLSearchParams(window.location.search);
    for (const key in updates) {
      search.set(key, updates[key] as string);
    }
    history.replaceState(null, "", `?${search.toString()}`);
    window.dispatchEvent(new Event(SEARCH_PARAMS_EVENT));
  }, []);

  return [params, setParams];
}
