import { ContentEditable as LexicalContentEditable } from "@lexical/react/LexicalContentEditable";
import type { JSX } from "react";

type Props = {
  placeholder: string;
  className?: string;
  placeholderClassName?: string;
};

export function ContentEditable({
  placeholder,
  className,
  placeholderClassName,
}: Props): JSX.Element {
  return (
    <LexicalContentEditable
      className={`ContentEditable__root scrollbar-hidden relative mx-auto block min-h-72 w-full max-w-[760px] overflow-auto px-6 pt-10 pb-16 focus:outline-none ${className ?? ""}`.trim()}
      aria-placeholder={placeholder}
      placeholder={
        <div
          className={`text-muted-foreground pointer-events-none absolute top-0 left-1/2 w-full max-w-[760px] -translate-x-1/2 overflow-hidden px-6 pt-10 pb-16 text-ellipsis select-none ${placeholderClassName ?? ""}`.trim()}
        >
          {placeholder}
        </div>
      }
    />
  );
}
