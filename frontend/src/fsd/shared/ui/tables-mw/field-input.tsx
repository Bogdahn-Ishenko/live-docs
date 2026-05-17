"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import { CalendarIcon, Upload, X, Loader2, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

import { cn } from "@/fsd/shared/lib/utils";
import { Button } from "@/fsd/shared/ui/button";
import { Input } from "@/fsd/shared/ui/input";
import { Textarea } from "@/fsd/shared/ui/textarea";
import { Checkbox } from "@/fsd/shared/ui/checkbox";
import { Label } from "@/fsd/shared/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/fsd/shared/ui/popover";
import { Calendar } from "@/fsd/shared/ui/calendar";
import type { FieldType } from "@/fsd/shared/lib/tables-mw/types";
import type { FieldValue, Attachment, Member } from "@/fsd/shared/lib/tables-mw/api-types";
import { detectFieldType, collectFieldMetadata } from "@/fsd/shared/lib/tables-mw/field-detector";
import { normalizeAttachmentUrl } from "@/fsd/shared/ui/tables-mw/field-display";

export interface FieldInputProps {
  fieldName: string;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
  allRecords?: { fields: Record<string, FieldValue> }[];
  datasheetId?: string;
  className?: string;
}

export function FieldInput({ 
  fieldName, 
  value, 
  onChange, 
  allRecords,
  datasheetId,
  className 
}: FieldInputProps) {
  const fieldType = useMemo(() => {
    if (allRecords && allRecords.length > 0) {
      const metadata = collectFieldMetadata(allRecords);
      const meta = metadata.get(fieldName);
      if (meta) return meta.type;
    }
    return detectFieldType(fieldName, value);
  }, [fieldName, value, allRecords]);

  const options = useMemo(() => {
    if (!allRecords) return undefined;
    const metadata = collectFieldMetadata(allRecords);
    return metadata.get(fieldName)?.options;
  }, [fieldName, allRecords]);

  return (
    <div className={className}>
      <FieldInputByType
        fieldType={fieldType}
        fieldName={fieldName}
        value={value}
        onChange={onChange}
        options={options}
        datasheetId={datasheetId}
      />
    </div>
  );
}

interface FieldInputByTypeProps {
  fieldType: FieldType;
  fieldName: string;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
  options?: string[];
  datasheetId?: string;
}

