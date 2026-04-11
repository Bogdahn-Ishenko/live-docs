"use client";

import { useState, useCallback, useMemo } from "react";
import { Plus, Pencil, Trash2, Loader2, RefreshCw, Database } from "lucide-react";

import { cn } from "@/fsd/shared/lib/utils";
import { Button } from "@/fsd/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/fsd/shared/ui/dialog";
import { Label } from "@/fsd/shared/ui/label";
import { FieldDisplay } from "@/fsd/shared/ui/tables-mw/field-display";
import { FieldInput } from "@/fsd/shared/ui/tables-mw/field-input";
import type { TablesRecord, FieldValue } from "@/fsd/shared/lib/tables-mw/api-types";

interface TablesRecordTableProps {
  records: TablesRecord[];
  isLoading: boolean;
  isSubmitting: boolean;
  datasheetId?: string;
  spaceId?: string;
  onAddRecord: (fields: globalThis.Record<string, FieldValue>) => Promise<boolean>;
  onUpdateRecord: (recordId: string, fields: globalThis.Record<string, FieldValue>) => Promise<boolean>;
  onDeleteRecord: (recordId: string) => Promise<boolean>;
  onRefresh: () => void;
  onEditingChange?: (isEditing: boolean) => void;
}

/**
 * Tables Record Table Component
 * Displays records in a table with CRUD operations
 */
