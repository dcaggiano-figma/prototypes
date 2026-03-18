import type { ReactNode } from 'react';

export type RecipeCategory = 'forms' | 'navigation' | 'overlays' | 'data-display' | 'layout' | 'feedback' | 'property-panels';

export interface RecipeExample {
  label: string;
  render: () => ReactNode;
  code: string;
}

export interface ComponentRef {
  name: string;
  source: 'fpl' | 'shared';
  docsUrl?: string;
}

export interface Recipe {
  id: string;
  name: string;
  category: RecipeCategory;
  description: string;
  components: ComponentRef[];
  examples: RecipeExample[];
  tags: string[];
}

export const CATEGORY_LABELS: Record<RecipeCategory, string> = {
  forms: 'Forms',
  navigation: 'Navigation',
  overlays: 'Overlays',
  'data-display': 'Data Display',
  layout: 'Layout',
  feedback: 'Feedback',
  'property-panels': 'Property Panels',
};
