import { type ComponentType } from 'react';
import { ButtonPrimitive, Collapse } from '@figma/fpl-components';
import {
  Icon24Rectangle,
  Icon24Ellipse,
  Icon24Diamond,
  Icon24Polygon,
  Icon24Star,
  Icon24Line,
  Icon24ShapeHexagon,
  Icon24ShapeOctagon,
  Icon24ShapeRightArrow,
  Icon24ShapeLeftArrow,
  Icon24Arrow,
  Icon24ArrowUp,
  Icon24ArrowDown,
  Icon24StrokeLineArrow,
  Icon24StrokeTriangleArrow,
  Icon24StrokeCircleArrow,
  Icon24ShapePentagon,
  Icon24ShapeDocument,
  Icon24ShapeMultipleDocuments,
  Icon24ShapeManualInput,
  Icon24ShapeInternalStorage,
  Icon24ShapeSummingJunction,
  Icon24ShapeCylinder,
} from '@figma/fpl-icons';

interface ShapeItem {
  id: string;
  label: string;
  Icon: ComponentType;
}

interface ShapeSection {
  id: string;
  label: string;
  items: ShapeItem[];
}

const SECTIONS: ShapeSection[] = [
  {
    id: 'recents',
    label: 'Recents',
    items: [
      { id: 'rect', label: 'Rectangle', Icon: Icon24Rectangle },
      { id: 'ellipse', label: 'Ellipse', Icon: Icon24Ellipse },
      { id: 'diamond', label: 'Diamond', Icon: Icon24Diamond },
      { id: 'star', label: 'Star', Icon: Icon24Star },
      { id: 'arrow-r', label: 'Right arrow', Icon: Icon24ShapeRightArrow },
      { id: 'hexagon', label: 'Hexagon', Icon: Icon24ShapeHexagon },
      { id: 'line', label: 'Line', Icon: Icon24Line },
      { id: 'polygon', label: 'Polygon', Icon: Icon24Polygon },
    ],
  },
  {
    id: 'arrows',
    label: 'Arrows',
    items: [
      { id: 'arrow-right', label: 'Right arrow', Icon: Icon24ShapeRightArrow },
      { id: 'arrow-left', label: 'Left arrow', Icon: Icon24ShapeLeftArrow },
      { id: 'arrow-generic', label: 'Arrow', Icon: Icon24Arrow },
      { id: 'arrow-up', label: 'Arrow up', Icon: Icon24ArrowUp },
      { id: 'arrow-down', label: 'Arrow down', Icon: Icon24ArrowDown },
      { id: 'stroke-line', label: 'Line arrow', Icon: Icon24StrokeLineArrow },
      { id: 'stroke-triangle', label: 'Triangle arrow', Icon: Icon24StrokeTriangleArrow },
      { id: 'stroke-circle', label: 'Circle arrow', Icon: Icon24StrokeCircleArrow },
    ],
  },
  {
    id: 'basic',
    label: 'Basic',
    items: [
      { id: 'basic-rect', label: 'Rectangle', Icon: Icon24Rectangle },
      { id: 'basic-ellipse', label: 'Ellipse', Icon: Icon24Ellipse },
      { id: 'basic-diamond', label: 'Diamond', Icon: Icon24Diamond },
      { id: 'basic-polygon', label: 'Polygon', Icon: Icon24Polygon },
      { id: 'basic-star', label: 'Star', Icon: Icon24Star },
      { id: 'basic-pentagon', label: 'Pentagon', Icon: Icon24ShapePentagon },
      { id: 'basic-hexagon', label: 'Hexagon', Icon: Icon24ShapeHexagon },
      { id: 'basic-octagon', label: 'Octagon', Icon: Icon24ShapeOctagon },
    ],
  },
  {
    id: 'flowchart',
    label: 'Flowchart',
    items: [
      { id: 'fc-process', label: 'Process', Icon: Icon24Rectangle },
      { id: 'fc-decision', label: 'Decision', Icon: Icon24Diamond },
      { id: 'fc-document', label: 'Document', Icon: Icon24ShapeDocument },
      { id: 'fc-multi-doc', label: 'Multiple documents', Icon: Icon24ShapeMultipleDocuments },
      { id: 'fc-input', label: 'Manual input', Icon: Icon24ShapeManualInput },
      { id: 'fc-storage', label: 'Internal storage', Icon: Icon24ShapeInternalStorage },
      { id: 'fc-cylinder', label: 'Database', Icon: Icon24ShapeCylinder },
      { id: 'fc-junction', label: 'Junction', Icon: Icon24ShapeSummingJunction },
    ],
  },
];

export function ShapesPanel() {
  return (
    <>
      <div className="px-3 pt-2.5 pb-3 border-b border-border">
        <span className="text-bodyLgStrong text-text h-4 flex items-center">Shapes</span>
      </div>
      <div className="flex flex-col overflow-y-auto py-2">
        {SECTIONS.map((section) => (
          <Collapse.Root key={section.id} defaultOpen={true}>
            <Collapse.Header variant="leftPanel" size="md">
              <Collapse.Label size="md">{section.label}</Collapse.Label>
            </Collapse.Header>
            <Collapse.Content>
              <div className="grid grid-cols-4 gap-2 px-3 pb-3 pt-1">
                {section.items.map((item) => (
                  <ButtonPrimitive
                    key={item.id}
                    className="aspect-square rounded-md bg-bg-secondary icon-secondary hover:border-border hover:border active:bg-bg-pressed flex items-center justify-center"
                    aria-label={item.label}
                  >
                    <item.Icon />
                  </ButtonPrimitive>
                ))}
              </div>
            </Collapse.Content>
          </Collapse.Root>
        ))}
      </div>
    </>
  );
}
