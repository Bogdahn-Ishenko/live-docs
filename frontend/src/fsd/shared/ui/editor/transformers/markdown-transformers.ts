import {
  CHECK_LIST,
  ELEMENT_TRANSFORMERS,
  MULTILINE_ELEMENT_TRANSFORMERS,
  TEXT_FORMAT_TRANSFORMERS,
  TEXT_MATCH_TRANSFORMERS,
  type Transformer,
} from "@lexical/markdown";

import { EMOJI } from "@/fsd/shared/ui/editor/transformers/markdown-emoji-transformer";
import { HR } from "@/fsd/shared/ui/editor/transformers/markdown-hr-transformer";
import { IMAGE } from "@/fsd/shared/ui/editor/transformers/markdown-image-transformer";
import {
  LAYOUT_CONTAINER,
  LAYOUT_ITEM,
} from "@/fsd/shared/ui/editor/transformers/markdown-layout-transformer";
import { TABLE } from "@/fsd/shared/ui/editor/transformers/markdown-table-transformer";
import { TABLES_MW } from "@/fsd/shared/ui/editor/transformers/markdown-tables-mw-transformer";
import { TWEET } from "@/fsd/shared/ui/editor/transformers/markdown-tweet-transformer";

export const MARKDOWN_TRANSFORMERS: Array<Transformer> = [
  LAYOUT_CONTAINER,
  LAYOUT_ITEM,
  TABLES_MW,
  TABLE,
  HR,
  IMAGE,
  EMOJI,
  TWEET,
  CHECK_LIST,
  ...ELEMENT_TRANSFORMERS,
  ...MULTILINE_ELEMENT_TRANSFORMERS,
  ...TEXT_FORMAT_TRANSFORMERS,
  ...TEXT_MATCH_TRANSFORMERS,
];
