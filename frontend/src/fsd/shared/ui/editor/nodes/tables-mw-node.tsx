'use client'

import type { JSX } from "react";
import { useEffect, useState } from "react";

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

const REFRESH_INTERVAL = 5000; // 5 seconds

// Tables.mws.ru API response types
interface TablesMwRecord {
  recordId: string;
  fields: Record<string, string | number | boolean | null>;
}

interface TablesMwResponse {
  code: number;
  success: boolean;
  message: string;
  data: {
    total: number;
    pageNum: number;
    pageSize: number;
    records: TablesMwRecord[];
  };
}

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

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const urlObj = new URL(url);
        const apiPath = urlObj.pathname;

        const proxyUrl = new URL("/api/tables-mw", window.location.origin);
        proxyUrl.searchParams.set("path", apiPath);

        urlObj.searchParams.forEach((value, key) => {
          proxyUrl.searchParams.set(key, value);
        });

        const response = await fetch(proxyUrl.toString());
        if (!response.ok) throw new Error("Failed to fetch");

        const result = await response.json();
        if (isMounted && result.success) {
          setData(result);
        }
      } catch (error) {
        console.error("Failed to fetch tables data:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    // Fetch immediately on mount
    fetchData();

    // Set up interval for refresh
    const intervalId = setInterval(fetchData, REFRESH_INTERVAL);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [url]);

  // Render table from data
  if (!data || !data.success || data.data.records.length === 0) {
    return (
      <div className="p-4 border rounded bg-muted/50 min-h-[100px] flex items-center justify-center">
        <div className="text-sm text-muted-foreground">
          {isLoading ? "Загрузка..." : "Нет данных"}
        </div>
      </div>
    );
  }

  const records = data.data.records;
  const fieldNames = new Set<string>();
  records.forEach((record) => {
    Object.keys(record.fields).forEach((key) => fieldNames.add(key));
  });
  const columns = Array.from(fieldNames);

  return (
    <div className="tables-mw-table relative my-4">
      {isLoading && (
        <div className="absolute top-2 right-2 z-10">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border">
          <thead>
            <tr className="bg-muted">
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
                {columns.map((colName) => (
                  <td
                    key={`${record.recordId}-${colName}`}
                    className="border border-border px-3 py-2 text-sm"
                  >
                    {record.fields[colName] !== null &&
                    record.fields[colName] !== undefined
                      ? String(record.fields[colName])
                      : ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-1 text-xs text-muted-foreground text-right">
        Обновляется каждые 5 секунд
      </div>
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
