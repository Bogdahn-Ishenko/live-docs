"use client";

import { CodeHighlightNode, CodeNode } from "@lexical/code";
import {
  AutoFocusExtension,
  ClearEditorExtension,
  DecoratorTextExtension,
  HorizontalRuleExtension,
  SelectionAlwaysOnDisplayExtension,
} from "@lexical/extension";
import { HashtagExtension } from "@lexical/hashtag";
import { HistoryExtension } from "@lexical/history";
import {
  AutoLinkExtension,
  ClickableLinkExtension,
  LinkExtension,
} from "@lexical/link";
import { CheckListExtension, ListExtension } from "@lexical/list";
import { OverflowNode } from "@lexical/overflow";
import { CharacterLimitPlugin } from "@lexical/react/LexicalCharacterLimitPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { RichTextExtension } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import {
  configExtension,
  defineExtension,
  type EditorState,
  type SerializedEditorState,
} from "lexical";
import { useMemo, useRef, useState } from "react";
import { useBlockViewer } from "@/fsd/app/providers/block-viewer-provider";
import { Button } from "@/fsd/shared/ui/button";
import { ContentEditable } from "@/fsd/shared/ui/editor/editor-ui/content-editable";
import { DateTimeExtension } from "@/fsd/shared/ui/editor/extensions/date-time-extension";
import { DragDropPasteExtension } from "@/fsd/shared/ui/editor/extensions/drag-drop-paste-extension";
import { EmojisExtension } from "@/fsd/shared/ui/editor/extensions/emojis-extension";
import { ImagesExtension } from "@/fsd/shared/ui/editor/extensions/images-extension";
import { KeywordsExtension } from "@/fsd/shared/ui/editor/extensions/keywords-extension";
import { MarkdownShortcutsExtension } from "@/fsd/shared/ui/editor/extensions/markdown-shortcuts-extension";
import { MaxLengthExtension } from "@/fsd/shared/ui/editor/extensions/max-length-extension";
import { AutocompleteNode } from "@/fsd/shared/ui/editor/nodes/autocomplete-node";
import { TweetNode } from "@/fsd/shared/ui/editor/nodes/embeds/tweet-node";
import { YouTubeNode } from "@/fsd/shared/ui/editor/nodes/embeds/youtube-node";
import { EmojiNode } from "@/fsd/shared/ui/editor/nodes/emoji-node";
import { LayoutContainerNode } from "@/fsd/shared/ui/editor/nodes/layout-container-node";
import { LayoutItemNode } from "@/fsd/shared/ui/editor/nodes/layout-item-node";
import { MentionNode } from "@/fsd/shared/ui/editor/nodes/mention-node";
import { SpecialTextNode } from "@/fsd/shared/ui/editor/nodes/special-text-node";
import {
  $insertTablesMwNode,
  TablesMwNode,
} from "@/fsd/shared/ui/editor/nodes/tables-mw-node";
import { ActionsPlugin } from "@/fsd/shared/ui/editor/plugins/actions/actions-plugin";
import { ClearEditorActionPlugin } from "@/fsd/shared/ui/editor/plugins/actions/clear-editor-plugin";
import { CounterCharacterPlugin } from "@/fsd/shared/ui/editor/plugins/actions/counter-character-plugin";
import { EditModeTogglePlugin } from "@/fsd/shared/ui/editor/plugins/actions/edit-mode-toggle-plugin";
import { ImportExportPlugin } from "@/fsd/shared/ui/editor/plugins/actions/import-export-plugin";
import { MarkdownTogglePlugin } from "@/fsd/shared/ui/editor/plugins/actions/markdown-toggle-plugin";
import { ShareContentPlugin } from "@/fsd/shared/ui/editor/plugins/actions/share-content-plugin";
import { SpeechToTextPlugin } from "@/fsd/shared/ui/editor/plugins/actions/speech-to-text-plugin";
import { TreeViewPlugin } from "@/fsd/shared/ui/editor/plugins/actions/tree-view-plugin";
import { AutoCompletePlugin } from "@/fsd/shared/ui/editor/plugins/auto-complete-plugin";
import { CodeActionMenuPlugin } from "@/fsd/shared/ui/editor/plugins/code-action-menu-plugin";
import { CodeHighlightPlugin } from "@/fsd/shared/ui/editor/plugins/code-highlight-plugin";
import { ComponentPickerMenuPlugin } from "@/fsd/shared/ui/editor/plugins/component-picker-menu-plugin";
import { ContextMenuPlugin } from "@/fsd/shared/ui/editor/plugins/context-menu-plugin";
import { DraggableBlockPlugin } from "@/fsd/shared/ui/editor/plugins/draggable-block-plugin";
import { AutoEmbedPlugin } from "@/fsd/shared/ui/editor/plugins/embeds/auto-embed-plugin";
import { TwitterPlugin } from "@/fsd/shared/ui/editor/plugins/embeds/twitter-plugin";
import { YouTubePlugin } from "@/fsd/shared/ui/editor/plugins/embeds/youtube-plugin";
import { EmojiPickerPlugin } from "@/fsd/shared/ui/editor/plugins/emoji-picker-plugin";
import { FloatingLinkEditorPlugin } from "@/fsd/shared/ui/editor/plugins/floating-link-editor-plugin";
import { FloatingTextFormatToolbarPlugin } from "@/fsd/shared/ui/editor/plugins/floating-text-format-plugin";
import { LayoutPlugin } from "@/fsd/shared/ui/editor/plugins/layout-plugin";
import { MentionsPlugin } from "@/fsd/shared/ui/editor/plugins/mentions-plugin";
import { AlignmentPickerPlugin } from "@/fsd/shared/ui/editor/plugins/picker/alignment-picker-plugin";
import { BulletedListPickerPlugin } from "@/fsd/shared/ui/editor/plugins/picker/bulleted-list-picker-plugin";
import { CheckListPickerPlugin } from "@/fsd/shared/ui/editor/plugins/picker/check-list-picker-plugin";
import { CodePickerPlugin } from "@/fsd/shared/ui/editor/plugins/picker/code-picker-plugin";
import { ColumnsLayoutPickerPlugin } from "@/fsd/shared/ui/editor/plugins/picker/columns-layout-picker-plugin";
import { DateTimePickerPlugin } from "@/fsd/shared/ui/editor/plugins/picker/date-time-picker-plugin";
import { DividerPickerPlugin } from "@/fsd/shared/ui/editor/plugins/picker/divider-picker-plugin";
import { EmbedsPickerPlugin } from "@/fsd/shared/ui/editor/plugins/picker/embeds-picker-plugin";
import { HeadingPickerPlugin } from "@/fsd/shared/ui/editor/plugins/picker/heading-picker-plugin";
import { ImagePickerPlugin } from "@/fsd/shared/ui/editor/plugins/picker/image-picker-plugin";
import { NumberedListPickerPlugin } from "@/fsd/shared/ui/editor/plugins/picker/numbered-list-picker-plugin";
import { ParagraphPickerPlugin } from "@/fsd/shared/ui/editor/plugins/picker/paragraph-picker-plugin";
import { QuotePickerPlugin } from "@/fsd/shared/ui/editor/plugins/picker/quote-picker-plugin";
import {
  DynamicTablePickerPlugin,
  TablePickerPlugin,
} from "@/fsd/shared/ui/editor/plugins/picker/table-picker-plugin";
import SpecialTextPlugin from "@/fsd/shared/ui/editor/plugins/special-text-plugin";
import { TabFocusPlugin } from "@/fsd/shared/ui/editor/plugins/tab-focus-plugin";
import { TablesMwBrowserPlugin } from "@/fsd/shared/ui/editor/plugins/tables-mw-browser-plugin";
import { TablesMwPastePlugin } from "@/fsd/shared/ui/editor/plugins/tables-mw-paste-plugin";
import { FormatBulletedList } from "@/fsd/shared/ui/editor/plugins/toolbar/block-format/format-bulleted-list";
import { FormatCheckList } from "@/fsd/shared/ui/editor/plugins/toolbar/block-format/format-check-list";
import { FormatCodeBlock } from "@/fsd/shared/ui/editor/plugins/toolbar/block-format/format-code-block";
import { FormatHeading } from "@/fsd/shared/ui/editor/plugins/toolbar/block-format/format-heading";
import { FormatNumberedList } from "@/fsd/shared/ui/editor/plugins/toolbar/block-format/format-numbered-list";
import { FormatParagraph } from "@/fsd/shared/ui/editor/plugins/toolbar/block-format/format-paragraph";
import { FormatQuote } from "@/fsd/shared/ui/editor/plugins/toolbar/block-format/format-quote";
import { BlockFormatDropDown } from "@/fsd/shared/ui/editor/plugins/toolbar/block-format-toolbar-plugin";
import { InsertColumnsLayout } from "@/fsd/shared/ui/editor/plugins/toolbar/block-insert/insert-columns-layout";
import { InsertEmbeds } from "@/fsd/shared/ui/editor/plugins/toolbar/block-insert/insert-embeds";
import { InsertHorizontalRule } from "@/fsd/shared/ui/editor/plugins/toolbar/block-insert/insert-horizontal-rule";
import { InsertImage } from "@/fsd/shared/ui/editor/plugins/toolbar/block-insert/insert-image";
import { InsertTable } from "@/fsd/shared/ui/editor/plugins/toolbar/block-insert/insert-table";
import { BlockInsertPlugin } from "@/fsd/shared/ui/editor/plugins/toolbar/block-insert-plugin";
import { ClearFormattingToolbarPlugin } from "@/fsd/shared/ui/editor/plugins/toolbar/clear-formatting-toolbar-plugin";
import { CodeLanguageToolbarPlugin } from "@/fsd/shared/ui/editor/plugins/toolbar/code-language-toolbar-plugin";
import { ElementFormatToolbarPlugin } from "@/fsd/shared/ui/editor/plugins/toolbar/element-format-toolbar-plugin";
import { FontBackgroundToolbarPlugin } from "@/fsd/shared/ui/editor/plugins/toolbar/font-background-toolbar-plugin";
import { FontColorToolbarPlugin } from "@/fsd/shared/ui/editor/plugins/toolbar/font-color-toolbar-plugin";
import { FontFamilyToolbarPlugin } from "@/fsd/shared/ui/editor/plugins/toolbar/font-family-toolbar-plugin";
import { FontFormatToolbarPlugin } from "@/fsd/shared/ui/editor/plugins/toolbar/font-format-toolbar-plugin";
import { FontSizeToolbarPlugin } from "@/fsd/shared/ui/editor/plugins/toolbar/font-size-toolbar-plugin";
import { HistoryToolbarPlugin } from "@/fsd/shared/ui/editor/plugins/toolbar/history-toolbar-plugin";
import { LinkToolbarPlugin } from "@/fsd/shared/ui/editor/plugins/toolbar/link-toolbar-plugin";
import { SubSuperToolbarPlugin } from "@/fsd/shared/ui/editor/plugins/toolbar/subsuper-toolbar-plugin";
import { ToolbarPlugin } from "@/fsd/shared/ui/editor/plugins/toolbar/toolbar-plugin";
import { TypingPerfPlugin } from "@/fsd/shared/ui/editor/plugins/typing-pref-plugin";
import { WikiLinksPlugin } from "@/fsd/shared/ui/editor/plugins/wiki-links-plugin";
import { editorTheme } from "@/fsd/shared/ui/editor/themes/editor-theme";
import { MARKDOWN_TRANSFORMERS } from "@/fsd/shared/ui/editor/transformers/markdown-transformers";
import { validateUrl } from "@/fsd/shared/ui/editor/utils/url";
import { Separator } from "@/fsd/shared/ui/separator";
import { TooltipProvider } from "@/fsd/shared/ui/tooltip";

