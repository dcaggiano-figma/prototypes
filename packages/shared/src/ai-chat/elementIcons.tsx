import type { ReactNode } from 'react';
import {
  Icon24ConnectorStraight,
  Icon24Ellipse,
  Icon24Frame,
  Icon24Group,
  Icon24Image,
  Icon24Line,
  Icon24Link,
  Icon24ListView,
  Icon24NumberList,
  Icon24Polygon,
  Icon24Rectangle,
  Icon24Section,
  Icon24ShapeStar,
  Icon24ShapeText,
  Icon24Sticky,
  Icon24Text,
  Icon24VectorBend,
} from '@figma/fpl-icons';

const ICON_MAP: Record<string, ReactNode> = {
  // HTML element types (Make template)
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

  // Scene graph node types (editor templates)
  RECTANGLE: <Icon24Rectangle />,
  ELLIPSE: <Icon24Ellipse />,
  TEXT: <Icon24Text />,
  FRAME: <Icon24Frame />,
  SECTION: <Icon24Section />,
  LINE: <Icon24Line />,
  POLYGON: <Icon24Polygon />,
  STAR: <Icon24ShapeStar />,
  STICKY_NOTE: <Icon24Sticky />,
  CONNECTOR: <Icon24ConnectorStraight />,
  SHAPE_WITH_TEXT: <Icon24ShapeText />,
  GROUP: <Icon24Group />,
  VECTOR: <Icon24VectorBend />,
  SLIDE: <Icon24Frame />,
  GRID_SECTION: <Icon24Section />,
};

export function getElementIcon(type: string): ReactNode {
  return ICON_MAP[type] ?? <Icon24Rectangle />;
}
