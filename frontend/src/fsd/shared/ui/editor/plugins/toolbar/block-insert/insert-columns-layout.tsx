import { Columns3Icon } from "lucide-react";

import { useToolbarContext } from "@/fsd/shared/ui/editor/context/toolbar-context";
import { InsertLayoutDialog } from "@/fsd/shared/ui/editor/plugins/layout-plugin";
import { DropdownMenuItem } from "@/fsd/shared/ui/dropdown-menu";

export function InsertColumnsLayout() {
  const { activeEditor, showModal } = useToolbarContext();

  return (
    <DropdownMenuItem
      onClick={() =>
        showModal("Вставить колонки", (onClose) => (
          <InsertLayoutDialog activeEditor={activeEditor} onClose={onClose} />
        ))
      }
    >
      <div className="flex items-center gap-1">
        <Columns3Icon className="size-4" />
        <span>Колонки</span>
      </div>
    </DropdownMenuItem>
  );
}