const placeholder = "Нажмите / для команд...";
const maxLength = 30 * 1000;

/**
 * TablesMw Browser Button Component
 * Button to open the tables browser and insert tables into the editor
 */
function TablesMwBrowserButton() {
  const [editor] = useLexicalComposerContext();

  const handleInsertTable = (
    spaceId: string,
    datasheet: { id: string; name: string },
    viewId: string,
  ) => {
    editor.update(() => {
      const apiUrl = `https://tables.mws.ru/fusion/v1/datasheets/${datasheet.id}/records?viewId=${viewId}&fieldKey=name`;
      $insertTablesMwNode(apiUrl, spaceId, datasheet.id, viewId);
    });
  };

  return <TablesMwBrowserPlugin onInsertTable={handleInsertTable} />;
}

export function Editor({
  editorState,
  editorSerializedState,
  onChange,
  onSerializedChange,
  documentTitle,
  documentDescription,
  collabId,
}: {
  editorState?: EditorState;
  editorSerializedState?: SerializedEditorState | null;
  onChange?: (editorState: EditorState) => void;
  onSerializedChange?: (editorSerializedState: SerializedEditorState) => void;
  documentTitle?: string;
  documentDescription?: string;
  collabId?: string;

}) {
  const {
    toolbarItems,
    footerItems,
    pluginItems,
    togglePluginItem,
    blockFormatItems,
    blockInsertItems,
    componentPickerItems,
  } = useBlockViewer();

  const [floatingAnchorElem, setFloatingAnchorElem] =
    useState<HTMLDivElement | null>(null);
  const [isLinkEditMode, setIsLinkEditMode] = useState<boolean>(false);

  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem);
    }
  };

  // Keep the initial editor state stable so LexicalExtensionComposer
  // does not recreate the editor on every content change.
  const initialSerializedStateRef = useRef(editorSerializedState);
  const initialEditorStateRef = useRef(editorState);

  const AppExtension = useMemo(
    () =>
      defineExtension({
        dependencies: [
          RichTextExtension,
          ImagesExtension,
          HorizontalRuleExtension,
          configExtension(ListExtension, { shouldPreserveNumbering: false }),
          CheckListExtension,
          configExtension(MarkdownShortcutsExtension, {
            transformers: MARKDOWN_TRANSFORMERS,
          }),
          AutoFocusExtension,
          ClearEditorExtension,
          DecoratorTextExtension,
          // HistoryExtension, // !!!
          KeywordsExtension,
          HashtagExtension,
          DateTimeExtension,
          configExtension(MaxLengthExtension, { disabled: false, maxLength }),
          DragDropPasteExtension,
          EmojisExtension,
          configExtension(LinkExtension, {
            validateUrl,
            attributes: {
              rel: "noopener noreferrer",
              target: "_blank",
            },
          }),
          AutoLinkExtension,
          ClickableLinkExtension,
          SelectionAlwaysOnDisplayExtension,
        ],
        // html: buildHTMLConfig(),
        name: "@shadcn-editor",
        namespace: "Playground",
        nodes: [
          OverflowNode,
          TableNode,
          TableCellNode,
          TableRowNode,
          CodeNode,
          CodeHighlightNode,
          MentionNode,
          EmojiNode,
          LayoutContainerNode,
          LayoutItemNode,
          TweetNode,
          YouTubeNode,
          AutocompleteNode,
          SpecialTextNode,
          TablesMwNode,
        ],
        $initialEditorState(editor) {
          if (initialSerializedStateRef.current) {
            const parsedState = editor.parseEditorState(initialSerializedStateRef.current);
            editor.setEditorState(parsedState);
          } else if (initialEditorStateRef.current) {
            editor.setEditorState(initialEditorStateRef.current);
          }
        },
        theme: editorTheme,
      }),
    [],
  );

  return (
    <div className="bg-background flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-lg border shadow">
      <LexicalExtensionComposer extension={AppExtension} contentEditable={null}>
        <LexicalCollaboration>
          {collabId && (
            <CollaborationPlugin
              id={collabId}
              providerFactory={(id, yjsDocMap) => {
                console.log('Инициализация провайдера для ID:', id)
                const doc = new Y.Doc();
                yjsDocMap.set(id, doc);

                const provider = new WebsocketProvider(
                  process.env.NEXT_PUBLIC_WIKILIVE_YJS_URL || 'wss://wiki-live.ru/yjs',
                  id,
                  doc,
                );

                provider.on('status', (event: { status: string }) => {
                  console.log('[YJS] status', event.status);
                });

                provider.on('connection-error', (event: Event) => {
                  console.error('[YJS] connection-error', event);
                });

                return provider as any;
              }}
              shouldBootstrap={true}
            />
          )}
        <TooltipProvider>
          <div className="relative flex min-h-0 flex-1 flex-col">
            <ToolbarPlugin>
              {({ blockType }) => (
                <div className="vertical-align-middle sticky top-0 z-10 flex items-center gap-2 overflow-auto border-b p-1">
                  {toolbarItems.undoRedo && <HistoryToolbarPlugin />}
                  {toolbarItems.undoRedo && (
                    <Separator orientation="vertical" className="!h-7" />
                  )}
                  {toolbarItems.blockFormat && (
                    <BlockFormatDropDown>
                      {blockFormatItems.paragraph && <FormatParagraph />}
                      {(() => {
                        const levels = (["h1", "h2", "h3"] as const).filter(
                          (l) => blockFormatItems[l],
                        );
                        return levels.length > 0 ? (
                          <FormatHeading levels={levels} />
                        ) : null;
                      })()}
                      {blockFormatItems.numberList && <FormatNumberedList />}
                      {blockFormatItems.bulletList && <FormatBulletedList />}
                      {blockFormatItems.checkList && <FormatCheckList />}
                      {blockFormatItems.codeBlock && <FormatCodeBlock />}
                      {blockFormatItems.blockquote && <FormatQuote />}
                    </BlockFormatDropDown>
                  )}
                  {blockType === "code" ? (
                    <CodeLanguageToolbarPlugin />
                  ) : (
                    <>
                      {toolbarItems.fontFamily && <FontFamilyToolbarPlugin />}
                      {toolbarItems.fontSize && <FontSizeToolbarPlugin />}
                      {(toolbarItems.fontFamily || toolbarItems.fontSize) && (
                        <Separator orientation="vertical" className="!h-7" />
                      )}
                      {toolbarItems.fontFormat && <FontFormatToolbarPlugin />}
                      {toolbarItems.fontFormat && (
                        <Separator orientation="vertical" className="!h-7" />
                      )}
                      {toolbarItems.subSuper && <SubSuperToolbarPlugin />}
                      {toolbarItems.link && (
                        <LinkToolbarPlugin
                          setIsLinkEditMode={setIsLinkEditMode}
                        />
                      )}
                      {(toolbarItems.subSuper || toolbarItems.link) && (
                        <Separator orientation="vertical" className="!h-7" />
                      )}
                      {toolbarItems.clearFormatting && (
                        <ClearFormattingToolbarPlugin />
                      )}
                      {toolbarItems.clearFormatting && (
                        <Separator orientation="vertical" className="!h-7" />
                      )}
                      {toolbarItems.fontColor && <FontColorToolbarPlugin />}
                      {toolbarItems.fontBackground && (
                        <FontBackgroundToolbarPlugin />
                      )}
                      {(toolbarItems.fontColor ||
                        toolbarItems.fontBackground) && (
                        <Separator orientation="vertical" className="!h-7" />
                      )}
                      {toolbarItems.fontAlignment && (
                        <ElementFormatToolbarPlugin />
                      )}
                      {toolbarItems.fontAlignment && (
                        <Separator orientation="vertical" className="!h-7" />
                      )}
                      {toolbarItems.blockInsert && (
                        <BlockInsertPlugin>
                          {blockInsertItems.divider && <InsertHorizontalRule />}
                          {blockInsertItems.image && <InsertImage />}
                          {blockInsertItems.table && <InsertTable />}
                          {blockInsertItems.columnsLayout && (
                            <InsertColumnsLayout />
                          )}
                          {blockInsertItems.embeds && <InsertEmbeds />}
                        </BlockInsertPlugin>
                      )}
                      <TablesMwBrowserButton />
                    </>
                  )}
                </div>
              )}
            </ToolbarPlugin>
            <div className="relative min-h-0 flex-1" data-comment-content-frame>
              <div className="h-full">
                <div className="h-full" ref={onRef}>
                  <ContentEditable
                    placeholder={placeholder}
                    placeholderClassName={`${pluginItems.draggableBlock ? "pl-14" : "pl-4"}`}
                    className={`h-full ${pluginItems.draggableBlock ? "pl-14" : "pl-4"}`}
                  />
                </div>
              </div>
              {pluginItems.componentPicker && (
                <ComponentPickerMenuPlugin
                  baseOptions={[
                    ...(componentPickerItems.paragraph
                      ? [ParagraphPickerPlugin()]
                      : []),
                    ...(componentPickerItems.h1
                      ? [HeadingPickerPlugin({ n: 1 })]
                      : []),
                    ...(componentPickerItems.h2
                      ? [HeadingPickerPlugin({ n: 2 })]
                      : []),
                    ...(componentPickerItems.h3
                      ? [HeadingPickerPlugin({ n: 3 })]
                      : []),
                    ...(componentPickerItems.table
                      ? [TablePickerPlugin()]
                      : []),
                    ...(componentPickerItems.checkList
                      ? [CheckListPickerPlugin()]
                      : []),
                    ...(componentPickerItems.numberList
                      ? [NumberedListPickerPlugin()]
                      : []),
                    ...(componentPickerItems.bulletList
                      ? [BulletedListPickerPlugin()]
                      : []),
                    ...(componentPickerItems.blockquote
                      ? [QuotePickerPlugin()]
                      : []),
                    ...(componentPickerItems.codeBlock
                      ? [CodePickerPlugin()]
                      : []),
                    ...(componentPickerItems.divider
                      ? [DividerPickerPlugin()]
                      : []),
                    ...(componentPickerItems.tweetEmbed
                      ? [EmbedsPickerPlugin({ embed: "tweet" })]
                      : []),
                    ...(componentPickerItems.youtubeEmbed
                      ? [EmbedsPickerPlugin({ embed: "youtube-video" })]
                      : []),
                    ...(componentPickerItems.image
                      ? [ImagePickerPlugin()]
                      : []),
                    ...(componentPickerItems.columnsLayout
                      ? [ColumnsLayoutPickerPlugin()]
                      : []),
                    ...(componentPickerItems.dateTime
                      ? [DateTimePickerPlugin()]
                      : []),
                    ...(componentPickerItems.alignLeft
                      ? [AlignmentPickerPlugin({ alignment: "left" })]
                      : []),
                    ...(componentPickerItems.alignCenter
                      ? [AlignmentPickerPlugin({ alignment: "center" })]
                      : []),
                    ...(componentPickerItems.alignRight
                      ? [AlignmentPickerPlugin({ alignment: "right" })]
                      : []),
                    ...(componentPickerItems.alignJustify
                      ? [AlignmentPickerPlugin({ alignment: "justify" })]
                      : []),
                  ]}
                  dynamicOptionsFn={DynamicTablePickerPlugin}
                />
              )}
              {pluginItems.emojiPicker && <EmojiPickerPlugin />}
              {pluginItems.autoEmbed && <AutoEmbedPlugin />}
              <TablesMwPastePlugin />
              {pluginItems.mentions && <MentionsPlugin />}
              <WikiLinksPlugin />
              {blockFormatItems.codeBlock && <CodeHighlightPlugin />}
              {blockInsertItems.table && <TablePlugin />}

              {(blockInsertItems.embeds || componentPickerItems.tweetEmbed) && (
                <TwitterPlugin />
              )}
              {(blockInsertItems.embeds ||
                componentPickerItems.youtubeEmbed) && <YouTubePlugin />}
              {pluginItems.tabFocus && <TabFocusPlugin />}
              {pluginItems.tabIndentation && <TabIndentationPlugin />}
              {blockInsertItems.columnsLayout && <LayoutPlugin />}

              {pluginItems.floatingLinkToolbar && (
                <FloatingLinkEditorPlugin
                  anchorElem={floatingAnchorElem}
                  isLinkEditMode={isLinkEditMode}
                  setIsLinkEditMode={setIsLinkEditMode}
                />
              )}

              {pluginItems.draggableBlock && (
                <DraggableBlockPlugin
                  anchorElem={floatingAnchorElem}
                  baseOptions={[
                    ...(componentPickerItems.paragraph
                      ? [ParagraphPickerPlugin()]
                      : []),
                    ...(componentPickerItems.h1
                      ? [HeadingPickerPlugin({ n: 1 })]
                      : []),
                    ...(componentPickerItems.h2
                      ? [HeadingPickerPlugin({ n: 2 })]
                      : []),
                    ...(componentPickerItems.h3
                      ? [HeadingPickerPlugin({ n: 3 })]
                      : []),
                    ...(componentPickerItems.table
                      ? [TablePickerPlugin()]
                      : []),
                    ...(componentPickerItems.checkList
                      ? [CheckListPickerPlugin()]
                      : []),
                    ...(componentPickerItems.numberList
                      ? [NumberedListPickerPlugin()]
                      : []),
                    ...(componentPickerItems.bulletList
                      ? [BulletedListPickerPlugin()]
                      : []),
                    ...(componentPickerItems.blockquote
                      ? [QuotePickerPlugin()]
                      : []),
                    ...(componentPickerItems.codeBlock
                      ? [CodePickerPlugin()]
                      : []),
                    ...(componentPickerItems.divider
                      ? [DividerPickerPlugin()]
                      : []),
                    ...(componentPickerItems.tweetEmbed
                      ? [EmbedsPickerPlugin({ embed: "tweet" })]
                      : []),
                    ...(componentPickerItems.youtubeEmbed
                      ? [EmbedsPickerPlugin({ embed: "youtube-video" })]
                      : []),
                    ...(componentPickerItems.image
                      ? [ImagePickerPlugin()]
                      : []),
                    ...(componentPickerItems.columnsLayout
                      ? [ColumnsLayoutPickerPlugin()]
                      : []),
                    ...(componentPickerItems.dateTime
                      ? [DateTimePickerPlugin()]
                      : []),
                    ...(componentPickerItems.alignLeft
                      ? [AlignmentPickerPlugin({ alignment: "left" })]
                      : []),
                    ...(componentPickerItems.alignCenter
                      ? [AlignmentPickerPlugin({ alignment: "center" })]
                      : []),
                    ...(componentPickerItems.alignRight
                      ? [AlignmentPickerPlugin({ alignment: "right" })]
                      : []),
                    ...(componentPickerItems.alignJustify
                      ? [AlignmentPickerPlugin({ alignment: "justify" })]
                      : []),
                  ]}
                  dynamicOptionsFn={DynamicTablePickerPlugin}
                />
              )}
              {blockFormatItems.codeBlock && (
                <CodeActionMenuPlugin anchorElem={floatingAnchorElem} />
              )}

              {pluginItems.floatingTextToolbar && (
                <FloatingTextFormatToolbarPlugin
                  anchorElem={floatingAnchorElem}
                  setIsLinkEditMode={setIsLinkEditMode}
                  aiEnabled={pluginItems.selectionAi}
                />
              )}
              {pluginItems.autoComplete && <AutoCompletePlugin />}
              {pluginItems.contextMenu && <ContextMenuPlugin />}
              {pluginItems.specialText && <SpecialTextPlugin />}

              <TypingPerfPlugin />
            </div>
            <ActionsPlugin>
              <div className="clear-both flex items-center justify-between gap-2 overflow-auto border-t p-1">
                <div className="flex flex-1 justify-start text-xs text-gray-500">
                  {footerItems.characterCount && (
                    <CharacterLimitPlugin
                      maxLength={maxLength}
                      charset="UTF-16"
                    />
                  )}
                </div>
                <div>
                  {footerItems.characterCount && (
                    <CounterCharacterPlugin charset="UTF-16" />
                  )}
                </div>
                <div className="flex flex-1 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    className={`p-2 ${pluginItems.selectionAi ? "text-foreground" : "text-muted-foreground"}`}
                    onClick={() => togglePluginItem("selectionAi")}
                    title="Включить или выключить AI для выделения"
                    aria-label="Toggle selection AI"
                  >
                    <span
                      className={`mr-1.5 inline-block size-1.5 rounded-full ${
                        pluginItems.selectionAi
                          ? "bg-emerald-500"
                          : "bg-muted-foreground/60"
                      }`}
                    />
                    {pluginItems.selectionAi ? "AI: Вкл" : "AI: Выкл"}
                  </Button>
                  <TablesMwBrowserButton />
                  {footerItems.speechToText && <SpeechToTextPlugin />}
                  {footerItems.shareContent && <ShareContentPlugin />}
                  {footerItems.exportImport && (
                    <ImportExportPlugin
                      documentTitle={documentTitle}
                      documentDescription={documentDescription}
                    />
                  )}
                  {footerItems.markdownToggle && (
                    <MarkdownTogglePlugin
                      shouldPreserveNewLinesInMarkdown={true}
                      transformers={MARKDOWN_TRANSFORMERS}
                    />
                  )}
                  {footerItems.viewOnly && <EditModeTogglePlugin />}
                  {footerItems.clearEditor && <ClearEditorActionPlugin />}
                  {footerItems.treeView && <TreeViewPlugin />}
                </div>
              </div>
            </ActionsPlugin>
          </div>

          <OnChangePlugin
            ignoreSelectionChange={true}
            onChange={(editorState) => {
              onChange?.(editorState);
              onSerializedChange?.(editorState.toJSON());
            }}
          />
        </TooltipProvider>
      </LexicalExtensionComposer>
    </div>
  );
}


