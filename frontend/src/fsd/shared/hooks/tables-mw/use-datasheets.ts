"use client";

import { useState, useCallback } from "react";
import type { 
  CreateDatasheetRequest, 
  CreateDatasheetResponse,
  DeleteDatasheetResponse 
} from "@/fsd/shared/lib/tables-mw/api-types";

interface UseCreateDatasheetResult {
  createDatasheet: (spaceId: string, data: CreateDatasheetRequest) => Promise<CreateDatasheetResponse | null>;
  isLoading: boolean;
  error: string | null;
}

interface UseDeleteDatasheetResult {
  deleteDatasheet: (spaceId: string, dstId: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to create a new datasheet
 */
export function useCreateDatasheet(): UseCreateDatasheetResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDatasheet = useCallback(async (
    spaceId: string, 
    data: CreateDatasheetRequest
  ): Promise<CreateDatasheetResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tables-mw/datasheets?spaceId=${spaceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      return (await response.json()) as CreateDatasheetResponse;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { createDatasheet, isLoading, error };
}

/**
 * Hook to delete a datasheet
 */
export function useDeleteDatasheet(): UseDeleteDatasheetResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteDatasheet = useCallback(async (spaceId: string, dstId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/tables-mw/datasheets/${dstId}?spaceId=${spaceId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = (await response.json()) as DeleteDatasheetResponse;
      return data.success;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { deleteDatasheet, isLoading, error };
}
