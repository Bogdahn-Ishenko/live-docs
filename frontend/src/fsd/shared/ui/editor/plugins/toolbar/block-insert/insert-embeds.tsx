import { INSERT_EMBED_COMMAND } from "@lexical/react/LexicalAutoEmbedPlugin";

import { useToolbarContext } from "@/fsd/shared/ui/editor/context/toolbar-context";
import { EmbedConfigs } from "@/fsd/shared/ui/editor/plugins/embeds/auto-embed-plugin";
import { DropdownMenuItem } from "@/fsd/shared/ui/dropdown-menu";

export function InsertEmbeds() {
  const { activeEditor } = useToolbarContext();
  return EmbedConfigs.map((embedConfig) => (
    <DropdownMenuItem
      key={embedConfig.type}
      onClick={() => {
        activeEditor.dispatchCommand(INSERT_EMBED_COMMAND, embedConfig.type);
      }}
    >
      <div className="flex items-center gap-1">
        {embedConfig.icon}
        <span>{embedConfig.contentName}</span>
      </div>
    </DropdownMenuItem>
  ));
}
