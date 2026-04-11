/**
 * MWS Tables API Client
 * Full-featured client for all API endpoints
 */

import type {
  // Spaces
  GetSpacesResponse,
  // Nodes
  GetNodesResponse,
  GetNodeDetailsResponse,
  DeleteNodeResponse,
  // Datasheets
  CreateDatasheetRequest,
  CreateDatasheetResponse,
  DeleteDatasheetResponse,
  // Fields
  GetFieldsResponse,
  CreateFieldRequest,
  CreateFieldResponse,
  DeleteFieldResponse,
  UpdateFieldIndexRequest,
  // Records
  GetRecordsResponse,
  GetRecordsParams,
  CreateRecordsRequest,
  CreateRecordsResponse,
  UpdateRecordsRequest,
  UpdateRecordsResponse,
  DeleteRecordsResponse,
  // Views
  GetViewsResponse,
  CreateViewRequestBody,
  CreateViewResponse,
  DeleteViewResponse,
  UpdateViewNameRequest,
  UpdateViewNameResponse,
  SortInfoRequest,
  SortInfoResponse,
  GroupRequest,
  GroupResponse,
  HideFieldsRequest,
  HideFieldsResponse,
  MoveViewRequest,
  MoveViewResponse,
  // Attachments
  UploadAttachmentResponse,
  // Timemachine
  GetTimeMachineResponse,
  // Base
  BaseResponse,
} from "./api-types";

// API Configuration
const API_BASE = "https://tables.mws.ru";
const AUTH_TOKEN = "Bearer uskHudJhxskxRj6UUSV3sjX";

// Default request options
const defaultOptions: RequestInit = {
  headers: {
    Authorization: AUTH_TOKEN,
    "Content-Type": "application/json",
  },
};

/**
 * Base fetch function with error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || `HTTP Error ${response.status}`,
      response.status,
      errorData
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ============================================================================
// SPACES API
// ============================================================================

export const spacesApi = {
  /**
   * Get all spaces for the authenticated user
   */
  getAll(): Promise<GetSpacesResponse> {
    return apiFetch<GetSpacesResponse>("/fusion/v1/spaces");
  },
};

// ============================================================================
// NODES API
// ============================================================================

