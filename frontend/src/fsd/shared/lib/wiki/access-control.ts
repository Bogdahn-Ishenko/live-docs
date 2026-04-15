/**
 * Wiki Page Access Control
 * Manage who can view/comment/edit pages
 */

export type CommentPermission = "everyone" | "creator_only" | "authenticated";
export type EditPermission = "everyone" | "creator_only" | "specific_users";

export interface PageAccessSettings {
  pageId: string;
  commentPermission: CommentPermission;
  editPermission: EditPermission;
  allowedUserIds?: string[]; // for specific_users edit permission
}

// Field names in MWS Tables
export const ACCESS_FIELDS = {
  PAGE_ID: "Page ID",
  COMMENT_PERMISSION: "Comment Permission",
  EDIT_PERMISSION: "Edit Permission",
  ALLOWED_USERS: "Allowed Users",
} as const;

export const PERMISSION_LABELS: Record<CommentPermission | EditPermission, string> = {
  everyone: "Все пользователи",
  creator_only: "Только создатель страницы",
  authenticated: "Только авторизованные",
  specific_users: "Только определенные пользователи",
};

export function parseAccessSettings(record: {
  recordId: string;
  fields: Record<string, unknown>;
}): PageAccessSettings {
  const fields = record.fields;
  
  return {
    pageId: String(fields[ACCESS_FIELDS.PAGE_ID] || ""),
    commentPermission: (fields[ACCESS_FIELDS.COMMENT_PERMISSION] as CommentPermission) || "everyone",
    editPermission: (fields[ACCESS_FIELDS.EDIT_PERMISSION] as EditPermission) || "everyone",
    allowedUserIds: fields[ACCESS_FIELDS.ALLOWED_USERS] 
      ? String(fields[ACCESS_FIELDS.ALLOWED_USERS]).split(",")
      : undefined,
  };
}

export function accessSettingsToFields(settings: Partial<PageAccessSettings>): Record<string, string | null> {
  const fields: Record<string, string | null> = {};
  
  if (settings.pageId !== undefined) fields[ACCESS_FIELDS.PAGE_ID] = settings.pageId;
  if (settings.commentPermission !== undefined) fields[ACCESS_FIELDS.COMMENT_PERMISSION] = settings.commentPermission;
  if (settings.editPermission !== undefined) fields[ACCESS_FIELDS.EDIT_PERMISSION] = settings.editPermission;
  if (settings.allowedUserIds !== undefined) {
    fields[ACCESS_FIELDS.ALLOWED_USERS] = settings.allowedUserIds.join(",");
  }
  
  return fields;
}

// Check if user can comment
export function canComment(
  settings: PageAccessSettings | null,
  userId: string | null,
  creatorId: string
): boolean {
  if (!settings) return true;
  
  switch (settings.commentPermission) {
    case "everyone":
      return true;
    case "creator_only":
      return userId === creatorId;
    case "authenticated":
      return userId !== null;
    default:
      return true;
  }
}

// Check if user can edit
export function canEdit(
  settings: PageAccessSettings | null,
  userId: string | null,
  creatorId: string
): boolean {
  if (!settings) return true;
  
  switch (settings.editPermission) {
    case "everyone":
      return true;
    case "creator_only":
      return userId === creatorId;
    case "specific_users":
      return userId !== null && (settings.allowedUserIds?.includes(userId) || userId === creatorId);
    default:
      return true;
  }
}
