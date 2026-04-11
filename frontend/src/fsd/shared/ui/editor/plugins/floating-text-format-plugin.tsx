'use client'
import {
  type Dispatch,
  type JSX,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { createPortal } from "react-dom";

import { $isCodeHighlightNode } from "@lexical/code";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
  $createRangeSelection,
  $getNodeByKey,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $setSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  type LexicalEditor,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import {
  BoldIcon,
  ChevronDownIcon,
  CodeIcon,
  ItalicIcon,
  LinkIcon,
  LoaderCircleIcon,
  SparklesIcon,
  StrikethroughIcon,
  SubscriptIcon,
  SuperscriptIcon,
  UnderlineIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/fsd/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/fsd/shared/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/fsd/shared/ui/dropdown-menu";
import { Input } from "@/fsd/shared/ui/input";
import { getDOMRangeRect } from "@/fsd/shared/ui/editor/utils/get-dom-range-rect";
import { getSelectedNode } from "@/fsd/shared/ui/editor/utils/get-selected-node";
import { setFloatingElemPosition } from "@/fsd/shared/ui/editor/utils/set-floating-elem-position";
import { Separator } from "@/fsd/shared/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/fsd/shared/ui/toggle-group";

type GenerateSuccess = {
  text: string;
};

type GenerateFailure = {
  error?: string;
};

type PresetAction = {
  label: string;
  prompt: string;
};

type SelectionSnapshot = {
  anchorKey: string;
  anchorOffset: number;
  anchorType: "text" | "element";
  focusKey: string;
  focusOffset: number;
  focusType: "text" | "element";
  text: string;
};

function getSelectionSnapshot(editor: LexicalEditor): SelectionSnapshot | null {
  let result: SelectionSnapshot | null = null;

  editor.getEditorState().read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection) || selection.isCollapsed()) {
      return;
    }

    const text = selection.getTextContent().trim();
    if (!text) {
      return;
    }

    result = {
      anchorKey: selection.anchor.key,
      anchorOffset: selection.anchor.offset,
      anchorType: selection.anchor.type,
      focusKey: selection.focus.key,
      focusOffset: selection.focus.offset,
      focusType: selection.focus.type,
      text,
    };
  });

  return result;
}

const PRESET_ACTIONS: PresetAction[] = [
  { label: "Улучшить текст", prompt: "Улучши стиль и читаемость, сохрани смысл." },
  { label: "Сократить", prompt: "Сократи текст примерно в 2 раза без потери смысла." },
  { label: "Расширить", prompt: "Расширь текст, добавь детали и структуру." },
];

