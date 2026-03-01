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
  h2: <Icon24Text />,
  h3: <Icon24Text />,
  h4: <Icon24Text />,
  h5: <Icon24Text />,
  h6: <Icon24Text />,
  p: <Icon24Text />,
  span: <Icon24Text />,
  label: <Icon24Text />,
  blockquote: <Icon24Text />,
  img: <Icon24Image />,
};

export function getElementIcon(type: string): ReactNode {
  return ICON_MAP[type] ?? <Icon24Rectangle />;
}
