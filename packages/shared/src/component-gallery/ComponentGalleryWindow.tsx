import { useCallback, useState } from 'react';
import { Window } from '@figma/fpl-components';
import { RECIPE_REGISTRY } from './recipeRegistry';
import { ComponentGallerySidebar } from './ComponentGallerySidebar';
import { ComponentGalleryDetail } from './ComponentGalleryDetail';

interface ComponentGalleryWindowProps {
  onClose: () => void;
}

export function ComponentGalleryWindow({ onClose }: ComponentGalleryWindowProps) {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(
    RECIPE_REGISTRY[0]?.id ?? '',
  );

  const selectedRecipe = RECIPE_REGISTRY.find((r) => r.id === selectedRecipeId) ?? null;

  const handleSelect = useCallback((id: string) => {
    setSelectedRecipeId(id);
  }, []);

  return (
    <Window.ResizableRoot
      onClose={onClose}
      defaultPosition={{ x: 'center', y: 'center' }}
      defaultWidth={900}
      defaultHeight={650}
      constraints={{ minWidth: 700, minHeight: 450 }}
    >
      <Window.Contents>
        <Window.Header>
          <Window.Title>Component gallery</Window.Title>
        </Window.Header>
        <Window.Sidebar width={220} className="grid grid-rows-[auto_1fr]">
          <ComponentGallerySidebar
            recipes={RECIPE_REGISTRY}
            onSelect={handleSelect}
          />
        </Window.Sidebar>
        <Window.Body>
          <ComponentGalleryDetail recipe={selectedRecipe} />
        </Window.Body>
      </Window.Contents>
    </Window.ResizableRoot>
  );
}
