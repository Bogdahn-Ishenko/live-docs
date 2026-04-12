import { Columns3Icon } from "lucide-react";

import { InsertLayoutDialog } from "@/fsd/shared/ui/editor/plugins/layout-plugin";
import { ComponentPickerOption } from "@/fsd/shared/ui/editor/plugins/picker/component-picker-option";

export function ColumnsLayoutPickerPlugin() {
  return new ComponentPickerOption("Колонки", {
    icon: <Columns3Icon className="size-4" />,
    keywords: ["columns", "layout", "grid"],
    onSelect: (_, editor, showModal) =>
      showModal("Вставить колонки", (onClose) => (
        <InsertLayoutDialog activeEditor={editor} onClose={onClose} />
      )),
  });
}