function FieldInputByType({
  fieldType,
  fieldName,
  value,
  onChange,
  options,
  datasheetId,
}: FieldInputByTypeProps) {
  switch (fieldType) {
    case "text":
      return (
        <Input
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Введите ${fieldName}`}
        />
      );

    case "multiline_text":
      return (
        <Textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Введите ${fieldName}`}
          rows={4}
        />
      );

    case "number":
    case "currency":
    case "percent":
      return (
        <NumberInput
          value={value as number | null}
          onChange={onChange}
          fieldType={fieldType}
        />
      );

    case "rating":
      return (
        <RatingInput
          value={(value as number) ?? 0}
          onChange={onChange}
        />
      );

    case "date":
      return (
        <DateInput
          value={value as number | null}
          onChange={onChange}
        />
      );

    case "checkbox":
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={(value as boolean) ?? false}
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          <Label className="cursor-pointer">Да</Label>
        </div>
      );

    case "email":
      return (
        <Input
          type="email"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`email@example.com`}
        />
      );

    case "phone":
      return (
        <Input
          type="tel"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`+7 (999) 999-99-99`}
        />
      );

    case "url":
      return (
        <UrlInput
          value={value as { title: string; text: string; favicon: string } | null}
          onChange={onChange}
        />
      );

    case "single_select":
      return (
        <SingleSelectInput
          value={(value as string) ?? ""}
          onChange={onChange}
          options={options ?? []}
        />
      );

    case "multi_select":
      return (
        <MultiSelectInput
          value={(value as string[]) ?? []}
          onChange={onChange}
          options={options ?? []}
        />
      );

    case "single_link":
      return (
        <LinkInput
          value={(value as string) ?? ""}
          onChange={onChange}
          placeholder="recXXXXXXXXXXXX"
        />
      );

    case "multi_link":
      return (
        <MultiLinkInput
          value={(value as string[]) ?? []}
          onChange={onChange}
        />
      );

    case "attachment":
      return (
        <AttachmentInput
          value={(value as Attachment[]) ?? []}
          onChange={onChange}
          datasheetId={datasheetId}
        />
      );

    case "member":
      return (
        <MemberInput
          value={(value as Member[]) ?? []}
          onChange={onChange}
          disabled
        />
      );

    default:
      return (
        <Input
          value={value !== null && value !== undefined ? String(value) : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Введите ${fieldName}`}
        />
      );
  }
}

// Individual input components

function NumberInput({
  value,
  onChange,
  fieldType,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  fieldType: "number" | "currency" | "percent";
}) {
  const displayValue = value === null || value === undefined ? "" : String(value);
  
  const suffix = fieldType === "percent" ? "%" : "";

  return (
    <div className="relative">
      <Input
        type="number"
        step={fieldType === "currency" ? "0.01" : fieldType === "percent" ? "0.01" : "any"}
        value={displayValue}
        onChange={(e) => {
          const val = e.target.value === "" ? null : parseFloat(e.target.value);
          onChange(val);
        }}
        className={suffix ? "pr-8" : ""}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
}

function RatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }, (_, i) => {
        const starValue = i + 1;
        const isFilled = (hoverValue !== null ? hoverValue : value) >= starValue;

        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(starValue)}
            onMouseEnter={() => setHoverValue(starValue)}
            onMouseLeave={() => setHoverValue(null)}
            className="p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            <svg
              className={cn(
                "w-6 h-6 transition-colors",
                isFilled ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
              )}
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="1"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

function DateInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const date = useMemo(() => {
    if (!value) return undefined;
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }, [value]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP", { locale: ru }) : "Выберите дату"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => onChange(d ? d.getTime() : null)}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function UrlInput({
  value,
  onChange,
}: {
  value: { title: string; text: string; favicon: string } | null;
  onChange: (value: { title: string; text: string; favicon: string }) => void;
}) {
  return (
    <div className="space-y-2">
      <Input
        placeholder="https://example.com"
        value={value?.text ?? ""}
        onChange={(e) =>
          onChange({
            title: e.target.value,
            text: e.target.value,
            favicon: "",
          })
        }
      />
    </div>
  );
}

function SingleSelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
    >
      <option value="">—</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function MultiSelectInput({
  value,
  onChange,
  options,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  options: string[];
}) {
  // Ensure value is always an array
  const safeValue = Array.isArray(value) ? value : [];
  
  const toggleOption = useCallback((opt: string) => {
    if (safeValue.includes(opt)) {
      onChange(safeValue.filter((v) => v !== opt));
    } else {
      onChange([...safeValue, opt]);
    }
  }, [safeValue, onChange]);

  return (
    <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px]">
      {options.length === 0 ? (
        <span className="text-sm text-muted-foreground">Нет доступных опций</span>
      ) : (
        options.map((opt) => {
          const isSelected = safeValue.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggleOption(opt)}
              className={cn(
                "px-2 py-1 rounded-full text-xs font-medium transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {opt}
            </button>
          );
        })
      )}
    </div>
  );
}

function LinkInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || "recXXXXXXXXXXXX"}
      pattern="rec[A-Za-z0-9]+"
    />
  );
}

function MultiLinkInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  
  // Ensure value is always an array
  const safeValue = Array.isArray(value) ? value : [];

  const addLink = useCallback(() => {
    if (inputValue.trim() && !safeValue.includes(inputValue.trim())) {
      onChange([...safeValue, inputValue.trim()]);
      setInputValue("");
    }
  }, [inputValue, safeValue, onChange]);

  const removeLink = useCallback((link: string) => {
    onChange(safeValue.filter((v) => v !== link));
  }, [safeValue, onChange]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="recXXXXXXXXXXXX"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addLink();
            }
          }}
        />
        <Button type="button" onClick={addLink} variant="secondary">
          Добавить
        </Button>
      </div>
      <div className="flex flex-wrap gap-1">
        {safeValue.map((link) => (
          <span
            key={link}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-muted"
          >
            {link}
            <button
              type="button"
              onClick={() => removeLink(link)}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function AttachmentInput({
  value,
  onChange,
  datasheetId,
}: {
  value: Attachment[];
  onChange: (value: Attachment[]) => void;
  datasheetId?: string;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Ensure value is always an array
  const safeValue = Array.isArray(value) ? value : [];

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !datasheetId) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/tables-mw/attachments?datasheetId=${datasheetId}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const result = await response.json();
      if (result.success && result.data) {
        const newAttachment: Attachment = result.data;
        onChange([...safeValue, newAttachment]);
      }
    } catch (error) {
      console.error("Failed to upload file:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [datasheetId, safeValue, onChange]);

  const removeAttachment = useCallback((idOrToken: string) => {
    onChange(safeValue.filter((a) => (a.id || a.token) !== idOrToken));
  }, [safeValue, onChange]);

  return (
    <div className="space-y-2">
      {safeValue.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((attachment, index) => (
            <div
              key={attachment.id || attachment.token || `attachment-${index}`}
              className="relative group inline-flex items-center gap-2 px-2 py-1 rounded-md bg-muted"
            >
              {attachment.mimeType?.startsWith("image/") ? (
                <div className="w-8 h-8 rounded overflow-hidden">
                  <img
                    src={normalizeAttachmentUrl(attachment.url)}
                    alt={attachment.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
              <span className="text-sm truncate max-w-[120px]">{attachment.name}</span>
              <button
                type="button"
                onClick={() => removeAttachment(attachment.id || attachment.token || "")}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading || !datasheetId}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || !datasheetId}
          className="gap-1"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Загрузка...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Добавить файл
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function MemberInput({
  value,
  disabled,
}: {
  value: Member[];
  onChange: (value: Member[]) => void;
  disabled?: boolean;
}) {
  // Ensure value is always an array
  const safeValue = Array.isArray(value) ? value : [];
  
  if (safeValue.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {safeValue.map((member) => (
        <div
          key={member.id}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-sm"
          title={member.email}
        >
          <span className="font-medium">{member.name}</span>
          {disabled && <span className="text-xs text-muted-foreground">(только чтение)</span>}
        </div>
      ))}
    </div>
  );
}

export { collectFieldMetadata };
