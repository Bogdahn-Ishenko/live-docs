/**
 * Wiki Pages Types
 * For storing and managing wiki pages in MWS Tables
 */

import type { SerializedEditorState } from "lexical";

export interface WikiPage {
  recordId: string;
  title: string;
  slug: string;
  content: SerializedEditorState | null;
  parentId?: string | null;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  updatedBy?: string;
  isPublished: boolean;
}

export interface WikiPageMetadata {
  recordId: string;
  title: string;
  slug: string;
  parentId?: string | null;
  updatedAt: number;
  isPublished: boolean;
}

export interface WikiLink {
  fromPageId: string;
  toPageId: string;
  fromPageTitle: string;
  toPageTitle: string;
}

export interface WikiHierarchy {
  page: WikiPageMetadata;
  children: WikiHierarchy[];
}

export interface CreateWikiPageRequest {
  title: string;
  slug?: string;
  content?: SerializedEditorState;
  parentId?: string | null;
}

export interface UpdateWikiPageRequest {
  recordId: string;
  title?: string;
  slug?: string;
  content?: SerializedEditorState | null;
  parentId?: string | null;
  isPublished?: boolean;
}

// Field names in MWS Tables datasheet
export const WIKI_FIELDS = {
  TITLE: "Title",
  SLUG: "Slug",
  CONTENT: "Content",
  PARENT_ID: "Parent ID",
  CREATED_AT: "Created At",
  UPDATED_AT: "Updated At",
  CREATED_BY: "Created By",
  UPDATED_BY: "Updated By",
  IS_PUBLISHED: "Is Published",
} as const;

// Parse wiki page from MWS Tables record
export function parseWikiPage(record: {
  recordId: string;
  fields: Record<string, unknown>;
}): WikiPage {
  const fields = record.fields;
  
  let content: SerializedEditorState | null = null;
  const rawContent = fields[WIKI_FIELDS.CONTENT];
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
    title: String(fields[WIKI_FIELDS.TITLE] || ""),
    slug: String(fields[WIKI_FIELDS.SLUG] || ""),
    content,
    parentId: fields[WIKI_FIELDS.PARENT_ID] ? String(fields[WIKI_FIELDS.PARENT_ID]) : null,
    createdAt: Number(fields[WIKI_FIELDS.CREATED_AT]) || Date.now(),
    updatedAt: Number(fields[WIKI_FIELDS.UPDATED_AT]) || Date.now(),
    createdBy: fields[WIKI_FIELDS.CREATED_BY] ? String(fields[WIKI_FIELDS.CREATED_BY]) : undefined,
    updatedBy: fields[WIKI_FIELDS.UPDATED_BY] ? String(fields[WIKI_FIELDS.UPDATED_BY]) : undefined,
    isPublished: fields[WIKI_FIELDS.IS_PUBLISHED] === true || fields[WIKI_FIELDS.IS_PUBLISHED] === "true",
  };
}

// Convert wiki page to MWS Tables fields
export function wikiPageToFields(page: Partial<WikiPage>): Record<string, string | number | boolean | null> {
  const fields: Record<string, string | number | boolean | null> = {};
  
  if (page.title !== undefined) fields[WIKI_FIELDS.TITLE] = page.title;
  if (page.slug !== undefined) fields[WIKI_FIELDS.SLUG] = page.slug;
  if (page.content !== undefined) {
    fields[WIKI_FIELDS.CONTENT] = page.content ? JSON.stringify(page.content) : "";
  }
  if (page.parentId !== undefined) fields[WIKI_FIELDS.PARENT_ID] = page.parentId;
  if (page.createdAt !== undefined) fields[WIKI_FIELDS.CREATED_AT] = page.createdAt;
  if (page.updatedAt !== undefined) fields[WIKI_FIELDS.UPDATED_AT] = page.updatedAt;
  if (page.createdBy !== undefined) fields[WIKI_FIELDS.CREATED_BY] = page.createdBy;
  if (page.updatedBy !== undefined) fields[WIKI_FIELDS.UPDATED_BY] = page.updatedBy;
  if (page.isPublished !== undefined) fields[WIKI_FIELDS.IS_PUBLISHED] = page.isPublished;
  
  return fields;
}

// Generate slug from title
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50);
}

// Extract internal links from editor content
export function extractLinksFromContent(content: SerializedEditorState | null): string[] {
  if (!content || !content.root || !content.root.children) return [];
  
  const links: string[] = [];
  
  function traverse(node: unknown) {
    if (!node || typeof node !== "object") return;
    
    const obj = node as Record<string, unknown>;
    
    // Check for link nodes
    if (obj.type === "link" && obj.url && typeof obj.url === "string") {
      const url = obj.url;
      // Check if it's an internal wiki link (starts with /wiki/ or [[...]])
      if (url.startsWith("/wiki/") || url.startsWith("[[")) {
        const slug = url.replace(/^\/wiki\//, "").replace(/^\[\[/, "").replace(/\]\]$/, "");
        if (slug && !links.includes(slug)) {
          links.push(slug);
        }
      }
    }
    
    // Traverse children
    if (Array.isArray(obj.children)) {
      obj.children.forEach(traverse);
    }
    
    // Check common node properties that might contain children
    if (obj.root && typeof obj.root === "object") traverse(obj.root);
  }
  
  traverse(content);
  return links;
}
