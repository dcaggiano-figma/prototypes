import type { ReactNode } from 'react';
import {
  Icon24Rectangle,
  Icon24Link,
  Icon24ListView,
  Icon24NumberList,
  Icon24Text,
  Icon24Image,
} from '@figma/fpl-icons';

const ICON_MAP: Record<string, ReactNode> = {
  div: <Icon24Rectangle />,
  a: <Icon24Link />,
  ul: <Icon24ListView />,
  ol: <Icon24NumberList />,
  h1: <Icon24Text />,
  img: <Icon24Image />,
};

export function getElementIcon(type: string): ReactNode {
  return ICON_MAP[type] ?? <Icon24Rectangle />;
}
