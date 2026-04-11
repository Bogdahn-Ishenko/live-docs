"use client";

import { useState, useEffect, useCallback } from "react";
import type { 
  Field, 
  GetFieldsResponse, 
  CreateFieldRequest,
  CreateFieldResponse,
  FieldTypeEnum 
} from "@/fsd/shared/lib/tables-mw/api-types";

interface UseFieldsResult {
  fields: Field[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseCreateFieldResult {
  createField: (spaceId: string, dstId: string, data: CreateFieldRequest) => Promise<CreateFieldResponse | null>;
  isLoading: boolean;
  error: string | null;
}

interface UseDeleteFieldResult {
  deleteField: (spaceId: string, dstId: string, fieldId: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch fields in a datasheet
 */
export function useFields(dstId: string | null, viewId?: string): UseFieldsResult {
  const [fields, setFields] = useState<Field[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFields = useCallback(async () => {
    if (!dstId) {
      setFields([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (viewId) params.append("viewId", viewId);

      const response = await fetch(`/api/tables-mw/fields/${dstId}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = (await response.json()) as GetFieldsResponse;
      
      if (data.success) {
        setFields(data.data.fields);
      } else {
        setError(data.message || "Failed to fetch fields");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [dstId, viewId]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  return {
    fields,
    isLoading,
    error,
    refetch: fetchFields,
  };
}

/**
 * Hook to create a new field
 */
export function useCreateField(): UseCreateFieldResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createField = useCallback(async (
    spaceId: string,
    dstId: string,
    data: CreateFieldRequest
  ): Promise<CreateFieldResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tables-mw/fields/${dstId}?spaceId=${spaceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      return (await response.json()) as CreateFieldResponse;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { createField, isLoading, error };
}

/**
 * Hook to delete a field
 */
export function useDeleteField(): UseDeleteFieldResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteField = useCallback(async (
    spaceId: string,
    dstId: string,
    fieldId: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ spaceId, dstId, fieldId });
      const response = await fetch(`/api/tables-mw/fields/delete?${params.toString()}`, {
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

  return { deleteField, isLoading, error };
}

// Field type options for UI
export const FIELD_TYPE_OPTIONS: { value: FieldTypeEnum; label: string }[] = [
  { value: "SingleText", label: "Однострочный текст" },
  { value: "Text", label: "Многострочный текст" },
  { value: "SingleSelect", label: "Одиночный выбор" },
  { value: "MultiSelect", label: "Множественный выбор" },
  { value: "Number", label: "Число" },
  { value: "Currency", label: "Валюта" },
  { value: "Percent", label: "Процент" },
  { value: "DateTime", label: "Дата и время" },
  { value: "Attachment", label: "Вложение" },
  { value: "Member", label: "Участник" },
  { value: "Checkbox", label: "Чекбокс" },
  { value: "Rating", label: "Рейтинг" },
  { value: "URL", label: "URL" },
  { value: "Phone", label: "Телефон" },
  { value: "Email", label: "Email" },
  { value: "OneWayLink", label: "Односторонняя связь" },
  { value: "TwoWayLink", label: "Двусторонняя связь" },
  { value: "MagicLookUp", label: "Поиск" },
  { value: "Formula", label: "Формула" },
  { value: "AutoNumber", label: "Автономер" },
  { value: "CreatedTime", label: "Время создания" },
  { value: "LastModifiedTime", label: "Время изменения" },
  { value: "CreatedBy", label: "Создатель" },
  { value: "LastModifiedBy", label: "Кто изменил" },
];
