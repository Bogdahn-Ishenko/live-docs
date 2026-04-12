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
import { toast } from "sonner";

import type { 
  TablesRecord, 
  FieldValue 
} from "@/fsd/shared/lib/tables-mw/api-types";
import {
  useRecords,
  useCreateRecords,
  useUpdateRecords,
  useDeleteRecords,
} from "@/fsd/shared/hooks/tables-mw";
import { TablesRecordTable } from "./tables-mw-table";

const REFRESH_INTERVAL = 5000; // 5 seconds

export type SerializedTablesMwNode = Spread<
  {
    url: string;
    spaceId?: string;
    datasheetId?: string;
    viewId?: string;
  },
  SerializedLexicalNode
>;

export class TablesMwNode extends DecoratorNode<JSX.Element> {
  __url: string;
  __spaceId?: string;
  __datasheetId?: string;
  __viewId?: string;

  static getType(): string {
    return "tables-mw";
  }

  static clone(node: TablesMwNode): TablesMwNode {
    return new TablesMwNode(
      node.__url, 
      node.__spaceId,
      node.__datasheetId,
      node.__viewId,
      node.__key
    );
  }

  constructor(
    url: string, 
    spaceId?: string,
    datasheetId?: string,
    viewId?: string,
    key?: NodeKey
  ) {
    super(key);
    this.__url = url;
    this.__spaceId = spaceId;
    this.__datasheetId = datasheetId;
    this.__viewId = viewId;
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
    return $createTablesMwNode(
      serializedNode.url,
      serializedNode.spaceId,
      serializedNode.datasheetId,
      serializedNode.viewId
    );
  }

  exportJSON(): SerializedTablesMwNode {
    return {
      ...super.exportJSON(),
      type: "tables-mw",
      url: this.__url,
      spaceId: this.__spaceId,
      datasheetId: this.__datasheetId,
      viewId: this.__viewId,
      version: 1,
    };
  }

  getUrl(): string {
    return this.__url;
  }

  getSpaceId(): string | undefined {
    return this.__spaceId;
  }

  getDatasheetId(): string | undefined {
    return this.__datasheetId;
  }

  getViewId(): string | undefined {
    return this.__viewId;
  }

  decorate(_editor: LexicalEditor, _config: EditorConfig): JSX.Element {
    return (
      <TablesMwComponent 
        url={this.__url} 
        spaceId={this.__spaceId}
        datasheetId={this.__datasheetId}
        viewId={this.__viewId}
      />
    );
  }
}

interface TablesMwComponentProps {
  url: string;
  spaceId?: string;
  datasheetId?: string;
  viewId?: string;
}

function TablesMwComponent({ url, spaceId, datasheetId, viewId }: TablesMwComponentProps): JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  
  // Parse URL if explicit IDs not provided
  const parsedInfo = useCallback(() => {
    if (datasheetId && viewId) {
      return { datasheetId, viewId, fieldKey: "name" as const };
    }
    
    const urlObj = new URL(url);
    const pathViewId = urlObj.searchParams.get("viewId") || "viw0Lfw3STnJg";
    const fieldKey = (urlObj.searchParams.get("fieldKey") as "name" | "id") || "name";
    
    const match = urlObj.pathname.match(/\/fusion\/v1\/datasheets\/([^\/]+)/);
    const pathDatasheetId = match?.[1] || "";
    
    return { 
      datasheetId: pathDatasheetId, 
      viewId: pathViewId, 
      fieldKey 
    };
  }, [url, datasheetId, viewId]);

  const { datasheetId: effectiveDatasheetId, viewId: effectiveViewId, fieldKey } = parsedInfo();

  // Use the new hooks
  const { 
    records, 
    isLoading: isLoadingRecords, 
    refetch 
  } = useRecords(
    effectiveDatasheetId || null,
    { 
      viewId: effectiveViewId,
      fieldKey,
      pageSize: 100 
    }
  );

  const { createRecords, isLoading: isCreating } = useCreateRecords();
  const { updateRecords, isLoading: isUpdating } = useUpdateRecords();
  const { deleteRecords, isLoading: isDeleting } = useDeleteRecords();

  // Auto-refresh
  useEffect(() => {
    if (isEditing) return;
    
    const intervalId = setInterval(() => {
      refetch();
    }, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [isEditing, refetch]);

  const handleAddRecord = async (fields: globalThis.Record<string, FieldValue>): Promise<boolean> => {
    if (!effectiveDatasheetId) return false;

    const result = await createRecords(
      effectiveDatasheetId,
      {
        records: [{ fields }],
        fieldKey,
      },
      effectiveViewId
    );

    if (result?.success) {
      toast.success("Запись добавлена");
      refetch();
      return true;
    } else {
      toast.error("Ошибка при добавлении записи");
      return false;
    }
  };

  const handleUpdateRecord = async (recordId: string, fields: globalThis.Record<string, FieldValue>): Promise<boolean> => {
    if (!effectiveDatasheetId) return false;

    const result = await updateRecords(
      effectiveDatasheetId,
      {
        records: [{ recordId, fields }],
        fieldKey,
      },
      effectiveViewId
    );

    if (result?.success) {
      toast.success("Запись обновлена");
      refetch();
      return true;
    } else {
      toast.error("Ошибка при обновлении записи");
      return false;
    }
  };

  const handleDeleteRecord = async (recordId: string): Promise<boolean> => {
    if (!effectiveDatasheetId) return false;

    const success = await deleteRecords(effectiveDatasheetId, [recordId]);

    if (success) {
      toast.success("Запись удалена");
      refetch();
      return true;
    } else {
      toast.error("Ошибка при удалении записи");
      return false;
    }
  };

  const isSubmitting = isCreating || isUpdating || isDeleting;

  return (
    <TablesRecordTable
      records={records}
      isLoading={isLoadingRecords}
      isSubmitting={isSubmitting}
      datasheetId={effectiveDatasheetId}
      spaceId={spaceId}
      onAddRecord={handleAddRecord}
      onUpdateRecord={handleUpdateRecord}
      onDeleteRecord={handleDeleteRecord}
      onRefresh={refetch}
      onEditingChange={setIsEditing}
    />
  );
}

export function $createTablesMwNode(
  url: string,
  spaceId?: string,
  datasheetId?: string,
  viewId?: string
): TablesMwNode {
  return new TablesMwNode(url, spaceId, datasheetId, viewId);
}

export function $isTablesMwNode(
  node: LexicalNode | null | undefined,
): node is TablesMwNode {
  return node instanceof TablesMwNode;
}

export function $insertTablesMwNode(
  url: string,
  spaceId?: string,
  datasheetId?: string,
  viewId?: string
): void {
  const node = $createTablesMwNode(url, spaceId, datasheetId, viewId);
  $insertNodeToNearestRoot(node);
}