function TextFormatFloatingToolbar({
  editor,
  anchorElem,
  isLink,
  isBold,
  isItalic,
  isUnderline,
  isCode,
  isStrikethrough,
  isSubscript,
  isSuperscript,
  isVisible,
  selectedText,
  aiEnabled,
  setIsLinkEditMode,
}: {
  editor: LexicalEditor;
  anchorElem: HTMLElement;
  isBold: boolean;
  isCode: boolean;
  isItalic: boolean;
  isLink: boolean;
  isStrikethrough: boolean;
  isSubscript: boolean;
  isSuperscript: boolean;
  isUnderline: boolean;
  isVisible: boolean;
  selectedText: string;
  aiEnabled: boolean;
  setIsLinkEditMode: Dispatch<boolean>;
}): JSX.Element {
  const popupCharStylesEditorRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);
  const [isCustomPromptOpen, setIsCustomPromptOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  const insertLink = useCallback(() => {
    if (!isLink) {
      setIsLinkEditMode(true);
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, "https://");
    } else {
      setIsLinkEditMode(false);
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  }, [editor, isLink, setIsLinkEditMode]);

  const runAi = useCallback(
    async (instruction: string) => {
      const snapshot = getSelectionSnapshot(editor);

      if (isLoading || !snapshot) {
        toast.error("Выделите текст для обработки");
        return;
      }

      setIsLoading(true);
      setIsAiMenuOpen(false);

      try {
        const response = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "block",
            prompt:
              `${instruction}\n\n` +
              "Перепиши выделенный текст по задаче выше. " +
              "Сохрани исходную структуру текста: абзацы, списки и заголовки там, где это уместно. " +
              "Не добавляй пояснений, комментариев и служебных подсказок. " +
              "Верни только финальный вариант текста для вставки в редактор.\n\n" +
              `Текст:\n${snapshot.text}`,
            context: "",
          }),
        });

        const payload = (await response.json()) as GenerateSuccess | GenerateFailure;
        if (!response.ok || !("text" in payload) || typeof payload.text !== "string") {
          throw new Error(("error" in payload && payload.error) || "Не удалось обработать выделение");
        }

        const generated = payload.text.trim();
        if (!generated) {
          throw new Error("Пустой ответ от AI");
        }

        let inserted = false;
        editor.update(() => {
          if (!snapshot) {
            return;
          }

          const anchorNode = $getNodeByKey(snapshot.anchorKey);
          const focusNode = $getNodeByKey(snapshot.focusKey);
          if (!anchorNode || !focusNode) {
            return;
          }

          const selection = $createRangeSelection();
          selection.anchor.set(
            snapshot.anchorKey,
            snapshot.anchorOffset,
            snapshot.anchorType,
          );
          selection.focus.set(
            snapshot.focusKey,
            snapshot.focusOffset,
            snapshot.focusType,
          );
          $setSelection(selection);

          if (selection.isCollapsed()) {
            return;
          }

          if (selection.getTextContent().trim() !== snapshot.text) {
            return;
          }

          selection.insertText(generated);
          inserted = true;
        });

        if (!inserted) {
          throw new Error("Не удалось применить результат: исходное выделение изменилось");
        }        
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Не удалось обработать выделение";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [editor, isLoading, selectedText],
  );

  const submitCustomPrompt = useCallback(() => {
    const value = customPrompt.trim();
    if (!value) {
      toast.error("Введите запрос");
      return;
    }
    setIsCustomPromptOpen(false);
    setCustomPrompt("");
    void runAi(value);
  }, [customPrompt, runAi]);

  const mouseMoveListener = useCallback((e: MouseEvent) => {
    if (
      popupCharStylesEditorRef?.current &&
      (e.buttons === 1 || e.buttons === 3)
    ) {
      if (popupCharStylesEditorRef.current.style.pointerEvents !== "none") {
        const x = e.clientX;
        const y = e.clientY;
        const elementUnderMouse = document.elementFromPoint(x, y);

        if (!popupCharStylesEditorRef.current.contains(elementUnderMouse)) {
          popupCharStylesEditorRef.current.style.pointerEvents = "none";
        }
      }
    }
  }, []);

  const mouseUpListener = useCallback((_e: MouseEvent) => {
    if (popupCharStylesEditorRef?.current) {
      if (popupCharStylesEditorRef.current.style.pointerEvents !== "auto") {
        popupCharStylesEditorRef.current.style.pointerEvents = "auto";
      }
    }
  }, []);

  useEffect(() => {
    if (popupCharStylesEditorRef?.current) {
      document.addEventListener("mousemove", mouseMoveListener);
      document.addEventListener("mouseup", mouseUpListener);

      return () => {
        document.removeEventListener("mousemove", mouseMoveListener);
        document.removeEventListener("mouseup", mouseUpListener);
      };
    }
  }, [mouseMoveListener, mouseUpListener]);

  const $updateTextFormatFloatingToolbar = useCallback(() => {
    const selection = $getSelection();

    const popupCharStylesEditorElem = popupCharStylesEditorRef.current;
    const nativeSelection = window.getSelection();

    if (popupCharStylesEditorElem === null) {
      return;
    }

    const rootElement = editor.getRootElement();
    if (
      selection === null ||
      nativeSelection === null ||
      nativeSelection.isCollapsed ||
      rootElement === null ||
      !rootElement.contains(nativeSelection.anchorNode)
    ) {
      popupCharStylesEditorElem.style.opacity = "0";
      popupCharStylesEditorElem.style.transform = "translate(-10000px, -10000px)";
      return;
    }

    const rangeRect = getDOMRangeRect(nativeSelection, rootElement);
    setFloatingElemPosition(
      rangeRect,
      popupCharStylesEditorElem,
      anchorElem,
      isLink,
    );
  }, [editor, anchorElem, isLink]);

  useEffect(() => {
    const scrollerElem = anchorElem.parentElement;

    const update = () => {
      editor.getEditorState().read(() => {
        $updateTextFormatFloatingToolbar();
      });
    };

    window.addEventListener("resize", update);
    if (scrollerElem) {
      scrollerElem.addEventListener("scroll", update);
    }

    return () => {
      window.removeEventListener("resize", update);
      if (scrollerElem) {
        scrollerElem.removeEventListener("scroll", update);
      }
    };
  }, [editor, $updateTextFormatFloatingToolbar, anchorElem]);

  useEffect(() => {
    editor.getEditorState().read(() => {
      $updateTextFormatFloatingToolbar();
    });
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateTextFormatFloatingToolbar();
        });
      }),

      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          $updateTextFormatFloatingToolbar();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, $updateTextFormatFloatingToolbar]);

  return (
    <div
      ref={popupCharStylesEditorRef}
      data-slot="floating-text-toolbar"
      className={`bg-background absolute top-0 left-0 flex gap-1 rounded-md border p-1 opacity-0 shadow-md transition-opacity duration-300 will-change-transform ${
        isVisible ? "" : "pointer-events-none"
      }`}
    >
      {editor.isEditable() && (
        <>
          <ToggleGroup
            type="multiple"
            defaultValue={[
              isBold ? "bold" : "",
              isItalic ? "italic" : "",
              isUnderline ? "underline" : "",
              isStrikethrough ? "strikethrough" : "",
              isSubscript ? "subscript" : "",
              isSuperscript ? "superscript" : "",
              isCode ? "code" : "",
              isLink ? "link" : "",
            ]}
          >
            <ToggleGroupItem
              value="bold"
              aria-label="Toggle bold"
              onClick={() => {
                editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
              }}
              size="sm"
            >
              <BoldIcon className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="italic"
              aria-label="Toggle italic"
              onClick={() => {
                editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
              }}
              size="sm"
            >
              <ItalicIcon className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="underline"
              aria-label="Toggle underline"
              onClick={() => {
                editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline");
              }}
              size="sm"
            >
              <UnderlineIcon className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="strikethrough"
              aria-label="Toggle strikethrough"
              onClick={() => {
                editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough");
              }}
              size="sm"
            >
              <StrikethroughIcon className="h-4 w-4" />
            </ToggleGroupItem>
            <Separator orientation="vertical" />
            <ToggleGroupItem
              value="code"
              aria-label="Toggle code"
              onClick={() => {
                editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code");
              }}
              size="sm"
            >
              <CodeIcon className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="link"
              aria-label="Toggle link"
              onClick={insertLink}
              size="sm"
            >
              <LinkIcon className="h-4 w-4" />
            </ToggleGroupItem>
            <Separator orientation="vertical" />
          </ToggleGroup>
          <ToggleGroup
            type="single"
            defaultValue={
              isSubscript ? "subscript" : isSuperscript ? "superscript" : ""
            }
          >
            <ToggleGroupItem
              value="subscript"
              aria-label="Toggle subscript"
              onClick={() => {
                editor.dispatchCommand(FORMAT_TEXT_COMMAND, "subscript");
              }}
              size="sm"
            >
              <SubscriptIcon className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="superscript"
              aria-label="Toggle superscript"
              onClick={() => {
                editor.dispatchCommand(FORMAT_TEXT_COMMAND, "superscript");
              }}
              size="sm"
            >
              <SuperscriptIcon className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          {aiEnabled && (
            <>
              <Separator orientation="vertical" />
              <DropdownMenu open={isAiMenuOpen} onOpenChange={setIsAiMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="xs"
                    variant="ghost"
                    type="button"
                    disabled={!selectedText || isLoading}
                    onMouseDown={(event) => event.preventDefault()}
                    className="h-8"
                    aria-label="AI actions"
                  >
                    {isLoading ? (
                      <LoaderCircleIcon className="size-3.5 animate-spin" />
                    ) : (
                      <SparklesIcon className="size-3.5" />
                    )}
                    AI
                    <ChevronDownIcon className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="bottom" sideOffset={6} className="w-56">
                  <DropdownMenuLabel>Действия с текстом</DropdownMenuLabel>
                  {PRESET_ACTIONS.map((action) => (
                    <DropdownMenuItem
                      key={action.label}
                      onSelect={(event) => {
                        event.preventDefault();
                        void runAi(action.prompt);
                      }}
                    >
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      setIsAiMenuOpen(false);
                      setIsCustomPromptOpen(true);
                    }}
                  >
                    Свой запрос...
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Dialog open={isCustomPromptOpen} onOpenChange={setIsCustomPromptOpen}>
                <DialogContent showCloseButton={false}>
                  <DialogHeader>
                    <DialogTitle>AI-запрос</DialogTitle>
                    <DialogDescription>
                      Опиши, что сделать с выделенным текстом.
                    </DialogDescription>
                  </DialogHeader>
                  <Input
                    value={customPrompt}
                    onChange={(event) => setCustomPrompt(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        submitCustomPrompt();
                      }
                    }}
                    placeholder="Например: Сделай текст короче"
                    autoFocus
                  />
                  <DialogFooter>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setIsCustomPromptOpen(false)}
                    >
                      Отмена
                    </Button>
                    <Button
                      type="button"
                      onClick={submitCustomPrompt}
                      disabled={isLoading}
                    >
                      Применить
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </>
      )}
    </div>
  );
}

function useFloatingTextFormatToolbar(
  editor: LexicalEditor,
  anchorElem: HTMLDivElement | null,
  setIsLinkEditMode: Dispatch<boolean>,
  aiEnabled: boolean,
): JSX.Element | null {
  const [isText, setIsText] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isSubscript, setIsSubscript] = useState(false);
  const [isSuperscript, setIsSuperscript] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [selectedText, setSelectedText] = useState("");

  const updatePopup = useCallback(() => {
    editor.getEditorState().read(() => {
      if (editor.isComposing()) {
        return;
      }
      const selection = $getSelection();
      const nativeSelection = window.getSelection();
      const rootElement = editor.getRootElement();

      if (
        nativeSelection !== null &&
        (!$isRangeSelection(selection) ||
          rootElement === null ||
          !rootElement.contains(nativeSelection.anchorNode))
      ) {
        setIsText(false);
        setSelectedText("");
        return;
      }

      if (!$isRangeSelection(selection)) {
        setSelectedText("");
        return;
      }

      const node = getSelectedNode(selection);
      const text = selection.getTextContent().trim();

      setIsBold(selection.hasFormat("bold"));
      setIsItalic(selection.hasFormat("italic"));
      setIsUnderline(selection.hasFormat("underline"));
      setIsStrikethrough(selection.hasFormat("strikethrough"));
      setIsSubscript(selection.hasFormat("subscript"));
      setIsSuperscript(selection.hasFormat("superscript"));
      setIsCode(selection.hasFormat("code"));
      setSelectedText(text);

      const parent = node.getParent();
      if ($isLinkNode(parent) || $isLinkNode(node)) {
        setIsLink(true);
      } else {
        setIsLink(false);
      }

      if (
        !$isCodeHighlightNode(selection.anchor.getNode()) &&
        selection.getTextContent() !== ""
      ) {
        setIsText($isTextNode(node) || $isParagraphNode(node));
      } else {
        setIsText(false);
      }

      const rawTextContent = selection.getTextContent().replace(/\n/g, "");
      if (!selection.isCollapsed() && rawTextContent === "") {
        setIsText(false);
        setSelectedText("");
      }
    });
  }, [editor]);

  useEffect(() => {
    document.addEventListener("selectionchange", updatePopup);
    return () => {
      document.removeEventListener("selectionchange", updatePopup);
    };
  }, [updatePopup]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(() => {
        updatePopup();
      }),
      editor.registerRootListener(() => {
        if (editor.getRootElement() === null) {
          setIsText(false);
          setSelectedText("");
        }
      }),
    );
  }, [editor, updatePopup]);

  if (!anchorElem) {
    return null;
  }

  return createPortal(
    <TextFormatFloatingToolbar
      editor={editor}
      anchorElem={anchorElem}
      isLink={isLink}
      isBold={isBold}
      isItalic={isItalic}
      isStrikethrough={isStrikethrough}
      isSubscript={isSubscript}
      isSuperscript={isSuperscript}
      isUnderline={isUnderline}
      isVisible={isText}
      isCode={isCode}
      selectedText={selectedText}
      aiEnabled={aiEnabled}
      setIsLinkEditMode={setIsLinkEditMode}
    />,
    anchorElem,
  );
}

export function FloatingTextFormatToolbarPlugin({
  anchorElem,
  setIsLinkEditMode,
  aiEnabled = false,
}: {
  anchorElem: HTMLDivElement | null;
  setIsLinkEditMode: Dispatch<boolean>;
  aiEnabled?: boolean;
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  return useFloatingTextFormatToolbar(editor, anchorElem, setIsLinkEditMode, aiEnabled);
}
