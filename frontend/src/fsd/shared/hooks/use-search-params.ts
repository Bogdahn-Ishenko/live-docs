'use client'
import { useCallback, useEffect, useState } from "react";

const SEARCH_PARAMS_EVENT = "search-params-change";

function readParams<T extends Record<string, string>>(defaults: T): T {
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
  const [params, setParamsState] = useState<T>(() => readParams(defaults));

  useEffect(() => {
    function onUpdate() {
      setParamsState(readParams(defaults));
    }
    window.addEventListener(SEARCH_PARAMS_EVENT, onUpdate);
    return () => window.removeEventListener(SEARCH_PARAMS_EVENT, onUpdate);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setParams = useCallback((updates: Partial<T>) => {
    const search = new URLSearchParams(window.location.search);
    for (const key in updates) {
      search.set(key, updates[key] as string);
    }
    history.replaceState(null, "", `?${search.toString()}`);
    window.dispatchEvent(new Event(SEARCH_PARAMS_EVENT));
  }, []);

  return [params, setParams];
}
