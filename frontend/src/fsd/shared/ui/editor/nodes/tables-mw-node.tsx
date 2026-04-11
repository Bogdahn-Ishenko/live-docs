'use client'

import type { JSX } from "react";
import { useEffect, useState, useCallback } from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $insertNodeToNearestRoot } from "@lexical/utils";
import {
  DecoratorNode,
  type EditorConfig,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
import type { 
  TablesMwRecord, 
  TablesMwResponse, 
  TablesMwModifyResponse, 
  FieldValue 
} from "@/fsd/shared/lib/tables-mw/types";
import { collectFieldMetadata } from "@/fsd/shared/lib/tables-mw/field-detector";

const REFRESH_INTERVAL = 5000; // 5 seconds

export type SerializedTablesMwNode = Spread<
  {
    url: string;
  },
  SerializedLexicalNode
>;

export class TablesMwNode extends DecoratorNode<JSX.Element> {
  __url: string;

  static getType(): string {
    return "tables-mw";
  }

  static clone(node: TablesMwNode): TablesMwNode {
    return new TablesMwNode(node.__url, node.__key);
  }

  constructor(url: string, key?: NodeKey) {
    super(key);
    this.__url = url;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const div = document.createElement("div");
    div.className = "tables-mw-node";
    return div;
  }

  updateDOM(): false {
    return false;
  }

  static importJSON(serializedNode: SerializedTablesMwNode): TablesMwNode {
    return $createTablesMwNode(serializedNode.url);
  }

  exportJSON(): SerializedTablesMwNode {
    return {
      ...super.exportJSON(),
      type: "tables-mw",
      url: this.__url,
      version: 1,
    };
  }

  getUrl(): string {
    return this.__url;
  }

  decorate(_editor: LexicalEditor, _config: EditorConfig): JSX.Element {
    return <TablesMwComponent url={this.__url} />;
  }
}

function TablesMwComponent({
  url,
}: {
  url: string;
}): JSX.Element {
  const [data, setData] = useState<TablesMwResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TablesMwRecord | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  // Store form data as FieldValue to preserve types
  const [formData, setFormData] = useState<Record<string, FieldValue>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parse URL to get API info
  const getApiInfo = useCallback(() => {
    const urlObj = new URL(url);
    const apiPath = urlObj.pathname;
    const viewId = urlObj.searchParams.get("viewId") || "viw0Lfw3STnJg";
    const fieldKey = urlObj.searchParams.get("fieldKey") || "name";
    
    // Extract datasheet ID from path
    const match = apiPath.match(/\/fusion\/v1\/datasheets\/([^\/]+)/);
    const datasheetId = match?.[1] || "";
    
    return { apiPath, viewId, fieldKey, datasheetId };
  }, [url]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { apiPath, viewId, fieldKey } = getApiInfo();

      const proxyUrl = new URL("/api/tables-mw", window.location.origin);
      proxyUrl.searchParams.set("path", apiPath);
      proxyUrl.searchParams.set("viewId", viewId);
      proxyUrl.searchParams.set("fieldKey", fieldKey);

      const response = await fetch(proxyUrl.toString());
      if (!response.ok) throw new Error("Failed to fetch");

      const result = await response.json();
      if (result.success) {
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch tables data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [getApiInfo]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      await fetchData();
    };

    loadData();

    const intervalId = setInterval(() => {
      if (isMounted && !isEditing) {
        loadData();
      }
    }, REFRESH_INTERVAL);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [url, fetchData, isEditing]);

  const getColumns = useCallback(() => {
    if (!data?.data?.records?.length) return [];
    const fieldNames = new Set<string>();
    data.data.records.forEach((record) => {
      Object.keys(record.fields).forEach((key) => fieldNames.add(key));
    });
    return Array.from(fieldNames);
  }, [data]);

  const handleAddClick = () => {
    const columns = getColumns();
    const initialFormData: Record<string, FieldValue> = {};
    columns.forEach((col) => {
      initialFormData[col] = "";
    });
    setFormData(initialFormData);
    setIsAddDialogOpen(true);
  };

  const handleEditClick = (record: TablesMwRecord) => {
    setEditingRecord(record);
    // Clone the fields to avoid reference issues
    const newFormData: Record<string, FieldValue> = {};
    Object.entries(record.fields).forEach(([key, value]) => {
      // Deep clone arrays and objects
      if (Array.isArray(value)) {
        newFormData[key] = JSON.parse(JSON.stringify(value));
      } else if (typeof value === "object" && value !== null) {
        newFormData[key] = { ...value };
      } else {
        newFormData[key] = value;
      }
    });
    // Add empty values for any columns not in this record
    const columns = getColumns();
    columns.forEach((col) => {
      if (!(col in newFormData)) {
        newFormData[col] = "";
      }
    });
    setFormData(newFormData);
    setIsEditDialogOpen(true);
    setIsEditing(true);
  };

  const handleDeleteClick = (recordId: string) => {
    setDeletingRecordId(recordId);
    setIsDeleteDialogOpen(true);
    setIsEditing(true);
  };

  const handleFormChange = (key: string, value: FieldValue) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // Prepare fields for API - handle type conversions
  const prepareFieldsForApi = (
    fields: Record<string, FieldValue>
  ): Record<string, FieldValue> => {
    const result: Record<string, FieldValue> = {};
    
    for (const [key, value] of Object.entries(fields)) {
      // Skip null/undefined/empty string values - they will be sent as null to clear the field
      if (value === null || value === undefined || value === "") {
        result[key] = null;
        continue;
      }
      
      // Keep arrays and objects as-is
      if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
        result[key] = value;
        continue;
      }
      
      // For primitive values, keep them as-is
      result[key] = value;
    }
    
    return result;
  };

  const handleAddSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { apiPath, viewId, fieldKey } = getApiInfo();
      
      const proxyUrl = new URL("/api/tables-mw", window.location.origin);
      proxyUrl.searchParams.set("path", apiPath);
      proxyUrl.searchParams.set("viewId", viewId);
      proxyUrl.searchParams.set("fieldKey", fieldKey);

      const fields = prepareFieldsForApi(formData);

      const response = await fetch(proxyUrl.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: [{ fields }],
          fieldKey,
        }),
      });

      const result: TablesMwModifyResponse = await response.json();
      
      if (result.success) {
        toast.success("Запись успешно добавлена");
        setIsAddDialogOpen(false);
        await fetchData();
      } else {
        toast.error("Ошибка при добавлении записи");
      }
    } catch (error) {
      console.error("Failed to add record:", error);
      toast.error("Ошибка при добавлении записи");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!editingRecord) return;
    
    setIsSubmitting(true);
    try {
      const { apiPath, viewId, fieldKey } = getApiInfo();
      
      const proxyUrl = new URL("/api/tables-mw", window.location.origin);
      proxyUrl.searchParams.set("path", apiPath);
      proxyUrl.searchParams.set("viewId", viewId);
      proxyUrl.searchParams.set("fieldKey", fieldKey);

      const fields = prepareFieldsForApi(formData);

      const response = await fetch(proxyUrl.toString(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: [{ recordId: editingRecord.recordId, fields }],
          fieldKey,
        }),
      });

      const result: TablesMwModifyResponse = await response.json();
      
      if (result.success) {
        toast.success("Запись успешно обновлена");
        setIsEditDialogOpen(false);
        setEditingRecord(null);
        setIsEditing(false);
        await fetchData();
      } else {
        toast.error("Ошибка при обновлении записи");
      }
    } catch (error) {
      console.error("Failed to update record:", error);
      toast.error("Ошибка при обновлении записи");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingRecordId) return;
    
    setIsSubmitting(true);
    try {
      const { apiPath } = getApiInfo();
      
      const proxyUrl = new URL("/api/tables-mw", window.location.origin);
      proxyUrl.searchParams.set("path", apiPath);
      proxyUrl.searchParams.append("recordIds", deletingRecordId);

      const response = await fetch(proxyUrl.toString(), {
        method: "DELETE",
      });

      const result: TablesMwModifyResponse = await response.json();
      
      if (result.success) {
        toast.success("Запись успешно удалена");
        setIsDeleteDialogOpen(false);
        setDeletingRecordId(null);
        setIsEditing(false);
        await fetchData();
      } else {
        toast.error("Ошибка при удалении записи");
      }
    } catch (error) {
      console.error("Failed to delete record:", error);
      toast.error("Ошибка при удалении записи");
    } finally {
      setIsSubmitting(false);
    }
  };

  const { datasheetId } = getApiInfo();
  const records = data?.data?.records || [];
  const columns = getColumns();

  // Render table from data
  if (!data || !data.success || data.data.records.length === 0) {
    return (
      <div className="p-4 border rounded bg-muted/50 min-h-[100px] flex flex-col items-center justify-center gap-3">
        <div className="text-sm text-muted-foreground">
          {isLoading ? "Загрузка..." : "Нет данных"}
        </div>
        <Button size="sm" onClick={handleAddClick} className="gap-1">
          <Plus className="size-4" />
          Добавить запись
        </Button>

        {/* Add Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
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
      </div>
    );
  }

  return (
    <div className="tables-mw-table relative my-4">
      {isLoading && (
        <div className="absolute top-2 right-2 z-10">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-2">
        <Button size="sm" onClick={handleAddClick} className="gap-1">
          <Plus className="size-4" />
          Добавить
        </Button>
        <span className="text-xs text-muted-foreground">
          Обновляется каждые 5 сек
        </span>
      </div>

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
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
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
          setIsEditing(false);
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
                setIsEditing(false);
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
          setIsEditing(false);
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
                setIsEditing(false);
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

export function $createTablesMwNode(url: string): TablesMwNode {
  return new TablesMwNode(url);
}

export function $isTablesMwNode(
  node: LexicalNode | null | undefined,
): node is TablesMwNode {
  return node instanceof TablesMwNode;
}

export function $insertTablesMwNode(url: string): void {
  const node = $createTablesMwNode(url);
  $insertNodeToNearestRoot(node);
}
