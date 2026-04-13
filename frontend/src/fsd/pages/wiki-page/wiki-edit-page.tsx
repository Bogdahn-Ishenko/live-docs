'use client';

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { SerializedEditorState } from "lexical";
import { 
  ArrowLeft, 
  Save, 
  Globe, 
  Lock,
  Clock,
  Check,
  MoreVertical,
  Trash2,
  ExternalLink,
  Link2,
  AlertCircle,
  MessageSquare,
  History,
  GitBranch,
  PanelRight,
  PanelRightClose
} from "lucide-react";

import { Button } from "@/fsd/shared/ui/button";
import { Input } from "@/fsd/shared/ui/input";
import { Card, CardContent } from "@/fsd/shared/ui/card";
import { Toggle } from "@/fsd/shared/ui/toggle";
import { Skeleton } from "@/fsd/shared/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/fsd/shared/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/fsd/shared/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/fsd/shared/ui/tooltip";
import { ScrollArea } from "@/fsd/shared/ui/scroll-area";
import { BlockViewerProvider } from "@/fsd/app/providers/block-viewer-provider";
import { SidebarProvider } from "@/fsd/shared/ui/sidebar";
import { CommentsPanelEnhanced } from "@/fsd/shared/ui/wiki/comments-panel-enhanced";
import { VersionsPanel } from "@/fsd/shared/ui/wiki/versions-panel";
import { MiniPageGraph, PageGraph } from "@/fsd/shared/ui/wiki/page-graph";
import { 
  useWikiPage, 
  useUpdateWikiPage, 
  useDeleteWikiPage,
  useAutoSave,
  useWikiBacklinks,
  useCreateVersion
} from "@/fsd/shared/hooks/wiki";
import { useLocalStorage } from "@/fsd/shared/hooks/use-local-storage";
import { extractLinksFromContent, generateSlug } from "@/fsd/shared/lib/wiki/types";
import type { WikiComment } from "@/fsd/shared/lib/wiki/comments";

// Dynamic imports
const Editor = dynamic(
  () => import("@/fsd/shared/ui/blocks/editor-x").then((mod) => mod.Editor),
  { ssr: false, loading: () => (
    <div className="h-[calc(100vh-200px)] flex items-center justify-center border rounded-lg">
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        Загрузка редактора...
      </div>
    </div>
  )}
);

const CommentSelectionPlugin = dynamic(
  () => import("@/fsd/shared/ui/editor/plugins/comment-selection-plugin").then(mod => mod.CommentSelectionPlugin),
  { ssr: false }
);

interface WikiEditPageProps {
  slug: string;
  isNew?: boolean;
}

type RightPanel = 'none' | 'comments' | 'versions' | 'graph';

