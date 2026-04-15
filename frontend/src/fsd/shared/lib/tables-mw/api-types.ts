/**
 * Comprehensive API Types for MWS Tables
 * Based on OpenAPI specification
 */

// ============================================================================
// BASE RESPONSES
// ============================================================================

export interface BaseResponse {
  success: boolean;
  code: number;
  message: string;
  data?: globalThis.Record<string, unknown> | unknown;
}

export interface BackendResponse {
  success: boolean;
  code: number;
  message: string;
}

// ============================================================================
// SPACES
// ============================================================================

export interface Space {
  id: string;
  name: string;
  isAdmin?: boolean;
}

export interface GetSpacesResponse extends BaseResponse {
  data: {
    spaces: Space[];
  };
}

// ============================================================================
// NODES
// ============================================================================

export type NodeType = "Folder" | "Datasheet" | "Form" | "Dashboard" | "Mirror" | "Automation" | "Widget";

export interface Node {
  id: string;
  name: string;
  type: NodeType | string;
  icon?: string;
  isFav?: boolean;
  permission?: number;
  children?: Node[];
}

export interface GetNodesResponse extends BaseResponse {
  data: {
    nodes: Node[];
  };
}

export interface GetNodeDetailsResponse extends BaseResponse {
  data: Node;
}

export interface DeleteNodeResponse extends BaseResponse {
  data: {
    nodeId: string;
  };
}

// ============================================================================
// DATASHEETS
// ============================================================================

export interface Datasheet {
  id: string;
  name: string;
  type: "Datasheet";
}

export interface CreateDatasheetRequest {
  name: string;
  description?: string;
  folderId?: string;
  preNodeId?: string;
  fields?: CreateFieldRequest[];
}

export interface CreateDatasheetResponse extends BackendResponse {
  data: {
    id: string;
    createdAt: number;
    fields: Array<{
      id: string;
      name: string;
    }>;
  };
}

export interface DeleteDatasheetResponse extends DeleteNodeResponse {}

// ============================================================================
// FIELDS
// ============================================================================

export type FieldTypeEnum =
  | "SingleText"
  | "Text"
  | "SingleSelect"
  | "MultiSelect"
  | "Number"
  | "Currency"
  | "Percent"
  | "DateTime"
  | "Attachment"
  | "Member"
  | "Checkbox"
  | "Rating"
  | "URL"
  | "Phone"
  | "Email"
  | "WorkDoc"
  | "OneWayLink"
  | "TwoWayLink"
  | "MagicLookUp"
  | "Formula"
  | "AutoNumber"
  | "CreatedTime"
  | "LastModifiedTime"
  | "CreatedBy"
  | "LastModifiedBy";

export interface Field {
  id: string;
  name: string;
  type: FieldTypeEnum;
  desc?: string;
  property?: FieldProperty;
}

export interface FieldProperty {
  defaultValue?: string | number | boolean | string[];
  // SingleText/Text
  mask?: MaskProperty;
  // SingleSelect/MultiSelect
  options?: Array<{
    name: string;
    color?: string;
  }>;
  // Number/Currency
  symbol?: string;
  precision?: number;
  // Currency
  symbolAlign?: string;
  // DateTime
  dateFormat?: string;
  timeFormat?: string;
  autoFill?: boolean;
  includeTime?: boolean;
  // Member
  isMulti?: boolean;
  shouldSendMsg?: boolean;
  // Checkbox
  icon?: string;
  // Rating
  max?: number;
  // Link fields
  foreignDatasheetId?: string;
  limitToViewId?: string;
  limitSingleRecord?: boolean;
  // Lookup
  relatedLinkFieldId?: string;
  targetFieldId?: string;
  // Formula
  expression?: string;
  // LastModified
  collectType?: 0 | 1;
  fieldIdCollection?: string[];
  // Button
  text?: string;
  style?: {
    type?: "Background" | "OnlyText";
    color?: {
      value?: string;
    };
  };
  action?: {
    type?: "Link" | "RecordOperation" | "SendEmail" | "AddRecord";
    config?: globalThis.Record<string, unknown>;
  };
}

export interface MaskProperty {
  condition?: {
    operator?: string;
    value?: string;
  };
}

export interface GetFieldsResponse extends BackendResponse {
  data: {
    fields: Field[];
  };
}

export interface CreateFieldRequest {
  type: FieldTypeEnum;
  name: string;
  property?: FieldProperty;
}

export interface CreateFieldResponse extends BackendResponse {
  data: {
    id: string;
    name: string;
  };
}

export interface DeleteFieldResponse extends BackendResponse {
  data: globalThis.Record<string, unknown>;
}

export interface UpdateFieldIndexRequest {
  index: number;
}

// ============================================================================
// RECORDS
// ============================================================================

export interface Attachment {
  id?: string;
  token?: string;
  name: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  preview?: string;
  url?: string;
  bucket?: string;
}

export interface Member {
  id: string;
  type: "Member";
  name: string;
  avatar?: string;
  email: string;
}

export interface UrlObject {
  title: string;
  text: string;
  favicon: string;
}

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

