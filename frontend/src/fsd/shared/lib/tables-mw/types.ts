// Types for tables.mws.ru API fields

export type FieldType =
  | "text"
  | "multiline_text"
  | "number"
  | "currency"
  | "percent"
  | "date"
  | "checkbox"
  | "rating"
  | "url"
  | "email"
  | "phone"
  | "single_select"
  | "multi_select"
  | "member"
  | "attachment"
  | "single_link"
  | "multi_link"
  | "unknown";

// Raw field values from API
export type FieldValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Attachment[]
  | Member[]
  | string[]
  | UrlObject;

export interface Attachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  token: string;
  width?: number;
  height?: number;
  url: string;
}

export interface Member {
  id: string;
  type: "Member";
  name: string;
  avatar: string;
  email: string;
}

export interface UrlObject {
  title: string;
  text: string;
  favicon: string;
}

export interface TablesMwRecord {
  recordId: string;
  fields: Record<string, FieldValue>;
}

export interface TablesMwResponse {
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

export interface TablesMwModifyResponse {
  code: number;
  success: boolean;
  message: string;
  data?: {
    records: TablesMwRecord[];
  };
}

// Field metadata for form rendering
export interface FieldMetadata {
  name: string;
  type: FieldType;
  options?: string[]; // for select fields - collected from all records
}
