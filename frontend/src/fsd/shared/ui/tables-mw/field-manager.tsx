"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2, Loader2, Database, Settings2, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/fsd/shared/lib/utils";
import { Button } from "@/fsd/shared/ui/button";
import { Input } from "@/fsd/shared/ui/input";
import { Label } from "@/fsd/shared/ui/label";
import { Checkbox } from "@/fsd/shared/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/fsd/shared/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/fsd/shared/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/fsd/shared/ui/accordion";
import { ScrollArea } from "@/fsd/shared/ui/scroll-area";
import type { Field, FieldTypeEnum, FieldProperty } from "@/fsd/shared/lib/tables-mw/api-types";
import {
  useFields,
  useCreateField,
  useDeleteField,
  FIELD_TYPE_OPTIONS,
} from "@/fsd/shared/hooks/tables-mw";

interface FieldManagerProps {
  spaceId: string;
  datasheetId: string;
  className?: string;
}

// Fields that require precision
const PRECISION_TYPES: FieldTypeEnum[] = ["Number", "Currency", "Percent"];

// Fields that require options
const OPTIONS_TYPES: FieldTypeEnum[] = ["SingleSelect", "MultiSelect"];

// Fields that require date format
const DATETIME_TYPES: FieldTypeEnum[] = ["DateTime", "CreatedTime"];

// Fields that require max value
const MAX_TYPES: FieldTypeEnum[] = ["Rating"];

// Date format options
const DATE_FORMATS = [
  "YYYY/MM/DD",
  "YYYY-MM-DD",
  "DD/MM/YYYY",
  "YYYY-MM",
  "MM-DD",
  "YYYY",
  "MM",
  "DD",
];

/**
 * Field Manager Component
 * Manage fields in a datasheet - create, view, delete
 */