export interface TablesRecord {
  recordId: string;
  fields: globalThis.Record<string, FieldValue>;
  createdAt?: number;
  updatedAt?: number;
}

export interface GetRecordsParams {
  viewId?: string;
  pageSize?: number;
  maxRecords?: number;
  pageNum?: number;
  sort?: Array<{
    order?: "asc" | "desc";
    field?: string;
  }>;
  recordIds?: string[];
  fields?: string[];
  filterByFormula?: string;
  cellFormat?: "string" | "json";
  fieldKey?: "name" | "id";
}

export interface GetRecordsResponse extends BackendResponse {
  data: {
    pageNum: number;
    pageSize: number;
    total: number;
    records: TablesRecord[];
  };
}

export interface CreateRecordsRequest {
  records: Array<{
    fields: globalThis.Record<string, FieldValue>;
  }>;
  fieldKey: string;
}

export interface CreateRecordsResponse extends BackendResponse {
  data: {
    records: TablesRecord[];
  };
}

export interface UpdateRecordsRequest {
  records: Array<{
    recordId: string;
    fields: globalThis.Record<string, FieldValue>;
  }>;
  fieldKey: string;
}

export interface UpdateRecordsResponse extends BackendResponse {
  data: {
    records: TablesRecord[];
  };
}

export interface DeleteRecordsResponse extends BackendResponse {
  data: boolean;
}

// ============================================================================
// VIEWS
// ============================================================================

export type ViewType = "Grid" | "Kanban" | "Gantt" | "Architecture" | "Gallery" | "Calendar";

export interface View {
  id: string;
  name: string;
  type: ViewType;
}

export interface ViewColumn {
  fieldId: string;
  statType?: number;
}

export interface ViewRow {
  recordId: string;
}

export interface ViewDetails {
  id: string;
  name: string;
  type: number;
  rowHeightLevel?: number;
  columns?: ViewColumn[];
  rows?: ViewRow[];
  frozenColumnCount?: number;
  displayHiddenColumnWithinMirror?: boolean;
}

export interface GetViewsResponse extends BackendResponse {
  data: {
    views: View[];
  };
}

// View creation request bodies
export type CreateViewRequestBody =
  | {
      name: string;
      properties: {
        type: "Kanban";
        settings: {
          groupFieldId: string;
        };
      };
    }
  | {
      name: string;
      properties: {
        type: "Grid";
      };
    }
  | {
      name: string;
      properties: {
        type: "Gantt";
        settings: {
          startFieldId: string;
          endFieldId?: string;
          linkFieldId?: string;
        };
      };
    }
  | {
      name: string;
      properties: {
        type: "Architecture";
        settings: {
          linkFieldId: string;
        };
      };
    }
  | {
      name: string;
      properties: {
        type: "Gallery";
      };
    }
  | {
      name: string;
      properties: {
        type: "Calendar";
        settings: {
          startFieldId: string;
          endFieldId?: string;
        };
      };
    };

export interface CreateViewResponse extends BaseResponse {
  data: ViewDetails;
}

export interface DeleteViewResponse extends BaseResponse {
  data: {
    viewId: string;
  };
}

export interface UpdateViewNameRequest {
  name: string;
  description?: string;
}

export interface ViewShortInfo {
  viewId: string;
  name: string;
  type: string;
}

export interface UpdateViewNameResponse extends BaseResponse {
  data: ViewShortInfo;
}

// Sort
export interface SortRule {
  fieldId: string;
  desc?: boolean;
}

export interface SortInfoRequest {
  data: {
    keepSort?: boolean;
    rules: SortRule[];
  };
  applySort?: boolean;
}

export interface SortInfoResponse extends BaseResponse {
  data: ViewShortInfo;
}

// Group
export interface GroupRule {
  fieldId: string;
  desc?: boolean;
}

export interface GroupRequest {
  data: GroupRule[];
}

export interface GroupResponse extends BaseResponse {
  data: ViewShortInfo;
}

// Hidden Fields
export interface HideFieldRule {
  fieldId: string;
  hidden: boolean;
}

export interface HideFieldsRequest {
  data: HideFieldRule[];
}

export interface HideFieldsResponse extends BaseResponse {
  data: ViewShortInfo;
}

// Move View
export interface MoveViewRequest {
  data: {
    newIndex: number;
  };
}

export interface MoveViewResponse extends BaseResponse {
  data: ViewShortInfo;
}

// ============================================================================
// ATTACHMENTS
// ============================================================================

export interface UploadAttachmentResponse extends BaseResponse {
  data: {
    token: string;
    name: string;
    size: number;
    width?: number;
    height?: number;
    mimeType: string;
    preview?: string;
    url: string;
    bucket?: string;
  };
}

export interface DownloadAttachmentParams {
  token: string;
}

// ============================================================================
// TIMEMACHINE
// ============================================================================

export interface GetTimeMachineResponse extends BackendResponse {
  data: string[]; // Array of deleted record IDs
}

// ============================================================================
// ERROR RESPONSES
// ============================================================================

export interface ErrorResponse extends BaseResponse {
  message: string;
}

export type InvalidResponse = ErrorResponse;
