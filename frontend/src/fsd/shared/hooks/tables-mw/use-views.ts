"use client";

import { useState, useEffect, useCallback } from "react";
import type { 
  View, 
  GetViewsResponse,
  CreateViewRequestBody,
  CreateViewResponse,
  UpdateViewNameRequest,
  SortInfoRequest,
  GroupRequest,
  HideFieldsRequest,
  MoveViewRequest,
  ViewType 
} from "@/fsd/shared/lib/tables-mw/api-types";

interface UseViewsResult {
  views: View[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseCreateViewResult {
  createView: (spaceId: string, dstId: string, data: CreateViewRequestBody) => Promise<CreateViewResponse | null>;
  isLoading: boolean;
  error: string | null;
}

interface UseDeleteViewResult {
  deleteView: (spaceId: string, dstId: string, viewId: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

interface UseUpdateViewResult {
  updateViewName: (spaceId: string, dstId: string, viewId: string, data: UpdateViewNameRequest) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch views in a datasheet
 */
export function useViews(dstId: string | null): UseViewsResult {
  const [views, setViews] = useState<View[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchViews = useCallback(async () => {
    if (!dstId) {
      setViews([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tables-mw/views/${dstId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = (await response.json()) as GetViewsResponse;
      
      if (data.success) {
        setViews(data.data.views);
      } else {
        setError(data.message || "Failed to fetch views");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [dstId]);

  useEffect(() => {
    fetchViews();
  }, [fetchViews]);

  return {
    views,
    isLoading,
    error,
    refetch: fetchViews,
  };
}

/**
 * Hook to create a new view
 */
export function useCreateView(): UseCreateViewResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createView = useCallback(async (
    spaceId: string,
    dstId: string,
    data: CreateViewRequestBody
  ): Promise<CreateViewResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ spaceId, dstId });
      const response = await fetch(`/api/tables-mw/views/manage?${params.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      return (await response.json()) as CreateViewResponse;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { createView, isLoading, error };
}

/**
 * Hook to delete a view
 */
export function useDeleteView(): UseDeleteViewResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteView = useCallback(async (
    spaceId: string,
    dstId: string,
    viewId: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ spaceId, dstId, viewId });
      const response = await fetch(`/api/tables-mw/views/manage?${params.toString()}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { deleteView, isLoading, error };
}

/**
 * Hook to update view name
 */
export function useUpdateView(): UseUpdateViewResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateViewName = useCallback(async (
    spaceId: string,
    dstId: string,
    viewId: string,
    data: UpdateViewNameRequest
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ spaceId, dstId, viewId });
      const response = await fetch(`/api/tables-mw/views/manage?${params.toString()}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result = await response.json();
      return result.success;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { updateViewName, isLoading, error };
}

/**
 * Hook to set view sort
 */
export function useSetViewSort() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setSort = useCallback(async (
    spaceId: string,
    dstId: string,
    viewId: string,
    data: SortInfoRequest
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ spaceId, dstId, viewId });
      const response = await fetch(`/api/tables-mw/views/sort?${params.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result = await response.json();
      return result.success;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { setSort, isLoading, error };
}

/**
 * Hook to set view group
 */
export function useSetViewGroup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setGroup = useCallback(async (
    spaceId: string,
    dstId: string,
    viewId: string,
    data: GroupRequest
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ spaceId, dstId, viewId });
      const response = await fetch(`/api/tables-mw/views/group?${params.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result = await response.json();
      return result.success;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { setGroup, isLoading, error };
}

/**
 * Hook to set hidden fields
 */
export function useSetHiddenFields() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setHiddenFields = useCallback(async (
    spaceId: string,
    dstId: string,
    viewId: string,
    data: HideFieldsRequest
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ spaceId, dstId, viewId });
      const response = await fetch(`/api/tables-mw/views/hidden?${params.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result = await response.json();
      return result.success;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { setHiddenFields, isLoading, error };
}

/**
 * Hook to move view
 */
export function useMoveView() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const moveView = useCallback(async (
    spaceId: string,
    dstId: string,
    viewId: string,
    data: MoveViewRequest
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ spaceId, dstId, viewId });
      const response = await fetch(`/api/tables-mw/views/move?${params.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result = await response.json();
      return result.success;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { moveView, isLoading, error };
}

// View type options for UI
export const VIEW_TYPE_OPTIONS: { value: ViewType; label: string; description: string }[] = [
  { value: "Grid", label: "Сетка", description: "Табличное представление данных" },
  { value: "Kanban", label: "Канбан", description: "Доска с группировкой по статусу" },
  { value: "Gantt", label: "Гантт", description: "Диаграмма Гантта для планирования" },
  { value: "Architecture", label: "Архитектура", description: "Иерархическое представление" },
  { value: "Gallery", label: "Галерея", description: "Представление в виде карточек" },
  { value: "Calendar", label: "Календарь", description: "Календарное представление" },
];
