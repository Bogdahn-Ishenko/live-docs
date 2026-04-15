"use client";

import { useMemo } from "react";
import { FileText, Image, Paperclip, Link2, Check, Star, Phone, Mail, ExternalLink, User } from "lucide-react";

import { cn } from "@/fsd/shared/lib/utils";
import type { FieldType } from "@/fsd/shared/lib/tables-mw/types";
import type { FieldValue, Attachment, Member, UrlObject } from "@/fsd/shared/lib/tables-mw/api-types";
import { detectFieldType } from "@/fsd/shared/lib/tables-mw/field-detector";

export interface FieldDisplayProps {
  fieldName: string;
  value: FieldValue;
  className?: string;
  compact?: boolean;
}

export function FieldDisplay({ fieldName, value, className, compact = false }: FieldDisplayProps) {
  const fieldType = useMemo(() => 
    detectFieldType(fieldName, value),
    [fieldName, value]
  );

  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }

  switch (fieldType) {
    case "attachment":
      return <AttachmentDisplay value={value as Attachment[]} className={className} compact={compact} />;
    case "member":
      return <MemberDisplay value={value as Member[]} className={className} />;
    case "url":
      return <UrlDisplay value={value as UrlObject} className={className} />;
    case "checkbox":
      return <CheckboxDisplay value={value as boolean} className={className} />;
    case "rating":
      return <RatingDisplay value={value as number} className={className} />;
    case "date":
      return <DateDisplay value={value as number} className={className} />;
    case "percent":
      return <PercentDisplay value={value as number} className={className} />;
    case "currency":
      return <CurrencyDisplay value={value as number} className={className} />;
    case "email":
      return <EmailDisplay value={value as string} className={className} />;
    case "phone":
      return <PhoneDisplay value={value as string} className={className} />;
    case "multi_select":
      return <MultiSelectDisplay value={value as string[]} className={className} />;
    case "single_select":
      return <SingleSelectDisplay value={value as string} className={className} />;
    case "single_link":
      return <LinkDisplay value={value as string} className={className} />;
    case "multi_link":
      return <MultiLinkDisplay value={value as string[]} className={className} />;
    case "multiline_text":
      return <MultilineTextDisplay value={value as string} className={className} />;
    case "number":
      return <NumberDisplay value={value as number} className={className} />;
    default:
      return <TextDisplay value={String(value)} className={className} />;
  }
}

// Individual display components

function TextDisplay({ value, className }: { value: string; className?: string }) {
  return <span className={cn("text-sm", className)}>{value}</span>;
}

function MultilineTextDisplay({ value, className }: { value: string; className?: string }) {
  return (
    <div className={cn("text-sm whitespace-pre-wrap max-h-24 overflow-y-auto", className)}>
      {value}
    </div>
  );
}

function NumberDisplay({ value, className }: { value: number; className?: string }) {
  return <span className={cn("text-sm tabular-nums", className)}>{value.toLocaleString("ru-RU")}</span>;
}

function CurrencyDisplay({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("text-sm tabular-nums font-medium", className)}>
      {value.toLocaleString("ru-RU", { style: "currency", currency: "RUB" })}
    </span>
  );
}

function PercentDisplay({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("text-sm tabular-nums", className)}>
      {value}%
    </span>
  );
}

function DateDisplay({ value, className }: { value: number; className?: string }) {
  const date = useMemo(() => {
    try {
      return new Date(value);
    } catch {
      return null;
    }
  }, [value]);

  if (!date || isNaN(date.getTime())) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <span className={cn("text-sm tabular-nums", className)}>
      {date.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>
  );
}

function CheckboxDisplay({ value, className }: { value: boolean; className?: string }) {
  return (
    <div className={cn("flex justify-center", className)}>
      {value ? (
        <div className="w-5 h-5 bg-primary rounded flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
      ) : (
        <div className="w-5 h-5 border-2 border-muted-foreground/30 rounded" />
      )}
    </div>
  );
}

function RatingDisplay({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("flex gap-0.5", className)}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "w-4 h-4",
            i < value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}

function UrlDisplay({ value, className }: { value: UrlObject; className?: string }) {
  return (
    <a
      href={value.text}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "text-sm text-primary hover:underline inline-flex items-center gap-1",
        className
      )}
    >
      {value.title || value.text}
      <ExternalLink className="w-3 h-3" />
    </a>
  );
}

function EmailDisplay({ value, className }: { value: string; className?: string }) {
  return (
    <a
      href={`mailto:${value}`}
      className={cn(
        "text-sm text-primary hover:underline inline-flex items-center gap-1",
        className
      )}
    >
      <Mail className="w-3.5 h-3.5" />
      {value}
    </a>
  );
}

function PhoneDisplay({ value, className }: { value: string; className?: string }) {
  return (
    <a
      href={`tel:${value.replace(/\s/g, "")}`}
      className={cn(
        "text-sm text-primary hover:underline inline-flex items-center gap-1",
        className
      )}
    >
      <Phone className="w-3.5 h-3.5" />
      {value}
    </a>
  );
}

