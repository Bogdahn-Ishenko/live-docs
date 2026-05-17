"use client";

import { useState, useCallback } from "react";
import { 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  Table, 
  Database,
  RefreshCw,
  Plus,
  Trash2,
  Loader2,
  X,
  Check,
  FileJson,
  Grid3X3
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/fsd/shared/lib/utils";
import { Button } from "@/fsd/shared/ui/button";
import { Input } from "@/fsd/shared/ui/input";
import { Label } from "@/fsd/shared/ui/label";
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
import { ScrollArea } from "@/fsd/shared/ui/scroll-area";
import { Separator } from "@/fsd/shared/ui/separator";
import type { Space, Node, View, Field, CreateViewRequestBody } from "@/fsd/shared/lib/tables-mw/api-types";
import {
  useSpaces,
  useNodes,
  useCreateDatasheet,
  useDeleteNode,
  useViews,
  useFields,
  VIEW_TYPE_OPTIONS,
  useCreateView,
} from "@/fsd/shared/hooks/tables-mw";

interface TablesBrowserProps {
  onSelectDatasheet?: (spaceId: string, datasheet: Node, views: View[], fields: Field[]) => void;
  className?: string;
}

/**
 * Tables Browser Component
 * Browse spaces, folders, and datasheets
 */
export function TablesBrowser({ onSelectDatasheet, className }: TablesBrowserProps) {
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedDatasheet, setSelectedDatasheet] = useState<Node | null>(null);
  
  // Create datasheet dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDatasheetName, setNewDatasheetName] = useState("");
  
  // Create view dialog
  const [isCreateViewDialogOpen, setIsCreateViewDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [newViewType, setNewViewType] = useState("Grid");

  // Hooks
  const { spaces, isLoading: isLoadingSpaces, refetch: refetchSpaces } = useSpaces();
  const { nodes, isLoading: isLoadingNodes, refetch: refetchNodes } = useNodes(
    selectedSpace?.id || null
  );
  const { createDatasheet, isLoading: isCreating } = useCreateDatasheet();
  const { deleteNode, isLoading: isDeleting } = useDeleteNode();
  const { views, isLoading: isLoadingViews, refetch: refetchViews } = useViews(
    selectedDatasheet?.id || null
  );
  const { fields, isLoading: isLoadingFields, refetch: refetchFields } = useFields(
    selectedDatasheet?.id || null
  );
  const { createView, isLoading: isCreatingView } = useCreateView();

  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleSelectSpace = useCallback((space: Space) => {
    setSelectedSpace(space);
    setSelectedDatasheet(null);
    setExpandedNodes(new Set());
  }, []);

  const handleSelectDatasheet = useCallback((node: Node) => {
    setSelectedDatasheet(node);
    // Auto-expand to load views and fields
  }, []);

  const handleCreateDatasheet = async () => {
    if (!selectedSpace || !newDatasheetName.trim()) return;

    const result = await createDatasheet(selectedSpace.id, {
      name: newDatasheetName.trim(),
    });

    if (result?.success) {
      toast.success("Таблица создана");
      setIsCreateDialogOpen(false);
      setNewDatasheetName("");
      refetchNodes();
    } else {
      toast.error("Ошибка при создании таблицы");
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!selectedSpace) return;

    const confirmed = confirm("Вы уверены, что хотите удалить этот элемент?");
    if (!confirmed) return;

    const success = await deleteNode(selectedSpace.id, nodeId);
    if (success) {
      toast.success("Элемент удален");
      if (selectedDatasheet?.id === nodeId) {
        setSelectedDatasheet(null);
      }
      refetchNodes();
    } else {
      toast.error("Ошибка при удалении");
    }
  };

  const handleCreateView = async () => {
    if (!selectedSpace || !selectedDatasheet || !newViewName.trim()) return;

    const viewType = newViewType as "Grid" | "Kanban" | "Gantt" | "Architecture" | "Gallery" | "Calendar";
    
    let viewData: CreateViewRequestBody;
    if (viewType === "Grid") {
      viewData = { name: newViewName.trim(), properties: { type: "Grid" } };
    } else if (viewType === "Gallery") {
      viewData = { name: newViewName.trim(), properties: { type: "Gallery" } };
    } else if (viewType === "Kanban") {
      viewData = { 
        name: newViewName.trim(), 
        properties: { type: "Kanban", settings: { groupFieldId: "" } } 
      };
    } else if (viewType === "Gantt") {
      viewData = { 
        name: newViewName.trim(), 
        properties: { type: "Gantt", settings: { startFieldId: "" } } 
      };
    } else if (viewType === "Calendar") {
      viewData = { 
        name: newViewName.trim(), 
        properties: { type: "Calendar", settings: { startFieldId: "" } } 
      };
    } else {
      viewData = { 
        name: newViewName.trim(), 
        properties: { type: "Architecture", settings: { linkFieldId: "" } } 
      };
    }

    const result = await createView(selectedSpace.id, selectedDatasheet.id, viewData);
    if (result?.success) {
      toast.success("Представление создано");
      setIsCreateViewDialogOpen(false);
      setNewViewName("");
      refetchViews();
    } else {
      toast.error("Ошибка при создании представления");
    }
  };

  const handleInsertToEditor = () => {
    if (selectedSpace && selectedDatasheet && onSelectDatasheet) {
      onSelectDatasheet(selectedSpace.id, selectedDatasheet, views, fields);
    }
  };

  // Build tree structure from flat nodes
  const buildTree = (nodes: Node[]): Node[] => {
    const nodeMap = new Map<string, Node & { children?: Node[] }>();
    const rootNodes: Node[] = [];

    // First pass: create map
    for (const node of nodes) {
      nodeMap.set(node.id, { ...node, children: [] });
    }

    // Second pass: build tree
    for (const node of nodes) {
      const nodeWithChildren = nodeMap.get(node.id);
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          const childNode = nodeMap.get(child.id);
          if (childNode && nodeWithChildren) {
            nodeWithChildren.children = nodeWithChildren.children || [];
            nodeWithChildren.children.push(childNode);
          }
        }
      }
      // If node has no parent in the list, it's a root node
      const hasParent = nodes.some(n => 
        n.children?.some(c => c.id === node.id)
      );
      if (!hasParent) {
        rootNodes.push(nodeMap.get(node.id)!);
      }
    }

    return rootNodes;
  };

  const treeNodes = buildTree(nodes);

  const renderNode = (node: Node, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedDatasheet?.id === node.id;
    const hasChildren = node.children && node.children.length > 0;
    const isDatasheet = node.type === "Datasheet";

    return (
      <div key={node.id}>
        <div
          className={cn(
            "flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent",
            isSelected && "bg-accent",
            depth > 0 && "ml-4"
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => {
            if (isDatasheet) {
              handleSelectDatasheet(node);
            } else if (hasChildren) {
              toggleNode(node.id);
            }
          }}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="p-0.5 hover:bg-accent rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}
          
          {isDatasheet ? (
            <Table className="w-4 h-4 text-primary" />
          ) : (
            <Folder className="w-4 h-4 text-yellow-500" />
          )}
          
          <span className="flex-1 text-sm truncate">{node.name}</span>
          
          {isDatasheet && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteNode(node.id);
              }}
              className="p-1 opacity-0 group-hover:opacity-100 hover:text-destructive"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
        
        {isExpanded && hasChildren && (
          <div>
            {node.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("flex h-full border rounded-lg overflow-hidden", className)}>
      {/* Spaces Sidebar */}
      <div className="w-48 border-r bg-muted/30 flex flex-col">
        <div className="p-3 border-b flex items-center justify-between">
          <span className="font-medium text-sm">Пространства</span>
          <Button variant="ghost" size="icon-xs" onClick={refetchSpaces}>
            <RefreshCw className={cn("w-3.5 h-3.5", isLoadingSpaces && "animate-spin")} />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {spaces.map((space) => (
              <button
                key={space.id}
                onClick={() => handleSelectSpace(space)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left hover:bg-accent",
                  selectedSpace?.id === space.id && "bg-accent"
                )}
              >
                <Database className="w-4 h-4 text-muted-foreground" />
                <span className="flex-1 truncate">{space.name}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Nodes Tree */}
      <div className="w-64 border-r bg-muted/30 flex flex-col">
        <div className="p-3 border-b flex items-center justify-between">
          <span className="font-medium text-sm">Элементы</span>
          <div className="flex gap-1">
            {selectedSpace && (
              <Button 
                variant="ghost" 
                size="icon-xs" 
                onClick={() => setIsCreateDialogOpen(true)}
                title="Создать таблицу"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon-xs" onClick={refetchNodes}>
              <RefreshCw className={cn("w-3.5 h-3.5", isLoadingNodes && "animate-spin")} />
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2">
            {!selectedSpace ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                Выберите пространство
              </div>
            ) : isLoadingNodes ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : treeNodes.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                Нет элементов
              </div>
            ) : (
              treeNodes.map((node) => renderNode(node))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Datasheet Details */}
      <div className="flex-1 flex flex-col bg-background">
        {selectedDatasheet ? (
          <>
            <div className="p-4 border-b">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{selectedDatasheet.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    ID: {selectedDatasheet.id}
                  </p>
                </div>
                <Button onClick={handleInsertToEditor} className="gap-2">
                  <FileJson className="w-4 h-4" />
                  Вставить в редактор
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              {/* Views Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Grid3X3 className="w-4 h-4" />
                    Представления ({views.length})
                  </h4>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsCreateViewDialogOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Добавить
                  </Button>
                </div>
                
                {isLoadingViews ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : views.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-2">
                    Нет представлений
                  </div>
                ) : (
                  <div className="space-y-1">
                    {views.map((view) => (
                      <div
                        key={view.id}
                        className="flex items-center justify-between px-3 py-2 rounded-md border"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{view.name}</span>
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {view.type}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">{view.id}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              {/* Fields Section */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Поля ({fields.length})
                </h4>
                
                {isLoadingFields ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : fields.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-2">
                    Нет полей
                  </div>
                ) : (
                  <div className="space-y-1">
                    {fields.map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center justify-between px-3 py-2 rounded-md border"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{field.name}</span>
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {field.type}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">{field.id}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Выберите таблицу для просмотра деталей</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Datasheet Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать таблицу</DialogTitle>
            <DialogDescription>
              Введите название для новой таблицы в пространстве "{selectedSpace?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="name">Название</Label>
            <Input
              id="name"
              value={newDatasheetName}
              onChange={(e) => setNewDatasheetName(e.target.value)}
              placeholder="Новая таблица"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateDatasheet();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleCreateDatasheet} 
              disabled={!newDatasheetName.trim() || isCreating}
            >
              {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create View Dialog */}
      <Dialog open={isCreateViewDialogOpen} onOpenChange={setIsCreateViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать представление</DialogTitle>
            <DialogDescription>
              Создайте новое представление для таблицы "{selectedDatasheet?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="viewName">Название</Label>
              <Input
                id="viewName"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder="Новое представление"
              />
            </div>
            <div>
              <Label htmlFor="viewType">Тип</Label>
              <Select value={newViewType} onValueChange={setNewViewType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIEW_TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label} - {type.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateViewDialogOpen(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleCreateView} 
              disabled={!newViewName.trim() || isCreatingView}
            >
              {isCreatingView && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