export const nodesApi = {
  /**
   * Get nodes in a space
   * @param spaceId - Space ID
   * @param type - Optional node type filter
   */
  getBySpace(spaceId: string, type?: number): Promise<GetNodesResponse> {
    const params = new URLSearchParams();
    if (type !== undefined) params.append("type", type.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiFetch<GetNodesResponse>(`/fusion/v1/spaces/${spaceId}/nodes${query}`);
  },

  /**
   * Get detailed information about a node
   * @param nodeId - Node ID
   */
  getDetails(nodeId: string): Promise<GetNodeDetailsResponse> {
    return apiFetch<GetNodeDetailsResponse>(`/fusion/v1/nodes/${nodeId}`);
  },

  /**
   * Delete a node (move to trash or permanent delete)
   * @param spaceId - Space ID
   * @param nodeId - Node ID
   */
  delete(spaceId: string, nodeId: string): Promise<DeleteNodeResponse> {
    return apiFetch<DeleteNodeResponse>(
      `/fusion/v1/spaces/${spaceId}/node/${nodeId}`,
      { method: "DELETE" }
    );
  },
};

// ============================================================================
// DATASHEETS API
// ============================================================================

export const datasheetsApi = {
  /**
   * Create a new datasheet in a space
   * @param spaceId - Space ID
   * @param data - Datasheet creation data
   */
  create(
    spaceId: string,
    data: CreateDatasheetRequest
  ): Promise<CreateDatasheetResponse> {
    return apiFetch<CreateDatasheetResponse>(
      `/fusion/v1/spaces/${spaceId}/datasheets`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Delete a datasheet
   * @param spaceId - Space ID
   * @param dstId - Datasheet ID
   */
  delete(spaceId: string, dstId: string): Promise<DeleteDatasheetResponse> {
    return apiFetch<DeleteDatasheetResponse>(
      `/fusion/v1/spaces/${spaceId}/datasheet/${dstId}`,
      { method: "DELETE" }
    );
  },
};

// ============================================================================
// FIELDS API
// ============================================================================

export const fieldsApi = {
  /**
   * Get all fields in a datasheet
   * @param dstId - Datasheet ID
   * @param viewId - Optional view ID for field ordering
   */
  getAll(dstId: string, viewId?: string): Promise<GetFieldsResponse> {
    const params = new URLSearchParams();
    if (viewId) params.append("viewId", viewId);
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiFetch<GetFieldsResponse>(
      `/fusion/v1/datasheets/${dstId}/fields${query}`
    );
  },

  /**
   * Create a new field in a datasheet
   * @param spaceId - Space ID
   * @param dstId - Datasheet ID
   * @param data - Field creation data
   */
  create(
    spaceId: string,
    dstId: string,
    data: CreateFieldRequest
  ): Promise<CreateFieldResponse> {
    return apiFetch<CreateFieldResponse>(
      `/fusion/v1/spaces/${spaceId}/datasheets/${dstId}/fields`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Delete a field from a datasheet
   * @param spaceId - Space ID
   * @param dstId - Datasheet ID
   * @param fieldId - Field ID
   */
  delete(
    spaceId: string,
    dstId: string,
    fieldId: string
  ): Promise<DeleteFieldResponse> {
    return apiFetch<DeleteFieldResponse>(
      `/fusion/v1/spaces/${spaceId}/datasheets/${dstId}/fields/${fieldId}`,
      { method: "DELETE" }
    );
  },

  /**
   * Update field index (position) in a view
   * @param dstId - Datasheet ID
   * @param viewId - View ID
   * @param fieldId - Field ID
   * @param data - New index data
   */
  updateIndex(
    dstId: string,
    viewId: string,
    fieldId: string,
    data: UpdateFieldIndexRequest
  ): Promise<BaseResponse> {
    return apiFetch<BaseResponse>(
      `/fusion/v1/datasheets/${dstId}/views/${viewId}/fields/${fieldId}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
  },
};

// ============================================================================
// RECORDS API
// ============================================================================

function buildRecordsQueryParams(params: GetRecordsParams): string {
  const query = new URLSearchParams();
  
  if (params.viewId) query.append("viewId", params.viewId);
  if (params.pageSize !== undefined) query.append("pageSize", params.pageSize.toString());
  if (params.maxRecords !== undefined) query.append("maxRecords", params.maxRecords.toString());
  if (params.pageNum !== undefined) query.append("pageNum", params.pageNum.toString());
  if (params.filterByFormula) query.append("filterByFormula", params.filterByFormula);
  if (params.cellFormat) query.append("cellFormat", params.cellFormat);
  if (params.fieldKey) query.append("fieldKey", params.fieldKey);
  
  if (params.recordIds?.length) {
    query.append("recordIds", params.recordIds.join(","));
  }
  
  if (params.fields?.length) {
    query.append("fields", params.fields.join(","));
  }
  
  if (params.sort?.length) {
    params.sort.forEach((sort, index) => {
      if (sort.order) query.append(`sort[${index}][order]`, sort.order);
      if (sort.field) query.append(`sort[${index}][field]`, sort.field);
    });
  }
  
  return query.toString() ? `?${query.toString()}` : "";
}

export const recordsApi = {
  /**
   * Get records from a datasheet
   * @param dstId - Datasheet ID
   * @param params - Query parameters
   */
  getAll(
    dstId: string,
    params: GetRecordsParams = {}
  ): Promise<GetRecordsResponse> {
    const query = buildRecordsQueryParams(params);
    return apiFetch<GetRecordsResponse>(
      `/fusion/v1/datasheets/${dstId}/records${query}`
    );
  },

  /**
   * Create records in a datasheet
   * @param dstId - Datasheet ID
   * @param data - Records creation data
   * @param viewId - Optional view ID
   */
  create(
    dstId: string,
    data: CreateRecordsRequest,
    viewId?: string
  ): Promise<CreateRecordsResponse> {
    const params = viewId ? `?viewId=${viewId}` : "";
    return apiFetch<CreateRecordsResponse>(
      `/fusion/v1/datasheets/${dstId}/records${params}`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Update records in a datasheet
   * @param dstId - Datasheet ID
   * @param data - Records update data
   * @param viewId - Optional view ID
   */
  update(
    dstId: string,
    data: UpdateRecordsRequest,
    viewId?: string
  ): Promise<UpdateRecordsResponse> {
    const params = viewId ? `?viewId=${viewId}` : "";
    return apiFetch<UpdateRecordsResponse>(
      `/fusion/v1/datasheets/${dstId}/records${params}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Delete records from a datasheet
   * @param dstId - Datasheet ID
   * @param recordIds - Array of record IDs to delete
   */
  delete(dstId: string, recordIds: string[]): Promise<DeleteRecordsResponse> {
    const params = new URLSearchParams();
    params.append("recordIds", recordIds.join(","));
    return apiFetch<DeleteRecordsResponse>(
      `/fusion/v1/datasheets/${dstId}/records?${params.toString()}`,
      { method: "DELETE" }
    );
  },
};

// ============================================================================
// VIEWS API
// ============================================================================

export const viewsApi = {
  /**
   * Get all views in a datasheet
   * @param dstId - Datasheet ID
   */
  getAll(dstId: string): Promise<GetViewsResponse> {
    return apiFetch<GetViewsResponse>(`/fusion/v1/datasheets/${dstId}/views`);
  },

  /**
   * Create a new view in a datasheet
   * @param spaceId - Space ID
   * @param dstId - Datasheet ID
   * @param data - View creation data
   */
  create(
    spaceId: string,
    dstId: string,
    data: CreateViewRequestBody
  ): Promise<CreateViewResponse> {
    return apiFetch<CreateViewResponse>(
      `/fusion/v1/spaces/${spaceId}/datasheets/${dstId}/views`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Delete a view
   * @param spaceId - Space ID
   * @param dstId - Datasheet ID
   * @param viewId - View ID
   */
  delete(
    spaceId: string,
    dstId: string,
    viewId: string
  ): Promise<DeleteViewResponse> {
    return apiFetch<DeleteViewResponse>(
      `/fusion/v1/spaces/${spaceId}/datasheets/${dstId}/views/${viewId}`,
      { method: "DELETE" }
    );
  },

  /**
   * Update view name
   * @param spaceId - Space ID
   * @param dstId - Datasheet ID
   * @param viewId - View ID
   * @param data - Name update data
   */
  updateName(
    spaceId: string,
    dstId: string,
    viewId: string,
    data: UpdateViewNameRequest
  ): Promise<UpdateViewNameResponse> {
    return apiFetch<UpdateViewNameResponse>(
      `/fusion/v1/spaces/${spaceId}/datasheets/${dstId}/views/${viewId}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Set sort rules for a view
   * @param spaceId - Space ID
   * @param dstId - Datasheet ID
   * @param viewId - View ID
   * @param data - Sort configuration
   */
  setSort(
    spaceId: string,
    dstId: string,
    viewId: string,
    data: SortInfoRequest
  ): Promise<SortInfoResponse> {
    return apiFetch<SortInfoResponse>(
      `/fusion/v1/spaces/${spaceId}/datasheets/${dstId}/views/${viewId}/sort`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Set group rules for a view
   * @param spaceId - Space ID
   * @param dstId - Datasheet ID
   * @param viewId - View ID
   * @param data - Group configuration
   */
  setGroup(
    spaceId: string,
    dstId: string,
    viewId: string,
    data: GroupRequest
  ): Promise<GroupResponse> {
    return apiFetch<GroupResponse>(
      `/fusion/v1/spaces/${spaceId}/datasheets/${dstId}/views/${viewId}/group`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Set hidden fields for a view
   * @param spaceId - Space ID
   * @param dstId - Datasheet ID
   * @param viewId - View ID
   * @param data - Hidden fields configuration
   */
  setHiddenFields(
    spaceId: string,
    dstId: string,
    viewId: string,
    data: HideFieldsRequest
  ): Promise<HideFieldsResponse> {
    return apiFetch<HideFieldsResponse>(
      `/fusion/v1/spaces/${spaceId}/datasheets/${dstId}/views/${viewId}/hidden`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Move view to a new index
   * @param spaceId - Space ID
   * @param dstId - Datasheet ID
   * @param viewId - View ID
   * @param data - Move configuration
   */
  move(
    spaceId: string,
    dstId: string,
    viewId: string,
    data: MoveViewRequest
  ): Promise<MoveViewResponse> {
    return apiFetch<MoveViewResponse>(
      `/fusion/v1/spaces/${spaceId}/datasheets/${dstId}/views/${viewId}/move`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },
};

// ============================================================================
// ATTACHMENTS API
// ============================================================================

export const attachmentsApi = {
  /**
   * Upload a file to a datasheet
   * @param dstId - Datasheet ID
   * @param file - File to upload
   * @param recordId - Optional record ID to attach to
   * @param fieldId - Optional field ID to attach to (requires recordId)
   */
  upload(
    dstId: string,
    file: File,
    recordId?: string,
    fieldId?: string
  ): Promise<UploadAttachmentResponse> {
    const params = new URLSearchParams();
    if (recordId) params.append("recordId", recordId);
    if (fieldId) params.append("fieldId", fieldId);
    const query = params.toString() ? `?${params.toString()}` : "";

    const formData = new FormData();
    formData.append("file", file);

    return apiFetch<UploadAttachmentResponse>(
      `/fusion/v1/datasheets/${dstId}/attachments${query}`,
      {
        method: "POST",
        body: formData,
        headers: {
          // Remove Content-Type to let browser set it with boundary
          "Content-Type": undefined as unknown as string,
        },
      }
    );
  },

  /**
   * Download a file by token
   * @param dstId - Datasheet ID
   * @param token - File token
   * @returns Blob of the file
   */
  async download(dstId: string, token: string): Promise<Blob> {
    const url = `${API_BASE}/fusion/v1/datasheets/${dstId}/attachments?token=${encodeURIComponent(token)}`;
    const response = await fetch(url, {
      headers: {
        Authorization: AUTH_TOKEN,
      },
    });

    if (!response.ok) {
      throw new ApiError(`HTTP Error ${response.status}`, response.status, {});
    }

    return response.blob();
  },

  /**
   * Get download URL for a file
   * @param dstId - Datasheet ID
   * @param token - File token
   * @returns Full download URL
   */
  getDownloadUrl(dstId: string, token: string): string {
    return `${API_BASE}/fusion/v1/datasheets/${dstId}/attachments?token=${encodeURIComponent(token)}`;
  },
};

// ============================================================================
// TIMEMACHINE API
// ============================================================================

export const timemachineApi = {
  /**
   * Get array of deleted record IDs
   * @param dstId - Datasheet ID
   */
  getDeletedRecords(dstId: string): Promise<GetTimeMachineResponse> {
    return apiFetch<GetTimeMachineResponse>(`/fusion/v1/timemachine/${dstId}`);
  },
};

// ============================================================================
// MAIN EXPORT
// ============================================================================

export const tablesMwApi = {
  spaces: spacesApi,
  nodes: nodesApi,
  datasheets: datasheetsApi,
  fields: fieldsApi,
  records: recordsApi,
  views: viewsApi,
  attachments: attachmentsApi,
  timemachine: timemachineApi,
};

export default tablesMwApi;