export function TablesRecordTable({
  records,
  isLoading,
  isSubmitting,
  datasheetId,
  spaceId,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord,
  onRefresh,
  onEditingChange,
}: TablesRecordTableProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TablesRecord | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [formData, setFormData] = useState<globalThis.Record<string, FieldValue>>({});

  // Get all column names from records
  const columns = useMemo(() => {
    const fieldNames = new Set<string>();
    records.forEach((record) => {
      Object.keys(record.fields).forEach((key) => fieldNames.add(key));
    });
    return Array.from(fieldNames);
  }, [records]);

  const handleAddClick = () => {
    const initialFormData: globalThis.Record<string, FieldValue> = {};
    columns.forEach((col) => {
      initialFormData[col] = "";
    });
    setFormData(initialFormData);
    setIsAddDialogOpen(true);
    onEditingChange?.(true);
  };

  const handleEditClick = (record: TablesRecord) => {
    setEditingRecord(record);
    const newFormData: globalThis.Record<string, FieldValue> = {};
    Object.entries(record.fields).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        newFormData[key] = JSON.parse(JSON.stringify(value));
      } else if (typeof value === "object" && value !== null) {
        newFormData[key] = { ...value };
      } else {
        newFormData[key] = value;
      }
    });
    columns.forEach((col) => {
      if (!(col in newFormData)) {
        newFormData[col] = "";
      }
    });
    setFormData(newFormData);
    setIsEditDialogOpen(true);
    onEditingChange?.(true);
  };

  const handleDeleteClick = (recordId: string) => {
    setDeletingRecordId(recordId);
    setIsDeleteDialogOpen(true);
    onEditingChange?.(true);
  };

  const handleFormChange = (key: string, value: FieldValue) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const prepareFieldsForApi = (
    fields: globalThis.Record<string, FieldValue>
  ): globalThis.Record<string, FieldValue> => {
    const result: globalThis.Record<string, FieldValue> = {};
    
    for (const [key, value] of Object.entries(fields)) {
      if (value === null || value === undefined || value === "") {
        result[key] = null;
        continue;
      }
      
      if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
        result[key] = value;
        continue;
      }
      
      result[key] = value;
    }
    
    return result;
  };

  const handleAddSubmit = async () => {
    const fields = prepareFieldsForApi(formData);
    const success = await onAddRecord(fields);
    if (success) {
      setIsAddDialogOpen(false);
      onEditingChange?.(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!editingRecord) return;
    const fields = prepareFieldsForApi(formData);
    const success = await onUpdateRecord(editingRecord.recordId, fields);
    if (success) {
      setIsEditDialogOpen(false);
      setEditingRecord(null);
      onEditingChange?.(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingRecordId) return;
    const success = await onDeleteRecord(deletingRecordId);
    if (success) {
      setIsDeleteDialogOpen(false);
      setDeletingRecordId(null);
      onEditingChange?.(false);
    }
  };

  // Empty state
  if (records.length === 0) {
    return (
      <div className="p-4 border rounded bg-muted/50 min-h-[100px] flex flex-col items-center justify-center gap-3">
        <div className="text-sm text-muted-foreground">
          {isLoading ? "Загрузка..." : "Нет данных"}
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleAddClick} className="gap-1">
            <Plus className="size-4" />
            Добавить запись
          </Button>
          <Button size="sm" variant="outline" onClick={onRefresh}>
            <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* Add Dialog for empty state */}
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) onEditingChange?.(false);
        }}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Добавить запись</DialogTitle>
              <DialogDescription>
                Заполните поля для новой записи
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {columns.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  В таблице еще нет полей. Добавьте поля через меню управления.
                </div>
              ) : (
                columns.map((column) => (
                  <div key={column} className="space-y-2">
                    <Label>{column}</Label>
                    <FieldInput
                      fieldName={column}
                      value={formData[column]}
                      onChange={(value) => handleFormChange(column, value)}
                      allRecords={records}
                      datasheetId={datasheetId}
                    />
                  </div>
                ))
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsAddDialogOpen(false);
                onEditingChange?.(false);
              }}>
                Отмена
              </Button>
              <Button onClick={handleAddSubmit} disabled={isSubmitting || columns.length === 0}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Добавление...
                  </>
                ) : (
                  "Добавить"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="tables-mw-table relative my-4">
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-2 right-2 z-10">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-2">
          <Button size="sm" onClick={handleAddClick} className="gap-1">
            <Plus className="size-4" />
            Добавить
          </Button>
          <Button size="sm" variant="outline" onClick={onRefresh}>
            <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {spaceId && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              Space: {spaceId.slice(0, 8)}...
            </span>
          )}
          {datasheetId && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              Table: {datasheetId.slice(0, 8)}...
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {records.length} записей
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border">
          <thead>
            <tr className="bg-muted">
              <th className="border border-border px-3 py-2 text-left text-sm font-medium w-20">
                Действия
              </th>
              {columns.map((colName) => (
                <th
                  key={colName}
                  className="border border-border px-3 py-2 text-left text-sm font-medium"
                >
                  {colName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => (
              <tr 
                key={record.recordId} 
                className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}
              >
                <td className="border border-border px-2 py-1">
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => handleEditClick(record)}
                      title="Редактировать"
                    >
                      <Pencil className="size-3" />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClick(record.recordId)}
                      title="Удалить"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </td>
                {columns.map((colName) => (
                  <td
                    key={`${record.recordId}-${colName}`}
                    className="border border-border px-3 py-2 text-sm"
                  >
                    <FieldDisplay
                      fieldName={colName}
                      value={record.fields[colName]}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) onEditingChange?.(false);
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Добавить запись</DialogTitle>
            <DialogDescription>
              Заполните поля для новой записи
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {columns.map((column) => (
              <div key={column} className="space-y-2">
                <Label>{column}</Label>
                <FieldInput
                  fieldName={column}
                  value={formData[column]}
                  onChange={(value) => handleFormChange(column, value)}
                  allRecords={records}
                  datasheetId={datasheetId}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddDialogOpen(false);
              onEditingChange?.(false);
            }}>
              Отмена
            </Button>
            <Button onClick={handleAddSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Добавление...
                </>
              ) : (
                "Добавить"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          onEditingChange?.(false);
          setEditingRecord(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать запись</DialogTitle>
            <DialogDescription>
              Измените поля записи
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {columns.map((column) => (
              <div key={column} className="space-y-2">
                <Label>{column}</Label>
                <FieldInput
                  fieldName={column}
                  value={formData[column]}
                  onChange={(value) => handleFormChange(column, value)}
                  allRecords={records}
                  datasheetId={datasheetId}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditDialogOpen(false);
                onEditingChange?.(false);
                setEditingRecord(null);
              }}
            >
              Отмена
            </Button>
            <Button onClick={handleEditSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                "Сохранить"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        setIsDeleteDialogOpen(open);
        if (!open) {
          onEditingChange?.(false);
          setDeletingRecordId(null);
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Удалить запись</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить эту запись? Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDeleteDialogOpen(false);
                onEditingChange?.(false);
                setDeletingRecordId(null);
              }}
            >
              Отмена
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteSubmit} 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Удаление...
                </>
              ) : (
                "Удалить"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
