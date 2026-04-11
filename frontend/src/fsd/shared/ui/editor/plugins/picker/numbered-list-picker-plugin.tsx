import { INSERT_ORDERED_LIST_COMMAND } from "@lexical/list";

import { ListOrderedIcon } from "lucide-react";

import { ComponentPickerOption } from "@/fsd/shared/ui/editor/plugins/picker/component-picker-option";

export function NumberedListPickerPlugin() {
  return new ComponentPickerOption("Нумерованный список", {
    icon: <ListOrderedIcon className="size-4" />,
    keywords: ["numbered list", "ordered list", "ol"],
    onSelect: (_, editor) =>
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
  });
}
