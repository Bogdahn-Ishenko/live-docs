"use client";

import { useState, useEffect, useCallback } from "react";
import type { 
  TablesRecord,
  GetRecordsResponse,
  GetRecordsParams,
  CreateRecordsRequest,
  CreateRecordsResponse,
  UpdateRecordsRequest,
  UpdateRecordsResponse,
  DeleteRecordsResponse,
  FieldValue 
} from "@/fsd/shared/lib/tables-mw/api-types";

interface UseRecordsResult {
  records: TablesRecord[];
  total: number;
  pageNum: number;
  pageSize: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseCreateRecordsResult {
  createRecords: (dstId: string, data: CreateRecordsRequest, viewId?: string) => Promise<CreateRecordsResponse | null>;
  isLoading: boolean;
  error: string | null;
}

interface UseUpdateRecordsResult {
  updateRecords: (dstId: string, data: UpdateRecordsRequest, viewId?: string) => Promise<UpdateRecordsResponse | null>;
  isLoading: boolean;
  error: string | null;
}

interface UseDeleteRecordsResult {
  deleteRecords: (dstId: string, recordIds: string[]) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch records from a datasheet
 */
export function useRecords(
  dstId: string | null,
  params: GetRecordsParams = {}
): UseRecordsResult {
  const [records, setRecords] = useState<TablesRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    if (!dstId) {
      setRecords([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build query params
      const query = new URLSearchParams();
      query.append("path", `/fusion/v1/datasheets/${dstId}/records`);
      
      if (params.viewId) query.append("viewId", params.viewId);
      if (params.pageSize) query.append("pageSize", params.pageSize.toString());
      if (params.maxRecords) query.append("maxRecords", params.maxRecords.toString());
      if (params.pageNum) query.append("pageNum", params.pageNum.toString());
      if (params.filterByFormula) query.append("filterByFormula", params.filterByFormula);
      if (params.cellFormat) query.append("cellFormat", params.cellFormat);
      if (params.fieldKey) query.append("fieldKey", params.fieldKey);
      
      if (params.recordIds?.length) {
        query.append("recordIds", params.recordIds.join(","));
      }
      
      if (params.fields?.length) {
        query.append("fields", params.fields.join(","));
      }

      const response = await fetch(`/api/tables-mw?${query.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = (await response.json()) as GetRecordsResponse;
      
      if (data.success) {
        setRecords(data.data.records);
        setTotal(data.data.total);
        setPageNum(data.data.pageNum);
        setPageSize(data.data.pageSize);
      } else {
        setError(data.message || "Failed to fetch records");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [dstId, params.viewId, params.pageSize, params.maxRecords, params.pageNum, params.filterByFormula, params.cellFormat, params.fieldKey, params.recordIds?.join(","), params.fields?.join(",")]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return {
    records,
    total,
    pageNum,
    pageSize,
    isLoading,
    error,
    refetch: fetchRecords,
  };
}

/**
 * Hook to create records
 */
export function useCreateRecords(): UseCreateRecordsResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRecords = useCallback(async (
    dstId: string,
    data: CreateRecordsRequest,
    viewId?: string
  ): Promise<CreateRecordsResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append("path", `/fusion/v1/datasheets/${dstId}/records`);
      if (viewId) params.append("viewId", viewId);

      const response = await fetch(`/api/tables-mw?${params.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      return (await response.json()) as CreateRecordsResponse;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { createRecords, isLoading, error };
}

/**
 * Hook to update records
 */
export function useUpdateRecords(): UseUpdateRecordsResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateRecords = useCallback(async (
    dstId: string,
    data: UpdateRecordsRequest,
    viewId?: string
  ): Promise<UpdateRecordsResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append("path", `/fusion/v1/datasheets/${dstId}/records`);
      if (viewId) params.append("viewId", viewId);

      const response = await fetch(`/api/tables-mw?${params.toString()}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      return (await response.json()) as UpdateRecordsResponse;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { updateRecords, isLoading, error };
}

/**
 * Hook to delete records
 */
export function useDeleteRecords(): UseDeleteRecordsResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteRecords = useCallback(async (
    dstId: string,
    recordIds: string[]
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append("path", `/fusion/v1/datasheets/${dstId}/records`);
      params.append("recordIds", recordIds.join(","));

      const response = await fetch(`/api/tables-mw?${params.toString()}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = (await response.json()) as DeleteRecordsResponse;
      return data.success;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { deleteRecords, isLoading, error };
}

/**
 * Hook to get deleted records (timemachine)
 */
export function useDeletedRecords(dstId: string | null) {
  const [recordIds, setRecordIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDeletedRecords = useCallback(async () => {
    if (!dstId) {
      setRecordIds([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tables-mw/timemachine/${dstId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setRecordIds(data.data);
      } else {
        setError(data.message || "Failed to fetch deleted records");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [dstId]);

  useEffect(() => {
    fetchDeletedRecords();
  }, [fetchDeletedRecords]);

  return {
    recordIds,
    isLoading,
    error,
    refetch: fetchDeletedRecords,
  };
}
