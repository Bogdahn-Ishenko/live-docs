// Legacy types (for backward compatibility)
// Note: Attachment, Member, UrlObject, FieldValue are now in api-types
export type { 
  FieldType, 
  TablesMwRecord, 
  TablesMwResponse, 
  TablesMwModifyResponse,
  FieldMetadata 
} from "./types";

// Extended API types (preferred - includes all type definitions)
// Re-exporting only non-conflicting types from api-types
export type {
  // Base
  BaseResponse,
  BackendResponse,
  // Spaces
  Space,
  GetSpacesResponse,
  // Nodes
  NodeType,
  Node,
  GetNodesResponse,
  GetNodeDetailsResponse,
  DeleteNodeResponse,
  // Datasheets
  Datasheet,
  CreateDatasheetRequest,
  CreateDatasheetResponse,
  DeleteDatasheetResponse,
  // Fields
  FieldTypeEnum,
  Field,
  FieldProperty,
  MaskProperty,
  GetFieldsResponse,
  CreateFieldRequest,
  CreateFieldResponse,
  DeleteFieldResponse,
  UpdateFieldIndexRequest,
  // Records (TablesRecord is the new name for Record)
  TablesRecord,
  GetRecordsParams,
  GetRecordsResponse,
  CreateRecordsRequest,
  CreateRecordsResponse,
  UpdateRecordsRequest,
  UpdateRecordsResponse,
  DeleteRecordsResponse,
  // Views
  ViewType,
  View,
  ViewColumn,
  ViewRow,
  ViewDetails,
  GetViewsResponse,
  CreateViewRequestBody,
  CreateViewResponse,
  DeleteViewResponse,
  UpdateViewNameRequest,
  ViewShortInfo,
  UpdateViewNameResponse,
  SortRule,
  SortInfoRequest,
  SortInfoResponse,
  GroupRule,
  GroupRequest,
  GroupResponse,
  HideFieldRule,
  HideFieldsRequest,
  HideFieldsResponse,
  MoveViewRequest,
  MoveViewResponse,
  // Attachments
  UploadAttachmentResponse,
  DownloadAttachmentParams,
  // Timemachine
  GetTimeMachineResponse,
  // Errors
  ErrorResponse,
  InvalidResponse,
} from "./api-types";

// Re-export conflicting types explicitly from api-types (these override types.ts)
export type {
  Attachment,
  Member,
  UrlObject,
  FieldValue,
} from "./api-types";

// API client
export {
  tablesMwApi,
  tablesMwApi as default,
  spacesApi,
  nodesApi,
  datasheetsApi,
  fieldsApi,
  recordsApi,
  viewsApi,
  attachmentsApi,
  timemachineApi,
  ApiError,
} from "./api-client";

// Field detection utilities
export { detectFieldType, collectFieldMetadata } from "./field-detector";
export type { FieldMetadata as FieldDetectorMetadata } from "./field-detector";