export default function WikiEditPage({ slug, isNew }: WikiEditPageProps) {
  const router = useRouter();
  const { page, isLoading, refetch } = useWikiPage(isNew ? null : slug);
  const { updatePage, isLoading: isUpdating } = useUpdateWikiPage();
  const { deletePage, isLoading: isDeleting } = useDeleteWikiPage();
  const { createVersion } = useCreateVersion();
  const { backlinks } = useWikiBacklinks(page?.recordId || null);
  
  // Local state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<SerializedEditorState | null>(null);
  const [isPublished, setIsPublished] = useState(true);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [rightPanel, setRightPanel] = useState<RightPanel>('none');
  
  // Comment state
  const [selectedText, setSelectedText] = useState("");
  const [selection, setSelection] = useState<WikiComment['selection'] | undefined>();
  
  // Version restore dialog
  const [restoreVersion, setRestoreVersion] = useState<SerializedEditorState | null>(null);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  
  // Load page data
  useEffect(() => {
    if (page) {
      setTitle(page.title);
      setContent(page.content);
      setIsPublished(page.isPublished);
    }
  }, [page]);
  
  // Local storage backup for new pages
  const LOCAL_STORAGE_KEY = `wiki-draft-${slug}`;
  const [localDraft, setLocalDraft] = useLocalStorage<{
    title: string;
    content: SerializedEditorState | null;
  } | null>(LOCAL_STORAGE_KEY, null);
  
  // Load local draft for new pages
  useEffect(() => {
    if (isNew && localDraft && !hasLocalChanges) {
      setTitle(localDraft.title);
      setContent(localDraft.content);
    }
  }, [isNew, localDraft, hasLocalChanges]);
  
  // Save to local draft
  useEffect(() => {
    if (isNew && hasLocalChanges) {
      setLocalDraft({ title, content });
    }
  }, [title, content, isNew, hasLocalChanges, setLocalDraft]);
  
  // Auto-save for existing pages
  const { lastSaved, hasUnsavedChanges, isSaving, saveNow } = useAutoSave(
    page?.recordId || null,
    content,
    { enabled: !isNew && !!page, interval: 30000 }
  );
  
  // Track changes
  const handleContentChange = useCallback((newContent: SerializedEditorState) => {
    setContent(newContent);
    setHasLocalChanges(true);
  }, []);
  
  // Manual save
  const handleSave = async () => {
    if (isNew) {
      const newSlug = generateSlug(title || "new-page");
      router.push(`/wiki/${newSlug}?edit=true`);
      return;
    }
    
    if (!page) return;
    
    // Save version before updating
    await createVersion({
      pageId: page.recordId,
      content: page.content,
      action: "edit",
      description: `Редактирование: ${title}`,
    });
    
    const result = await updatePage({
      recordId: page.recordId,
      title,
      content,
      isPublished,
    });
    
    if (result) {
      setHasLocalChanges(false);
      refetch();
    }
  };
  
  // Delete page
  const handleDelete = async () => {
    if (!page) return;
    
    const success = await deletePage(page.recordId);
    if (success) {
      setIsDeleteDialogOpen(false);
      router.push("/wiki");
    }
  };
  
  // Handle add comment from selection
  const handleAddComment = useCallback((text: string, sel: WikiComment['selection']) => {
    setSelectedText(text);
    setSelection(sel);
    setRightPanel('comments');
  }, []);
  
  // Handle version restore
  const handleRestoreVersion = useCallback((versionContent: SerializedEditorState | null) => {
    setRestoreVersion(versionContent);
    setIsRestoreDialogOpen(true);
  }, []);
  
  const confirmRestore = () => {
    if (restoreVersion) {
      setContent(restoreVersion);
      setHasLocalChanges(true);
      setIsRestoreDialogOpen(false);
      setRestoreVersion(null);
    }
  };
  
  // Clear comment selection
  const clearCommentSelection = useCallback(() => {
    setSelectedText("");
    setSelection(undefined);
  }, []);
  
  // Extract outgoing links
  const outgoingLinks = content ? extractLinksFromContent(content) : [];
  
  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 max-w-6xl">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-[calc(100vh-200px)]" />
      </div>
    );
  }
  
  if (!isNew && !page) {
    return (
      <div className="container mx-auto py-6 max-w-6xl">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/wiki">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Страница не найдена</h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="size-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Страница с slug &quot;{slug}&quot; не существует
            </p>
            <Button asChild>
              <Link href="/wiki">К списку страниц</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <TooltipProvider>
      <div className="flex h-screen">
        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/wiki">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setHasLocalChanges(true);
              }}
              placeholder="Название страницы"
              className="text-xl font-semibold border-none bg-transparent focus-visible:ring-0 px-0 flex-1"
            />
            
            <div className="flex items-center gap-2">
              {/* Publish toggle */}
              <Toggle
                pressed={isPublished}
                onPressedChange={(pressed) => {
                  setIsPublished(pressed);
                  setHasLocalChanges(true);
                }}
                aria-label="Toggle publish"
              >
                {isPublished ? (
                  <Globe className="size-4 mr-1" />
                ) : (
                  <Lock className="size-4 mr-1" />
                )}
                {isPublished ? "Опубликовано" : "Черновик"}
              </Toggle>
              
              {/* Save status */}
              {!isNew && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground px-2">
                      {isSaving ? (
                        <>
                          <div className="size-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          Сохранение...
                        </>
                      ) : hasUnsavedChanges || hasLocalChanges ? (
                        <>
                          <Clock className="size-3" />
                          Есть изменения
                        </>
                      ) : lastSaved ? (
                        <>
                          <Check className="size-3 text-green-500" />
                          Сохранено
                        </>
                      ) : null}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {lastSaved && `Последнее сохранение: ${formatDate(lastSaved.getTime())}`}
                  </TooltipContent>
                </Tooltip>
              )}
              
              {/* Save button */}
              <Button 
                onClick={handleSave} 
                disabled={isUpdating || (!hasLocalChanges && !hasUnsavedChanges && !isNew)}
              >
                <Save className="size-4 mr-2" />
                {isNew ? "Создать" : "Сохранить"}
              </Button>
              
              {/* Actions menu */}
              {!isNew && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/wiki/${slug}`} target="_blank">
                        <ExternalLink className="size-4 mr-2" />
                        Просмотр
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setRightPanel(rightPanel === 'comments' ? 'none' : 'comments')}>
                      <MessageSquare className="size-4 mr-2" />
                      {rightPanel === 'comments' ? "Скрыть комментарии" : "Комментарии"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setRightPanel(rightPanel === 'versions' ? 'none' : 'versions')}>
                      <History className="size-4 mr-2" />
                      {rightPanel === 'versions' ? "Скрыть историю" : "Машина времени"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setRightPanel(rightPanel === 'graph' ? 'none' : 'graph')}>
                      <GitBranch className="size-4 mr-2" />
                      {rightPanel === 'graph' ? "Скрыть граф" : "Граф связей"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      <Trash2 className="size-4 mr-2" />
                      Удалить
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              {/* Panel toggle */}
              {!isNew && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setRightPanel(rightPanel === 'none' ? 'comments' : 'none')}
                  className={rightPanel !== 'none' ? "bg-accent" : ""}
                >
                  {rightPanel !== 'none' ? (
                    <PanelRightClose className="size-4" />
                  ) : (
                    <PanelRight className="size-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
          
          {/* Editor area */}
          <div className="flex-1 overflow-hidden">
            <BlockViewerProvider>
              <SidebarProvider defaultOpen={false}>
                <Editor
                  editorSerializedState={content}
                  onSerializedChange={handleContentChange}
                />
                {!isNew && (
                  <CommentSelectionPlugin onAddComment={handleAddComment} />
                )}
              </SidebarProvider>
            </BlockViewerProvider>
          </div>
        </div>
        
        {/* Right panel */}
        {!isNew && page && (
          <>
            {rightPanel === 'comments' && (
              <CommentsPanelEnhanced
                pageId={page.recordId}
                pageCreatorId={page.createdBy}
                currentUserId="current-user"
                isOpen={true}
                onClose={() => setRightPanel('none')}
                selectedText={selectedText}
                selection={selection}
                onClearSelection={clearCommentSelection}
              />
            )}
            
            {rightPanel === 'versions' && (
              <VersionsPanel
                pageId={page.recordId}
                isOpen={true}
                onClose={() => setRightPanel('none')}
                onRestore={handleRestoreVersion}
                currentContent={content}
              />
            )}
            
            {rightPanel === 'graph' && (
              <div className="w-96 border-l bg-background flex flex-col h-full">
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-medium flex items-center gap-2">
                    <GitBranch className="size-4" />
                    Граф связей
                  </h3>
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setRightPanel('none')}>
                    <PanelRightClose className="size-4" />
                  </Button>
                </div>
                <div className="flex-1 p-4">
                  <PageGraph 
                    currentPageId={page.recordId}
                    className="h-full w-full border rounded-lg"
                  />
                </div>
                <div className="p-4 border-t text-xs text-muted-foreground">
                  <p>Нажмите на узел для перехода к странице</p>
                  <p className="mt-1">Синие линии — ссылки в тексте, серые — иерархия</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Delete Confirmation */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить страницу?</DialogTitle>
            <DialogDescription>
              Страница &quot;{title}&quot; будет удалена навсегда.
              {backlinks.length > 0 && (
                <span className="block mt-2 text-amber-500">
                  Внимание: на эту страницу ссылаются {backlinks.length} других страниц.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Отмена
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Удаление..." : "Удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Restore Version Confirmation */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Восстановить версию?</DialogTitle>
            <DialogDescription>
              Текущее содержимое страницы будет заменено выбранной версией.
              Вы можете отменить это действие, не сохраняя страницу.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRestoreDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={confirmRestore}>
              Восстановить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
