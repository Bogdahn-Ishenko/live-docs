/**
 * Wiki Page Versions (Time Machine)
 * Based on Figma "Машина времени" designs
 */

import type { SerializedEditorState } from "lexical";

export interface WikiPageVersion {
  recordId: string;
  pageId: string;
  content: SerializedEditorState | null;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: number;
  action: string; // "edit", "create", "delete", etc.
  description?: string;
}

export interface CreateVersionRequest {
  pageId: string;
  content: SerializedEditorState | null;
  action: string;
  description?: string;
}

// Field names in MWS Tables for versions
export const VERSION_FIELDS = {
  PAGE_ID: "Page ID",
  CONTENT: "Content",
  AUTHOR_ID: "Author ID",
  AUTHOR_NAME: "Author Name",
  CREATED_AT: "Created At",
  ACTION: "Action",
  DESCRIPTION: "Description",
} as const;

// Parse version from MWS record
export function parseVersion(record: {
  recordId: string;
  fields: Record<string, unknown>;
}): WikiPageVersion {
  const fields = record.fields;
  
  let content: SerializedEditorState | null = null;
  const rawContent = fields[VERSION_FIELDS.CONTENT];
  if (rawContent) {
    try {
      content = typeof rawContent === "string" 
        ? JSON.parse(rawContent) 
        : (rawContent as SerializedEditorState);
    } catch {
      content = null;
    }
  }
  
  return {
    recordId: record.recordId,
    pageId: String(fields[VERSION_FIELDS.PAGE_ID] || ""),
    content,
    author: {
      id: String(fields[VERSION_FIELDS.AUTHOR_ID] || ""),
      name: String(fields[VERSION_FIELDS.AUTHOR_NAME] || "Аноним"),
    },
    createdAt: Number(fields[VERSION_FIELDS.CREATED_AT]) || Date.now(),
    action: String(fields[VERSION_FIELDS.ACTION] || "edit"),
    description: fields[VERSION_FIELDS.DESCRIPTION] ? String(fields[VERSION_FIELDS.DESCRIPTION]) : undefined,
  };
}

// Convert version to MWS fields
export function versionToFields(version: Partial<WikiPageVersion>): Record<string, string | number | boolean | null> {
  const fields: Record<string, string | number | boolean | null> = {};
  
  if (version.pageId !== undefined) fields[VERSION_FIELDS.PAGE_ID] = version.pageId;
  if (version.content !== undefined) {
    fields[VERSION_FIELDS.CONTENT] = version.content ? JSON.stringify(version.content) : "";
  }
  if (version.author !== undefined) {
    fields[VERSION_FIELDS.AUTHOR_ID] = version.author.id;
    fields[VERSION_FIELDS.AUTHOR_NAME] = version.author.name;
  }
  if (version.createdAt !== undefined) fields[VERSION_FIELDS.CREATED_AT] = version.createdAt;
  if (version.action !== undefined) fields[VERSION_FIELDS.ACTION] = version.action;
  if (version.description !== undefined) fields[VERSION_FIELDS.DESCRIPTION] = version.description;
  
  return fields;
}

// Format date for display (2025-11-14 15:53:57)
export function formatVersionDate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Get action label in Russian
export function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    create: "Создание",
    edit: "Редактирование",
    delete: "Удаление",
    restore: "Восстановление",
    publish: "Публикация",
    unpublish: "Снятие с публикации",
  };
  return labels[action] || action;
}
