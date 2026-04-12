import { ImageIcon } from "lucide-react";

import { InsertImageDialog } from "@/fsd/shared/ui/editor/extensions/images-extension";
import { ComponentPickerOption } from "@/fsd/shared/ui/editor/plugins/picker/component-picker-option";

export function ImagePickerPlugin() {
  return new ComponentPickerOption("Фото", {
    icon: <ImageIcon className="size-4" />,
    keywords: ["image", "photo", "picture", "file"],
    onSelect: (_, editor, showModal) =>
      showModal("Вставить фото", (onClose) => (
        <InsertImageDialog activeEditor={editor} onClose={onClose} />
      )),
  });
}