export function FieldManager({ spaceId, datasheetId, className }: FieldManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<FieldTypeEnum>("SingleText");
  
  // Property state
  const [precision, setPrecision] = useState<number>(2);
  const [includeTime, setIncludeTime] = useState<boolean>(false);
  const [dateFormat, setDateFormat] = useState<string>("YYYY-MM-DD");
  const [maxRating, setMaxRating] = useState<number>(5);
  const [options, setOptions] = useState<{ name: string; color: string }[]>([]);
  const [newOptionName, setNewOptionName] = useState("");

  const { fields, isLoading, error, refetch } = useFields(datasheetId);
  const { createField, isLoading: isCreating } = useCreateField();
  const { deleteField, isLoading: isDeleting } = useDeleteField();

  const resetForm = () => {
    setNewFieldName("");
    setNewFieldType("SingleText");
    setPrecision(2);
    setIncludeTime(false);
    setDateFormat("YYYY-MM-DD");
    setMaxRating(5);
    setOptions([]);
    setNewOptionName("");
  };

  const buildProperty = (): FieldProperty | undefined => {
    if (PRECISION_TYPES.includes(newFieldType)) {
      return { precision };
    }
    
    if (DATETIME_TYPES.includes(newFieldType)) {
      return { 
        dateFormat, 
        includeTime,
        timeFormat: includeTime ? "HH:mm" : undefined,
      };
    }
    
    if (MAX_TYPES.includes(newFieldType)) {
      return { max: maxRating };
    }
    
    if (OPTIONS_TYPES.includes(newFieldType) && options.length > 0) {
      return { options };
    }
    
    return undefined;
  };

  const handleCreateField = async () => {
    if (!newFieldName.trim()) return;

    const property = buildProperty();
    
    const requestBody: { name: string; type: FieldTypeEnum; property?: FieldProperty } = {
      name: newFieldName.trim(),
      type: newFieldType,
    };
    
    if (property) {
      requestBody.property = property;
    }

    const result = await createField(spaceId, datasheetId, requestBody);

    if (result?.success) {
      toast.success("Поле создано");
      setIsCreateDialogOpen(false);
      resetForm();
      refetch();
    } else {
      toast.error("Ошибка при создании поля");
    }
  };

  const handleDeleteField = async (fieldId: string, fieldName: string) => {
    const confirmed = confirm(`Вы уверены, что хотите удалить поле "${fieldName}"?`);
    if (!confirmed) return;

    const success = await deleteField(spaceId, datasheetId, fieldId);
    if (success) {
      toast.success("Поле удалено");
      refetch();
    } else {
      toast.error("Ошибка при удалении поля");
    }
  };

  const handleAddOption = () => {
    if (newOptionName.trim() && !options.find(o => o.name === newOptionName.trim())) {
      const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F"];
      const randomColor = colors[options.length % colors.length];
      setOptions([...options, { name: newOptionName.trim(), color: randomColor }]);
      setNewOptionName("");
    }
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const getFieldTypeLabel = (type: FieldTypeEnum): string => {
    const option = FIELD_TYPE_OPTIONS.find((o) => o.value === type);
    return option?.label || type;
  };

  const getFieldTypeColor = (type: FieldTypeEnum): string => {
    const colors: Record<string, string> = {
      SingleText: "bg-blue-100 text-blue-800",
      Text: "bg-blue-100 text-blue-800",
      SingleSelect: "bg-purple-100 text-purple-800",
      MultiSelect: "bg-purple-100 text-purple-800",
      Number: "bg-green-100 text-green-800",
      Currency: "bg-green-100 text-green-800",
      Percent: "bg-green-100 text-green-800",
      DateTime: "bg-orange-100 text-orange-800",
      Attachment: "bg-pink-100 text-pink-800",
      Member: "bg-indigo-100 text-indigo-800",
      Checkbox: "bg-gray-100 text-gray-800",
      Rating: "bg-yellow-100 text-yellow-800",
      URL: "bg-cyan-100 text-cyan-800",
      Phone: "bg-cyan-100 text-cyan-800",
      Email: "bg-cyan-100 text-cyan-800",
      OneWayLink: "bg-teal-100 text-teal-800",
      TwoWayLink: "bg-teal-100 text-teal-800",
      MagicLookUp: "bg-violet-100 text-violet-800",
      Formula: "bg-amber-100 text-amber-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  // Check if current type requires additional properties
  const needsPrecision = PRECISION_TYPES.includes(newFieldType);
  const needsOptions = OPTIONS_TYPES.includes(newFieldType);
  const needsDateFormat = DATETIME_TYPES.includes(newFieldType);
  const needsMax = MAX_TYPES.includes(newFieldType);
  const needsProperty = needsPrecision || needsOptions || needsDateFormat || needsMax;

  return (
    <div className={cn("flex flex-col h-full border rounded-lg", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Управление полями</h3>
          <span className="text-sm text-muted-foreground">({fields.length})</span>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Добавить поле
        </Button>
      </div>

      {/* Fields List */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            <p>Ошибка загрузки полей</p>
            <p className="text-sm">{error}</p>
          </div>
        ) : fields.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Нет полей</p>
            <p className="text-sm">Создайте первое поле</p>
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {fields.map((field) => (
              <AccordionItem
                key={field.id}
                value={field.id}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="font-medium">{field.name}</span>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        getFieldTypeColor(field.type)
                      )}
                    >
                      {getFieldTypeLabel(field.type)}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pb-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">ID:</span>
                        <span className="ml-2 font-mono">{field.id}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Тип:</span>
                        <span className="ml-2">{field.type}</span>
                      </div>
                      {field.desc && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Описание:</span>
                          <span className="ml-2">{field.desc}</span>
                        </div>
                      )}
                    </div>

                    {/* Field Properties */}
                    {field.property && Object.keys(field.property).length > 0 && (
                      <div className="bg-muted rounded-md p-3">
                        <p className="text-sm font-medium mb-2">Свойства:</p>
                        <pre className="text-xs overflow-auto">
                          {JSON.stringify(field.property, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteField(field.id, field.name)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Удалить
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </ScrollArea>

      {/* Create Field Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Создать поле</DialogTitle>
            <DialogDescription>
              Добавьте новое поле в таблицу
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Field Name */}
            <div>
              <Label htmlFor="fieldName">Название поля *</Label>
              <Input
                id="fieldName"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                placeholder="Например: Статус заказа"
              />
            </div>

            {/* Field Type */}
            <div>
              <Label htmlFor="fieldType">Тип поля *</Label>
              <Select
                value={newFieldType}
                onValueChange={(v) => setNewFieldType(v as FieldTypeEnum)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {FIELD_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dynamic Property Fields */}
            {needsProperty && (
              <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                <p className="font-medium text-sm">Настройки поля</p>
                
                {/* Precision for Number/Currency/Percent */}
                {needsPrecision && (
                  <div>
                    <Label htmlFor="precision">Точность (количество знаков после запятой)</Label>
                    <Input
                      id="precision"
                      type="number"
                      min={0}
                      max={10}
                      value={precision}
                      onChange={(e) => setPrecision(parseInt(e.target.value) || 0)}
                    />
                  </div>
                )}

                {/* Date Format for DateTime */}
                {needsDateFormat && (
                  <>
                    <div>
                      <Label htmlFor="dateFormat">Формат даты</Label>
                      <Select value={dateFormat} onValueChange={setDateFormat}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DATE_FORMATS.map((format) => (
                            <SelectItem key={format} value={format}>
                              {format}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="includeTime"
                        checked={includeTime}
                        onCheckedChange={(checked) => setIncludeTime(checked === true)}
                      />
                      <Label htmlFor="includeTime" className="cursor-pointer">
                        Включить время
                      </Label>
                    </div>
                  </>
                )}

                {/* Max for Rating */}
                {needsMax && (
                  <div>
                    <Label htmlFor="maxRating">Максимальная оценка</Label>
                    <Input
                      id="maxRating"
                      type="number"
                      min={1}
                      max={10}
                      value={maxRating}
                      onChange={(e) => setMaxRating(parseInt(e.target.value) || 5)}
                    />
                  </div>
                )}

                {/* Options for SingleSelect/MultiSelect */}
                {needsOptions && (
                  <div className="space-y-3">
                    <Label>Варианты выбора</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newOptionName}
                        onChange={(e) => setNewOptionName(e.target.value)}
                        placeholder="Название варианта"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddOption();
                          }
                        }}
                      />
                      <Button type="button" onClick={handleAddOption} variant="secondary" size="sm">
                        Добавить
                      </Button>
                    </div>
                    {options.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {options.map((option, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                            style={{ 
                              backgroundColor: option.color + "30", 
                              color: option.color,
                              border: `1px solid ${option.color}`
                            }}
                          >
                            {option.name}
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(index)}
                              className="hover:opacity-70"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleCreateField}
              disabled={!newFieldName.trim() || isCreating || (needsOptions && options.length === 0)}
            >
              {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
