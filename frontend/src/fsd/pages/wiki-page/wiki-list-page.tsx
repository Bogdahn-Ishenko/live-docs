'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  Search, 
  FileText, 
  MoreVertical, 
  Trash2, 
  Edit, 
  Clock,
  ChevronRight,
  FolderTree
} from "lucide-react";

import { Button } from "@/fsd/shared/ui/button";
import { Input } from "@/fsd/shared/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/fsd/shared/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/fsd/shared/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/fsd/shared/ui/dialog";
import { Skeleton } from "@/fsd/shared/ui/skeleton";
import { ScrollArea } from "@/fsd/shared/ui/scroll-area";
import { useWikiPages, useCreateWikiPage, useDeleteWikiPage, useWikiHierarchy } from "@/fsd/shared/hooks/wiki";
import { generateSlug } from "@/fsd/shared/lib/wiki/types";

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Recursive tree component
function WikiTreeItem({ 
  node, 
  level = 0,
  onDelete,
}: { 
  node: { page: { recordId: string; title: string; slug: string; updatedAt: number }; children: typeof node[] };
  level?: number;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  
  return (
    <div>
      <div 
        className="flex items-center gap-2 py-2 px-2 hover:bg-accent/50 rounded-md group"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {hasChildren ? (
          <button 
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 hover:bg-accent rounded"
          >
            <ChevronRight className={`size-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        ) : (
          <span className="w-5" />
        )}
        
        <FileText className="size-4 text-muted-foreground" />
        
        <Link 
          href={`/wiki/${node.page.slug}`}
          className="flex-1 text-sm hover:underline truncate"
        >
          {node.page.title || "(Без названия)"}
        </Link>
        
        <span className="text-xs text-muted-foreground hidden sm:block">
          {formatDate(node.page.updatedAt)}
        </span>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/wiki/${node.page.slug}`}>
                <Edit className="size-4 mr-2" />
                Редактировать
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => onDelete(node.page.recordId)}
            >
              <Trash2 className="size-4 mr-2" />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <WikiTreeItem 
              key={child.page.recordId} 
              node={child} 
              level={level + 1}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function WikiListPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [pageToDelete, setPageToDelete] = useState<string | null>(null);
  
  const { pages, isLoading, refetch } = useWikiPages();
  const { hierarchy } = useWikiHierarchy();
  const { createPage, isLoading: isCreating } = useCreateWikiPage();
  const { deletePage, isLoading: isDeleting } = useDeleteWikiPage();
  
  const filteredPages = pages.filter(page => 
    page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const handleCreatePage = async () => {
    if (!newPageTitle.trim()) return;
    
    const slug = generateSlug(newPageTitle);
    const newPage = await createPage({ 
      title: newPageTitle,
      slug,
    });
    
    if (newPage) {
      setIsCreateDialogOpen(false);
      setNewPageTitle("");
      router.push(`/wiki/${newPage.slug}`);
    }
  };
  
  const handleDeletePage = async () => {
    if (!pageToDelete) return;
    
    const success = await deletePage(pageToDelete);
    if (success) {
      setPageToDelete(null);
      refetch();
    }
  };
  
  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Wiki</h1>
          <p className="text-muted-foreground">
            {pages.length} страниц
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="size-4 mr-2" />
          Новая страница
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar with tree view */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FolderTree className="size-4" />
              Структура
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-300px)]">
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : hierarchy.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Нет страниц
                </p>
              ) : (
                <div>
                  {hierarchy.map((node) => (
                    <WikiTreeItem 
                      key={node.page.recordId} 
                      node={node}
                      onDelete={setPageToDelete}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
        
        {/* Main content */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Все страницы</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Поиск страниц..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="size-10 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredPages.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="size-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {searchQuery ? "Ничего не найдено" : "Нет страниц"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery 
                    ? "Попробуйте другой запрос" 
                    : "Создайте первую страницу wiki"}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="size-4 mr-2" />
                    Создать страницу
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPages.map((page) => (
                  <div
                    key={page.recordId}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent/50 group"
                  >
                    <div className="size-10 rounded bg-primary/10 flex items-center justify-center">
                      <FileText className="size-5 text-primary" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <Link 
                        href={`/wiki/${page.slug}`}
                        className="font-medium hover:underline block truncate"
                      >
                        {page.title || "(Без названия)"}
                      </Link>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>/{page.slug}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {formatDate(page.updatedAt)}
                        </span>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="opacity-0 group-hover:opacity-100"
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/wiki/${page.slug}`}>
                            <Edit className="size-4 mr-2" />
                            Редактировать
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => setPageToDelete(page.recordId)}
                        >
                          <Trash2 className="size-4 mr-2" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новая страница</DialogTitle>
            <DialogDescription>
              Введите название для новой wiki-страницы
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Название страницы"
            value={newPageTitle}
            onChange={(e) => setNewPageTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreatePage();
            }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleCreatePage} 
              disabled={!newPageTitle.trim() || isCreating}
            >
              {isCreating ? "Создание..." : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!pageToDelete} onOpenChange={() => setPageToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить страницу?</DialogTitle>
            <DialogDescription>
              Это действие нельзя отменить. Страница будет удалена навсегда.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPageToDelete(null)}>
              Отмена
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeletePage}
              disabled={isDeleting}
            >
              {isDeleting ? "Удаление..." : "Удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
