"use client";

import { useState, useCallback } from "react";
import { Database, Loader2 } from "lucide-react";

import { Button } from "@/fsd/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/fsd/shared/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/fsd/shared/ui/tabs";
import { TablesBrowser } from "@/fsd/shared/ui/tables-mw";
import { FieldManager } from "@/fsd/shared/ui/tables-mw";
import type { Node, View, Field } from "@/fsd/shared/lib/tables-mw/api-types";

interface TablesMwBrowserPluginProps {
  onInsertTable: (spaceId: string, datasheet: Node, viewId: string) => void;
}

/**
 * TablesMw Browser Dialog Plugin
 * Opens a dialog to browse and insert tables from tables.mws.ru
 */
export function TablesMwBrowserPlugin({ onInsertTable }: TablesMwBrowserPluginProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [selectedDatasheet, setSelectedDatasheet] = useState<Node | null>(null);
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
  const [selectedViews, setSelectedViews] = useState<View[]>([]);

  const handleSelectDatasheet = useCallback((
    spaceId: string, 
    datasheet: Node, 
    views: View[], 
    _fields: Field[]
  ) => {
    setSelectedSpaceId(spaceId);
    setSelectedDatasheet(datasheet);
    setSelectedViews(views);
    if (views.length > 0) {
      setSelectedViewId(views[0].id);
    }
  }, []);

  const handleInsert = () => {
    if (selectedSpaceId && selectedDatasheet && selectedViewId) {
      onInsertTable(selectedSpaceId, selectedDatasheet, selectedViewId);
      setIsOpen(false);
      // Reset state
      setSelectedSpaceId(null);
      setSelectedDatasheet(null);
      setSelectedViewId(null);
      setSelectedViews([]);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Database className="w-4 h-4" />
        Браузер таблиц
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="!w-[1000px] !max-w-[1000px] h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>Браузер таблиц MWS</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="browse" className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <TabsList className="mx-6 mt-4">
              <TabsTrigger value="browse">Обзор</TabsTrigger>
              {selectedDatasheet && (
                <TabsTrigger value="fields">Поля</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="browse" className="flex-1 min-h-0 px-6 pb-2 overflow-hidden">
              <TablesBrowser
                onSelectDatasheet={handleSelectDatasheet}
                className="h-full"
              />
            </TabsContent>

            {selectedDatasheet && selectedSpaceId && (
              <TabsContent value="fields" className="flex-1 min-h-0 px-6 pb-2 overflow-hidden">
                <FieldManager
                  spaceId={selectedSpaceId}
                  datasheetId={selectedDatasheet.id}
                  className="h-full"
                />
              </TabsContent>
            )}
          </Tabs>

          {selectedDatasheet && (
            <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Таблица:</span>
                  <span className="ml-2 font-medium">{selectedDatasheet.name}</span>
                </div>
                {selectedViews.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Представление:</span>
                    <select
                      value={selectedViewId || ""}
                      onChange={(e) => setSelectedViewId(e.target.value)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      {selectedViews.map((view) => (
                        <option key={view.id} value={view.id}>
                          {view.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <Button 
                onClick={handleInsert}
                disabled={!selectedViewId}
              >
                Вставить в документ
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