function SingleSelectDisplay({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground",
      className
    )}>
      {value}
    </span>
  );
}

function MultiSelectDisplay({ value, className }: { value: string[]; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {value.map((item, index) => (
        <span
          key={index}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function LinkDisplay({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-sm text-primary",
      className
    )}>
      <Link2 className="w-3.5 h-3.5" />
      {value}
    </span>
  );
}

function MultiLinkDisplay({ value, className }: { value: string[]; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {value.map((item, index) => (
        <span
          key={index}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground"
        >
          <Link2 className="w-3 h-3" />
          {item}
        </span>
      ))}
    </div>
  );
}

function MemberDisplay({ value, className }: { value: Member[]; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {value.map((member) => (
        <div
          key={member.id}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted"
          title={member.email}
        >
          <User className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm">{member.name}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Normalize attachment URL to use correct domain
 */
function normalizeAttachmentUrl(url: string | undefined): string {
  if (!url) return "";
  
  // If URL is already absolute with tables.mws.ru, return as-is
  if (url.startsWith("https://tables.mws.ru")) {
    return url;
  }
  
  // If URL starts with localhost or relative path, convert to absolute
  if (url.startsWith("http://localhost") || url.startsWith("https://localhost")) {
    // Extract path after localhost:port
    const pathMatch = url.match(/https?:\/\/localhost:\d+(\/.*)/);
    if (pathMatch) {
      return `https://tables.mws.ru${pathMatch[1]}`;
    }
  }
  
  // If URL is relative (starts with /)
  if (url.startsWith("/")) {
    return `https://tables.mws.ru${url}`;
  }
  
  // If URL starts with attachment/ or other path without leading slash
  if (url.startsWith("attachment/")) {
    return `https://tables.mws.ru/${url}`;
  }
  
  return url;
}

function AttachmentDisplay({ value, className, compact = false }: { value: Attachment[]; className?: string; compact?: boolean }) {
  const images = value.filter(a => a.mimeType?.startsWith("image/"));
  const files = value.filter(a => !a.mimeType?.startsWith("image/"));

  if (compact) {
    // Compact view for table cells - show small thumbnails
    return (
      <div className={cn("flex flex-wrap gap-1", className)}>
        {images.slice(0, 3).map((img, index) => (
          <a
            key={img.id || index}
            href={normalizeAttachmentUrl(img.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="relative group"
            title={img.name}
          >
            <div className="w-8 h-8 rounded border overflow-hidden bg-muted">
              <img
                src={normalizeAttachmentUrl(img.url)}
                alt={img.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </a>
        ))}
        {images.length > 3 && (
          <span className="w-8 h-8 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">
            +{images.length - 3}
          </span>
        )}
        {files.slice(0, 2).map((file, index) => (
          <a
            key={file.id || index}
            href={normalizeAttachmentUrl(file.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-xs"
            title={`${file.name} (${formatFileSize(file.size)})`}
          >
            <Paperclip className="w-3 h-3" />
            <span className="truncate max-w-[60px]">{file.name}</span>
          </a>
        ))}
        {files.length > 2 && (
          <span className="text-xs text-muted-foreground">+{files.length - 2}</span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, index) => (
            <a
              key={img.id || index}
              href={normalizeAttachmentUrl(img.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="relative group"
              title={img.name}
            >
              <div className="w-16 h-16 rounded-lg border overflow-hidden bg-muted">
                <img
                  src={normalizeAttachmentUrl(img.url)}
                  alt={img.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              {img.width && img.height && (
                <span className="absolute bottom-0.5 right-0.5 text-[10px] bg-black/50 text-white px-1 rounded">
                  {img.width}×{img.height}
                </span>
              )}
            </a>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {files.map((file, index) => (
            <a
              key={file.id || index}
              href={normalizeAttachmentUrl(file.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-sm"
              title={`${file.name} (${formatFileSize(file.size)})`}
            >
              {getFileIcon(file.mimeType)}
              <span className="truncate max-w-[120px]">{file.name}</span>
              <span className="text-xs text-muted-foreground">({formatFileSize(file.size)})</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function getFileIcon(mimeType: string) {
  if (mimeType?.startsWith("image/")) return <Image className="w-4 h-4" />;
  if (mimeType?.includes("pdf")) return <FileText className="w-4 h-4 text-red-500" />;
  return <Paperclip className="w-4 h-4" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// Export display components for individual use
export {
  AttachmentDisplay,
  normalizeAttachmentUrl,
  MemberDisplay,
  UrlDisplay,
  CheckboxDisplay,
  RatingDisplay,
  DateDisplay,
  PercentDisplay,
  CurrencyDisplay,
  EmailDisplay,
  PhoneDisplay,
  MultiSelectDisplay,
  SingleSelectDisplay,
  LinkDisplay,
  MultiLinkDisplay,
  MultilineTextDisplay,
  NumberDisplay,
  TextDisplay,
};
