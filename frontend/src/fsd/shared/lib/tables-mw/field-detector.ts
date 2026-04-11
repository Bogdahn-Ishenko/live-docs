import type { FieldType, FieldValue, Attachment, Member, UrlObject } from "./types";

/**
 * Detect field type based on value and field name heuristics
 */
export function detectFieldType(
  fieldName: string,
  value: FieldValue,
  allValues: FieldValue[] = []
): FieldType {
  // Null/undefined check
  if (value === null || value === undefined) {
    // Try to infer from field name
    return detectTypeFromFieldName(fieldName);
  }

  const type = typeof value;

  // Boolean -> checkbox
  if (type === "boolean") {
    return "checkbox";
  }

  // Number detection
  if (type === "number") {
    const numValue = value as number;
    
    // Check if it looks like a timestamp (milliseconds since epoch)
    // Typical range: 1970-2030 in milliseconds
    if (numValue > 100000000000 && numValue < 2000000000000) {
      return "date";
    }
    
    // Check field name hints for currency/percent
    const lowerName = fieldName.toLowerCase();
    if (lowerName.includes("валюта") || lowerName.includes("currency") || lowerName.includes("цена") || lowerName.includes("сумма")) {
      return "currency";
    }
    if (lowerName.includes("процент") || lowerName.includes("percent") || lowerName.includes("%")) {
      return "percent";
    }
    if (lowerName.includes("рейтинг") || lowerName.includes("rating") || lowerName.includes("оценка")) {
      return "rating";
    }
    
    return "number";
  }

  // Array detection
  if (Array.isArray(value)) {
    if (value.length === 0) {
      // Try to infer from field name
      return detectTypeFromFieldName(fieldName);
    }

    const firstItem = value[0];
    
    // Array of objects
    if (typeof firstItem === "object" && firstItem !== null) {
      // Check for Attachment
      if (isAttachment(firstItem)) {
        return "attachment";
      }
      // Check for Member
      if (isMember(firstItem)) {
        return "member";
      }
    }
    
    // Array of strings -> multi_select or multi_link
    if (typeof firstItem === "string") {
      // Check if strings look like record IDs (typically start with "rec")
      if (firstItem.startsWith("rec")) {
        return "multi_link";
      }
      return "multi_select";
    }
    
    return "unknown";
  }

  // Object detection
  if (type === "object" && value !== null) {
    if (isUrlObject(value)) {
      return "url";
    }
    return "unknown";
  }

  // String detection
  if (type === "string") {
    const strValue = value as string;
    const lowerName = fieldName.toLowerCase();

    // Check for multiline text (contains \n)
    if (strValue.includes("\n")) {
      return "multiline_text";
    }

    // Check for email
    if (lowerName.includes("почта") || lowerName.includes("email")) {
      return "email";
    }

    // Check for phone
    if (lowerName.includes("телефон") || lowerName.includes("phone")) {
      return "phone";
    }

    // Check for URL in value or field name
    if (isValidUrl(strValue) || lowerName.includes("url") || lowerName.includes("ссылка")) {
      // If it's a single line and looks like record ID reference
      if (strValue.startsWith("rec")) {
        return "single_link";
      }
    }

    // Check for single select (single word/short value, but not a number)
    // Heuristic: if all values in this column are short and similar
    if (allValues.length > 0) {
      const nonEmptyValues = allValues.filter((v): v is string => 
        typeof v === "string" && v.length > 0
      );
      const avgLength = nonEmptyValues.reduce((sum, v) => sum + v.length, 0) / nonEmptyValues.length;
      // If average length is short and values don't contain newlines -> single_select
      if (avgLength < 30 && !nonEmptyValues.some(v => v.includes("\n"))) {
        return "single_select";
      }
    }

    return "text";
  }

  return "unknown";
}

/**
 * Detect type based on field name patterns
 */
function detectTypeFromFieldName(fieldName: string): FieldType {
  const lower = fieldName.toLowerCase();
  
  if (lower.includes("почта") || lower.includes("email")) return "email";
  if (lower.includes("телефон") || lower.includes("phone")) return "phone";
  if (lower.includes("url") || lower.includes("ссылка")) return "url";
  if (lower.includes("рейтинг") || lower.includes("rating")) return "rating";
  if (lower.includes("чекбокс") || lower.includes("checkbox") || lower.includes("флаг")) return "checkbox";
  if (lower.includes("дата") || lower.includes("date")) return "date";
  if (lower.includes("валюта") || lower.includes("currency")) return "currency";
  if (lower.includes("процент") || lower.includes("percent")) return "percent";
  if (lower.includes("номер") && lower.includes("телефон")) return "phone";
  if (lower.includes("вложения") || lower.includes("attachments")) return "attachment";
  if (lower.includes("участник") || lower.includes("member")) return "member";
  if (lower.includes("текст") && (lower.includes("длинный") || lower.includes("многострочный"))) return "multiline_text";
  
  return "text";
}

/**
 * Check if value is an Attachment object
 */
function isAttachment(value: unknown): value is Attachment {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value &&
    "url" in value &&
    typeof (value as Attachment).id === "string" &&
    typeof (value as Attachment).name === "string" &&
    typeof (value as Attachment).url === "string"
  );
}

/**
 * Check if value is a Member object
 */
function isMember(value: unknown): value is Member {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "type" in value &&
    "name" in value &&
    (value as Member).type === "Member"
  );
}

/**
 * Check if value is a UrlObject
 */
function isUrlObject(value: unknown): value is UrlObject {
  return (
    typeof value === "object" &&
    value !== null &&
    "title" in value &&
    "text" in value &&
    typeof (value as UrlObject).title === "string" &&
    typeof (value as UrlObject).text === "string"
  );
}

/**
 * Check if string is a valid URL
 */
function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Collect field metadata from all records
 */
export function collectFieldMetadata(
  records: { fields: Record<string, FieldValue> }[]
): Map<string, FieldMetadata> {
  const metadata = new Map<string, FieldMetadata>();
  const fieldValues = new Map<string, FieldValue[]>();

  // Collect all values for each field
  for (const record of records) {
    for (const [fieldName, value] of Object.entries(record.fields)) {
      if (!fieldValues.has(fieldName)) {
        fieldValues.set(fieldName, []);
      }
      fieldValues.get(fieldName)!.push(value);
    }
  }

  // Detect type for each field
  for (const [fieldName, values] of fieldValues) {
    // Use first non-null value for detection
    const firstNonNull = values.find(v => v !== null && v !== undefined);
    const type = detectFieldType(fieldName, firstNonNull ?? null, values);
    
    // Collect options for select fields
    let options: string[] | undefined;
    if (type === "single_select" || type === "multi_select") {
      const optionSet = new Set<string>();
      for (const value of values) {
        if (typeof value === "string" && value) {
          optionSet.add(value);
        } else if (Array.isArray(value)) {
          for (const item of value) {
            if (typeof item === "string") {
              optionSet.add(item);
            }
          }
        }
      }
      options = Array.from(optionSet).sort();
    }

    metadata.set(fieldName, {
      name: fieldName,
      type,
      options,
    });
  }

  return metadata;
}

// FieldMetadata interface
export interface FieldMetadata {
  name: string;
  type: FieldType;
  options?: string[];
}
