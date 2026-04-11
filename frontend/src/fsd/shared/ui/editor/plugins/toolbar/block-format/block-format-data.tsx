import {
  CodeIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ListIcon,
  ListOrderedIcon,
  ListTodoIcon,
  QuoteIcon,
  TextIcon,
} from "lucide-react";

export const blockTypeToBlockName: Record<
  string,
  { label: string; icon: React.ReactNode }
> = {
  paragraph: {
    label: "Параграф",
    icon: <TextIcon className="size-4" />,
  },
  h1: {
    label: "Заголовок 1",
    icon: <Heading1Icon className="size-4" />,
  },
  h2: {
    label: "Заголовок 2",
    icon: <Heading2Icon className="size-4" />,
  },
  h3: {
    label: "Заголовок 3",
    icon: <Heading3Icon className="size-4" />,
  },
  number: {
    label: "Нумерованный список",
    icon: <ListOrderedIcon className="size-4" />,
  },
  bullet: {
    label: "Маркированный список",
    icon: <ListIcon className="size-4" />,
  },
  check: {
    label: "Чек-лист",
    icon: <ListTodoIcon className="size-4" />,
  },
  code: {
    label: "Блок кода",
    icon: <CodeIcon className="size-4" />,
  },
  quote: {
    label: "Цитата",
    icon: <QuoteIcon className="size-4" />,
  },
};
