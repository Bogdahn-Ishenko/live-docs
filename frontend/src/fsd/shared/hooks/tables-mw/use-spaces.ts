"use client";

import { useState, useEffect, useCallback } from "react";
import type { Space, GetSpacesResponse } from "@/fsd/shared/lib/tables-mw/api-types";

interface UseSpacesResult {
  spaces: Space[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage spaces
 */
export function useSpaces(): UseSpacesResult {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSpaces = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/tables-mw/spaces");
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = (await response.json()) as GetSpacesResponse;
      
      if (data.success) {
        setSpaces(data.data.spaces);
      } else {
        setError(data.message || "Failed to fetch spaces");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

  return {
    spaces,
    isLoading,
    error,
    refetch: fetchSpaces,
  };
}
