/**
 * Wiki Comments Types and Utilities
 * Based on Figma designs
 */

export interface WikiComment {
  recordId: string;
  pageId: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: number;
  updatedAt?: number;
  resolved: boolean;
  // Position in document (for highlighting)
  anchor?: {
    key: string;
    offset: number;
    text: string;
  };
  // Selection range
  selection?: {
    anchorKey: string;
    anchorOffset: number;
    focusKey: string;
    focusOffset: number;
    selectedText: string;
  };
}

export interface CreateCommentRequest {
  pageId: string;
  content: string;
  selection?: WikiComment['selection'];
}

export interface UpdateCommentRequest {
  recordId: string;
  content?: string;
  resolved?: boolean;
}

// Field names in MWS Tables for comments
export const COMMENT_FIELDS = {
  PAGE_ID: "Page ID",
  CONTENT: "Content",
  AUTHOR_ID: "Author ID",
  AUTHOR_NAME: "Author Name",
  CREATED_AT: "Created At",
  UPDATED_AT: "Updated At",
  RESOLVED: "Resolved",
  // JSON fields for position data
  SELECTION: "Selection",
} as const;

// Parse comment from MWS record
export function parseComment(record: {
  recordId: string;
  fields: Record<string, unknown>;
}): WikiComment {
  const fields = record.fields;
  
  let selection: WikiComment['selection'] | undefined;
  const rawSelection = fields[COMMENT_FIELDS.SELECTION];
  if (rawSelection && typeof rawSelection === "string") {
    try {
      selection = JSON.parse(rawSelection);
    } catch {
      selection = undefined;
    }
  }
  
  return {
    recordId: record.recordId,
    pageId: String(fields[COMMENT_FIELDS.PAGE_ID] || ""),
    content: String(fields[COMMENT_FIELDS.CONTENT] || ""),
    author: {
      id: String(fields[COMMENT_FIELDS.AUTHOR_ID] || ""),
      name: String(fields[COMMENT_FIELDS.AUTHOR_NAME] || "Аноним"),
    },
    createdAt: Number(fields[COMMENT_FIELDS.CREATED_AT]) || Date.now(),
    updatedAt: fields[COMMENT_FIELDS.UPDATED_AT] ? Number(fields[COMMENT_FIELDS.UPDATED_AT]) : undefined,
    resolved: fields[COMMENT_FIELDS.RESOLVED] === true || fields[COMMENT_FIELDS.RESOLVED] === "true",
    selection,
  };
}

// Convert comment to MWS fields
export function commentToFields(comment: Partial<WikiComment>): Record<string, string | number | boolean | null> {
  const fields: Record<string, string | number | boolean | null> = {};
  
  if (comment.pageId !== undefined) fields[COMMENT_FIELDS.PAGE_ID] = comment.pageId;
  if (comment.content !== undefined) fields[COMMENT_FIELDS.CONTENT] = comment.content;
  if (comment.author !== undefined) {
    fields[COMMENT_FIELDS.AUTHOR_ID] = comment.author.id;
    fields[COMMENT_FIELDS.AUTHOR_NAME] = comment.author.name;
  }
  if (comment.createdAt !== undefined) fields[COMMENT_FIELDS.CREATED_AT] = comment.createdAt;
  if (comment.updatedAt !== undefined) fields[COMMENT_FIELDS.UPDATED_AT] = comment.updatedAt;
  if (comment.resolved !== undefined) fields[COMMENT_FIELDS.RESOLVED] = comment.resolved;
  if (comment.selection !== undefined) {
    fields[COMMENT_FIELDS.SELECTION] = JSON.stringify(comment.selection);
  }
  
  return fields;
}

// Format date for display (27.10.25 18:03)
export function formatCommentDate(timestamp: number): string {
  const date = new Date(timestamp);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}
