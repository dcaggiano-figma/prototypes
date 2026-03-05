import { useState } from 'react';
import { Input, Label, Textarea } from '@figma/fpl-components';
import { Icon24Lock, Icon24Text, Icon24Image } from '@figma/fpl-icons';

export function EditContentPanel() {
  const [plantName, setPlantName] = useState('Red Maple');
  const [description, setDescription] = useState(
    'The red maple is a common tree in the eastern U.S., known for its brilliant red foliage in fall. It grows in a variety of habitats, including wetlands and uplands.',
  );
  const [type, setType] = useState('Species Spotlight');
  const [scientificName, setScientificName] = useState('Acer rubrum');

  return (
    <div className="flex flex-col">
      <div className="px-3 py-2.5 border-b border-border flex flex-col gap-3 text-bodyLgStrong text-text">Edit content</div>
      {/* Brand guidelines banner */}
      <div className="px-3 py-3 flex gap-2 border-b border-border">
        <div className="flex-1 flex flex-col gap-1">
          <span className="text-bodyMdStrong text-text">This template has brand guidelines</span>
          <span className="text-bodyMd text-text-secondary">
            Brand guidelines let you edit text and images without changing the design.
          </span>
        </div>
        <div className="flex-shrink-0 text-icon-secondary">
          <Icon24Lock />
        </div>
      </div>

      {/* Text section */}
      <div className="flex flex-col border-b border-border">
        <div className="flex items-center gap-1 text-text p-2.5">
          <Icon24Text />
          <span className="text-bodyMdStrong">Text</span>
        </div>
        <div className="flex flex-col gap-3 px-3 pb-4">
          <div className="flex flex-col gap-1">
            <Label className="text-text-secondary text-bodyMd">Plant name</Label>
            <Input id="plant-name" value={plantName} onChange={setPlantName} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-text-secondary text-bodyMd">Description</Label>
            <Textarea id="description" value={description} onChange={setDescription} rows={6} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-text-secondary text-bodyMd">Type</Label>
            <Input id="type" value={type} onChange={setType} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-text-secondary text-bodyMd">Scientific name</Label>
            <Input id="scientific-name" value={scientificName} onChange={setScientificName} />
          </div>
        </div>
      </div>

      {/* Image section */}
      <div className="flex flex-col ">
        <div className="p-2.5 flex items-center gap-1 text-text">
          <Icon24Image />
          <span className="text-bodyMdStrong">Image</span>
        </div>
        <div className="px-3">
          <div className="w-full aspect-[16/9] rounded-md bg-bg-secondary overflow-hidden border border-border">
            
          </div>
        </div>
      </div>
    </div>
  );
}
